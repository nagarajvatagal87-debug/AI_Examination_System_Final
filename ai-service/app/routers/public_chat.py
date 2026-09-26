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
    try:
        supabase = get_supabase()
        college_rows = supabase.table("college_info").select("section, content").execute().data or []
        college_info = {row["section"]: row["content"] for row in college_rows}

        dept_rows = supabase.table("department_public_info").select(
            "about, student_count, courses, fees, placement_percentage, "
            "highest_package, average_package, achievements, facilities, departments(name)"
        ).eq("published", True).execute().data or []

        return {
            "institution": "Dayananda Sagar Academy of Technology and Management (DSATM)",
            "college_info": college_info,
            "departments": dept_rows
        }
    except Exception as e:
        print(f"Error fetching public RAG context: {e}")
        return {"college_info": {}, "departments": []}


@router.post("/public-chat")
async def public_chat(payload: PublicChatRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    data = fetch_public_data()

    system_prompt = """You are the official Public AI Assistant for Dayananda Sagar Academy of Technology and Management (DSATM).
Your job is to answer prospective students, parents, and visitors accurately using ONLY the published RAG college and department data provided.
- Always use the exact placement percentages, fee structures, highest/average packages, and course names from the context.
- Never invent numbers or hallucinate facts not in the published data.
- If asked about something private (individual student marks, private phone numbers), politely explain that private records are protected.
- Maintain a warm, welcoming, and professional tone."""

    history_lines = []
    if payload.history:
        for item in payload.history[-6:]:
            role = item.get("role") or item.get("sender") or "user"
            content = item.get("content") or item.get("text") or ""
            if content.strip():
                history_lines.append(f"{role.capitalize()}: {content.strip()}")

    history_text = "\n".join(history_lines)
    conversation_section = f"\nPREVIOUS CONVERSATION MEMORY:\n{history_text}\n" if history_text else ""

    prompt = f"""GROUNDED RAG KNOWLEDGE BASE:
{json.dumps(data, default=str, indent=2)}

{conversation_section}
USER QUESTION: {payload.question}
"""

    answer = complete(prompt, system=system_prompt, max_tokens=800)
    return {"answer": answer}