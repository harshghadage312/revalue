import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline

from ml.price_prediction.dataset import get_smartphone_resale_dataset
from ml.price_prediction.features import build_preprocessor, CATEGORICAL_FEATURES, NUMERICAL_FEATURES


def train_price_model(artifact_dir: str = "./ml/price_prediction/artifacts") -> dict:
    os.makedirs(artifact_dir, exist_ok=True)
    print("Loading smartphone resale dataset...")
    df = get_smartphone_resale_dataset()
    print(f"Dataset size: {len(df)} samples across {df['brand'].nunique()} brands and {df['model'].nunique()} models.")

    feature_cols = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
    X = df[feature_cols]
    y = df["resale_price"]

    # 80/20 train/test split with reproducible seed
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    preprocessor = build_preprocessor()
    rf_model = RandomForestRegressor(
        n_estimators=120,
        max_depth=14,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )

    full_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", rf_model),
    ])

    print("Fitting Random Forest Regressor pipeline...")
    full_pipeline.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = full_pipeline.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    # Baseline comparison (predicting mean)
    dummy = DummyRegressor(strategy="mean")
    dummy.fit(X_train, y_train)
    dummy_pred = dummy.predict(X_test)
    baseline_mae = float(mean_absolute_error(y_test, dummy_pred))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, dummy_pred)))
    baseline_r2 = float(r2_score(y_test, dummy_pred))

    print(f"--- Model Evaluation Results ---")
    print(f"MAE:  INR {mae:,.2f}  (Baseline MAE: INR {baseline_mae:,.2f})")
    print(f"RMSE: INR {rmse:,.2f}  (Baseline RMSE: INR {baseline_rmse:,.2f})")
    print(f"R2:   {r2:.4f}     (Baseline R2: {baseline_r2:.4f})")

    # Save model artifact
    model_filename = os.path.join(artifact_dir, "rf_price_model.joblib")
    joblib.dump(full_pipeline, model_filename)
    print(f"Model saved to {model_filename}")

    metadata = {
        "model_version": "rf_v1.0.0",
        "algorithm": "RandomForestRegressor",
        "n_estimators": 120,
        "features": feature_cols,
        "dataset_name": "ReValue Smartphone Secondary Market Dataset v1",
        "dataset_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "currency": "INR",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "mae": mae,
            "rmse": rmse,
            "r2_score": r2,
            "baseline_mae": baseline_mae,
            "baseline_rmse": baseline_rmse,
            "baseline_r2": baseline_r2,
        }
    }

    meta_filename = os.path.join(artifact_dir, "model_metadata.json")
    with open(meta_filename, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {meta_filename}")

    return metadata


if __name__ == "__main__":
    train_price_model()
