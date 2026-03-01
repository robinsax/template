"""
Base model definitions for generative AI providers.
"""
from enum import Enum

from backend.model import EnumMixin, Model

class ImageGenSizeOption(EnumMixin, Enum):
    """
    Resolution options for image generation.
    """
    SIZE_1K = "1K"
    SIZE_2K = "2K"

class ImageGenAspectRatioOption(EnumMixin, Enum):
    """
    Aspect ratio options for image generation.
    """
    ASPECT_1_1 = "1:1"
    ASPECT_3_4 = "3:4"
    ASPECT_4_3 = "4:3"
    ASPECT_9_16 = "9:16"
    ASPECT_16_9 = "16:9"

class ImageGenMimeTypeOption(EnumMixin, Enum):
    """
    MIME type options for image generation.
    """
    JPEG = "JPEG"
    PNG = "PNG"

class ImageGenOptionsModel(Model):
    """
    Options for image generation.
    """
    image_size: ImageGenSizeOption = ImageGenSizeOption.SIZE_1K
    aspect_ratio: ImageGenAspectRatioOption = ImageGenAspectRatioOption.ASPECT_1_1
    output_mime_type: ImageGenMimeTypeOption = ImageGenMimeTypeOption.JPEG
