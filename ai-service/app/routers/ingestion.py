from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
import io

from app.core.embeddings import embed_batch
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()

STORAGE_BUCKET = "exam-files"


class IngestRequest(BaseModel):
    course_material_id: str
    subject_id: str
    file_path: str


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return [c.strip() for c in chunks if c.strip()]


@router.post("/ingest-course-material")
async def ingest_course_material(payload: IngestRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)
    try:
        supabase = get_supabase()
        pdf_bytes = supabase.storage.from_(STORAGE_BUCKET).download(payload.file_path)
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = "".join(page.extract_text() or "" for page in reader.pages)

        if not full_text.strip():
            raise HTTPException(status_code=400, detail="No extractable text found in PDF")

        chunks = chunk_text(full_text)
        embeddings = embed_batch(chunks)

        rows = [
            {
                "course_material_id": payload.course_material_id,
                "subject_id": payload.subject_id,
                "chunk_index": i,
                "content": chunk,
                "embedding": embedding,
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        supabase.table("course_chunks").insert(rows).execute()
        supabase.table("course_materials").update({"processed": True}).eq("id", payload.course_material_id).execute()

        return {"status": "ok", "chunks_created": len(rows)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))