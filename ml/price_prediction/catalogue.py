"""
ReValue Smartphone Catalogue Service.
Aggregates known smartphone brands, models, and hardware specifications
from the MindValue Random Forest model and curated market profiles.
"""

from typing import List, Dict, Any, Optional

# Supported brands recognized by the MindValue Random Forest model
KNOWN_BRANDS = [
    "Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Realme",
    "Vivo", "iQOO", "Oppo", "Motorola", "Nothing", "Poco",
    "Infinix", "Tecno", "Lava", "Honor", "itel", "CMF",
    "Acer", "Alcatel", "BlackZone", "HMD", "Ulefone"
]

# Canonical hardware profiles for common smartphone series
CURATED_PROFILES: Dict[str, Dict[str, Any]] = {
    # --- Apple ---
    "Apple iPhone 13": {
        "brand": "Apple", "model": "Apple iPhone 13", "os": "ios",
        "storage_options": [128, 256, 512], "ram_options": [4],
        "battery_mah": 3240, "display_size_inches": 6.1, "refresh_rate_hz": 60,
        "has_5g": True, "original_retail_price": 69900.0
    },
    "Apple iPhone 14": {
        "brand": "Apple", "model": "Apple iPhone 14", "os": "ios",
        "storage_options": [128, 256, 512], "ram_options": [6],
        "battery_mah": 3279, "display_size_inches": 6.1, "refresh_rate_hz": 60,
        "has_5g": True, "original_retail_price": 79900.0
    },
    "Apple iPhone 15": {
        "brand": "Apple", "model": "Apple iPhone 15 (256GB)", "os": "ios",
        "storage_options": [128, 256, 512], "ram_options": [6],
        "battery_mah": 3349, "display_size_inches": 6.1, "refresh_rate_hz": 60,
        "has_5g": True, "original_retail_price": 89900.0
    },
    "Apple iPhone 15 Pro": {
        "brand": "Apple", "model": "Apple iPhone 15 Pro (512GB)", "os": "ios",
        "storage_options": [128, 256, 512, 1024], "ram_options": [8],
        "battery_mah": 3274, "display_size_inches": 6.1, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 134900.0
    },
    "Apple iPhone 16": {
        "brand": "Apple", "model": "Apple iPhone 16 (256GB)", "os": "ios",
        "storage_options": [128, 256, 512], "ram_options": [8],
        "battery_mah": 3561, "display_size_inches": 6.1, "refresh_rate_hz": 60,
        "has_5g": True, "original_retail_price": 89900.0
    },
    "Apple iPhone 12": {
        "brand": "Apple", "model": "Apple iPhone 12", "os": "ios",
        "storage_options": [64, 128, 256], "ram_options": [4],
        "battery_mah": 2815, "display_size_inches": 6.1, "refresh_rate_hz": 60,
        "has_5g": True, "original_retail_price": 65900.0
    },

    # --- Samsung ---
    "Samsung Galaxy S23": {
        "brand": "Samsung", "model": "Samsung Galaxy S23", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 3900, "display_size_inches": 6.1, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 74999.0
    },
    "Samsung Galaxy S22": {
        "brand": "Samsung", "model": "Samsung Galaxy S22", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 3700, "display_size_inches": 6.1, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 72999.0
    },
    "Samsung Galaxy S21": {
        "brand": "Samsung", "model": "Samsung Galaxy S21", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 4000, "display_size_inches": 6.2, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 69999.0
    },
    "Samsung Galaxy A54 5G": {
        "brand": "Samsung", "model": "Samsung Galaxy A54", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 5000, "display_size_inches": 6.4, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 38999.0
    },
    "Samsung Galaxy A16 5G": {
        "brand": "Samsung", "model": "Samsung Galaxy A16 5G (6GB RAM + 128GB)", "os": "android",
        "storage_options": [128], "ram_options": [6, 8],
        "battery_mah": 5000, "display_size_inches": 6.7, "refresh_rate_hz": 90,
        "has_5g": True, "original_retail_price": 18999.0
    },

    # --- Google ---
    "Google Pixel 7": {
        "brand": "Google", "model": "Google Pixel 7", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 4355, "display_size_inches": 6.3, "refresh_rate_hz": 90,
        "has_5g": True, "original_retail_price": 59999.0
    },
    "Google Pixel 8": {
        "brand": "Google", "model": "Google Pixel 8", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 4575, "display_size_inches": 6.2, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 75999.0
    },
    "Google Pixel 6": {
        "brand": "Google", "model": "Google Pixel 6", "os": "android",
        "storage_options": [128, 256], "ram_options": [8],
        "battery_mah": 4614, "display_size_inches": 6.4, "refresh_rate_hz": 90,
        "has_5g": True, "original_retail_price": 59999.0
    },

    # --- OnePlus ---
    "OnePlus 11R 5G": {
        "brand": "OnePlus", "model": "OnePlus 11R", "os": "android",
        "storage_options": [128, 256], "ram_options": [8, 16],
        "battery_mah": 5000, "display_size_inches": 6.74, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 39999.0
    },
    "OnePlus 12": {
        "brand": "OnePlus", "model": "OnePlus 12", "os": "android",
        "storage_options": [256, 512], "ram_options": [12, 16],
        "battery_mah": 5400, "display_size_inches": 6.82, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 64999.0
    },
    "OnePlus 10 Pro": {
        "brand": "OnePlus", "model": "OnePlus 10 Pro", "os": "android",
        "storage_options": [128, 256], "ram_options": [8, 12],
        "battery_mah": 5000, "display_size_inches": 6.7, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 66999.0
    },

    # --- Xiaomi & Poco ---
    "Xiaomi 13 Pro": {
        "brand": "Xiaomi", "model": "Xiaomi 13 Pro", "os": "android",
        "storage_options": [256], "ram_options": [12],
        "battery_mah": 4820, "display_size_inches": 6.73, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 79999.0
    },
    "Redmi Note 12 Pro": {
        "brand": "Xiaomi", "model": "Redmi Note 12 Pro", "os": "android",
        "storage_options": [128, 256], "ram_options": [6, 8],
        "battery_mah": 5000, "display_size_inches": 6.67, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 24999.0
    },

    # --- Nothing ---
    "Nothing Phone (2)": {
        "brand": "Nothing", "model": "Nothing Phone 2", "os": "android",
        "storage_options": [128, 256, 512], "ram_options": [8, 12],
        "battery_mah": 4700, "display_size_inches": 6.7, "refresh_rate_hz": 120,
        "has_5g": True, "original_retail_price": 44999.0
    },
}


