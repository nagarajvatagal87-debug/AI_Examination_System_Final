import io
import os
from google.cloud import vision
from PIL import Image
import fitz  # PyMuPDF

_vision_client: vision.ImageAnnotatorClient | None = None


def get_vision_client() -> vision.ImageAnnotatorClient:
    global _vision_client
    if _vision_client is None:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path or not os.path.exists(cred_path):
            raise RuntimeError(
                "GOOGLE_APPLICATION_CREDENTIALS is not set or the file doesn't exist. "
                "Set it in .env to the path of your gcp-vision-key.json."
            )
        _vision_client = vision.ImageAnnotatorClient()
    return _vision_client


def pdf_to_images(pdf_bytes: bytes, dpi: int = 200) -> list[Image.Image]:
    """Rasterizes each page of a PDF into a PIL Image."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)
    for page in doc:
        pix = page.get_pixmap(matrix=matrix)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        images.append(img)
    return images


def _image_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def ocr_pdf(pdf_bytes: bytes) -> tuple[str, float]:
    """
    Returns (full_text, average_confidence) for a scanned answer script PDF.
    Uses Google Cloud Vision's document_text_detection — the mode built for
    dense/handwritten text, far more accurate than generic OCR on handwriting.
    """
    client = get_vision_client()
    images = pdf_to_images(pdf_bytes)

    full_text_parts = []
    page_confidences = []

    for img in images:
        content = _image_to_png_bytes(img)
        vision_image = vision.Image(content=content)
        response = client.document_text_detection(image=vision_image)

        if response.error.message:
            raise RuntimeError(f"Google Vision error: {response.error.message}")

        annotation = response.full_text_annotation
        full_text_parts.append(annotation.text)

        block_confidences = [
            block.confidence
            for page in annotation.pages
            for block in page.blocks
            if block.confidence is not None
        ]
        if block_confidences:
            page_confidences.append(sum(block_confidences) / len(block_confidences))

    full_text = "\n\n".join(full_text_parts).strip()
    avg_confidence = (sum(page_confidences) / len(page_confidences)) if page_confidences else 0.0

    return full_text, avg_confidence