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

        all_page_chunks = []
        global_chunk_idx = 0

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            page_text = page.extract_text() or ""
            if not page_text.strip():
                continue

            page_chunks = chunk_text(page_text)
            for chunk_str in page_chunks:
                all_page_chunks.append({
                    "chunk_index": global_chunk_idx,
                    "page_number": page_num,
                    "content": chunk_str
                })
                global_chunk_idx += 1

        if not all_page_chunks:
            supabase.table("course_materials").update({"processed": False, "ingestion_status": "FAILED"}).eq("id", payload.course_material_id).execute()
            raise HTTPException(status_code=400, detail="No extractable text found in PDF")

        texts = [c["content"] for c in all_page_chunks]
        embeddings = embed_batch(texts)

        rows = [
            {
                "course_material_id": payload.course_material_id,
                "subject_id": payload.subject_id,
                "chunk_index": c["chunk_index"],
                "page_number": c["page_number"],
                "content": c["content"],
                "embedding": emb,
            }
            for c, emb in zip(all_page_chunks, embeddings)
        ]

        supabase.table("course_chunks").insert(rows).execute()
        supabase.table("course_materials").update({"processed": True, "ingestion_status": "INDEXED"}).eq("id", payload.course_material_id).execute()

        return {"status": "ok", "chunks_created": len(rows)}
    except HTTPException:
        raise
    except Exception as e:
        try:
            supabase.table("course_materials").update({"processed": False, "ingestion_status": "FAILED"}).eq("id", payload.course_material_id).execute()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))