class SmartphoneCatalogue:
    @staticmethod
    def get_supported_brands() -> List[str]:
        return sorted(KNOWN_BRANDS)

    @staticmethod
    def get_models_by_brand(brand: str) -> List[str]:
        brand_clean = brand.strip().lower()
        matched = []
        for key, profile in CURATED_PROFILES.items():
            if profile["brand"].lower() == brand_clean:
                matched.append(key)
        if matched:
            return sorted(matched)
        return [f"{brand} Model"]

    @staticmethod
    def get_specs_for_model(brand: str, model: str) -> Dict[str, Any]:
        brand_clean = (brand or "").strip().lower()
        model_clean = (model or "").strip().lower()
        full_name = f"{brand_clean} {model_clean}".strip()

        # 1. Direct key or model match
        for key, profile in CURATED_PROFILES.items():
            k_lower = key.lower()
            p_model = profile["model"].lower()
            if model_clean in [k_lower, p_model] or full_name in [k_lower, p_model]:
                return profile

        # 2. Brand match + model substring
        for key, profile in CURATED_PROFILES.items():
            p_brand = profile["brand"].lower()
            if p_brand == brand_clean or p_brand in full_name:
                k_lower = key.lower()
                p_model = profile["model"].lower()
                if model_clean in k_lower or model_clean in p_model:
                    return profile
                words = [w for w in k_lower.split() if len(w) > 2 and w != p_brand]
                if any(w in model_clean for w in words):
                    return profile

        # Intelligent brand-level fallback
        is_apple = brand_clean == "apple"
        return {
            "brand": brand,
            "model": model,
            "os": "ios" if is_apple else "android",
            "storage_options": [128, 256],
            "ram_options": [6, 8] if not is_apple else [6],
            "battery_mah": 3300 if is_apple else 5000,
            "display_size_inches": 6.1 if is_apple else 6.5,
            "refresh_rate_hz": 60 if is_apple else 120,
            "has_5g": True,
            "original_retail_price": 69900.0 if is_apple else 35000.0
        }
