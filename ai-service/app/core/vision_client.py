import base64
import json
import os
from groq import Groq

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set.")
        _client = Groq(api_key=api_key)
    return _client


VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")


def image_to_base64_url(image_bytes: bytes) -> str:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def analyze_page_for_diagrams(image_bytes: bytes, question_list: list[dict]) -> list[dict]:
    client = get_client()
    image_url = image_to_base64_url(image_bytes)
    question_text = "\n".join(f"Q{q['question_no']}" for q in question_list)

    prompt = f"""This is a page from a student's handwritten exam answer script.
Question numbers on this exam: {question_text}

Identify any hand-drawn diagrams/charts/figures. For each, give the likely
question_no (int), a plain-text description, and confidence (0-1).

Return ONLY a JSON array. Empty array if none found. No preamble, no markdown fences.
"""

    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        }],
        max_tokens=1024,
    )

    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []