import io
from typing import Tuple
from PIL import Image, UnidentifiedImageError
import numpy as np


TARGET_SIZE: Tuple[int, int] = (224, 224)
MAX_IMAGE_BYTES: int = 5 * 1024 * 1024  # 5 MB


def preprocess_image_bytes(image_bytes: bytes) -> np.ndarray:
    """
    Safely decodes and preprocesses raw image bytes for MobileNetV2.
    Validates size, format, and converts to (1, 224, 224, 3) float32 array.
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Image file is empty (0 bytes).")

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"Image file exceeds maximum allowable size of {MAX_IMAGE_BYTES // (1024 * 1024)}MB.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()  # Check file header integrity
        # Reopen after verify() as per PIL documentation
        image = Image.open(io.BytesIO(image_bytes))
    except (UnidentifiedImageError, OSError, Exception) as e:
        raise ValueError(f"Corrupt or unsupported image format: {str(e)}")

    if image.format not in ["JPEG", "PNG", "WEBP"]:
        raise ValueError(f"Unsupported image format: {image.format}. Only JPEG, PNG, and WebP are accepted.")

    # Convert to RGB (handles RGBA, grayscale, CMYK)
    if image.mode != "RGB":
        image = image.convert("RGB")

    image = image.resize(TARGET_SIZE, Image.Resampling.BILINEAR)
    img_array = np.array(image, dtype=np.float32)

    # MobileNetV2 standard normalization: scale pixels from [0, 255] to [-1, 1]
    img_array = (img_array / 127.5) - 1.0

    # Expand batch dimension -> (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array
