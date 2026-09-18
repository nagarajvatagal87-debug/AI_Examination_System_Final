import json
from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()


class InsightRequest(BaseModel):
    student_id: str
    subject_id: str | None = None


@router.post("/insights")
async def get_insights(payload: InsightRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    submissions = supabase.table("answer_submissions").select("id").eq(
        "student_id", payload.student_id
    ).execute().data or []
    submission_ids = [s["id"] for s in submissions]

    if not submission_ids:
        return {"status": "no_data", "strong_topics": [], "weak_topics": []}

    answers = supabase.table("answers").select(
        "id, question_id, submission_id, questions(unit, marks, question_text, exam_id, exams(subject_id))"
    ).in_("submission_id", submission_ids).execute().data or []

    if payload.subject_id:
        answers = [a for a in answers if a.get("questions", {}).get("exams", {}).get("subject_id") == payload.subject_id]

    if not answers:
        return {"status": "no_data", "strong_topics": [], "weak_topics": []}

    answer_ids = [a["id"] for a in answers]

    evaluations = supabase.table("evaluations").select(
        "answer_id, final_marks"
    ).in_("answer_id", answer_ids).not_.is_("final_marks", "null").execute().data or []

    eval_by_answer = {e["answer_id"]: e["final_marks"] for e in evaluations}

    relevant = []
    for a in answers:
        if a["id"] not in eval_by_answer:
            continue
        q = a.get("questions", {})
        relevant.append({
            "unit": q.get("unit"),
            "question_text": q.get("question_text"),
            "marks": q.get("marks"),
            "final_marks": eval_by_answer[a["id"]],
        })

    if not relevant:
        return {"status": "no_data", "strong_topics": [], "weak_topics": []}

    prompt = f"""Given this student's per-question performance:
{json.dumps(relevant)}

Identify strong and weak topics/units. Return ONLY a JSON object with
"strong_topics" (array) and "weak_topics" (array). No preamble, no markdown fences.
"""

    raw = complete(prompt, max_tokens=512)
    try:
        insights = json.loads(raw)
    except json.JSONDecodeError:
        return {"status": "parse_error", "raw_response": raw}

    supabase.table("student_insights").upsert({
        "student_id": payload.student_id,
        "subject_id": payload.subject_id,
        "strong_topics": insights.get("strong_topics", []),
        "weak_topics": insights.get("weak_topics", []),
    }).execute()

    return {"status": "ok", **insights}