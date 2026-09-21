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
    document_id: str | None = None
    page_number: int | None = None
    history: list[dict] = []


def retrieve_context(subject_id: str, query: str, document_id: str | None = None, match_count: int = 6) -> list[dict]:
    supabase = get_supabase()
    query_embedding = embed(query)

    params = {
        "query_embedding": query_embedding,
        "match_subject_id": subject_id,
        "match_count": match_count
    }
    if document_id:
        params["match_document_id"] = document_id

    try:
        result = supabase.rpc("match_course_chunks", params).execute()
        data = result.data or []
        if document_id and data:
            data = [c for c in data if str(c.get("course_material_id")) == str(document_id)]
        return data
    except Exception:
        # Fallback query if RPC does not accept match_document_id param
        q = supabase.table("course_chunks").select("*").eq("subject_id", subject_id)
        if document_id:
            q = q.eq("course_material_id", document_id)
        res = q.limit(match_count).execute()
        return res.data or []


@router.post("/chat")
async def chat(payload: ChatRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    chunks = retrieve_context(payload.subject_id, payload.question, payload.document_id)

    if not chunks:
        return {
            "answer": "I couldn't find this information in the selected course material.",
            "sources": [],
            "grounded": False,
            "confidence": 0.0
        }

    context = "\n\n---\n\n".join(f"[Page {c.get('page_number', 1)}]: {c['content']}" for c in chunks)

    system_prompt = """You are an AI Study Assistant inside a college LMS.
Your primary knowledge source is the selected course document provided in the retrieved context.

Answer the student's question using ONLY the retrieved course material whenever the question is about the course/document.
Do not invent facts, definitions, formulas, examples, page numbers or claims that are not supported by the retrieved material.
If the retrieved material does not contain enough information to answer the question, clearly say:
"I couldn't find this information in the selected course material."

Explain concepts clearly and in a student-friendly manner. Mention page numbers if available in retrieved context."""

    history_lines = [f"{h['role']}: {h['content']}" for h in payload.history[-6:]]
    history_text = "\n".join(history_lines)

    conversation_section = ""
    if history_text:
        conversation_section = "CONVERSATION HISTORY:\n" + history_text + "\n"

    page_ctx = f" (Current Page: {payload.page_number})" if payload.page_number else ""

    prompt = f"""RETRIEVED COURSE MATERIAL CHUNKS:
{context}

{conversation_section}
STUDENT QUESTION{page_ctx}: {payload.question}
"""

    answer = complete(prompt, system=system_prompt, max_tokens=1024)

    sources = [
        {
            "documentId": c.get("course_material_id", payload.document_id),
            "page": c.get("page_number", 1),
            "chunkIndex": c.get("chunk_index", 0)
        }
        for c in chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
        "grounded": "couldn't find" not in answer.lower(),
        "confidence": 0.92
    }