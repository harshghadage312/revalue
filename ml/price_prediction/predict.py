import os
import json
import math
import joblib
import pandas as pd
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.ml import PriceEstimateRequest, PriceEstimateResponse
from app.core.errors import ValidationError
from app.core.logging import logger
from ml.price_prediction.catalogue import SmartphoneCatalogue

_MODEL_CACHE = None
_METADATA_CACHE = None

EXPECTED_FEATURES = [
    "Brand", "Model", "OS", "RAM_GB", "Storage_GB",
    "Battery_mAh", "Display_Size_Inches", "Refresh_Rate_Hz", "5G_Support",
    "Original_Price_INR", "Days_Used", "Condition", "Battery_Health_Percent",
    "Screen_Crack", "Scratches", "Repair_History", "Warranty_Available"
]


def load_model() -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
    """
    Loads and caches the fitted scikit-learn Pipeline once for prediction.
    Prioritizes the production MindValue Random Forest model.
    """
    global _MODEL_CACHE, _METADATA_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE, _METADATA_CACHE

    # Candidate model paths
    artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    candidates = [
        os.path.join(artifacts_dir, "mindvalue_random_forest_model.pkl"),
        settings.PRICE_MODEL_PATH,
        os.path.join(artifacts_dir, "rf_price_model.joblib"),
    ]

    model_path = None
    for cand in candidates:
        if cand and os.path.exists(cand):
            model_path = cand
            break

    if not model_path:
        logger.warning("No price prediction model artifact found on disk.")
        return None, None

    try:
        _MODEL_CACHE = joblib.load(model_path)
        logger.info(f"Loaded Random Forest model from {model_path} (Type: {type(_MODEL_CACHE)})")

        # Backward compatibility for scikit-learn version differences on deserialized pipelines
        if hasattr(_MODEL_CACHE, "named_steps") and "preprocessor" in _MODEL_CACHE.named_steps:
            prep = _MODEL_CACHE.named_steps["preprocessor"]
            for _, trans, _ in getattr(prep, "transformers_", []):
                if hasattr(trans, "steps"):
                    for _, sstep in trans.steps:
                        if hasattr(sstep, "statistics_") and not hasattr(sstep, "_fill_dtype"):
                            try:
                                sstep._fill_dtype = sstep.statistics_.dtype
                            except Exception:
                                pass

        meta_path = os.path.join(os.path.dirname(model_path), "model_metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                _METADATA_CACHE = json.load(f)
        else:
            _METADATA_CACHE = {
                "model_version": "mindvalue_rf_v2.0",
                "model_name": "MindValue Random Forest Price Regressor",
                "features_count": 17,
                "target": "Used_Resale_Price_INR",
            }
        return _MODEL_CACHE, _METADATA_CACHE
    except Exception as e:
        logger.error(f"Failed to load price prediction model from {model_path}: {e}")
        return None, None


def _normalize_condition(raw_cond: str) -> str:
    """Normalizes condition strings to the 4 categories expected by MindValue."""
    c = (raw_cond or "good").strip().lower()
    if c in ["excellent", "mint", "flawless"]:
        return "Excellent"
    elif c in ["good", "fair"]:
        return "Good"
    elif c in ["bad", "poor"]:
        return "Bad"
    elif c in ["defective", "damaged", "broken"]:
        return "Damaged"
    return "Good"


def _normalize_binary(val: Any) -> str:
    """Normalizes boolean or string values to 'Yes' or 'No'."""
    if val is None:
        return "No"
    if isinstance(val, bool):
        return "Yes" if val else "No"
    s = str(val).strip().lower()
    return "Yes" if s in ["yes", "true", "1", "y"] else "No"


def _normalize_scratches(val: Any, condition: str) -> str:
    """Normalizes scratch grade to 'Minor', 'Moderate', or 'Heavy'."""
    if val:
        s = str(val).strip().capitalize()
        if s in ["Minor", "Moderate", "Heavy"]:
            return s
    cond = condition.lower()
    if cond in ["excellent", "good"]:
        return "Minor"
    elif cond == "bad":
        return "Moderate"
    return "Heavy"


def estimate_price(req: PriceEstimateRequest) -> PriceEstimateResponse:
    """
    Executes price inference via the fitted MindValue Random Forest Pipeline.
    Constructs the 17 expected features, handles defaults, validates inputs,
    and returns a guaranteed finite, non-negative resale price estimate.
    """
    model, metadata = load_model()
    now = datetime.now(timezone.utc)

    if model is None:
        return PriceEstimateResponse(
            estimated_price=0.0,
            price_range_low=0.0,
            price_range_high=0.0,
            currency="INR",
            model_version="unavailable",
            dataset_version="none",
            features_used=[],
            is_model_available=False,
            prediction_timestamp=now,
            explanation="Price estimation model is currently not available or loaded.",
        )

    # 1. Input Validation
    if req.original_retail_price is not None and req.original_retail_price <= 0:
        raise ValidationError("Original retail price must be a positive number.")
    if req.approximate_age_months < 0 or (req.days_used is not None and req.days_used < 0):
        raise ValidationError("Age / days used cannot be negative.")
    if req.battery_health_percent is not None and (req.battery_health_percent < 10 or req.battery_health_percent > 100):
        raise ValidationError("Battery health percentage must be between 10% and 100%. ")

    # 2. Extract catalogue specifications for smart defaults
    specs = SmartphoneCatalogue.get_specs_for_model(req.brand, req.model)

    # 3. Assemble the 17 Features required by the fitted MindValue Pipeline
    brand_clean = req.brand.strip().lower()
    model_clean = req.model.strip()
    is_apple = brand_clean == "apple"

    os_clean = (req.os.strip().lower() if req.os else ("ios" if is_apple else "android"))
    ram_gb = float(req.ram_gb if req.ram_gb is not None else specs["ram_options"][0])
    storage_gb = float(req.storage_gb if req.storage_gb is not None else specs["storage_options"][0])
    battery_mah = float(req.battery_mah if req.battery_mah is not None else specs["battery_mah"])
    display_size = float(req.display_size_inches if req.display_size_inches is not None else specs["display_size_inches"])
    refresh_rate = float(req.refresh_rate_hz if req.refresh_rate_hz is not None else specs["refresh_rate_hz"])
    has_5g = bool(req.has_5g if req.has_5g is not None else specs["has_5g"])
    orig_price = float(req.original_retail_price if req.original_retail_price is not None else specs["original_retail_price"])

    days_used = float(req.days_used if req.days_used is not None else max(15, round(req.approximate_age_months * 30.5)))
    condition_val = _normalize_condition(req.condition)
    battery_health = float(req.battery_health_percent if req.battery_health_percent is not None else 85)

    # Defective/Damaged condition implies screen crack or heavy scratches unless specified
    if req.condition.lower() == "defective" and req.screen_crack is None:
        screen_crack = "Yes"
    else:
        screen_crack = _normalize_binary(req.screen_crack)

    scratches = _normalize_scratches(req.scratches, req.condition)
    repair_history = _normalize_binary(req.repair_history)

    # Warranty default: usually 1 year (365 days) from purchase
    if req.warranty_available is not None:
        warranty = _normalize_binary(req.warranty_available)
    else:
        warranty = "Yes" if days_used <= 330 else "No"

    feature_dict = {
        "Brand": brand_clean,
        "Model": model_clean,
        "OS": os_clean,
        "RAM_GB": ram_gb,
        "Storage_GB": storage_gb,
        "Battery_mAh": battery_mah,
        "Display_Size_Inches": display_size,
        "Refresh_Rate_Hz": refresh_rate,
        "5G_Support": has_5g,
        "Original_Price_INR": orig_price,
        "Days_Used": days_used,
        "Condition": condition_val,
        "Battery_Health_Percent": battery_health,
        "Screen_Crack": screen_crack,
        "Scratches": scratches,
        "Repair_History": repair_history,
        "Warranty_Available": warranty,
    }

    df = pd.DataFrame([feature_dict])

    # 4. Pipeline Inference
    try:
        raw_pred = float(model.predict(df)[0])
    except Exception as e:
        logger.error(f"Inference error in MindValue pipeline: {e}")
        raise ValidationError(f"Price estimation failed during inference: {str(e)}")

    # 5. Output Validation
    if not math.isfinite(raw_pred) or raw_pred < 0:
        logger.error(f"Non-finite or negative model output encountered: {raw_pred}")
        raise ValidationError("Model returned an invalid non-finite price estimate.")

    # Bound estimate sensibly (cannot exceed 98% of launch price; cannot fall below minimum scrap floor of INR 500)
    capped_pred = min(raw_pred, orig_price * 0.98)
    capped_pred = max(500.0, capped_pred)
    pred_rounded = round(capped_pred / 50.0) * 50.0

    # Valuation range (+/- 8% spread, minimum INR 1,000 spread)
    spread = max(1000.0, round((pred_rounded * 0.08) / 50.0) * 50.0)
    range_low = max(500.0, pred_rounded - spread)
    range_high = min(orig_price, pred_rounded + spread)

    explanation = (
        f"MindValue valuation of ₹{pred_rounded:,.2f} based on {int(days_used)} days used "
        f"({req.approximate_age_months} mos), '{condition_val}' condition, {int(battery_health)}% battery health, "
        f"and original launch price of ₹{orig_price:,.2f}."
    )

    model_ver = metadata.get("model_version", "mindvalue_rf_v2.0")

    return PriceEstimateResponse(
        estimated_price=pred_rounded,
        price_range_low=range_low,
        price_range_high=range_high,
        currency="INR",
        model_version=model_ver,
        dataset_version="MindValue Production Pipeline",
        features_used=EXPECTED_FEATURES,
        is_model_available=True,
        prediction_timestamp=now,
        explanation=explanation,
    )
