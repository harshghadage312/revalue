import pytest
import uuid
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


def test_open_negotiation_full_flow():
    seller_token, _ = create_user("seller")
    buyer_token, _ = create_user("buyer")

    # Seller creates product
    prod_res = client.post("/api/v1/products", json={
        "title": "Xiaomi 13 Pro 5G (Ceramic Black, 256 GB)",
        "description": "Leica optics, Snapdragon 8 Gen 2, 120W HyperCharge.",
        "category": "smartphone",
        "brand": "Xiaomi",
        "model": "13 Pro",
        "condition": "excellent",
        "asking_price": 50000.0,
        "selling_method": "negotiation",
        "negotiation_settings": {
            "min_acceptable_price": 45000.0,
            "allow_counteroffers": True,
        }
    }, headers={"Authorization": f"Bearer {seller_token}"})
    prod_id = prod_res.json()["id"]

    # 1. Seller cannot make offer on own product
    self_offer_res = client.post("/api/v1/offers", json={
        "product_id": prod_id,
        "amount": 48000.0
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert self_offer_res.status_code == 403

    # 2. Buyer submits valid offer
    offer_res = client.post("/api/v1/offers", json={
        "product_id": prod_id,
        "amount": 44000.0,
        "note": "Can close today for 44k."
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert offer_res.status_code == 201
    offer_data = offer_res.json()
    assert offer_data["amount"] == 44000.0
    assert offer_data["status"] == "pending"
    offer_id = offer_data["id"]

    # 3. Seller requests AI negotiation suggestion
    sugg_res = client.get(f"/api/v1/offers/{offer_id}/suggestion", headers={"Authorization": f"Bearer {seller_token}"})
    assert sugg_res.status_code == 200
    suggestion = sugg_res.json()
    assert suggestion["recommendation"] in ["counter", "accept", "manual_review"]
    assert suggestion["suggested_counter_amount"] is not None

    # 4. Seller counters offer
    counter_res = client.post(f"/api/v1/offers/{offer_id}/counter", json={
        "amount": 47000.0,
        "note": "47k is my best price including all accessories."
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert counter_res.status_code == 200
    assert counter_res.json()["status"] == "countered"
    assert counter_res.json()["amount"] == 47000.0
    assert len(counter_res.json()["counter_history"]) == 2

    # 5. Buyer accepts counteroffer
    accept_res = client.post(f"/api/v1/offers/{offer_id}/accept", headers={"Authorization": f"Bearer {buyer_token}"})
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # 6. Verify product is atomically moved to RESERVED
    check_prod = client.get(f"/api/v1/products/{prod_id}").json()
    assert check_prod["status"] == "reserved"


def test_rule_based_negotiation_boundary_rules():
    # Test lowball offer (< 50% discount) -> REJECT
    res_lowball = client.post("/api/v1/ml/negotiation-suggestion", json={
        "asking_price": 50000.0,
        "buyer_offer": 20000.0,
        "condition": "good"
    })
    assert res_lowball.status_code == 200
    assert res_lowball.json()["recommendation"] == "reject"

    # Test full price offer -> ACCEPT
    res_full = client.post("/api/v1/ml/negotiation-suggestion", json={
        "asking_price": 50000.0,
        "buyer_offer": 50000.0,
        "condition": "good"
    })
    assert res_full.status_code == 200
    assert res_full.json()["recommendation"] == "accept"


def test_turn_taking_and_self_acceptance_prevention():
    seller_token, _ = create_user("seller")
    buyer_token, _ = create_user("buyer")

    prod_res = client.post("/api/v1/products", json={
        "title": "Samsung Galaxy S23 (Lavender, 128 GB)",
        "description": "Like-new condition.",
        "category": "smartphone",
        "brand": "Samsung",
        "model": "Galaxy S23",
        "condition": "excellent",
        "asking_price": 60000.0,
        "selling_method": "negotiation",
    }, headers={"Authorization": f"Bearer {seller_token}"})
    prod_id = prod_res.json()["id"]

    # 1. Buyer creates initial offer
    offer_res = client.post("/api/v1/offers", json={
        "product_id": prod_id,
        "amount": 54000.0,
        "note": "Initial offer"
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert offer_res.status_code == 201
    offer_id = offer_res.json()["id"]

    # 2. Buyer cannot accept own opening offer
    accept_own = client.post(f"/api/v1/offers/{offer_id}/accept", headers={"Authorization": f"Bearer {buyer_token}"})
    assert accept_own.status_code == 403
    assert "cannot accept their own opening offer" in accept_own.json()["error"]["message"]

    # 3. Buyer cannot counter own offer without seller response
    counter_own = client.post(f"/api/v1/offers/{offer_id}/counter", json={
        "amount": 55000.0
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert counter_own.status_code == 409
    assert "already submitted an offer" in counter_own.json()["error"]["message"]

    # 4. Seller counters
    seller_counter = client.post(f"/api/v1/offers/{offer_id}/counter", json={
        "amount": 57000.0,
        "note": "Seller counter"
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert seller_counter.status_code == 200

    # 5. Seller cannot accept own counteroffer
    seller_accept_own = client.post(f"/api/v1/offers/{offer_id}/accept", headers={"Authorization": f"Bearer {seller_token}"})
    assert seller_accept_own.status_code == 403
    assert "cannot accept your own counteroffer" in seller_accept_own.json()["error"]["message"]

    # 6. Seller cannot counter twice in a row without buyer response
    seller_double_counter = client.post(f"/api/v1/offers/{offer_id}/counter", json={
        "amount": 56500.0
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert seller_double_counter.status_code == 409
    assert "wait for the other party" in seller_double_counter.json()["error"]["message"]

    # 7. Buyer successfully accepts seller's counteroffer
    buyer_accept = client.post(f"/api/v1/offers/{offer_id}/accept", headers={"Authorization": f"Bearer {buyer_token}"})
    assert buyer_accept.status_code == 200
    assert buyer_accept.json()["status"] == "accepted"
