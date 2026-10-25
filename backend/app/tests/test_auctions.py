import pytest
import uuid
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from app.db.connection import DatabaseManager
from main import app

client = TestClient(app)


def create_user(role="buyer"):
    email = f"user_{uuid.uuid4().hex[:8]}@revalue.market"
    client.post("/api/v1/auth/register", json={
        "name": f"Test {role.title()}",
        "email": email,
        "password": "Password123!",
        "role": role
    })
    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    return res.json()["access_token"], email


@pytest.fixture(autouse=True)
def setup_db():
    DatabaseManager.connect(force_memory=True)


def test_sealed_bidding_privacy_and_deadline():
    seller_token, _ = create_user("seller")
    buyer1_token, _ = create_user("buyer")
    buyer2_token, _ = create_user("buyer")

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=2)

    # 1. Seller creates Sealed Bidding listing
    prod_res = client.post("/api/v1/products", json={
        "title": "Google Pixel 8 (Hazel, 128 GB) Sealed Bid",
        "description": "Mint condition Google Pixel 8 flagship.",
        "category": "smartphone",
        "brand": "Google",
        "model": "Pixel 8",
        "condition": "excellent",
        "asking_price": 55000.0,
        "selling_method": "bidding",
        "auction_settings": {
            "starting_bid": 40000.0,
            "reserve_price": 48000.0,  # PRIVATE reserve price
            "min_increment": 500.0,
            "deadline": deadline.isoformat(),
        }
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert prod_res.status_code == 201
    prod = prod_res.json()
    prod_id = prod["id"]
    auction_id = prod["auction_info"]["auction_id"]

    # Verify reserve price is NOT revealed
    assert prod["auction_info"]["has_reserve_price"] is True
    assert "reserve_price" not in prod["auction_info"]

    # 2. Seller cannot bid on own listing
    seller_bid = client.post(f"/api/v1/auctions/{auction_id}/bids", json={"amount": 42000.0}, headers={"Authorization": f"Bearer {seller_token}"})
    assert seller_bid.status_code == 403

    # 3. Buyer 1 bids 45,000
    b1_res = client.post(f"/api/v1/auctions/{auction_id}/bids", json={"amount": 45000.0}, headers={"Authorization": f"Bearer {buyer1_token}"})
    assert b1_res.status_code == 201
    assert b1_res.json()["amount"] == 45000.0

    # 4. Buyer 2 bids 49,000
    b2_res = client.post(f"/api/v1/auctions/{auction_id}/bids", json={"amount": 49000.0}, headers={"Authorization": f"Bearer {buyer2_token}"})
    assert b2_res.status_code == 201

    # 5. Check Bid Privacy: Buyer 1 views auction, sees ONLY own bid, cannot see Buyer 2's bid
    b1_view = client.get(f"/api/v1/auctions/{auction_id}", headers={"Authorization": f"Bearer {buyer1_token}"}).json()
    assert b1_view["total_bids_count"] == 2
    assert b1_view["user_own_bid"]["amount"] == 45000.0
    assert "highest_bid" not in b1_view
    assert b1_view["winner_id"] is None

    # 6. Cannot finalize before deadline
    early_finalize = client.post(f"/api/v1/auctions/{auction_id}/finalize")
    assert early_finalize.status_code == 422
    assert "deadline" in early_finalize.json()["error"]["message"].lower()


def test_sealed_bidding_deterministic_finalization_with_reserve():
    seller_token, _ = create_user("seller")
    buyer1_token, _ = create_user("buyer")
    buyer2_token, _ = create_user("buyer")

    db = DatabaseManager.get_db()
    # Create an auction whose deadline has already elapsed (in past)
    past_deadline = datetime.now(timezone.utc) - timedelta(minutes=5)
    auction_id = str(uuid.uuid4())
    prod_id = str(uuid.uuid4())

    db.products.insert_one({
        "id": prod_id,
        "title": "Vintage Phone",
        "seller_id": "seller_abc",
        "asking_price": 20000.0,
        "selling_method": "bidding",
        "status": "active",
        "created_at": past_deadline - timedelta(days=2),
        "updated_at": past_deadline - timedelta(days=2),
    })

    db.auctions.insert_one({
        "id": auction_id,
        "product_id": prod_id,
        "seller_id": "seller_abc",
        "starting_bid": 10000.0,
        "reserve_price": 15000.0,
        "min_increment": 500.0,
        "deadline": past_deadline,
        "status": "active",
        "created_at": past_deadline - timedelta(days=2),
    })

    # Case A: Bid below reserve (12,000 < 15,000 reserve)
    db.bids.insert_one({
        "id": "bid_low",
        "auction_id": auction_id,
        "product_id": prod_id,
        "buyer_id": "buyer_low",
        "amount": 12000.0,
        "created_at": past_deadline - timedelta(hours=1),
    })

    # Finalize -> closed_no_winner because reserve wasn't met!
    fin_res1 = client.post(f"/api/v1/auctions/{auction_id}/finalize")
    assert fin_res1.status_code == 200
    assert fin_res1.json()["status"] == "closed_no_winner"
    assert fin_res1.json()["winner_id"] is None

    # Case B: Re-open with bids meeting reserve (16,000 and 18,000)
    db.auctions.update_one({"id": auction_id}, {"$set": {"status": "active"}})
    db.bids.insert_one({
        "id": "bid_winner",
        "auction_id": auction_id,
        "product_id": prod_id,
        "buyer_id": "buyer_winner",
        "amount": 18000.0,
        "created_at": past_deadline - timedelta(hours=2),
    })

    fin_res2 = client.post(f"/api/v1/auctions/{auction_id}/finalize")
    assert fin_res2.status_code == 200
    data2 = fin_res2.json()
    assert data2["status"] == "finalized"
    assert data2["winner_id"] == "buyer_winner"
    assert data2["winning_amount"] == 18000.0
