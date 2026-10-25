from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class PriceEstimateRequest(BaseModel):
    category: str = "smartphone"
    brand: str
    model: str
    approximate_age_months: int = Field(default=12, ge=0)
    condition: str = Field(default="good")
    storage_gb: Optional[int] = Field(default=128, ge=8)
    ram_gb: Optional[int] = Field(default=6, ge=1)
    original_retail_price: Optional[float] = Field(default=None, gt=0)
    battery_health_percent: Optional[int] = Field(default=85, ge=10, le=100)
    # Additional features for MindValue 17-feature Random Forest model
    os: Optional[str] = None
    days_used: Optional[int] = None
    battery_mah: Optional[int] = None
    display_size_inches: Optional[float] = None
    refresh_rate_hz: Optional[int] = None
    has_5g: Optional[bool] = None
    screen_crack: Optional[str] = None
    scratches: Optional[str] = None
    repair_history: Optional[str] = None
    warranty_available: Optional[str] = None


class CatalogueResponse(BaseModel):
    brands: List[str]
    total_brands: int
    models_by_brand: Optional[Dict[str, List[str]]] = None


class PriceEstimateResponse(BaseModel):
    estimated_price: float
    price_range_low: float
    price_range_high: float
    currency: str = "INR"
    model_version: str
    dataset_version: str
    features_used: List[str]
    is_model_available: bool = True
    prediction_timestamp: datetime
    explanation: str


class MobileConditionResponse(BaseModel):
    predicted_condition: Optional[str] = None  # "excellent", "good", "bad", "defective", or None if unavailable
    confidence_score: Optional[float] = None
    class_probabilities: Dict[str, float] = {}
    model_version: str = "mobilenet_v2_1.0"
    is_model_available: bool = False
    status: str = "model_unavailable"  # "ok", "model_unavailable", "class_mismatch"
    error_message: Optional[str] = None
    disclaimer: str
    evaluated_at: datetime


class RecommendationItem(BaseModel):
    product_id: str
    title: str
    brand: str
    model: str
    asking_price: float
    condition: str
    image_url: Optional[str] = None
    similarity_score: float
    recommendation_reason: str
    is_personalized: bool


class RecommendationResponse(BaseModel):
    items: List[RecommendationItem]
    total: int
    algorithm_version: str
    is_personalized: bool


class BoundingBox(BaseModel):
    ymin: float
    xmin: float
    ymax: float
    xmax: float


class DetectedObject(BaseModel):
    label: str
    confidence: float
    bounding_box: BoundingBox


class ObjectDetectionResponse(BaseModel):
    detected_objects: List[DetectedObject]
    model_status: str  # "not_configured", "available", "error"
    message: str
