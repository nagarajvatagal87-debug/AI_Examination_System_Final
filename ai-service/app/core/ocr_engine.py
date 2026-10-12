
import io
import json
import os

from google.cloud import vision
from google.oauth2 import service_account
from PIL import Image
import fitz  # PyMuPDF


_vision_client: vision.ImageAnnotatorClient | None = None


def get_vision_client() -> vision.ImageAnnotatorClient:
    """Create and cache the Google Cloud Vision client."""
    global _vision_client

    if _vision_client is None:
        credentials_json = os.environ.get(
            "GCP_VISION_CREDENTIALS_JSON"
        )

        if credentials_json:
            # Render: load credentials from a JSON environment variable.
            try:
                credentials_info = json.loads(credentials_json)

                credentials = (
                    service_account.Credentials
                    .from_service_account_info(credentials_info)
                )
            except (json.JSONDecodeError, ValueError) as exc:
                raise RuntimeError(
                    "GCP_VISION_CREDENTIALS_JSON is not valid "
                    "service-account JSON."
                ) from exc

            _vision_client = vision.ImageAnnotatorClient(
                credentials=credentials
            )

        else:
            # Local development: load credentials from a JSON file.
            cred_path = os.environ.get(
                "GOOGLE_APPLICATION_CREDENTIALS"
            )

            if not cred_path or not os.path.isfile(cred_path):
                raise RuntimeError(
                    "Google Vision credentials are missing. Set "
                    "GCP_VISION_CREDENTIALS_JSON on Render, or set "
                    "GOOGLE_APPLICATION_CREDENTIALS to the path "
                    "of your local service-account JSON file."
                )

            credentials = (
                service_account.Credentials
                .from_service_account_file(cred_path)
            )

            _vision_client = vision.ImageAnnotatorClient(
                credentials=credentials
            )

    return _vision_client


def pdf_to_images(
    pdf_bytes: bytes,
    dpi: int = 200
) -> list[Image.Image]:
    """Convert every PDF page into a PIL image."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    images = []
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)

    try:
        for page in doc:
            pix = page.get_pixmap(
                matrix=matrix,
                alpha=False
            )

            img = Image.open(
                io.BytesIO(pix.tobytes("png"))
            )

            # Ensure the image is fully loaded before the PDF closes.
            img.load()
            images.append(img.copy())

    finally:
        doc.close()

    return images


def _image_to_png_bytes(img: Image.Image) -> bytes:
    """Convert a PIL image into PNG bytes."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def ocr_pdf(pdf_bytes: bytes) -> tuple[str, float]:
    """
    Extract text from a scanned answer-sheet PDF using Google Cloud
    Vision document_text_detection.

    Returns:
        tuple[str, float]: Extracted text and average block confidence.
    """
    client = get_vision_client()
    images = pdf_to_images(pdf_bytes)

    full_text_parts = []
    page_confidences = []

    for page_number, img in enumerate(images, start=1):
        content = _image_to_png_bytes(img)
        vision_image = vision.Image(content=content)

        response = client.document_text_detection(
            image=vision_image
        )

        if response.error.message:
            raise RuntimeError(
                f"Google Vision error on page {page_number}: "
                f"{response.error.message}"
            )

        annotation = response.full_text_annotation
        full_text_parts.append(annotation.text or "")

        block_confidences = [
            block.confidence
            for page in annotation.pages
            for block in page.blocks
        ]

        if block_confidences:
            page_confidences.append(
                sum(block_confidences) / len(block_confidences)
            )

    full_text = "\n\n".join(full_text_parts).strip()

    avg_confidence = (
        sum(page_confidences) / len(page_confidences)
        if page_confidences
        else 0.0
    )

    return full_text, avg_confidence
