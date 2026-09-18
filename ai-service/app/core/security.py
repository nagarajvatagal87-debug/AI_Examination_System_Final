import os
from fastapi import Header, HTTPException


async def verify_shared_secret(authorization: str = Header(None)):
    """
    Every route in this service is internal-only — called by the Node backend,
    never directly by a browser. This checks the shared secret Node sends,
    matching GENAI_SERVICE_API_KEY in both backend/.env and ai-service/.env.
    """
    expected = os.environ.get("GENAI_SERVICE_API_KEY")
    if not authorization or authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid or missing service credentials")