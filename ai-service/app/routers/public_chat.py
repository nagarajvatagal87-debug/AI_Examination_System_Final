import json
from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()


class PublicChatRequest(BaseModel):
    question: str
    history: list[dict] = []


def fetch_public_data() -> dict:
    supabase = get_supabase()
    college_rows = supabase.table("college_info").select("section, content").execute().data or []
    college_info = {row["section"]: row["content"] for row in college_rows}

    dept_rows = supabase.table("department_public_info").select(
        "about, student_count, courses, fees, placement_percentage, "
        "highest_package, average_package, achievements, facilities, departments(name)"
    ).eq("published", True).execute().data or []

    return {"college_info": college_info, "departments": dept_rows}


@router.post("/public-chat")
async def public_chat(payload: PublicChatRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    data = fetch_public_data()

    if not data["departments"] and not data["college_info"]:
        return {"answer": "I don't have any published college information available yet."}

    system_prompt = """You are the College AI Assistant. Answer ONLY using the published
college/department data provided. Never invent numbers. If asked about something not
covered (individual marks, private contacts), politely say you don't share that."""

    history_lines = [f"{h['role']}: {h['content']}" for h in payload.history[-6:]]
    history_text = "\n".join(history_lines)

    conversation_section = ""
    if history_text:
        conversation_section = "CONVERSATION SO FAR:\n" + history_text + "\n"

    prompt = f"""PUBLISHED COLLEGE DATA:
{json.dumps(data, default=str)}

{conversation_section}
QUESTION: {payload.question}
"""

    answer = complete(prompt, system=system_prompt, max_tokens=800)
    return {"answer": answer}