
import io
import json
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.ocr_engine import ocr_pdf, pdf_to_images
from app.core.vision_client import analyze_page_for_diagrams
from app.core.groq_client import complete
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()
logger = logging.getLogger(__name__)

STORAGE_BUCKET = "exam-files"


class RunOcrRequest(BaseModel):
    submission_id: str
    exam_id: str


def split_by_question(
    full_text: str,
    questions: list[dict],
) -> dict:
    """Split the extracted answer script by question number."""
    question_list = "\n".join(
        f"Q{q['question_no']}: {q['question_text']}"
        for q in questions
    )

    prompt = f"""
Below is OCR-extracted text from a student's answer script,
followed by the exam questions.

Split the script into the answer for each question number.

QUESTIONS:
{question_list}

OCR-EXTRACTED SCRIPT:
{full_text}

Return ONLY a JSON object mapping question number (string)
to answer text. Use an empty string if unanswered.
Do not include markdown fences or a preamble.
"""

    raw = complete(prompt, max_tokens=3000)

    try:
        result = json.loads(raw)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object.")

        return {
            str(key): value if isinstance(value, str) else ""
            for key, value in result.items()
        }

    except (json.JSONDecodeError, TypeError, ValueError):
        logger.exception("Failed to split OCR text by question.")
        raise HTTPException(
            status_code=502,
            detail="Could not split the OCR text into question answers.",
        )


def save_answer_rows(supabase, submission_id: str, rows: list[dict]):
    """
    Update existing answer rows or insert missing ones.
    This avoids creating duplicates on ordinary retries.
    """
    existing_result = (
        supabase.table("answers")
        .select("id, question_id")
        .eq("submission_id", submission_id)
        .execute()
    )

    existing_rows = existing_result.data or []
    existing_by_question = {
        str(row["question_id"]): row
        for row in existing_rows
    }

    for row in rows:
        existing = existing_by_question.get(str(row["question_id"]))

        if existing:
            (
                supabase.table("answers")
                .update({
                    "ocr_text": row["ocr_text"],
                    "ocr_confidence": row["ocr_confidence"],
                    "diagram_detected": row["diagram_detected"],
                    "diagram_confidence": row["diagram_confidence"],
                })
                .eq("id", existing["id"])
                .execute()
            )
        else:
            supabase.table("answers").insert(row).execute()


@router.post("/run-ocr")
async def run_ocr(
    payload: RunOcrRequest,
    authorization: str | None = Header(default=None),
):
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    try:
        # 1. Verify that the submission exists.
        submission_result = (
            supabase.table("answer_submissions")
            .select(
                "id, exam_id, scanned_file_path, status"
            )
            .eq("id", payload.submission_id)
            .maybe_single()
            .execute()
        )

        submission = submission_result.data

        if not submission:
            raise HTTPException(
                status_code=404,
                detail="Submission not found.",
            )

        # 2. Prevent processing against the wrong exam.
        if str(submission["exam_id"]) != str(payload.exam_id):
            raise HTTPException(
                status_code=400,
                detail="Submission does not belong to this exam.",
            )

        file_path = submission.get("scanned_file_path")

        if not file_path:
            raise HTTPException(
                status_code=400,
                detail="Submission has no scanned PDF file.",
            )

        # 3. Fetch the exam questions.
        question_result = (
            supabase.table("questions")
            .select("id, question_no, question_text")
            .eq("exam_id", payload.exam_id)
            .order("question_no")
            .execute()
        )

        questions = question_result.data or []

        if not questions:
            raise HTTPException(
                status_code=400,
                detail="No questions found for this exam.",
            )

        # 4. Download the scanned answer paper.
        pdf_bytes = (
            supabase.storage
            .from_(STORAGE_BUCKET)
            .download(file_path)
        )

        if not pdf_bytes:
            raise HTTPException(
                status_code=422,
                detail="The downloaded PDF is empty.",
            )

        # 5. Extract handwritten or printed text.
        full_text, avg_confidence = ocr_pdf(pdf_bytes)

        if not full_text or not full_text.strip():
            raise HTTPException(
                status_code=422,
                detail="OCR produced no readable text.",
            )

        # 6. Analyze pages for diagrams.
        page_images = pdf_to_images(pdf_bytes)
        all_diagrams = []

        for page_number, image in enumerate(page_images, start=1):
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")

            try:
                diagrams = analyze_page_for_diagrams(
                    buffer.getvalue(),
                    questions,
                )

                if diagrams:
                    all_diagrams.extend(diagrams)

            except Exception:
                # Do not silently claim diagrams were evaluated.
                logger.exception(
                    "Diagram analysis failed on page %s",
                    page_number,
                )

        # 7. Split the extracted text by question.
        split_answers = split_by_question(full_text, questions)

        # 8. Build answer records.
        rows = []

        for question in questions:
            question_number = str(question["question_no"])

            answer_text = split_answers.get(question_number, "")

            matching_diagrams = [
                diagram
                for diagram in all_diagrams
                if str(diagram.get("question_no"))
                == question_number
            ]

            valid_descriptions = [
                diagram.get("description", "").strip()
                for diagram in matching_diagrams
                if isinstance(diagram.get("description"), str)
                and diagram.get("description", "").strip()
            ]

            diagram_detected = bool(valid_descriptions)

            diagram_confidence = None

            if diagram_detected:
                answer_text += (
                    "\n\n[DIAGRAM PRESENT — description: "
                    + "; ".join(valid_descriptions)
                    + "]"
                )

                confidences = [
                    diagram.get("confidence")
                    for diagram in matching_diagrams
                    if isinstance(
                        diagram.get("confidence"),
                        (int, float),
                    )
                    and not isinstance(
                        diagram.get("confidence"),
                        bool,
                    )
                    and 0 <= diagram["confidence"] <= 1
                ]

                if confidences:
                    diagram_confidence = max(confidences)

            rows.append({
                "submission_id": payload.submission_id,
                "question_id": question["id"],
                "ocr_text": answer_text,
                "ocr_confidence": avg_confidence,
                "diagram_detected": diagram_detected,
                "diagram_confidence": diagram_confidence,
            })

        # 9. Save without blindly inserting duplicate answer rows.
        save_answer_rows(
            supabase,
            payload.submission_id,
            rows,
        )

        # 10. Update status only after saving OCR results.
        (
            supabase.table("answer_submissions")
            .update({"status": "ocr_done"})
            .eq("id", payload.submission_id)
            .execute()
        )

        return {
            "status": "ok",
            "submission_id": payload.submission_id,
            "answers_created_or_updated": len(rows),
            "average_ocr_confidence": avg_confidence,
            "diagrams_detected": sum(
                row["diagram_detected"] for row in rows
            ),
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "OCR processing failed for submission %s",
            payload.submission_id,
        )

        raise HTTPException(
            status_code=500,
            detail="OCR processing failed. Check the AI-service logs.",
        )
