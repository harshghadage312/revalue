from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Query, Header
from app.schemas.ml import (
    PriceEstimateRequest, PriceEstimateResponse,
    MobileConditionResponse, RecommendationResponse, ObjectDetectionResponse,
    CatalogueResponse
)
from app.schemas.offers import NegotiationSuggestionRequest, NegotiationSuggestionResponse
from app.services.negotiation import NegotiationRuleEngine
from ml.price_prediction.predict import estimate_price
from ml.price_prediction.catalogue import SmartphoneCatalogue
from ml.mobile_condition.predict import predict_condition
from ml.recommendations.recommender import RecommendationEngine
from ml.object_detection_integration.interface import ObjectDetectionService
from app.core.security import decode_token
from app.core.errors import ValidationError

router = APIRouter(tags=["AI & Machine Learning"])


def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = decode_token(authorization.split(" ")[1])
        return payload.get("sub")
    except Exception:
        return None


@router.post("/ml/price-estimate", response_model=PriceEstimateResponse)
def get_price_estimate(req: PriceEstimateRequest):
    """
    AI Module 1: Random Forest resale price estimation.
    Returns estimated price, confidence interval, and explanation.
    """
    return estimate_price(req)


@router.get("/ml/catalogue", response_model=CatalogueResponse)
def get_catalogue():
    """
    Returns supported smartphone brands and catalogue overview.
    """
    brands = SmartphoneCatalogue.get_supported_brands()
    return CatalogueResponse(
        brands=brands,
        total_brands=len(brands),
        models_by_brand={b: SmartphoneCatalogue.get_models_by_brand(b) for b in brands[:8]}
    )


@router.get("/ml/catalogue/brands")
def get_catalogue_brands():
    """
    Returns list of all supported smartphone brands.
    """
    return SmartphoneCatalogue.get_supported_brands()


@router.get("/ml/catalogue/models")
def get_catalogue_models(brand: str = Query(...)):
    """
    Returns models associated with the specified smartphone brand.
    """
    return {
        "brand": brand,
        "models": SmartphoneCatalogue.get_models_by_brand(brand)
    }


@router.get("/ml/catalogue/specs")
def get_catalogue_specs(brand: str = Query(...), model: str = Query(...)):
    """
    Returns reference specifications for the selected smartphone model.
    """
    return SmartphoneCatalogue.get_specs_for_model(brand, model)


@router.post("/ml/negotiation-suggestion", response_model=NegotiationSuggestionResponse)
def get_negotiation_suggestion(req: NegotiationSuggestionRequest):
    """
    AI Module 2: Rule-based negotiation assistant.
    Returns deterministic advice: accept, counter, or reject.
    """
    return NegotiationRuleEngine.evaluate_offer(req)


@router.post("/ml/mobile-condition", response_model=MobileConditionResponse)
async def assess_mobile_condition(file: UploadFile = File(...)):
    """
    AI Module 3: MobileNetV2 visual condition classification (excellent, good, bad, defective).
    """
    contents = await file.read()
    if not contents or len(contents) == 0:
        raise ValidationError("Uploaded image file is empty.")
    return predict_condition(contents)


@router.get("/recommendations", response_model=RecommendationResponse)
def get_product_recommendations(
    category: Optional[str] = Query(None),
    limit: int = Query(6, ge=1, le=20),
    authorization: Optional[str] = Header(None),
):
    """
    AI Module 4: Personalized content-based product recommendations.
    Uses real wishlist and purchase signals with deterministic cold-start fallback.
    """
    user_id = get_optional_user_id(authorization)
    return RecommendationEngine.get_recommendations(user_id=user_id, category=category, limit=limit)


@router.post("/ml/object-detection", response_model=ObjectDetectionResponse)
async def run_object_detection(file: UploadFile = File(...)):
    """
    AI Module 5: Object detection future integration point.
    Returns honest unconfigured status if model adapter is not yet mounted.
    """
    contents = await file.read()
    return ObjectDetectionService.process_image(contents)
