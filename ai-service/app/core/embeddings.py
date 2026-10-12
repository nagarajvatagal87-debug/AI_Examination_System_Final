
import os
from openai import OpenAI

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client

    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        _client = OpenAI(api_key=api_key)

    return _client


def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    response = get_client().embeddings.create(
        model="text-embedding-3-small",
        input=texts,
        dimensions=1536,
    )

    return [
        item.embedding
        for item in sorted(response.data, key=lambda item: item.index)
    ]


def embed(text: str) -> list[float]:
    return embed_batch([text])[0]
