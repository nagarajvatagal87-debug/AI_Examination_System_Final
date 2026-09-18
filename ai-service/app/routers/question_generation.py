import json
from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.embeddings import embed
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()


class QuestionGenerationRequest(BaseModel):
    exam_id: str
    subject_id: str
    exam_type: str
    total_marks: int
    instructions: str | None = None  # teacher's custom focus, e.g. "concentrate on normalization"


def retrieve_context(subject_id: str, query: str, match_count: int = 8) -> str:
    supabase = get_supabase()
    query_embedding = embed(query)
    result = supabase.rpc(
        "match_course_chunks",
        {"query_embedding": query_embedding, "match_subject_id": subject_id, "match_count": match_count},
    ).execute()
    chunks = result.data or []
    return "\n\n---\n\n".join(c["content"] for c in chunks)


def quality_check(questions: list[dict], total_marks: int) -> dict:
    prompt = f"""Review this set of exam questions for quality issues.

QUESTIONS:
{json.dumps(questions)}

Target total marks: {total_marks}

Check for:
1. Duplicate or near-duplicate questions
2. Ambiguous wording
3. Marks distribution matching target and spread across topics

Return ONLY a JSON object with "issues" (array of strings), "actual_total_marks" (number),
"approved" (boolean - false only if duplicates/ambiguity found). No preamble, no markdown fences.
"""
    raw = complete(prompt, max_tokens=800)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"issues": ["Quality check could not be parsed"], "actual_total_marks": None, "approved": False}


@router.post("/question-generation")
async def generate_questions(payload: QuestionGenerationRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    context = retrieve_context(payload.subject_id, payload.instructions or "important topics and key concepts")

    if not context.strip():
        return {
            "status": "no_course_material",
            "message": "No processed course material found for this subject yet.",
        }

    instructions_section = f"\nTeacher's focus instructions: {payload.instructions}" if payload.instructions else ""

    prompt = f"""You are generating exam questions for a {payload.exam_type} examination.
Total marks: {payload.total_marks}.{instructions_section}

Base every question strictly on the course material below.

COURSE MATERIAL:
{context}

Return ONLY a JSON array of objects, each with "text", "marks" (integer), "unit" (short label).
No preamble, no markdown fences.
"""
    raw = complete(prompt, max_tokens=2048)

    try:
        questions = json.loads(raw)
    except json.JSONDecodeError:
        return {"status": "parse_error", "raw_response": raw}

    quality = quality_check(questions, payload.total_marks)

    supabase = get_supabase()
    rows = [
        {
            "exam_id": payload.exam_id,
            "question_no": i + 1,
            "unit": q.get("unit"),
            "marks": q.get("marks"),
            "question_text": q.get("text"),
        }
        for i, q in enumerate(questions)
    ]
    supabase.table("questions").insert(rows).execute()

    return {"status": "ok", "questions": questions, "quality_check": quality}