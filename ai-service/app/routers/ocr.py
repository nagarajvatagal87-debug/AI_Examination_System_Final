import json
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.ocr_engine import ocr_pdf, pdf_to_images
from app.core.vision_client import analyze_page_for_diagrams
from app.core.groq_client import complete
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()
STORAGE_BUCKET = "exam-files"


class RunOcrRequest(BaseModel):
    submission_id: str
    exam_id: str


def split_by_question(full_text: str, questions: list[dict]) -> dict:
    question_list = "\n".join(f"Q{q['question_no']}: {q['question_text']}" for q in questions)
    prompt = f"""Below is OCR-extracted text from a student's answer script, followed by
the exam's questions. Split the script into the answer for each question number.

QUESTIONS:
{question_list}

OCR'D SCRIPT:
{full_text}

Return ONLY a JSON object mapping question number (string) to answer text.
Use empty string if unanswered. No preamble, no markdown fences.
"""
    raw = complete(prompt, max_tokens=3000)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


@router.post("/run-ocr")
async def run_ocr(payload: RunOcrRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    submission = supabase.table("answer_submissions").select("*").eq("id", payload.submission_id).single().execute().data
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    questions = supabase.table("questions").select("id, question_no, question_text").eq("exam_id", payload.exam_id).execute().data
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this exam")

    pdf_bytes = supabase.storage.from_(STORAGE_BUCKET).download(submission["scanned_file_path"])
    full_text, avg_confidence = ocr_pdf(pdf_bytes)

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="OCR produced no text")

    page_images = pdf_to_images(pdf_bytes)
    all_diagrams = []
    for img in page_images:
        import io
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        diagrams = analyze_page_for_diagrams(buf.getvalue(), questions)
        all_diagrams.extend(diagrams)

    split_answers = split_by_question(full_text, questions)

    rows = []
    for q in questions:
        answer_text = split_answers.get(str(q["question_no"]), "")
        matching_diagrams = [d for d in all_diagrams if d.get("question_no") == q["question_no"]]

        if matching_diagrams:
            diagram_desc = "; ".join(d["description"] for d in matching_diagrams)
            answer_text += f"\n\n[DIAGRAM PRESENT — description: {diagram_desc}]"
            diagram_detected = True
            diagram_confidence = max(d.get("confidence", 0) for d in matching_diagrams)
        else:
            diagram_detected = False
            diagram_confidence = None

        rows.append({
            "submission_id": payload.submission_id,
            "question_id": q["id"],
            "ocr_text": answer_text,
            "ocr_confidence": avg_confidence,
            "diagram_detected": diagram_detected,
            "diagram_confidence": diagram_confidence,
        })

    supabase.table("answers").insert(rows).execute()
    supabase.table("answer_submissions").update({"status": "ocr_done"}).eq("id", payload.submission_id).execute()

    return {"status": "ok", "answers_created": len(rows), "average_ocr_confidence": avg_confidence}