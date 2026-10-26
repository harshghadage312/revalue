import os
from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.db.connection import get_db, DatabaseManager
from app.integrations.payments.manager import get_payment_provider
from ml.price_prediction.predict import load_model as load_price_model

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/health")
def health_check():
    """Liveness probe reporting that FastAPI service process is active."""
    import sys
    runtime_info = {"python": sys.version.split()[0]}
    try:
        import tensorflow as tf
        runtime_info["tensorflow"] = tf.__version__
        runtime_info["keras"] = getattr(tf.keras, "__version__", "builtin")
    except Exception as e:
        runtime_info["tensorflow_error"] = str(e)

    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.5",
        "runtime": runtime_info,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
def readiness_check():
    """
    Readiness probe distinguishing core database connectivity
    from optional ML artifacts and external payment integrations.
    """
    # 1. Database check
    db_status = "operational"
    try:
        db = get_db()
        db.command("ping")
    except Exception as e:
        db_status = f"unreachable: {str(e)}"
    is_memory_fallback = DatabaseManager.is_memory()

    # 2. Payment provider status
    payment_provider = get_payment_provider()
    payment_status = "configured" if payment_provider.is_configured() else "unconfigured"

    # 3. ML Model Artifacts
    price_model, _ = load_price_model()
    price_ml_status = "available" if price_model is not None else "unavailable"

    from ml.mobile_condition.predict import get_status as get_condition_status
    mobilenet_status = get_condition_status()

    return {
        "ready": db_status == "operational",
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "mode": "in_memory_dev_fallback" if is_memory_fallback else "live_mongodb",
        },
        "integrations": {
            "payment_provider": settings.PAYMENT_PROVIDER,
            "payment_status": payment_status,
        },
        "machine_learning": {
            "random_forest_price_estimator": price_ml_status,
            "mobilenet_condition_classifier": mobilenet_status,
            "recommendation_engine": "operational",
            "object_detection_adapter": "not_configured",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
