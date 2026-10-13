
import json
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.embeddings import embed
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()
logger = logging.getLogger(__name__)


class ProcessSubmissionRequest(BaseModel):
    submission_id: str
    scanned_file_path: str
    exam_id: str


def retrieve_context(
    subject_id: str,
    query_text: str,
    match_count: int = 5,
) -> str:
    """Retrieve course chunks relevant to the question."""
    query_embedding = embed(query_text)

    result = get_supabase().rpc(
        "match_course_chunks",
        {
            "query_embedding": query_embedding,
            "match_subject_id": subject_id,
            "match_count": match_count,
        },
    ).execute()

    chunks = result.data or []

    return "\n\n---\n\n".join(
        chunk["content"]
        for chunk in chunks
        if chunk.get("content")
    )


def evaluate_one_answer(
    question_text: str,
    marks: int,
    rubric: dict | None,
    ocr_text: str,
    subject_id: str,
) -> dict[str, Any]:
    """Generate and validate AI-suggested marks."""
    if not ocr_text or not ocr_text.strip():
        return {
            "suggested_marks": None,
            "confidence": 0,
            "evidence": "No readable answer text was extracted by OCR.",
            "flagged_for_review": True,
        }

    context = retrieve_context(subject_id, question_text)

    rubric_section = (
        f"\nMarking rubric: {json.dumps(rubric)}"
        if rubric
        else ""
    )

    prompt = f"""
Evaluate the student's answer using the question, course material,
and marking rubric. Award marks only for demonstrated understanding.

Question ({marks} marks): {question_text}
{rubric_section}

Relevant course material:
{context or "No relevant course chunks were retrieved."}

Student's OCR-extracted answer:
{ocr_text}

Return ONLY a JSON object with:
- suggested_marks: number between 0 and {marks}
- confidence: number between 0 and 1
- evidence: string explaining the assessment
- flagged_for_review: boolean

Flag unclear handwriting, incomplete answers, and insufficient evidence
for faculty review. Do not include markdown fences or a preamble.
"""

    raw = complete(prompt, max_tokens=1024)

    try:
        result = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {
            "suggested_marks": None,
            "confidence": 0,
            "evidence": "The AI returned an invalid evaluation response.",
            "flagged_for_review": True,
        }

    suggested = result.get("suggested_marks")
    confidence = result.get("confidence")

    if (
        isinstance(suggested, bool)
        or not isinstance(suggested, (int, float))
        or not 0 <= suggested <= marks
    ):
        suggested = None

    if (
        isinstance(confidence, bool)
        or not isinstance(confidence, (int, float))
        or not 0 <= confidence <= 1
    ):
        confidence = 0

    evidence = result.get("evidence")
    if not isinstance(evidence, str):
        evidence = "No valid evaluation evidence was returned."

    flagged = result.get("flagged_for_review")

    return {
        "suggested_marks": suggested,
        "confidence": confidence,
        "evidence": evidence,
        "flagged_for_review": (
            flagged is not False or suggested is None
        ),
    }


def fetch_answers(supabase, submission_id: str) -> list[dict]:
    """Fetch answers using the confirmed answers.submission_id column."""
    result = (
        supabase.table("answers")
        .select(
            """
            id, ocr_text, question_id, submission_id,
            questions (
                question_text, marks, rubric, exam_id,
                exams (subject_id)
            )
            """
        )
        .eq("submission_id", submission_id)
        .execute()
    )

    return result.data or []


