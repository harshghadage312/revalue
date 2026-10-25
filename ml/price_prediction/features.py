from typing import List
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

CATEGORICAL_FEATURES = ["brand", "model", "condition", "category"]
NUMERICAL_FEATURES = [
    "approximate_age_months",
    "storage_gb",
    "ram_gb",
    "original_retail_price",
    "battery_health_percent",
]


def build_preprocessor() -> ColumnTransformer:
    """Builds a scikit-learn ColumnTransformer for resale price features."""
    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value="unknown")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", cat_pipeline, CATEGORICAL_FEATURES),
            ("num", num_pipeline, NUMERICAL_FEATURES),
        ]
    )
    return preprocessor
