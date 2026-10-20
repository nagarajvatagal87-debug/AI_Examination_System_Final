import os
from groq import Groq

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Copy ai-service/.env.example to .env "
                "and add your key from https://console.groq.com/keys"
            )
        _client = Groq(api_key=api_key)
    return _client


def complete(prompt: str, system: str | None = None, max_tokens: int = 2048) -> str:
    """
    Sends a single user-turn prompt to Groq and returns the text response.
    Every agent (question generation, evaluation, chatbot...) builds its own
    prompt and calls this — keeps the API call and model name in one place.
    """
    client = get_client()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    models_to_try = [
        os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b"),
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b"
    ]
    # Remove duplicates while preserving order
    unique_models = list(dict.fromkeys(models_to_try))

    last_error = None
    for model_id in unique_models:
        try:
            response = client.chat.completions.create(
                model=model_id,
                messages=messages,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            continue

    raise RuntimeError(f"All Groq models failed. Last error: {last_error}")