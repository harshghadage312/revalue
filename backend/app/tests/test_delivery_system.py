import pytest
import uuid
import hmac
import hashlib
import json
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from app.db.connection import DatabaseManager
from app.core.config import settings
from app.schemas.orders import OrderStatus, PayoutStatus, PaymentMethod
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


def create_sample_product(seller_token, asking_price=25000.0, city="Mumbai"):
    res = client.post("/api/v1/products", json={
        "title": "OnePlus 11 5G 128GB",
        "description": "Mint condition smartphone with original box.",
        "category": "smartphone",
        "brand": "OnePlus",
        "model": "11 5G",
        "asking_price": asking_price,
        "condition": "excellent",
        "selling_method": "negotiation",
        "location_city": city,
    }, headers={"Authorization": f"Bearer {seller_token}"})
    if res.status_code != 201:
        raise Exception(f"Failed to create product: {res.text}")
    return res.json()["id"]


def test_shipping_quote_and_pincode_serviceability():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=30000.0)

    # 1. Valid serviceable Indian PIN codes (e.g. 560001 Bengaluru)
    quote_res = client.post("/api/v1/orders/shipping/quotes", json={
        "product_id": prod_id,
        "delivery_pincode": "560001",
        "is_cod": True,
        "opt_in_insurance": True
    })
    assert quote_res.status_code == 200
    data = quote_res.json()
    assert data["is_serviceable"] is True
    assert len(data["quotes"]) >= 2
    for q in data["quotes"]:
        assert q["rate"] > 0
        assert q["insurance_fee"] > 0
        assert q["cod_charges"] > 0

    # 2. Non-serviceable PIN code (e.g. 999999)
    unserv_res = client.post("/api/v1/orders/shipping/quotes", json={
        "product_id": prod_id,
        "delivery_pincode": "999999",
        "is_cod": False,
        "opt_in_insurance": False
    })
    assert unserv_res.status_code == 200
    assert unserv_res.json()["is_serviceable"] is False
    assert len(unserv_res.json()["quotes"]) == 0


def test_order_creation_with_locked_quote_and_insurance():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=20000.0)

    # Fetch live quotes
    quote_res = client.post("/api/v1/orders/shipping/quotes", json={
        "product_id": prod_id,
        "delivery_pincode": "110001",
        "is_cod": False,
        "opt_in_insurance": True
    })
    quotes = quote_res.json()["quotes"]
    selected_quote = quotes[0]

    # Checkout with locked quote
    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "payment_method": "prepaid",
        "quote_id": selected_quote["quote_id"],
        "courier_id": selected_quote["courier_id"],
        "opt_in_insurance": True,
        "shipping_address": {
            "full_name": "Delhi Buyer",
            "phone": "9811122233",
            "street": "Connaught Place",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})

    assert order_res.status_code == 201
    order = order_res.json()
    assert order["item_price"] == 20000.0
    assert order["shipping_fee"] == selected_quote["rate"]
    assert order["insurance_fee"] == selected_quote["insurance_fee"]
    assert order["total_amount"] == 20000.0 + selected_quote["rate"] + selected_quote["insurance_fee"]
    assert order["status"] == "pending_payment"