@router.post("/process-submission")
async def process_submission(
    payload: ProcessSubmissionRequest,
    authorization: str | None = Header(default=None),
):
    # Validate the shared secret used by the Node backend.
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    try:
        # Confirm the submission exists and belongs to this exam.
        submission_result = (
            supabase.table("answer_submissions")
            .select("id, exam_id, scanned_file_path, status")
            .eq("id", payload.submission_id)
            .maybe_single()
            .execute()
        )

        submission = submission_result.data

        if not submission:
            raise HTTPException(
                status_code=404,
                detail="Answer submission not found.",
            )

        if str(submission["exam_id"]) != str(payload.exam_id):
            raise HTTPException(
                status_code=400,
                detail="Submission does not belong to the specified exam.",
            )

        stored_path = submission.get("scanned_file_path")

        if not stored_path:
            raise HTTPException(
                status_code=400,
                detail="Submission has no scanned file path.",
            )

        if stored_path != payload.scanned_file_path:
            raise HTTPException(
                status_code=400,
                detail="Scanned file path does not match the stored submission.",
            )

        answers = fetch_answers(supabase, payload.submission_id)

        # Run OCR if answers are absent or any answer lacks OCR text.
        if not answers or any(
            not (answer.get("ocr_text") or "").strip()
            for answer in answers
        ):
            from app.routers.ocr import run_ocr, RunOcrRequest

            await run_ocr(
                RunOcrRequest(
                    submission_id=payload.submission_id,
                    exam_id=payload.exam_id,
                ),
                authorization,
            )

            answers = fetch_answers(supabase, payload.submission_id)

        if not answers:
            return {
                "status": "no_answers_found",
                "submission_id": payload.submission_id,
                "message": (
                    "OCR ran, but no answer rows were found. "
                    "Check the OCR router and answers table."
                ),
                "results": [],
            }

        results = []

        for answer in answers:
            try:
                question = answer.get("questions")

                if isinstance(question, list):
                    question = question[0] if question else None

                if not question:
                    raise ValueError("Answer has no linked question.")

                if str(question.get("exam_id")) != str(payload.exam_id):
                    raise ValueError(
                        "The linked question does not belong to this exam."
                    )

                exam = question.get("exams")

                if isinstance(exam, list):
                    exam = exam[0] if exam else None

                if not exam or not exam.get("subject_id"):
                    raise ValueError(
                        "Question has no linked subject information."
                    )

                question_marks = question.get("marks")

                if (
                    isinstance(question_marks, bool)
                    or not isinstance(question_marks, (int, float))
                    or question_marks < 0
                ):
                    raise ValueError("Invalid maximum marks for question.")

                evaluation = evaluate_one_answer(
                    question_text=question["question_text"],
                    marks=question_marks,
                    rubric=question.get("rubric"),
                    ocr_text=answer.get("ocr_text") or "",
                    subject_id=exam["subject_id"],
                )

                evaluation_row = {
                    "answer_id": answer["id"],
                    "ai_suggested_marks": evaluation["suggested_marks"],
                    "ai_confidence": evaluation["confidence"],
                    "ai_evidence": evaluation,
                }

                # Update an existing evaluation to reduce duplicate rows.
                existing_result = (
                    supabase.table("evaluations")
                    .select("id")
                    .eq("answer_id", answer["id"])
                    .limit(1)
                    .execute()
                )

                existing = existing_result.data or []

                if existing:
                    (
                        supabase.table("evaluations")
                        .update(evaluation_row)
                        .eq("id", existing[0]["id"])
                        .execute()
                    )
                else:
                    (
                        supabase.table("evaluations")
                        .insert(evaluation_row)
                        .execute()
                    )

                results.append({
                    "answer_id": answer["id"],
                    **evaluation,
                })

            except Exception:
                logger.exception(
                    "Evaluation failed for answer %s",
                    answer.get("id"),
                )

                results.append({
                    "answer_id": answer.get("id"),
                    "status": "failed",
                    "error": "Evaluation failed; check the AI-service logs.",
                    "flagged_for_review": True,
                })

        failed_count = sum(
            result.get("status") == "failed"
            for result in results
        )

        # Use only an enum value confirmed in your Supabase screenshot.
        # "evaluated" is used when all processing succeeds.
        # "ocr_done" is used when at least one answer fails.
        final_status = (
            "evaluated" if failed_count == 0 else "ocr_done"
        )

        (
            supabase.table("answer_submissions")
            .update({"status": final_status})
            .eq("id", payload.submission_id)
            .execute()
        )

        return {
            "status": "ok" if failed_count == 0 else "partial",
            "submission_id": payload.submission_id,
            "evaluated_count": len(results) - failed_count,
            "failed_count": failed_count,
            "results": results,
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Submission processing failed: %s",
            payload.submission_id,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Submission processing failed. "
                "Check the AI-service logs."
            ),
        )
