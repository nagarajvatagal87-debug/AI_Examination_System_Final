from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        # 384-dim by default — NOTE: your Supabase schema defines
        # course_chunks.embedding as vector(1536). Either switch the model to one
        # with 1536 dims, or alter the column to vector(384). Flagging this now
        # so it doesn't silently fail on the first insert.
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed(text: str) -> list[float]:
    model = get_model()
    return model.encode(text).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = get_model()
    return model.encode(texts).tolist()