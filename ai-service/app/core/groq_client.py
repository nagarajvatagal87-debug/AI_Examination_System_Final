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

    response = client.chat.completions.create(
        model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        messages=messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content