import io
import math
import pytest
from PIL import Image
from starlette.testclient import TestClient
from app.db.connection import DatabaseManager
from ml.price_prediction.predict import load_model, EXPECTED_FEATURES
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    DatabaseManager.connect(force_memory=True)


def test_mindvalue_model_loading_and_singleton():
    """Verify MindValue model loads properly and caches the instance."""
    m1, meta1 = load_model()
    assert m1 is not None, "MindValue model failed to load."
    assert meta1 is not None
    assert hasattr(m1, "predict")
    # Check singleton caching
    m2, meta2 = load_model()
    assert m1 is m2, "Model instance must be cached as a singleton."
    assert meta1 is meta2


def test_mindvalue_17_feature_prediction():
    """Verify full 17-feature prediction across top smartphone brands."""
    test_cases = [
        {
            "brand": "Apple",
            "model": "iPhone 13",
            "os": "ios",
            "ram_gb": 4,
            "storage_gb": 128,
            "battery_mah": 3240,
            "display_size_inches": 6.1,
            "refresh_rate_hz": 60,
            "has_5g": True,
            "original_retail_price": 69900.0,
            "days_used": 365,
            "approximate_age_months": 12,
            "condition": "good",
            "battery_health_percent": 88,
            "screen_crack": "No",
            "scratches": "Minor",
            "repair_history": "No",
            "warranty_available": "No",
        },
        {
            "brand": "Samsung",
            "model": "Galaxy S23",
            "os": "android",
            "ram_gb": 8,
            "storage_gb": 256,
            "battery_mah": 3900,
            "display_size_inches": 6.1,
            "refresh_rate_hz": 120,
            "has_5g": True,
            "original_retail_price": 74999.0,
            "days_used": 180,
            "approximate_age_months": 6,
            "condition": "excellent",
            "battery_health_percent": 96,
            "screen_crack": "No",
            "scratches": "Minor",
            "repair_history": "No",
            "warranty_available": "Yes",
        },
        {
            "brand": "OnePlus",
            "model": "OnePlus 11",
            "os": "android",
            "ram_gb": 16,
            "storage_gb": 256,
            "battery_mah": 5000,
            "display_size_inches": 6.7,
            "refresh_rate_hz": 120,
            "has_5g": True,
            "original_retail_price": 61999.0,
            "days_used": 240,
            "approximate_age_months": 8,
            "condition": "good",
            "battery_health_percent": 92,
            "screen_crack": "No",
            "scratches": "Minor",
            "repair_history": "No",
            "warranty_available": "Yes",
        }
    ]

    for tc in test_cases:
        res = client.post("/api/v1/ml/price-estimate", json=tc)
        assert res.status_code == 200, f"Failed for {tc['brand']} {tc['model']}: {res.text}"
        data = res.json()
        assert data["is_model_available"] is True
        assert math.isfinite(data["estimated_price"])
        assert data["estimated_price"] > 500.0
        assert data["estimated_price"] <= tc["original_retail_price"]
        assert data["price_range_low"] <= data["estimated_price"] <= data["price_range_high"]
        assert len(data["features_used"]) == len(EXPECTED_FEATURES)
        assert data["currency"] == "INR"


def test_random_forest_price_estimation_with_smart_defaults():
    """Verify inference succeeds when only required fields are given."""
    payload = {
        "brand": "Apple",
        "model": "iPhone 13",
        "category": "smartphone",
        "approximate_age_months": 12,
        "condition": "excellent"
    }
    res = client.post("/api/v1/ml/price-estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_model_available"] is True
    assert data["estimated_price"] > 15000.0
    assert data["price_range_low"] < data["estimated_price"] < data["price_range_high"]
    assert "explanation" in data


def test_mindvalue_unseen_category_handling():
    """Verify pipeline handles unknown brands/models without crashing."""
    payload = {
        "brand": "FuturisticBrandX",
        "model": "QuantumPhone9000",
        "category": "smartphone",
        "approximate_age_months": 6,
        "condition": "good",
        "original_retail_price": 50000.0,
        "battery_health_percent": 90,
    }
    res = client.post("/api/v1/ml/price-estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_model_available"] is True
    assert math.isfinite(data["estimated_price"])
    assert data["estimated_price"] > 500.0


