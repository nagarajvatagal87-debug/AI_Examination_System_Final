import json
from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.embeddings import embed
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()


class ProcessSubmissionRequest(BaseModel):
    submission_id: str
    scanned_file_path: str
    exam_id: str


def retrieve_context(subject_id: str, query_text: str, match_count: int = 5) -> str:
    supabase = get_supabase()
    query_embedding = embed(query_text)
    result = supabase.rpc(
        "match_course_chunks",
        {"query_embedding": query_embedding, "match_subject_id": subject_id, "match_count": match_count},
    ).execute()
    chunks = result.data or []
    return "\n\n---\n\n".join(c["content"] for c in chunks)


def evaluate_one_answer(question_text: str, marks: int, rubric: dict | None, ocr_text: str, subject_id: str) -> dict:
    context = retrieve_context(subject_id, question_text)
    rubric_section = f"\nMarking rubric: {json.dumps(rubric)}" if rubric else ""

    prompt = f"""Evaluate this student's answer against the course material and rubric.

Question ({marks} marks): {question_text}{rubric_section}

Relevant course material:
{context}

Student's answer (OCR-extracted):
{ocr_text}

Return ONLY a JSON object with "suggested_marks" (number), "confidence" (0-1),
"evidence" (string), "flagged_for_review" (boolean). No preamble, no markdown fences.
"""
    raw = complete(prompt, max_tokens=1024)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"suggested_marks": None, "confidence": 0, "evidence": raw, "flagged_for_review": True, "parse_error": True}


@router.post("/process-submission")
async def process_submission(payload: ProcessSubmissionRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    answers_result = supabase.table("answers").select(
        "id, ocr_text, question_id, questions(question_text, marks, rubric, exam_id, exams(subject_id))"
    ).eq("submission_id", payload.submission_id).execute()

    answers = answers_result.data or []

    if not answers:
        from app.routers.ocr import run_ocr, RunOcrRequest
        await run_ocr(RunOcrRequest(submission_id=payload.submission_id, exam_id=payload.exam_id), authorization)

        answers_result = supabase.table("answers").select(
            "id, ocr_text, question_id, questions(question_text, marks, rubric, exam_id, exams(subject_id))"
        ).eq("submission_id", payload.submission_id).execute()
        answers = answers_result.data or []

        if not answers:
            return {"status": "no_answers_found", "message": "OCR ran but produced no answers rows."}

    results = []
    for ans in answers:
        question = ans["questions"]
        subject_id = question["exams"]["subject_id"]

        evaluation = evaluate_one_answer(
            question_text=question["question_text"],
            marks=question["marks"],
            rubric=question.get("rubric"),
            ocr_text=ans["ocr_text"] or "",
            subject_id=subject_id,
        )

        supabase.table("evaluations").insert({
            "answer_id": ans["id"],
            "ai_suggested_marks": evaluation.get("suggested_marks"),
            "ai_confidence": evaluation.get("confidence"),
            "ai_evidence": evaluation,
        }).execute()

        results.append({"answer_id": ans["id"], **evaluation})

    supabase.table("answer_submissions").update({"status": "evaluated"}).eq("id", payload.submission_id).execute()

    return {"status": "ok", "results": results}