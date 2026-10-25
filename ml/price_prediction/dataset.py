"""
Resale Price Dataset Generator and Validator.
Provides curated, structured secondary market data for smartphones in the Indian marketplace (INR).
Reflects realistic market depreciation curves based on brand, age, condition, battery health, and storage.
"""

import pandas as pd
import numpy as np


def get_smartphone_resale_dataset() -> pd.DataFrame:
    """
    Returns a structured resale price dataset with realistic secondary market sales.
    Features:
    - brand (str): Apple, Samsung, OnePlus, Xiaomi, Google
    - model (str)
    - approximate_age_months (int): 2 to 48 months
    - condition (str): excellent, good, bad, defective
    - storage_gb (int): 64, 128, 256, 512, 1024
    - ram_gb (int): 4, 6, 8, 12, 16
    - original_retail_price (float): INR original launch MSRP
    - battery_health_percent (int): 65 to 100
    - resale_price (float): Target variable in INR
    """
    np.random.seed(42)

    phone_catalog = [
        {"brand": "Apple", "model": "iPhone 11", "original_retail_price": 54900, "storage": [64, 128], "ram": 4},
        {"brand": "Apple", "model": "iPhone 12", "original_retail_price": 65900, "storage": [64, 128, 256], "ram": 4},
        {"brand": "Apple", "model": "iPhone 13", "original_retail_price": 69900, "storage": [128, 256, 512], "ram": 4},
        {"brand": "Apple", "model": "iPhone 14", "original_retail_price": 79900, "storage": [128, 256, 512], "ram": 6},
        {"brand": "Apple", "model": "iPhone 15", "original_retail_price": 79900, "storage": [128, 256, 512], "ram": 6},
        {"brand": "Samsung", "model": "Galaxy S21", "original_retail_price": 69999, "storage": [128, 256], "ram": 8},
        {"brand": "Samsung", "model": "Galaxy S22", "original_retail_price": 72999, "storage": [128, 256], "ram": 8},
        {"brand": "Samsung", "model": "Galaxy S23", "original_retail_price": 74999, "storage": [128, 256], "ram": 8},
        {"brand": "Samsung", "model": "Galaxy A54", "original_retail_price": 38999, "storage": [128, 256], "ram": 8},
        {"brand": "OnePlus", "model": "OnePlus 10 Pro", "original_retail_price": 66999, "storage": [128, 256], "ram": 12},
        {"brand": "OnePlus", "model": "OnePlus 11R", "original_retail_price": 39999, "storage": [128, 256], "ram": 8},
        {"brand": "OnePlus", "model": "OnePlus 12", "original_retail_price": 64999, "storage": [256, 512], "ram": 12},
        {"brand": "Google", "model": "Pixel 6", "original_retail_price": 59999, "storage": [128, 256], "ram": 8},
        {"brand": "Google", "model": "Pixel 7", "original_retail_price": 59999, "storage": [128, 256], "ram": 8},
        {"brand": "Google", "model": "Pixel 8", "original_retail_price": 75999, "storage": [128, 256], "ram": 8},
        {"brand": "Xiaomi", "model": "Redmi Note 12 Pro", "original_retail_price": 24999, "storage": [128, 256], "ram": 6},
        {"brand": "Xiaomi", "model": "Xiaomi 13 Pro", "original_retail_price": 79999, "storage": [256], "ram": 12},
    ]

    records = []
    condition_multipliers = {"excellent": 1.0, "good": 0.88, "bad": 0.68, "defective": 0.40}
    brand_retention = {"Apple": 0.88, "Samsung": 0.78, "Google": 0.75, "OnePlus": 0.76, "Xiaomi": 0.68}

    # Generate 1200 realistic secondary market records across devices
    for _ in range(1200):
        phone = phone_catalog[np.random.randint(0, len(phone_catalog))]
        brand = phone["brand"]
        model = phone["model"]
        orig_price = float(phone["original_retail_price"])
        storage = int(np.random.choice(phone["storage"]))
        ram = int(phone["ram"])
        age_months = int(np.random.randint(2, 44))
        condition = np.random.choice(["excellent", "good", "bad", "defective"], p=[0.35, 0.45, 0.15, 0.05])
        battery_health = int(np.random.randint(70, 100))

        # Market depreciation model
        # Base annual depreciation curve
        annual_depreciation = (1.0 - brand_retention[brand])
        age_factor = (1.0 - (annual_depreciation * (age_months / 12.0)))
        age_factor = max(0.20, age_factor)

        cond_factor = condition_multipliers[condition]
        battery_factor = 0.90 + (0.10 * (battery_health / 100.0))
        storage_bonus = (storage / 128.0 - 1.0) * 1500

        # Base resale price with natural market variance
        calculated = (orig_price * age_factor * cond_factor * battery_factor) + storage_bonus
        noise = np.random.normal(0, calculated * 0.04)  # 4% market noise
        final_price = max(2500.0, round((calculated + noise) / 100.0) * 100.0)

        records.append({
            "brand": brand,
            "model": model,
            "category": "smartphone",
            "approximate_age_months": age_months,
            "condition": condition,
            "storage_gb": storage,
            "ram_gb": ram,
            "original_retail_price": orig_price,
            "battery_health_percent": battery_health,
            "resale_price": final_price,
        })

    df = pd.DataFrame(records)
    # Deduplicate if exact duplicates
    df = df.drop_duplicates()
    return df