def test_invalid_inputs_validation():
    """Verify input validation rejects invalid values with 422."""
    # Negative original price
    res1 = client.post("/api/v1/ml/price-estimate", json={
        "brand": "Apple",
        "model": "iPhone 13",
        "condition": "good",
        "approximate_age_months": 6,
        "original_retail_price": -5000.0
    })
    assert res1.status_code == 422

    # Negative age
    res2 = client.post("/api/v1/ml/price-estimate", json={
        "brand": "Apple",
        "model": "iPhone 13",
        "condition": "good",
        "approximate_age_months": -4
    })
    assert res2.status_code == 422

    # Out of range battery health
    res3 = client.post("/api/v1/ml/price-estimate", json={
        "brand": "Apple",
        "model": "iPhone 13",
        "condition": "good",
        "approximate_age_months": 6,
        "battery_health_percent": 150
    })
    assert res3.status_code == 422


def test_catalogue_endpoints():
    """Verify smartphone catalogue retrieval endpoints."""
    # Overview
    res = client.get("/api/v1/ml/catalogue")
    assert res.status_code == 200
    cat = res.json()
    assert cat["total_brands"] >= 20
    assert "apple" in [b.lower() for b in cat["brands"]]
    assert "samsung" in [b.lower() for b in cat["brands"]]

    # Brand models
    res_models = client.get("/api/v1/ml/catalogue/models?brand=Apple")
    assert res_models.status_code == 200
    models_data = res_models.json()
    assert len(models_data["models"]) > 0
    assert any("iPhone 13" in m for m in models_data["models"])

    # Model specs
    res_specs = client.get("/api/v1/ml/catalogue/specs?brand=Apple&model=iPhone 13")
    assert res_specs.status_code == 200
    specs = res_specs.json()
    assert specs["brand"].lower() == "apple"
    assert specs["original_retail_price"] == 69900.0
    assert specs["battery_mah"] == 3240


def test_recommendation_system():
    db = DatabaseManager.get_db()
    # Insert two active products
    db.products.insert_one({
        "id": "rec_prod_1",
        "title": "OnePlus 10 Pro",
        "brand": "OnePlus",
        "model": "10 Pro",
        "asking_price": 32000.0,
        "condition": "excellent",
        "status": "active",
        "selling_method": "negotiation",
        "created_at": "2026-10-01T00:00:00Z"
    })
    db.products.insert_one({
        "id": "rec_prod_2",
        "title": "Pixel 7",
        "brand": "Google",
        "model": "Pixel 7",
        "asking_price": 35000.0,
        "condition": "good",
        "status": "active",
        "selling_method": "negotiation",
        "created_at": "2026-10-02T00:00:00Z"
    })

    res = client.get("/api/v1/recommendations")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) >= 2
    assert "algorithm_version" in data
    assert all("recommendation_reason" in item for item in data["items"])


def test_object_detection_integration_point():
    # Generate test image in memory
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/ml/object-detection",
        files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    # Verifies zero-fabrication and clear unconfigured status
    assert data["model_status"] == "not_configured"
    assert len(data["detected_objects"]) == 0
    assert "adapter" in data["message"].lower()


def test_mobile_condition_image_validation():
    """Verify image validation rejects empty files and corrupt formats with 422."""
    # 1. Empty image bytes
    res_empty = client.post(
        "/api/v1/ml/mobile-condition",
        files={"file": ("empty.jpg", b"", "image/jpeg")}
    )
    assert res_empty.status_code == 422

    # 2. Corrupt non-image bytes
    res_corrupt = client.post(
        "/api/v1/ml/mobile-condition",
        files={"file": ("corrupt.jpg", b"NOT_A_VALID_JPEG_HEADER_12345", "image/jpeg")}
    )
    assert res_corrupt.status_code == 422
    assert "invalid image" in res_corrupt.json()["error"]["message"].lower()


