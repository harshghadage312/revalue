"""
Explicit Development-Only Seed Script for ReValue.
CRITICAL: Never run automatically in production.
Usage: py -3.10 scripts/seed_dev.py
"""

import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password
from app.db.connection import get_db, DatabaseManager
from app.schemas.products import ProductStatus, SellingMethod, ProductCondition


def seed_database():
    if settings.ENVIRONMENT == "production":
        print("ERROR: Automatic or manual seeding is strictly prohibited in production mode.")
        sys.exit(1)

    print("--- Seeding ReValue Development Database ---")
    db = get_db()
    now = datetime.now(timezone.utc)

    # 1. Seed Users
    users_data = [
        {
            "id": "usr_admin_001",
            "name": "System Administrator",
            "email": "admin@revalue.market",
            "password_hash": hash_password("AdminSecurePass!2026"),
            "role": "admin",
            "is_active": True,
            "phone": "+91-9876543210",
            "address": "ReValue HQ, Bandra Kurla Complex, Mumbai, Maharashtra",
            "created_at": now - timedelta(days=60),
            "updated_at": now - timedelta(days=60),
            "average_rating": 5.0,
            "review_count": 1,
        },
        {
            "id": "usr_seller_001",
            "name": "Rajesh Sharma",
            "email": "rajesh.seller@revalue.market",
            "password_hash": hash_password("SellerPass123!"),
            "role": "seller",
            "is_active": True,
            "phone": "+91-9820011223",
            "address": "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka",
            "created_at": now - timedelta(days=45),
            "updated_at": now - timedelta(days=45),
            "average_rating": 4.8,
            "review_count": 12,
        },
        {
            "id": "usr_seller_002",
            "name": "Priya Nair",
            "email": "priya.seller@revalue.market",
            "password_hash": hash_password("SellerPass123!"),
            "role": "seller",
            "is_active": True,
            "phone": "+91-9845012345",
            "address": "B-12, Sector 62, Noida, Uttar Pradesh",
            "created_at": now - timedelta(days=30),
            "updated_at": now - timedelta(days=30),
            "average_rating": 4.9,
            "review_count": 8,
        },
        {
            "id": "usr_buyer_001",
            "name": "Anita Desai",
            "email": "anita.buyer@revalue.market",
            "password_hash": hash_password("BuyerPass123!"),
            "role": "buyer",
            "is_active": True,
            "phone": "+91-9711098765",
            "address": "15 Park Street, Kolkata, West Bengal",
            "created_at": now - timedelta(days=20),
            "updated_at": now - timedelta(days=20),
            "average_rating": 5.0,
            "review_count": 3,
        },
        {
            "id": "usr_buyer_002",
            "name": "Vikram Malhotra",
            "email": "vikram.buyer@revalue.market",
            "password_hash": hash_password("BuyerPass123!"),
            "role": "buyer",
            "is_active": True,
            "phone": "+91-9988776655",
            "address": "404 Cyber City, DLF Phase 2, Gurugram, Haryana",
            "created_at": now - timedelta(days=15),
            "updated_at": now - timedelta(days=15),
            "average_rating": 4.7,
            "review_count": 2,
        },
    ]

    for u in users_data:
        db.users.update_one({"email": u["email"]}, {"$set": u}, upsert=True)
    print(f"Seeded {len(users_data)} users (Admin, Sellers, Buyers).")

    # 2. Seed Listings
    products_data = [
        {
            "id": "prod_iphone13_001",
            "seller_id": "usr_seller_001",
            "title": "Apple iPhone 13 (Midnight, 128 GB)",
            "description": "Flawless iPhone 13 used gently for 14 months with tempered glass and Spigen cover. Battery health 88%. Includes original retail box, braided USB-C to Lightning cable.",
            "category": "smartphone",
            "brand": "Apple",
            "model": "iPhone 13",
            "condition": "excellent",
            "asking_price": 38500.0,
            "currency": "INR",
            "original_retail_price": 69900.0,
            "approximate_age_months": 14,
            "specs": {
                "storage_gb": 128,
                "ram_gb": 4,
                "battery_health_percent": 88,
                "screen_size_inches": 6.1,
                "color": "Midnight",
                "has_original_box": True,
                "has_original_charger": True,
                "known_faults": "None, perfect operating condition.",
            },
            "location_city": "Bengaluru",
            "selling_method": "negotiation",
            "images": ["/uploads/products/iphone13_demo.jpg"],
            "status": "active",
            "private_negotiation_settings": {
                "min_acceptable_price": 35000.0,
                "allow_counteroffers": True,
            },
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=3),
        },
        {
            "id": "prod_galaxy_s23_002",
            "seller_id": "usr_seller_001",
            "title": "Samsung Galaxy S23 5G (Phantom Black, 256 GB)",
            "description": "Mint condition Galaxy S23. Dynamic AMOLED 2X 120Hz display, Snapdragon 8 Gen 2 for Galaxy. Tiny micro-hairline on edge bezel, screen is 100% pristine. Bill, box and charging cable present.",
            "category": "smartphone",
            "brand": "Samsung",
            "model": "Galaxy S23",
            "condition": "good",
            "asking_price": 44999.0,
            "currency": "INR",
            "original_retail_price": 74999.0,
            "approximate_age_months": 10,
            "specs": {
                "storage_gb": 256,
                "ram_gb": 8,
                "battery_health_percent": 92,
                "screen_size_inches": 6.1,
                "color": "Phantom Black",
                "has_original_box": True,
                "has_original_charger": True,
                "known_faults": "Slight cosmetic scuff near bottom left bezel.",
            },
            "location_city": "Bengaluru",
            "selling_method": "negotiation",
            "images": ["/uploads/products/s23_demo.jpg"],
            "status": "active",
            "private_negotiation_settings": {
                "min_acceptable_price": 41000.0,
                "allow_counteroffers": True,
            },
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=2),
        },
        {
            "id": "prod_pixel7_003",
            "seller_id": "usr_seller_002",
            "title": "Google Pixel 7 (Obsidian, 128 GB) [Sealed Auction]",
            "description": "Google Tensor G2 powered phone with industry-leading computational photography. Running official Android 14. Excellent battery retention. Available exclusively via Sealed-Bid Auction.",
            "category": "smartphone",
            "brand": "Google",
            "model": "Pixel 7",
            "condition": "excellent",
            "asking_price": 25000.0,
            "currency": "INR",
            "original_retail_price": 59999.0,
            "approximate_age_months": 16,
            "specs": {
                "storage_gb": 128,
                "ram_gb": 8,
                "battery_health_percent": 90,
                "screen_size_inches": 6.3,
                "color": "Obsidian",
                "has_original_box": True,
                "has_original_charger": False,
                "known_faults": "None.",
            },
            "location_city": "Noida",
            "selling_method": "bidding",
            "images": ["/uploads/products/pixel7_demo.jpg"],
            "status": "active",
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1),
        },
        {
            "id": "prod_oneplus11r_004",
            "seller_id": "usr_seller_002",
            "title": "OnePlus 11R 5G (Sonic Black, 128 GB)",
            "description": "100W SUPERVOOC fast charging, Snapdragon 8+ Gen 1, 120Hz Super Fluid AMOLED. Includes 100W power adapter and red cable. Single-owner.",
            "category": "smartphone",
            "brand": "OnePlus",
            "model": "OnePlus 11R",
            "condition": "good",
            "asking_price": 26500.0,
            "currency": "INR",
            "original_retail_price": 39999.0,
            "approximate_age_months": 11,
            "specs": {
                "storage_gb": 128,
                "ram_gb": 8,
                "battery_health_percent": 93,
                "screen_size_inches": 6.74,
                "color": "Sonic Black",
                "has_original_box": True,
                "has_original_charger": True,
                "known_faults": "None.",
            },
            "location_city": "Noida",
            "selling_method": "negotiation",
            "images": ["/uploads/products/oneplus11r_demo.jpg"],
            "status": "active",
            "private_negotiation_settings": {
                "min_acceptable_price": 24000.0,
                "allow_counteroffers": True,
            },
            "created_at": now - timedelta(hours=18),
            "updated_at": now - timedelta(hours=18),
        },
    ]

    for p in products_data:
        db.products.update_one({"id": p["id"]}, {"$set": p}, upsert=True)
    print(f"Seeded {len(products_data)} real smartphone listings.")

    # 3. Seed Sealed-Bid Auction for Pixel 7
    auction_deadline = now + timedelta(days=3)  # Active auction closing in 3 days
    auction_doc = {
        "id": "auc_pixel7_001",
        "product_id": "prod_pixel7_003",
        "seller_id": "usr_seller_002",
        "starting_bid": 25000.0,
        "reserve_price": 29000.0,  # Private reserve price
        "min_increment": 500.0,
        "deadline": auction_deadline,
        "status": "active",
        "total_bids": 1,
        "winner_id": None,
        "winning_amount": None,
        "created_at": now - timedelta(days=1),
        "finalized_at": None,
    }
    db.auctions.update_one({"id": auction_doc["id"]}, {"$set": auction_doc}, upsert=True)

    # Seed one sealed bid from Anita
    bid_doc = {
        "id": "bid_anita_001",
        "auction_id": "auc_pixel7_001",
        "product_id": "prod_pixel7_003",
        "buyer_id": "usr_buyer_001",
        "amount": 27000.0,
        "created_at": now - timedelta(hours=12),
        "updated_at": now - timedelta(hours=12),
    }
    db.bids.update_one({"id": bid_doc["id"]}, {"$set": bid_doc}, upsert=True)
    print("Seeded active Sealed Bidding auction with 1 private bid.")

    # 4. Seed an Active Negotiation on iPhone 13 from Vikram
    offer_doc = {
        "id": "off_vikram_001",
        "product_id": "prod_iphone13_001",
        "buyer_id": "usr_buyer_002",
        "seller_id": "usr_seller_001",
        "amount": 36000.0,
        "currency": "INR",
        "status": "pending",
        "note": "Hi Rajesh, I can pick this up tomorrow in Bellandur if you can do 36k.",
        "counter_history": [
            {
                "sender_id": "usr_buyer_002",
                "sender_role": "buyer",
                "amount": 36000.0,
                "note": "Hi Rajesh, I can pick this up tomorrow in Bellandur if you can do 36k.",
                "created_at": now - timedelta(hours=6),
            }
        ],
        "created_at": now - timedelta(hours=6),
        "updated_at": now - timedelta(hours=6),
    }
    db.offers.update_one({"id": offer_doc["id"]}, {"$set": offer_doc}, upsert=True)
    print("Seeded active Open Negotiation offer on iPhone 13.")

    print("\n[OK] Seed completed successfully.")
    print("Default Test Accounts:")
    print("  Admin:  admin@revalue.market / AdminSecurePass!2026")
    print("  Seller: rajesh.seller@revalue.market / SellerPass123!")
    print("  Buyer:  anita.buyer@revalue.market / BuyerPass123!")


if __name__ == "__main__":
    seed_database()
