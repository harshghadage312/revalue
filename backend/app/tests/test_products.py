import pytest
import uuid
from starlette.testclient import TestClient
from app.db.connection import DatabaseManager
from main import app

client = TestClient(app)


def get_auth_token(role="seller"):
    email = f"user_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": "Listing User",
        "email": email,
        "password": "Password123!",
        "role": role
    })
    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    return res.json()["access_token"]


@pytest.fixture(autouse=True)
def setup_db():
    DatabaseManager.connect(force_memory=True)


def test_create_and_get_product_negotiation():
    token = get_auth_token("seller")
    payload = {
        "title": "OnePlus 11 5G (Titan Black, 256 GB)",
        "description": "Mint condition phone with original charger and retail box. Used for 8 months.",
        "category": "smartphone",
        "brand": "OnePlus",
        "model": "OnePlus 11",
        "condition": "excellent",
        "asking_price": 42000.0,
        "currency": "INR",
        "original_retail_price": 61999.0,
        "approximate_age_months": 8,
        "location_city": "Mumbai",
        "selling_method": "negotiation",
        "specs": {
            "storage_gb": 256,
            "ram_gb": 16,
            "battery_health_percent": 95,
        },
        "negotiation_settings": {
            "min_acceptable_price": 38000.0,
            "allow_counteroffers": True,
        }
    }

    create_res = client.post("/api/v1/products", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    prod = create_res.json()
    assert prod["title"] == payload["title"]
    assert prod["asking_price"] == 42000.0
    assert prod["selling_method"] == "negotiation"
    # Reserve / min price must NEVER leak in public schema
    assert "private_negotiation_settings" not in prod
    assert "min_acceptable_price" not in prod

    prod_id = prod["id"]
    get_res = client.get(f"/api/v1/products/{prod_id}")
    assert get_res.status_code == 200
    public_prod = get_res.json()
    assert public_prod["id"] == prod_id
    assert "min_acceptable_price" not in public_prod


def test_search_and_filtering():
    token = get_auth_token("seller")
    # Create product 1: Apple
    client.post("/api/v1/products", json={
        "title": "Apple iPhone 12 Pro (Pacific Blue, 128 GB)",
        "description": "Clean device with box.",
        "category": "smartphone",
        "brand": "Apple",
        "model": "iPhone 12 Pro",
        "condition": "good",
        "asking_price": 45000.0,
        "location_city": "Delhi",
        "selling_method": "negotiation",
    }, headers={"Authorization": f"Bearer {token}"})

    # Create product 2: Samsung
    client.post("/api/v1/products", json={
        "title": "Samsung Galaxy S22 (Green, 128 GB)",
        "description": "Great phone, no scratches.",
        "category": "smartphone",
        "brand": "Samsung",
        "model": "Galaxy S22",
        "condition": "excellent",
        "asking_price": 35000.0,
        "location_city": "Bengaluru",
        "selling_method": "negotiation",
    }, headers={"Authorization": f"Bearer {token}"})

    # Filter by brand
    res_apple = client.get("/api/v1/products?brand=Apple")
    assert res_apple.status_code == 200
    items = res_apple.json()["items"]
    assert all(item["brand"] == "Apple" for item in items)

    # Filter by price range
    res_price = client.get("/api/v1/products?min_price=40000&max_price=50000")
    assert res_price.status_code == 200
    for item in res_price.json()["items"]:
        assert 40000.0 <= item["asking_price"] <= 50000.0


def test_cannot_edit_other_seller_listing():
    seller1_token = get_auth_token("seller")
    seller2_token = get_auth_token("seller")

    create_res = client.post("/api/v1/products", json={
        "title": "Seller 1 Listing",
        "description": "Listing by seller 1 description.",
        "category": "smartphone",
        "brand": "Google",
        "model": "Pixel 6",
        "condition": "good",
        "asking_price": 28000.0,
        "selling_method": "negotiation",
    }, headers={"Authorization": f"Bearer {seller1_token}"})
    prod_id = create_res.json()["id"]

    # Seller 2 attempts to edit
    edit_res = client.put(f"/api/v1/products/{prod_id}", json={
        "title": "Hacked Title"
    }, headers={"Authorization": f"Bearer {seller2_token}"})
    assert edit_res.status_code == 403


def test_auction_starting_price_consistency():
    """Verify that starting bid is consistent across creation, listing cards, and detail response."""
    seller_token = get_auth_token("seller")
    from datetime import datetime, timezone, timedelta
    deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    payload = {
        "title": "Google Pixel 7 Pro (Hazel, 128 GB)",
        "description": "Like new sealed auction listing.",
        "category": "smartphone",
        "brand": "Google",
        "model": "Pixel 7 Pro",
        "condition": "excellent",
        "asking_price": 28000.0,
        "location_city": "Pune",
        "selling_method": "bidding",
        "auction_settings": {
            "starting_bid": 25000.0,
            "reserve_price": 32000.0,
            "min_increment": 500,
            "deadline": deadline,
        }
    }

    create_res = client.post("/api/v1/products", json=payload, headers={"Authorization": f"Bearer {seller_token}"})
    assert create_res.status_code == 201
    prod = create_res.json()

    # The starting_bid field must be authoritative and equal to 25000.0
    assert prod["starting_bid"] == 25000.0
    # asking_price should also align with starting_bid for bidding listings
    assert prod["asking_price"] == 25000.0
    # Private reserve price must NEVER be exposed
    assert "reserve_price" not in prod
    assert "private_auction_settings" not in prod

    prod_id = prod["id"]

    # Verify detail response
    get_res = client.get(f"/api/v1/products/{prod_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["starting_bid"] == 25000.0
    assert detail["asking_price"] == 25000.0
    assert detail["auction_info"]["starting_bid"] == 25000.0
    assert "reserve_price" not in detail
    assert "reserve_price" not in (detail.get("auction_info") or {})

    # Verify list response (marketplace cards)
    list_res = client.get("/api/v1/products?selling_method=bidding")
    assert list_res.status_code == 200
    matched = [p for p in list_res.json()["items"] if p["id"] == prod_id]
    assert len(matched) == 1
    assert matched[0]["starting_bid"] == 25000.0
