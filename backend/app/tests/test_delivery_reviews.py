import pytest
import uuid
from datetime import datetime, timezone
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
    return res.json()["access_token"], res.json()["user"]["id"]


@pytest.fixture(autouse=True)
def setup_db():
    DatabaseManager.connect(force_memory=True)


def test_shipment_receipt_and_review_lifecycle():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")

    db = DatabaseManager.get_db()
    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    prod_id = f"prod_{uuid.uuid4().hex[:8]}"

    # Setup a paid order in database
    now = datetime.now(timezone.utc)
    db.orders.insert_one({
        "order_id": order_id,
        "product_id": prod_id,
        "product_title": "Samsung S21",
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "transaction_price": 28000.0,
        "currency": "INR",
        "status": "paid",
        "purchase_source": "buy_now",
        "shipping_address": {
            "full_name": "Buyer Person",
            "phone": "9876543210",
            "street": "MG Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "country": "India"
        },
        "payout_status": "held",
        "status_history": [],
        "created_at": now,
        "updated_at": now,
    })

    # 1. Seller updates shipment (marks shipped)
    ship_res = client.post(f"/api/v1/orders/{order_id}/shipment", json={
        "courier_name": "Blue Dart Express",
        "tracking_number": "BD982736451",
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert ship_res.status_code == 200
    assert ship_res.json()["courier_name"] == "Blue Dart Express"
    assert ship_res.json()["is_courier_verified"] is False  # Correctly labeled manual seller entry

    # 2. Buyer confirms receipt
    confirm_res = client.post(f"/api/v1/orders/{order_id}/confirm-receipt", headers={"Authorization": f"Bearer {buyer_token}"})
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "completed"

    # 3. Buyer submits 5-star review
    rev_res = client.post("/api/v1/reviews", json={
        "order_id": order_id,
        "rating": 5,
        "comment": "Outstanding smartphone! Fast delivery and packaged with care."
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert rev_res.status_code == 201
    assert rev_res.json()["rating"] == 5

    # 4. Duplicate review for same order rejected
    dup_rev = client.post("/api/v1/reviews", json={
        "order_id": order_id,
        "rating": 4,
        "comment": "Another review."
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert dup_rev.status_code == 409

    # 5. Verify seller aggregate rating updated in users collection
    seller_user = db.users.find_one({"id": seller_id})
    assert seller_user["average_rating"] == 5.0
    assert seller_user["review_count"] == 1


def test_dispute_blocks_payout():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")

    db = DatabaseManager.get_db()
    order_id = f"ord_disp_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)

    db.orders.insert_one({
        "order_id": order_id,
        "product_id": "prod_disp",
        "product_title": "Damaged Phone",
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "transaction_price": 32000.0,
        "status": "shipped",
        "payout_status": "held",
        "shipping_address": {"full_name": "Test", "phone": "123", "street": "X", "city": "Y", "state": "Z", "postal_code": "0", "country": "India"},
        "status_history": [],
        "created_at": now,
        "updated_at": now,
    })

    # Buyer opens dispute
    disp_res = client.post(f"/api/v1/orders/{order_id}/disputes", json={
        "reason": "damaged_item",
        "details": "Screen arrived cracked and power button does not respond."
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert disp_res.status_code == 201

    # Order must be marked disputed and payout status set to blocked_dispute
    order = db.orders.find_one({"order_id": order_id})
    assert order["status"] == "disputed"
    assert order["payout_status"] == "blocked_dispute"