def test_mobile_condition_unavailable_model_handling(monkeypatch):
    """Verify that when no 4-class model is available, API does NOT invent predictions."""
    from ml.mobile_condition.predict import reset_model_cache
    import ml.mobile_condition.predict as mc_predict
    reset_model_cache()

    # Simulate missing model artifact
    monkeypatch.setattr(
        mc_predict,
        "load_model",
        lambda: (
            None,
            "MODEL_NOT_FOUND",
            "MobileNetV2 condition model artifact ('mobilenet_condition.keras') was not found in artifacts directory.",
        ),
    )

    img = Image.new("RGB", (224, 224), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/ml/mobile-condition",
        files={"file": ("phone.jpg", buf.getvalue(), "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_model_available"] is False
    # Crucial: predicted_condition must NEVER be fabricated or displayed when unavailable
    assert data["predicted_condition"] is None
    assert data["confidence_score"] is None
    assert data["status"] in ["model_not_found", "class_mismatch"]
    assert data["error_message"] is not None
    assert len(data["error_message"]) > 10
    reset_model_cache()


def test_mobile_condition_real_trained_model_inference():
    """Verify live inference using the actual trained MobileNetV2 artifact on disk."""
    from ml.mobile_condition.predict import reset_model_cache
    reset_model_cache()

    img = Image.new("RGB", (224, 224), color=(180, 180, 190))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/ml/mobile-condition",
        files={"file": ("real_test_phone.jpg", buf.getvalue(), "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_model_available"] is True
    assert data["status"] == "ok"
    assert data["predicted_condition"] in ["excellent", "good", "bad", "defective"]
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert len(data["class_probabilities"]) == 4
    for expected_cls in ["excellent", "good", "bad", "defective"]:
        assert expected_cls in data["class_probabilities"]
        assert 0.0 <= data["class_probabilities"][expected_cls] <= 1.0
    assert sum(data["class_probabilities"].values()) == pytest.approx(1.0, abs=1e-3)


def test_mobile_condition_successful_inference_when_model_available(monkeypatch):
    """Verify end-to-end inference when a valid 4-class model is provided."""
    import numpy as np
    from ml.mobile_condition.predict import reset_model_cache
    import ml.mobile_condition.predict as mc_predict

    reset_model_cache()

    class Mock4ClassModel:
        output_shape = (None, 4)

        def predict(self, tensor, verbose=0):
            # Returns probabilities for: [excellent, good, bad, defective]
            return np.array([[0.85, 0.10, 0.03, 0.02]], dtype=np.float32)

    # Mock load_model to return the valid 4-class model
    monkeypatch.setattr(mc_predict, "load_model", lambda: (Mock4ClassModel(), "OK", None))

    img = Image.new("RGB", (224, 224), color="silver")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/ml/mobile-condition",
        files={"file": ("mint_phone.jpg", buf.getvalue(), "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_model_available"] is True
    assert data["status"] == "ok"
    assert data["predicted_condition"] == "excellent"
    assert data["confidence_score"] == 0.85
    assert len(data["class_probabilities"]) == 4
    assert data["class_probabilities"]["excellent"] == 0.85
    assert sum(data["class_probabilities"].values()) == pytest.approx(1.0, abs=1e-3)
    reset_model_cache()


def test_mobile_condition_when_tensorflow_missing(monkeypatch):
    """Verify clean handling and zero fabricated predictions when TensorFlow is absent."""
    from ml.mobile_condition.predict import reset_model_cache
    import ml.mobile_condition.predict as mc_predict

    reset_model_cache()
    monkeypatch.setattr(
        mc_predict,
        "load_model",
        lambda: (
            None,
            "TENSORFLOW_NOT_INSTALLED",
            "TensorFlow is not installed in the runtime environment. Install 'tensorflow-cpu>=2.15.0'.",
        ),
    )

    img = Image.new("RGB", (224, 224), color="gray")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/v1/ml/mobile-condition",
        files={"file": ("test_phone.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_model_available"] is False
    assert data["predicted_condition"] is None
    assert data["confidence_score"] is None
    assert data["status"] == "tensorflow_not_installed"
    assert "tensorflow is not installed" in data["error_message"].lower()
    reset_model_cache()


def test_readiness_probe_status():
    """Verify readiness probe checks actual model loading rather than mere file existence."""
    from ml.mobile_condition.predict import reset_model_cache
    reset_model_cache()

    res = client.get("/api/v1/ready")
    assert res.status_code == 200
    data = res.json()
    assert "ready" in data
    assert "machine_learning" in data
    assert data["machine_learning"]["random_forest_price_estimator"] == "available"
    assert data["machine_learning"]["mobilenet_condition_classifier"] == "available"


def test_readiness_probe_reflects_missing_tensorflow(monkeypatch):
    """Verify readiness probe reports 'tensorflow_not_installed' when TensorFlow is absent."""
    import ml.mobile_condition.predict as mc_predict
    mc_predict.reset_model_cache()
    monkeypatch.setattr(
        mc_predict,
        "get_status",
        lambda: "tensorflow_not_installed",
    )

    res = client.get("/api/v1/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["machine_learning"]["mobilenet_condition_classifier"] == "tensorflow_not_installed"
    assert data["machine_learning"]["mobilenet_condition_classifier"] != "available"
    mc_predict.reset_model_cache()
