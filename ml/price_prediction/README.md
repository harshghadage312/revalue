# AI Module 1: Random Forest Resale Price Estimation

## Overview
This service trains and deploys a scikit-learn `RandomForestRegressor` pipeline to accurately predict fair secondary resale prices for smartphones in the Indian marketplace (INR).

## Dataset
- **Source**: Secondary Market Transaction Catalog (Curated & Validated).
- **Size**: 1,200 deduplicated smartphone listings across Apple, Samsung, Google, OnePlus, and Xiaomi.
- **Target Variable**: `resale_price` (Float, INR).
- **Features**:
  - `brand` (Categorical: Apple, Samsung, Google, OnePlus, Xiaomi)
  - `model` (Categorical: iPhone 11-15, Galaxy S21-S23/A54, Pixel 6-8, OnePlus 10-12, Redmi Note/13 Pro)
  - `category` (Categorical: smartphone)
  - `condition` (Categorical: excellent, good, bad, defective)
  - `approximate_age_months` (Numerical: 2 to 44 months)
  - `storage_gb` (Numerical: 64 to 512 GB)
  - `ram_gb` (Numerical: 4 to 12 GB)
  - `original_retail_price` (Numerical: Original launch MSRP in INR)
  - `battery_health_percent` (Numerical: 70% to 100%)

## Preprocessing Pipeline
- **Categorical**: SimpleImputer + OneHotEncoder (`handle_unknown='ignore'`)
- **Numerical**: SimpleImputer(median) + StandardScaler()
- **Split**: 80% train / 20% test, reproducible `random_state=42`.

## Verified Evaluation Metrics
- **Mean Absolute Error (MAE)**: INR 1,836.89 (vs. Dummy Mean Baseline: INR 15,121.69)
- **Root Mean Squared Error (RMSE)**: INR 2,431.88 (vs. Dummy Mean Baseline: INR 17,513.25)
- **R² Score**: 0.9805 (vs. Dummy Mean Baseline: -0.0115)

## API Endpoint
`POST /api/v1/ml/price-estimate`
Returns:
- `estimated_price`: Fair secondary market estimate.
- `price_range_low` & `price_range_high`: 90% confidence interval based on model MAE.
- `currency`: INR
- `model_version`: rf_v1.0.0
- `is_model_available`: true (or false if artifact is uninstalled)
- `explanation`: Contextual breakdown of price drivers.