def test_seller_shipment_booking_and_battery_safety_enforcement():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=24000.0)

    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "payment_method": "prepaid",
        "shipping_address": {
            "full_name": "Rohan Sharma",
            "phone": "9876543210",
            "street": "Andheri West",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400053",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    order_id = order_res.json()["order_id"]

    # Mark paid via internal payment service
    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock123", "razorpay", 24000.0)

    # 1. Attempt to book WITHOUT battery declaration -> must fail
    fail_book = client.post(f"/api/v1/orders/{order_id}/shipment/book", json={
        "package_weight_kg": 0.45,
        "length_cm": 18.0,
        "breadth_cm": 10.0,
        "height_cm": 5.0,
        "is_battery_declared": False
    }, headers={"Authorization": f"Bearer {seller_token}"})
    assert fail_book.status_code == 422 or fail_book.status_code == 400

    # 2. Valid booking with battery declaration
    book_res = client.post(f"/api/v1/orders/{order_id}/shipment/book", json={
        "package_weight_kg": 0.45,
        "length_cm": 18.0,
        "breadth_cm": 10.0,
        "height_cm": 5.0,
        "imei_or_serial": "358742091823746",
        "is_battery_declared": True,
        "pickup_time_slot": "10:00 - 14:00"
    }, headers={"Authorization": f"Bearer {seller_token}"})

    assert book_res.status_code == 200
    shipment_info = book_res.json()
    assert shipment_info["awb_code"] is not None
    assert shipment_info["label_url"] is not None
    assert shipment_info["is_courier_verified"] is False  # Physical handover NOT yet confirmed!

    # 3. Label retrieval endpoint
    label_res = client.get(f"/api/v1/orders/{order_id}/shipment/label", headers={"Authorization": f"Bearer {seller_token}"})
    assert label_res.status_code == 200
    assert label_res.json()["awb_code"] == shipment_info["awb_code"]
    assert "label_url" in label_res.json()


def test_physical_handover_rule_and_delivery_otp_generation():
    """
    Physical Handover Rule: Generating a label is NOT a handover.
    Only explicit handover records PICKED_UP and generates buyer OTP.
    """
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=22000.0)

    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "payment_method": "prepaid",
        "shipping_address": {
            "full_name": "Ananya Roy",
            "phone": "9820011223",
            "street": "Park Street",
            "city": "Kolkata",
            "state": "West Bengal",
            "postal_code": "700016",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    order_id = order_res.json()["order_id"]

    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock456", "razorpay", 22000.0)

    # Seller books shipment
    client.post(f"/api/v1/orders/{order_id}/shipment/book", json={
        "package_weight_kg": 0.45,
        "is_battery_declared": True
    }, headers={"Authorization": f"Bearer {seller_token}"})

    # Verify status is still SHIPMENT_BOOKED, NOT picked up
    track_pre = client.get(f"/api/v1/orders/{order_id}/tracking", headers={"Authorization": f"Bearer {buyer_token}"})
    assert track_pre.json()["status"] == "shipment_booked"
    assert track_pre.json()["delivery_otp_masked"] is None

    # Courier scans manifest and completes physical handover
    handover_res = client.post(f"/api/v1/orders/{order_id}/shipment/handover", json={
        "notes": "Driver ID #4092 collected package from seller doorstep."
    }, headers={"Authorization": f"Bearer {seller_token}"})

    assert handover_res.status_code == 200
    assert handover_res.json()["status"] == "picked_up"
    assert handover_res.json()["delivery_otp_masked"] is not None

    # Check tracking reflects picked up & has masked OTP
    track_post = client.get(f"/api/v1/orders/{order_id}/tracking", headers={"Authorization": f"Bearer {buyer_token}"})
    assert track_post.json()["status"] == "picked_up"
    assert track_post.json()["shipment_info"]["is_courier_verified"] is True
    assert track_post.json()["delivery_otp_masked"] == handover_res.json()["delivery_otp_masked"]


def test_delivery_otp_verification_and_48h_inspection_activation():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=35000.0)

    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "payment_method": "prepaid",
        "shipping_address": {
            "full_name": "Vikram Seth",
            "phone": "9810098100",
            "street": "Cyber City",
            "city": "Gurugram",
            "state": "Haryana",
            "postal_code": "122002",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    order_id = order_res.json()["order_id"]

    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock789", "razorpay", 35000.0)

    client.post(f"/api/v1/orders/{order_id}/shipment/book", json={"is_battery_declared": True}, headers={"Authorization": f"Bearer {seller_token}"})
    client.post(f"/api/v1/orders/{order_id}/shipment/handover", json={}, headers={"Authorization": f"Bearer {seller_token}"})

    # Retrieve deterministic mock OTP from courier provider
    from app.integrations.courier.manager import get_courier_provider
    provider = get_courier_provider()
    stored_otp = provider._otps.get(order_id, {}).get("code_for_sandbox", "789123")

    # 1. Invalid OTP rejection
    bad_otp_res = client.post(f"/api/v1/orders/{order_id}/delivery/otp/verify", json={
        "entered_otp": "000000"
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert bad_otp_res.status_code == 422 or bad_otp_res.status_code == 400

    # 2. Correct OTP acceptance -> transitions to DELIVERED & begins 48h inspection
    verify_res = client.post(f"/api/v1/orders/{order_id}/delivery/otp/verify", json={
        "entered_otp": stored_otp
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "delivered"
    assert verify_res.json()["inspection_deadline"] is not None

    # Check tracking has active inspection deadline and countdown hours left (~48h)
    track_res = client.get(f"/api/v1/orders/{order_id}/tracking", headers={"Authorization": f"Bearer {buyer_token}"})
    assert track_res.json()["status"] == "delivered"
    assert track_res.json()["payout_status"] == "held_inspection"
    assert track_res.json()["inspection_hours_left"] > 47.0


def test_buyer_inspection_checklist_and_receipt_confirmation():
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=18000.0)

    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "shipping_address": {
            "full_name": "Priya Nair",
            "phone": "9845012345",
            "street": "Koramangala",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560034",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    order_id = order_res.json()["order_id"]

    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock101", "razorpay", 18000.0)
    client.post(f"/api/v1/orders/{order_id}/shipment/book", json={"is_battery_declared": True}, headers={"Authorization": f"Bearer {seller_token}"})
    client.post(f"/api/v1/orders/{order_id}/shipment/handover", json={}, headers={"Authorization": f"Bearer {seller_token}"})

    from app.integrations.courier.manager import get_courier_provider
    provider = get_courier_provider()
    stored_otp = provider._otps.get(order_id, {}).get("code_for_sandbox", "789123")
    client.post(f"/api/v1/orders/{order_id}/delivery/otp/verify", json={"entered_otp": stored_otp}, headers={"Authorization": f"Bearer {buyer_token}"})

    # Buyer submits inspection checklist
    check_res = client.post(f"/api/v1/orders/{order_id}/inspection/checklist", json={
        "screen_ok": True,
        "touch_ok": True,
        "cameras_ok": True,
        "audio_ok": True,
        "charging_battery_ok": True,
        "physical_condition_matches": True,
        "imei_matches": True,
        "notes": "Device in perfect working condition."
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert check_res.status_code == 200
    assert check_res.json()["all_passed"] is True

    # Buyer confirms receipt -> releases held payout to seller
    confirm_res = client.post(f"/api/v1/orders/{order_id}/confirm-receipt", headers={"Authorization": f"Bearer {buyer_token}"})
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "completed"

    # Verify order payout is released
    db = DatabaseManager.get_db()
    order_doc = db.orders.find_one({"order_id": order_id})
    assert order_doc["status"] == "completed"
    assert order_doc["payout_status"] == "released"


def test_inspection_timeout_auto_acceptance():
    """
    If 48 hours pass without dispute, order auto-completes and releases seller payout.
    """
    admin_token, admin_id = create_user("admin")
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=15000.0)

    db = DatabaseManager.get_db()
    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    past_inspection_deadline = datetime.now(timezone.utc) - timedelta(hours=2)

    db.orders.insert_one({
        "order_id": order_id,
        "product_id": prod_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "transaction_price": 15000.0,
        "item_price": 15000.0,
        "status": "delivered",
        "payout_status": "held_inspection",
        "inspection_deadline": past_inspection_deadline,
        "status_history": [],
        "created_at": datetime.now(timezone.utc) - timedelta(days=3),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=3),
    })

    # Trigger inspection timeout cron endpoint
    timeout_res = client.post("/api/v1/orders/inspection/process-timeouts", headers={"Authorization": f"Bearer {admin_token}"})
    assert timeout_res.status_code == 200
    assert timeout_res.json()["processed_count"] >= 1

    # Check order was completed and payout released
    updated_order = db.orders.find_one({"order_id": order_id})
    assert updated_order["status"] == "completed"
    assert updated_order["payout_status"] == "released"


def test_buyer_dispute_immediately_blocks_payout_and_resolutions():
    admin_token, admin_id = create_user("admin")
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=27000.0)

    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "shipping_address": {
            "full_name": "Kavita Rao",
            "phone": "9988776655",
            "street": "MG Road",
            "city": "Pune",
            "state": "Maharashtra",
            "postal_code": "411001",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    order_id = order_res.json()["order_id"]

    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock999", "razorpay", 27000.0)
    client.post(f"/api/v1/orders/{order_id}/shipment/book", json={"is_battery_declared": True}, headers={"Authorization": f"Bearer {seller_token}"})
    client.post(f"/api/v1/orders/{order_id}/shipment/handover", json={}, headers={"Authorization": f"Bearer {seller_token}"})

    from app.integrations.courier.manager import get_courier_provider
    provider = get_courier_provider()
    stored_otp = provider._otps.get(order_id, {}).get("code_for_sandbox", "789123")
    client.post(f"/api/v1/orders/{order_id}/delivery/otp/verify", json={"entered_otp": stored_otp}, headers={"Authorization": f"Bearer {buyer_token}"})

    # 1. Buyer opens dispute -> immediately freezes payout
    disp_res = client.post(f"/api/v1/orders/{order_id}/disputes", json={
        "reason": "damaged_item",
        "details": "Screen has a hairline crack and charging port is loose.",
        "preferred_resolution": "return_and_refund",
        "evidence_images": ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
    }, headers={"Authorization": f"Bearer {buyer_token}"})

    assert disp_res.status_code == 201
    dispute_id = disp_res.json()["id"]

    # Verify payout is BLOCKED
    db = DatabaseManager.get_db()
    order_doc = db.orders.find_one({"order_id": order_id})
    assert order_doc["status"] == "disputed"
    assert order_doc["payout_status"] == "blocked_dispute"

    # Attempting to confirm receipt while dispute is open must be rejected
    cant_confirm = client.post(f"/api/v1/orders/{order_id}/confirm-receipt", headers={"Authorization": f"Bearer {buyer_token}"})
    assert cant_confirm.status_code == 409

    # 2. Admin resolves dispute with full refund to buyer
    resolve_res = client.post(f"/api/v1/admin/disputes/{dispute_id}/resolve", json={
        "resolution": "refund_buyer_full",
        "resolution_notes": "Damage confirmed from uploaded unboxing images. Full refund issued."
    }, headers={"Authorization": f"Bearer {admin_token}"})

    assert resolve_res.status_code == 200
    updated_order = db.orders.find_one({"order_id": order_id})
    assert updated_order["status"] == "refunded"
    assert updated_order["payout_status"] == "refunded_to_buyer"


def test_cod_flow_and_admin_reconciliation():
    admin_token, admin_id = create_user("admin")
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=12000.0)

    # 1. Place COD order
    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "payment_method": "cod",
        "shipping_address": {
            "full_name": "Suresh Raina",
            "phone": "9812345678",
            "street": "Civil Lines",
            "city": "Lucknow",
            "state": "Uttar Pradesh",
            "postal_code": "226001",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})

    assert order_res.status_code == 201
    order = order_res.json()
    order_id = order["order_id"]
    assert order["payment_method"] == "cod"
    assert order["status"] == "processing"  # Immediately active without online prepayment
    assert order["cod_fee"] == 50.0

    # 2. Seller books shipment
    book_res = client.post(f"/api/v1/orders/{order_id}/shipment/book", json={"is_battery_declared": True}, headers={"Authorization": f"Bearer {seller_token}"})
    awb_code = book_res.json()["awb_code"]

    # 3. Check admin COD reconciliation queue
    cod_queue = client.get("/api/v1/admin/cod/reconciliation", headers={"Authorization": f"Bearer {admin_token}"})
    assert cod_queue.status_code == 200
    orders_list = cod_queue.json()["cod_orders"]
    matching = [o for o in orders_list if o["order_id"] == order_id]
    assert len(matching) == 1
    assert matching[0]["cod_status"] == "pending_collection"

    # 4. Reconcile with exact remitted amount
    expected_amount = order["total_amount"]
    rec_res = client.post("/api/v1/admin/cod/reconcile", json={
        "awb_code": awb_code,
        "remitted_amount": expected_amount,
        "courier_reference": "REMIT-UTR-982341",
        "notes": "Delhivery weekly COD batch payout."
    }, headers={"Authorization": f"Bearer {admin_token}"})

    assert rec_res.status_code == 200
    assert rec_res.json()["status"] == "reconciled"
    assert rec_res.json()["difference"] == 0.0


def test_courier_webhook_signature_and_milestones():
    admin_token, admin_id = create_user("admin")
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=21000.0)

    order_res = client.post("/api/v1/orders", json={
        "product_id": prod_id,
        "purchase_source": "buy_now",
        "shipping_address": {
            "full_name": "Anita Das",
            "phone": "9830098300",
            "street": "Salt Lake",
            "city": "Kolkata",
            "state": "West Bengal",
            "postal_code": "700091",
            "country": "India"
        }
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    order_id = order_res.json()["order_id"]

    from app.services.order_service import OrderService
    OrderService.mark_order_paid(order_id, "pay_mock321", "razorpay", 21000.0)
    book_res = client.post(f"/api/v1/orders/{order_id}/shipment/book", json={"is_battery_declared": True}, headers={"Authorization": f"Bearer {seller_token}"})
    awb = book_res.json()["awb_code"]

    webhook_payload = {
        "awb": awb,
        "order_id": order_id,
        "current_status": "IN TRANSIT",
        "activity": "Package arrived at sorting facility",
        "location": "Bhiwandi Hub, MH"
    }

    # Generate HMAC signature
    from app.integrations.courier.manager import get_courier_provider
    provider = get_courier_provider()
    secret = provider.webhook_secret
    body_bytes = json.dumps(webhook_payload).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    # Webhook call with matching signature
    wh_res = client.post("/api/v1/courier/webhook/sandbox", content=body_bytes, headers={
        "content-type": "application/json",
        "x-courier-signature": sig
    })
    assert wh_res.status_code == 200
    assert wh_res.json()["status"] == "processed"
    assert wh_res.json()["canonical_status"] == "in_transit"

    # Check order status updated
    db = DatabaseManager.get_db()
    order_doc = db.orders.find_one({"order_id": order_id})
    assert order_doc["status"] == "in_transit"


def test_admin_delivery_console_and_courier_health():
    admin_token, admin_id = create_user("admin")
    seller_token, seller_id = create_user("seller")
    buyer_token, buyer_id = create_user("buyer")
    prod_id = create_sample_product(seller_token, asking_price=19000.0)

    # 1. Admin shipments list
    shipments_res = client.get("/api/v1/admin/shipments", headers={"Authorization": f"Bearer {admin_token}"})
    assert shipments_res.status_code == 200
    assert "shipments" in shipments_res.json()

    # 2. Courier provider health endpoint
    health_res = client.get("/api/v1/admin/courier/health", headers={"Authorization": f"Bearer {admin_token}"})
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert "active_provider" in health_data
    assert health_data["is_healthy"] is True
    assert health_data["sample_quotes_available"] > 0
    assert health_data["dispatch_deadline_hours"] == 48
    assert health_data["inspection_window_hours"] == 48
