
import io
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader

from app.core.embeddings import embed_batch
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret


router = APIRouter()
logger = logging.getLogger(__name__)

STORAGE_BUCKET = "exam-files"


class IngestRequest(BaseModel):
    course_material_id: str
    subject_id: str
    file_path: str


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 100,
) -> list[str]:
    """Split text into overlapping chunks."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size."
        )

    cleaned_text = " ".join(text.split())

    if not cleaned_text:
        return []

    chunks = []
    start = 0
    step = chunk_size - overlap

    while start < len(cleaned_text):
        chunk = cleaned_text[start:start + chunk_size].strip()

        if chunk:
            chunks.append(chunk)

        start += step

    return chunks


@router.post("/ingest-course-material")
async def ingest_course_material(
    payload: IngestRequest,
    authorization: str | None = Header(default=None),
):
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    try:
        # 1. Verify that the course material exists.
        material_result = (
            supabase.table("course_materials")
            .select("id, subject_id, file_path")
            .eq("id", payload.course_material_id)
            .maybe_single()
            .execute()
        )

        material = material_result.data

        if not material:
            raise HTTPException(
                status_code=404,
                detail="Course material not found.",
            )

        # 2. Validate the requested subject.
        if str(material["subject_id"]) != str(payload.subject_id):
            raise HTTPException(
                status_code=400,
                detail="Subject does not match the course material.",
            )

        # 3. Download the file from Supabase Storage.
        # This assumes the path supplied by the caller is the
        # path used to store the course PDF in exam-files.
        pdf_bytes = (
            supabase.storage
            .from_(STORAGE_BUCKET)
            .download(payload.file_path)
        )

        if not pdf_bytes:
            raise HTTPException(
                status_code=422,
                detail="The course PDF is empty.",
            )

        # 4. Extract text page by page.
        reader = PdfReader(io.BytesIO(pdf_bytes))

        all_chunks = []
        global_chunk_index = 0

        for page_index, page in enumerate(reader.pages):
            page_number = page_index + 1
            page_text = page.extract_text() or ""

            if not page_text.strip():
                continue

            page_chunks = chunk_text(page_text)

            for chunk in page_chunks:
                all_chunks.append({
                    "chunk_index": global_chunk_index,
                    "page_number": page_number,
                    "content": chunk,
                })

                global_chunk_index += 1

        if not all_chunks:
            (
                supabase.table("course_materials")
                .update({
                    "processed": False,
                    "ingestion_status": "FAILED",
                })
                .eq("id", payload.course_material_id)
                .execute()
            )

            raise HTTPException(
                status_code=422,
                detail=(
                    "No extractable text was found in this PDF. "
                    "Scanned PDFs require an OCR ingestion workflow."
                ),
            )

        # 5. Generate embeddings with the shared embedding model.
        texts = [chunk["content"] for chunk in all_chunks]
        embeddings = embed_batch(texts)

        if len(embeddings) != len(all_chunks):
            raise RuntimeError(
                "Embedding count does not match the number of chunks."
            )

        for embedding in embeddings:
            if len(embedding) != 1536:
                raise RuntimeError(
                    "Expected 1536-dimensional embeddings. "
                    "Check the embedding model and database vector schema."
                )

        rows = [
            {
                "course_material_id": payload.course_material_id,
                "subject_id": payload.subject_id,
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk["page_number"],
                "content": chunk["content"],
                "embedding": embedding,
            }
            for chunk, embedding in zip(all_chunks, embeddings)
        ]

        # 6. Remove stale chunks from previous indexing.
        # Re-indexing replaces the material's old chunks.
        (
            supabase.table("course_chunks")
            .delete()
            .eq("course_material_id", payload.course_material_id)
            .execute()
        )

        # 7. Insert the newly generated chunks.
        (
            supabase.table("course_chunks")
            .insert(rows)
            .execute()
        )

        # 8. Mark ingestion complete only after insertion succeeds.
        (
            supabase.table("course_materials")
            .update({
                "processed": True,
                "ingestion_status": "INDEXED",
            })
            .eq("id", payload.course_material_id)
            .execute()
        )

        return {
            "status": "ok",
            "course_material_id": payload.course_material_id,
            "chunks_created": len(rows),
            "embedding_dimensions": 1536,
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Course material ingestion failed for %s",
            payload.course_material_id,
        )

        try:
            (
                supabase.table("course_materials")
                .update({
                    "processed": False,
                    "ingestion_status": "FAILED",
                })
                .eq("id", payload.course_material_id)
                .execute()
            )
        except Exception:
            logger.exception(
                "Could not update course-material failure status."
            )

        raise HTTPException(
            status_code=500,
            detail=(
                "Course material ingestion failed. "
                "Check the AI-service logs."
            ),
        )
