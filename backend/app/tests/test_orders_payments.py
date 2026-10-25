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


def test_order_creation_and_payment_flow():
    seller_token, _ = create_user("seller")
    buyer_token, _ = create_user("buyer")

    # 1. Seller lists product
    prod_res = client.post("/api/v1/products", json={
        "title": "OnePlus 12 (Emerald Green, 512 GB)",
        "description": "Mint condition flagship device.",
        "category": "smartphone",
        "brand": "OnePlus",
        "model": "OnePlus 12",
        "condition": "excellent",
        "asking_price": 58000.0,
        "selling_method": "negotiation",
    }, headers={"Authorization": f"Bearer {seller_token}"})
    prod_id = prod_res.json()["id"]

    # 2. Buyer attempts to purchase with Buy Now
    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "shipping_address": {
            "full_name": "Deepak Verma",
            "phone": "+91-9876543210",
            "street": "123 MG Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert order_res.status_code == 201
    order = order_res.json()
    assert order["status"] == "pending_payment"
    assert order["transaction_price"] == 58000.0
    order_id = order["order_id"]

    # 3. Seller cannot buy own product
    self_buy_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "shipping_address": {
            "full_name": "Fake Seller",
            "phone": "+91-9876543210",
            "street": "123 MG Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert self_buy_res.status_code == 403

    # 4. Initiate payment
    pay_init = client.post("/api/v1/payments", json={"order_id": order_id}, headers={"Authorization": f"Bearer {buyer_token}"})
    assert pay_init.status_code == 200
    assert pay_init.json()["status"] == "initiated"

    # 5. Complete sandbox payment
    pay_complete = client.post(f"/api/v1/payments/sandbox-complete?order_id={order_id}", headers={"Authorization": f"Bearer {buyer_token}"})
    assert pay_complete.status_code == 200
    assert pay_complete.json()["success"] is True

    # 6. Verify order status transitioned to PAID and product status to SOLD
    order_check = client.get(f"/api/v1/orders/{order_id}", headers={"Authorization": f"Bearer {buyer_token}"}).json()
    assert order_check["status"] == "paid"
    assert order_check["payment_info"]["provider"] == "sandbox"

    prod_check = client.get(f"/api/v1/products/{prod_id}").json()
    assert prod_check["status"] == "sold"


def test_payment_webhook_signature_verification():
    # Attempting to call webhook with invalid signature must be rejected with 401
    webhook_res = client.post(
        "/api/v1/payments/webhooks/sandbox",
        content=b'{"event": "payment.captured", "payload": {"order_id": "test_123"}}',
        headers={"x-webhook-signature": "forged_malicious_signature"}
    )
    assert webhook_res.status_code == 401
