from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.core.groq_client import complete
from app.core.embeddings import embed
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()


class ChatRequest(BaseModel):
    subject_id: str
    question: str
    history: list[dict] = []


def retrieve_context(subject_id: str, query: str, match_count: int = 6) -> list[dict]:
    supabase = get_supabase()
    query_embedding = embed(query)
    result = supabase.rpc(
        "match_course_chunks",
        {"query_embedding": query_embedding, "match_subject_id": subject_id, "match_count": match_count},
    ).execute()
    return result.data or []


@router.post("/chat")
async def chat(payload: ChatRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    chunks = retrieve_context(payload.subject_id, payload.question)

    if not chunks:
        return {
            "answer": "I don't have any course material loaded for this subject yet.",
            "sources": [],
        }

    context = "\n\n---\n\n".join(c["content"] for c in chunks)

    system_prompt = """You are a study assistant for students. Answer ONLY using the
course material provided below. If the material doesn't cover the question, say so
honestly instead of guessing."""

    history_lines = [f"{h['role']}: {h['content']}" for h in payload.history[-6:]]
    history_text = "\n".join(history_lines)

    conversation_section = ""
    if history_text:
        conversation_section = "CONVERSATION SO FAR:\n" + history_text + "\n"

    prompt = f"""COURSE MATERIAL:
{context}

{conversation_section}
STUDENT'S QUESTION: {payload.question}
"""

    answer = complete(prompt, system=system_prompt, max_tokens=1024)

    return {
        "answer": answer,
        "sources": [{"chunk_index": c["chunk_index"], "similarity": c["similarity"]} for c in chunks],
    }