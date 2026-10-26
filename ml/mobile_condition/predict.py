import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import numpy as np
from app.core.config import settings
from app.schemas.ml import MobileConditionResponse
from app.core.errors import ValidationError
from ml.mobile_condition.preprocess import preprocess_image_bytes
from app.core.logging import logger

_MODEL = None
_MODEL_STATUS: str = "UNCHECKED"
_MODEL_MESSAGE: Optional[str] = None
_LABELS: Dict[int, str] = {
    0: "excellent",
    1: "good",
    2: "bad",
    3: "defective"
}
EXPECTED_CLASSES = ["excellent", "good", "bad", "defective"]


def reset_model_cache():
    """Resets cached model reference. Primarily used during testing."""
    global _MODEL, _MODEL_STATUS, _MODEL_MESSAGE
    _MODEL = None
    _MODEL_STATUS = "UNCHECKED"
    _MODEL_MESSAGE = None


def get_status() -> str:
    """
    Returns condition classifier status for health/readiness checks without blocking.
    Returns 'available', 'tensorflow_not_installed', 'model_not_found', 'load_error', etc.
    """
    global _MODEL, _MODEL_STATUS
    if _MODEL is not None:
        return "available"
    if _MODEL_STATUS not in ["UNCHECKED", "OK"]:
        return _MODEL_STATUS.lower()

    # Fast check for TensorFlow availability before attempting load
    import importlib.util
    if importlib.util.find_spec("tensorflow") is None:
        return "tensorflow_not_installed"

    model, status, _ = load_model()
    return "available" if model is not None else status.lower()


def load_model() -> Tuple[Optional[Any], str, Optional[str]]:
    """
    Loads and caches the MobileNetV2 model.
    Returns (model, status_code, message).
    Strictly verifies that model outputs match the required 4 classes: ['excellent', 'good', 'bad', 'defective'].
    Never fabricates classes or silently reinterprets label mappings.
    """
    global _MODEL, _MODEL_STATUS, _MODEL_MESSAGE, _LABELS
    if _MODEL_STATUS != "UNCHECKED":
        return _MODEL, _MODEL_STATUS, _MODEL_MESSAGE

    base_dir = os.path.abspath(os.path.dirname(__file__))
    artifacts_dir = os.path.join(base_dir, "artifacts")

    labels_candidates = [
        os.path.join(artifacts_dir, "labels.json"),
        os.path.join(base_dir, "labels.json"),
    ]
    for lp in labels_candidates:
        if os.path.exists(lp):
            try:
                with open(lp, "r", encoding="utf-8") as f:
                    _LABELS = {int(k): v.lower() for k, v in json.load(f).items()}
                break
            except Exception as e:
                logger.warning(f"Could not parse {lp}: {e}")

    # Search for model checkpoints robustly across relative and absolute locations
    repo_root = os.path.abspath(os.path.join(base_dir, "..", ".."))
    candidates = []
    if settings.MOBILE_CONDITION_MODEL_PATH:
        candidates.append(settings.MOBILE_CONDITION_MODEL_PATH)
        candidates.append(os.path.abspath(settings.MOBILE_CONDITION_MODEL_PATH))
        clean_rel = settings.MOBILE_CONDITION_MODEL_PATH.lstrip("./\\")
        candidates.append(os.path.abspath(os.path.join(repo_root, clean_rel)))
    candidates.extend([
        os.path.join(artifacts_dir, "mobilenet_condition.keras"),
        os.path.join(artifacts_dir, "mobilenet_condition.h5"),
        os.path.join(artifacts_dir, "phone_condition_model.h5"),
    ])

    model_path = None
    for cand in candidates:
        if cand and os.path.exists(cand):
            model_path = os.path.abspath(cand)
            break

    if not model_path:
        _MODEL_STATUS = "MODEL_NOT_FOUND"
        _MODEL_MESSAGE = (
            "MobileNetV2 condition model artifact ('mobilenet_condition.keras') was not found in artifacts directory. "
            "To enable visual condition assessment, train on a 4-class dataset (Excellent, Good, Bad, Defective) "
            "using 'python -m ml.mobile_condition.train'."
        )
        return None, _MODEL_STATUS, _MODEL_MESSAGE

    # Inspect H5 class count before attempting load to catch class mismatches immediately
    if model_path.endswith(".h5"):
        try:
            import h5py
            with h5py.File(model_path, "r") as h5f:
                if "model_config" in h5f.attrs:
                    conf_str = h5f.attrs["model_config"]
                    if isinstance(conf_str, bytes):
                        conf_str = conf_str.decode("utf-8")
                    mconf = json.loads(conf_str)
                    layers = mconf.get("config", {}).get("layers", [])
                    for l in reversed(layers):
                        if l.get("class_name") == "Dense":
                            units = l.get("config", {}).get("units")
                            if units and units != 4:
                                _MODEL = None
                                _MODEL_STATUS = "CLASS_MISMATCH"
                                _MODEL_MESSAGE = (
                                    f"Model checkpoint at '{os.path.basename(model_path)}' was trained on {units} classes (e.g. damaged/good), "
                                    f"not the 4 required marketplace tiers (Excellent, Good, Bad, Defective). "
                                    f"A retrained 4-class MobileNetV2 model is required."
                                )
                                return None, _MODEL_STATUS, _MODEL_MESSAGE
                            break
        except Exception as h5_err:
            logger.debug(f"Could not inspect H5 config: {h5_err}")

    # Check TensorFlow availability before attempting inference load
    try:
        import tensorflow as tf
    except (ImportError, ModuleNotFoundError) as imp_err:
        logger.error(
            f"TensorFlow is not installed in the Python runtime environment: {imp_err}. "
            f"Please ensure 'tensorflow-cpu' is included in backend/requirements.txt."
        )
        _MODEL = None
        _MODEL_STATUS = "TENSORFLOW_NOT_INSTALLED"
        _MODEL_MESSAGE = (
            "TensorFlow is not installed in the runtime environment. "
            "Install 'tensorflow-cpu>=2.15.0' to enable visual condition classification."
        )
        return None, _MODEL_STATUS, _MODEL_MESSAGE

    try:
        model = None
        # Try direct load with compile=False for inference-only loading
        try:
            model = tf.keras.models.load_model(model_path, compile=False)
        except Exception as load_err:
            logger.info(f"Direct Keras load failed ({load_err}); attempting architecture reconstruction...")
            from tensorflow.keras.applications import MobileNetV2
            from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, Input
            from tensorflow.keras.models import Model

            # Check number of classes from H5 attributes if possible
            num_classes = 4
            try:
                import h5py
                with h5py.File(model_path, 'r') as h5f:
                    if 'model_weights' in h5f:
                        for k in h5f['model_weights'].keys():
                            if 'dense' in k.lower():
                                for subk in h5f['model_weights'][k].keys():
                                    if 'bias' in subk:
                                        shape = h5f['model_weights'][k][subk].shape
                                        if len(shape) == 1:
                                            num_classes = shape[0]
            except Exception:
                pass

            inputs = Input(shape=(224, 224, 3), name="input_image")
            base = MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights=None)
            x = base(inputs, training=False)
            x = GlobalAveragePooling2D(name="global_avg_pool")(x)
            x = Dense(128, activation="relu", name="dense_features")(x)
            x = Dropout(0.3, name="dropout")(x)
            out = Dense(num_classes, activation="softmax", name="condition_output")(x)
            model = Model(inputs=inputs, outputs=out, name="ReValue_MobileNetV2_Condition")
            model.load_weights(model_path)

        # Validate output shape against the 4 required classes
        output_dim = model.output_shape[-1]
        if output_dim != 4:
            logger.warning(
                f"Model at '{model_path}' has {output_dim} output classes, but ReValue requires 4 "
                f"marketplace condition tiers: {EXPECTED_CLASSES}. Refusing to invent mapping."
            )
            _MODEL = None
            _MODEL_STATUS = "CLASS_MISMATCH"
            _MODEL_MESSAGE = (
                f"Model checkpoint at '{os.path.basename(model_path)}' was trained on {output_dim} classes (e.g. damaged/good), "
                f"not the 4 required marketplace tiers (Excellent, Good, Bad, Defective). "
                f"A retrained 4-class MobileNetV2 model is required."
            )
            return None, _MODEL_STATUS, _MODEL_MESSAGE

        _MODEL = model
        _MODEL_STATUS = "OK"
        _MODEL_MESSAGE = None
        logger.info(f"Loaded valid 4-class MobileNetV2 condition classifier from {model_path}")
        return _MODEL, _MODEL_STATUS, None

    except Exception as e:
        logger.error(f"Failed to load condition model from {model_path}: {e}")
        _MODEL = None
        _MODEL_STATUS = "LOAD_ERROR"
        _MODEL_MESSAGE = f"Error initializing model artifact: {str(e)}"
        return None, _MODEL_STATUS, _MODEL_MESSAGE


