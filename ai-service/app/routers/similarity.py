from fastapi import APIRouter, Header
from pydantic import BaseModel
import numpy as np

from app.core.embeddings import embed_batch
from app.core.supabase_client import get_supabase
from app.core.security import verify_shared_secret

router = APIRouter()
SIMILARITY_THRESHOLD = 0.85


class SimilarityCheckRequest(BaseModel):
    exam_id: str


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


@router.post("/check-similarity")
async def check_similarity(payload: SimilarityCheckRequest, authorization: str = Header(None)):
    await verify_shared_secret(authorization)

    supabase = get_supabase()

    answers_result = supabase.table("answers").select(
        "id, ocr_text, question_id, submission_id, answer_submissions(student_id)"
    ).execute()

    submissions = supabase.table("answer_submissions").select("id, student_id").eq("exam_id", payload.exam_id).execute()
    submission_ids = {s["id"] for s in submissions.data or []}

    answers = [a for a in (answers_result.data or []) if a["submission_id"] in submission_ids]

    by_question: dict[str, list[dict]] = {}
    for a in answers:
        by_question.setdefault(a["question_id"], []).append(a)

    flagged_pairs = []

    for question_id, question_answers in by_question.items():
        if len(question_answers) < 2:
            continue

        texts = [a["ocr_text"] or "" for a in question_answers]
        embeddings = embed_batch(texts)

        for i in range(len(question_answers)):
            for j in range(i + 1, len(question_answers)):
                if not texts[i].strip() or not texts[j].strip():
                    continue
                sim = cosine_similarity(embeddings[i], embeddings[j])
                if sim >= SIMILARITY_THRESHOLD:
                    flagged_pairs.append({
                        "question_id": question_id,
                        "answer_id_1": question_answers[i]["id"],
                        "student_id_1": question_answers[i]["answer_submissions"]["student_id"],
                        "answer_id_2": question_answers[j]["id"],
                        "student_id_2": question_answers[j]["answer_submissions"]["student_id"],
                        "similarity": round(sim, 3),
                    })

    return {"exam_id": payload.exam_id, "flagged_pairs": flagged_pairs, "threshold_used": SIMILARITY_THRESHOLD}