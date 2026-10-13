
import io
import json
import os

import fitz
from google.cloud import vision
from google.oauth2 import service_account
from PIL import Image, UnidentifiedImageError


_vision_client: vision.ImageAnnotatorClient | None = None


def get_vision_client() -> vision.ImageAnnotatorClient:
    """Create and cache the Google Cloud Vision client."""
    global _vision_client

    if _vision_client is None:
        credentials_json = os.environ.get(
            "GCP_VISION_CREDENTIALS_JSON"
        )

        if credentials_json:
            try:
                credentials_info = json.loads(credentials_json)

                credentials = (
                    service_account.Credentials.from_service_account_info(
                        credentials_info
                    )
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
            credentials_path = os.environ.get(
                "GOOGLE_APPLICATION_CREDENTIALS"
            )

            if (
                not credentials_path
                or not os.path.isfile(credentials_path)
            ):
                raise RuntimeError(
                    "Google Vision credentials are missing. Configure "
                    "GCP_VISION_CREDENTIALS_JSON on Render or "
                    "GOOGLE_APPLICATION_CREDENTIALS locally."
                )

            credentials = (
                service_account.Credentials.from_service_account_file(
                    credentials_path
                )
            )

            _vision_client = vision.ImageAnnotatorClient(
                credentials=credentials
            )

    return _vision_client


def pdf_to_images(
    pdf_bytes: bytes,
    dpi: int = 200,
) -> list[Image.Image]:
    """Convert PDF pages into PIL images."""
    if not pdf_bytes:
        raise ValueError("The supplied PDF is empty.")

    if dpi < 72 or dpi > 400:
        raise ValueError("DPI must be between 72 and 400.")

    images: list[Image.Image] = []

    try:
        with fitz.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as document:
            if document.page_count == 0:
                raise ValueError("The PDF contains no pages.")

            zoom = dpi / 72
            matrix = fitz.Matrix(zoom, zoom)

            for page in document:
                pixmap = page.get_pixmap(
                    matrix=matrix,
                    alpha=False,
                )

                with Image.open(
                    io.BytesIO(pixmap.tobytes("png"))
                ) as image:
                    image.load()
                    images.append(image.copy())

    except (fitz.FileDataError, fitz.EmptyFileError) as exc:
        raise ValueError(
            "The uploaded file is not a valid readable PDF."
        ) from exc

    if not images:
        raise ValueError("No pages could be converted from the PDF.")

    return images


def _image_to_png_bytes(image: Image.Image) -> bytes:
    """Convert an image to PNG bytes for Google Vision."""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def ocr_pdf(pdf_bytes: bytes) -> tuple[str, float]:
    """
    Extract text from a scanned PDF using Google Vision.

    Returns:
        Extracted text and average block confidence (0.0 to 1.0).
    """
    client = get_vision_client()
    images = pdf_to_images(pdf_bytes)

    text_parts: list[str] = []
    page_confidences: list[float] = []

    for page_number, image in enumerate(images, start=1):
        content = _image_to_png_bytes(image)
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
        text_parts.append(annotation.text or "")

        block_confidences = [
            block.confidence
            for page in annotation.pages
            for block in page.blocks
        ]

        if block_confidences:
            page_confidences.append(
                sum(block_confidences) / len(block_confidences)
            )

    full_text = "\n\n".join(text_parts).strip()

    average_confidence = (
        sum(page_confidences) / len(page_confidences)
        if page_confidences
        else 0.0
    )

    return full_text, average_confidence
