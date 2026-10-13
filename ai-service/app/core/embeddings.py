
import os
from openai import OpenAI

_client: OpenAI | None = None

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


def get_client() -> OpenAI:
    global _client

    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not configured in the AI service environment."
            )

        _client = OpenAI(api_key=api_key)

    return _client


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings using the configured OpenAI embedding model."""
    if not texts:
        return []

    normalized_texts = [
        text.strip() if isinstance(text, str) else ""
        for text in texts
    ]

    if any(not text for text in normalized_texts):
        raise ValueError("Embedding input cannot contain blank text.")

    response = get_client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=normalized_texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )

    return [
        item.embedding
        for item in sorted(response.data, key=lambda item: item.index)
    ]


def embed(text: str) -> list[float]:
    """Generate a single embedding vector."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Embedding input must be a non-empty string.")

    return embed_batch([text])[0]