def predict_condition(image_bytes: bytes) -> MobileConditionResponse:
    now = datetime.now(timezone.utc)
    disclaimer = (
        "Visual condition assessment estimates physical exterior cosmetic condition only. "
        "It does not verify internal motherboard integrity, battery health percentage, "
        "IMEI legitimacy, water resistance, or component authenticity."
    )

    # 1. Image Validation and Preprocessing
    try:
        input_tensor = preprocess_image_bytes(image_bytes)
    except ValueError as e:
        raise ValidationError(f"Invalid image upload: {str(e)}")

    # 2. Model Loading
    model, status_code, err_msg = load_model()
    if model is None:
        return MobileConditionResponse(
            predicted_condition=None,
            confidence_score=None,
            class_probabilities={},
            model_version="mobilenet_v2_1.0",
            is_model_available=False,
            status=status_code.lower(),
            error_message=err_msg,
            disclaimer=f"{err_msg} {disclaimer}",
            evaluated_at=now,
        )

    # 3. Model Inference
    try:
        predictions = model.predict(input_tensor, verbose=0)[0]
    except Exception as e:
        logger.error(f"Error during MobileNetV2 inference: {e}")
        raise ValidationError(f"Model inference failed: {str(e)}")

    best_idx = int(np.argmax(predictions))
    confidence = float(predictions[best_idx])

    probs = {
        _LABELS.get(i, f"class_{i}"): round(float(predictions[i]), 4)
        for i in range(len(predictions))
    }

    return MobileConditionResponse(
        predicted_condition=_LABELS.get(best_idx, "good"),
        confidence_score=round(confidence, 4),
        class_probabilities=probs,
        model_version="mobilenet_v2_1.0",
        is_model_available=True,
        status="ok",
        error_message=None,
        disclaimer=disclaimer,
        evaluated_at=now,
    )
