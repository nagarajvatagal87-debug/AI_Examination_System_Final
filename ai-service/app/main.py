from fastapi import FastAPI, Header, HTTPException
import os
from app.routers import ingestion, question_generation, answer_evaluation, chatbot, insights, ocr, public_chat, similarity

app = FastAPI(title="Exam AI Platform - AI Service", version="0.0.1")


async def verify_shared_secret(authorization: str = Header(None)):
    expected = os.environ.get("GENAI_SERVICE_API_KEY")
    if not authorization or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid or missing service credentials")


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(ingestion.router, prefix="/agents", tags=["ingestion"])
app.include_router(question_generation.router, prefix="/agents", tags=["question-generation"])
app.include_router(answer_evaluation.router, prefix="/agents", tags=["answer-evaluation"])
app.include_router(chatbot.router, prefix="/agents", tags=["chatbot"])
app.include_router(insights.router, prefix="/agents", tags=["insights"])
app.include_router(ocr.router, prefix="/agents", tags=["ocr"])
app.include_router(public_chat.router, prefix="/agents", tags=["public-chat"])
app.include_router(similarity.router, prefix="/agents", tags=["similarity"])