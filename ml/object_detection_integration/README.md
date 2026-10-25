# Object Detection — Future Integration Point

## Purpose
This module provides a clean, modular abstraction to plug in a real computer-vision object detection model (such as YOLOv8, YOLOv9, or Faster R-CNN) to detect hardware components, phone models, screen cracks, or accessories from listing photos.

## Interface Architecture
- `ObjectDetectionAdapter`: Abstract base class specifying `detect_objects(image_bytes)` and `is_available()`.
- `ObjectDetectionService`: Central registry and normalized inference pipeline.
- `NullObjectDetectionAdapter`: Default fallback that honestly reports `model_status: "not_configured"`.

## How to Register a Real Model
1. Subclass `ObjectDetectionAdapter`.
2. Implement `detect_objects(self, image_bytes)` to return a list of `DetectedObject(label=..., confidence=..., bounding_box=BoundingBox(...))`.
3. Call `ObjectDetectionService.register_adapter(MyCustomYoloAdapter())` during application startup.

## Zero Fabrication Policy
Per the ReValue specification, this module strictly returns zero detections and `model_status: "not_configured"` until a genuine model adapter is mounted. It will never generate fake bounding boxes.
