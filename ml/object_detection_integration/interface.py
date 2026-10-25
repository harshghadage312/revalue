from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.schemas.ml import ObjectDetectionResponse, DetectedObject, BoundingBox


class ObjectDetectionAdapter(ABC):
    """
    Abstract adapter for future object detection integrations (e.g. YOLOv8, Faster R-CNN).
    Accepts raw image bytes or decoded image and returns normalized detection results.
    """
    @abstractmethod
    def detect_objects(self, image_bytes: bytes) -> List[DetectedObject]:
        """Runs inference and returns normalized detected objects with bounding boxes."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the underlying model weights and dependencies are loaded."""
        pass


class NullObjectDetectionAdapter(ObjectDetectionAdapter):
    """Default inactive adapter prior to real model attachment."""
    def detect_objects(self, image_bytes: bytes) -> List[DetectedObject]:
        return []

    def is_available(self) -> bool:
        return False


class ObjectDetectionService:
    _adapter: ObjectDetectionAdapter = NullObjectDetectionAdapter()

    @classmethod
    def register_adapter(cls, adapter: ObjectDetectionAdapter):
        """Registers a concrete trained model adapter for object detection."""
        cls._adapter = adapter

    @classmethod
    def process_image(cls, image_bytes: bytes) -> ObjectDetectionResponse:
        """
        Processes image via the registered adapter.
        Safely returns unconfigured status if no adapter has been mounted.
        Never fabricates detection boxes or synthetic predictions.
        """
        if not cls._adapter.is_available():
            return ObjectDetectionResponse(
                detected_objects=[],
                model_status="not_configured",
                message=(
                    "Object detection model is not yet registered. "
                    "The system interface is ready for a real YOLO/Faster-RCNN adapter."
                ),
            )

        try:
            detections = cls._adapter.detect_objects(image_bytes)
            return ObjectDetectionResponse(
                detected_objects=detections,
                model_status="available",
                message=f"Successfully identified {len(detections)} objects.",
            )
        except Exception as e:
            return ObjectDetectionResponse(
                detected_objects=[],
                model_status="error",
                message=f"Error running object detection adapter: {str(e)}",
            )
