# ReValue Delivery, Logistics, Buyer Protection & Marketplace Settlement System

## 1. Architectural Overview & Design Philosophy

ReValue operates as an AI-assisted marketplace for pre-owned smartphones across India. Unlike open classifieds, ReValue guarantees transaction safety, verified physical logistics, doorstep delivery verification, and protected seller payouts.

The delivery and marketplace settlement engine adheres to strict commercial and regulatory requirements:
1. **Never Improvise Banking Escrow**: Funds are handled via licensed payment gateways (Prepaid) or verified logistics remittances (Cash on Delivery). ReValue coordinates payout authorizations and settlement releases based on verified physical milestones and inspection completion.
2. **Strict Physical Handover Rule**: Booking a courier and printing an Air Waybill (AWB) shipping label is purely an administrative step. The parcel is **never** considered dispatched or in-transit until the courier driver physically scans the manifest barcode at pickup.
3. **Doorstep Proof of Delivery (POD) & Delivery OTP**: A secure 6-digit one-time password (OTP) is issued to the buyer and masked until physical handover. The delivery agent must input this OTP to record verified delivery.
4. **48-Hour Buyer Inspection Window**: Delivery marks the start of an irrevocable 48-hour countdown during which the buyer tests the smartphone against a 7-point hardware inspection checklist.
5. **Immediate Payout Freeze on Dispute**: If an issue arises (e.g., IMEI mismatch, undisclosed physical defect, hardware failure), opening a dispute instantly freezes seller payouts until an administrator arbitrates.
6. **Lithium-ion Battery Safety**: Strict enforcement of packaging protocols and UN 3481 hazardous material declarations before any shipping label can be issued.

---

## 2. Canonical State Machine (Order to Settlement)

```
[ ORDER CREATION ]
       │
       ▼
  payment_pending ──► paid / confirmed ──► seller_dispatch_pending
                                                  │ (48h dispatch deadline)
                                                  ▼
                                           shipment_booked (AWB assigned, Label printed)
                                                  │
                                                  ▼ (Physical Manifest Scan)
                                              picked_up / in_transit
                                                  │
                                                  ▼
                                           out_for_delivery
                                                  │
                                                  ▼ (Doorstep Delivery OTP Verified)
                                              delivered
                                                  │
                     ┌────────────────────────────┴────────────────────────────┐
                     │ (48h Buyer Inspection Window)                           │
                     ▼                                                         ▼
         [Receipt Confirmed / 48h Timeout]                              [Dispute Opened]
                     │                                                         │
                     ▼                                                         ▼
              completed_settled                                      dispute_pending (Payout Frozen)
                     │                                                         │
               Payout Released                                       Admin Arbitration
                                                               ┌───────────────┼───────────────┐
                                                               ▼               ▼               ▼
                                                          Full Refund    Partial Refund   Return Reverse
                                                                                             Pickup
```

### 2.1 Complete Canonical State Index

| State Key | Domain | Description | Trigger / Actor |
|---|---|---|---|
| `pending` | Order | Order created, awaiting payment confirmation or COD approval | Buyer |
| `paid` | Order | Prepaid funds captured by payment gateway | Webhook / Gateway |
| `seller_dispatch_pending` | Fulfillment | Seller notified; 48-hour packaging & dispatch deadline active | Order Service |
| `shipment_booked` | Logistics | AWB generated and label ready; awaiting physical courier collection | Seller / Shiprocket API |
| `pickup_scheduled` | Logistics | Courier pickup slot confirmed with logistics provider | Courier Manager |
| `picked_up` | Logistics | Courier driver scanned manifest; parcel physically handed over | Courier Webhook / Handover Scan |
| `in_transit` | Logistics | Parcel in motion between transit hubs | Courier Tracking API |
| `out_for_delivery` | Logistics | Parcel out with doorstep delivery rider | Courier Tracking API |
| `delivered` | Logistics | OTP verified at doorstep; 48-hour inspection countdown starts | Delivery OTP Service |
| `inspection_period` | Buyer Protection| Active 48h window for buyer hardware checklist evaluation | Delivery Service |
| `receipt_confirmed` | Buyer Protection| Buyer explicitly passed checklist and accepted smartphone | Buyer |
| `completed` | Settlement | Inspection satisfied or 48h timeout elapsed; payout released | System Auto-Accept / Delivery Service |
| `dispute_pending` | Dispute | Buyer flagged issue; seller payout frozen immediately | Buyer |
| `dispute_under_review` | Dispute | Admin reviewing photographic and IMEI evidence | Admin |
| `dispute_resolved` | Dispute | Dispute resolved via refund, return, or release | Admin |
| `return_requested` | Return | Return approved by admin arbitration | Admin |
| `return_pickup_scheduled` | Return | Reverse courier assigned for return collection | Admin / Delivery Service |
| `return_picked_up` | Return | Courier collected return parcel from buyer | Courier Webhook |
| `return_in_transit` | Return | Return parcel in transit back to seller | Courier Webhook |
| `return_delivered` | Return | Return parcel received and inspected by seller | Seller / Admin |
| `refund_pending` | Refund | Refund scheduled for payment gateway or bank transfer | Delivery Service |
| `refunded` | Refund | Refund credited back to buyer | Payment Service |
| `rto_initiated` | Delivery Exception | Undeliverable shipment marked Return To Origin | Courier Webhook |
| `rto_in_transit` | Delivery Exception | Return parcel traveling back to seller hub | Courier Webhook |
| `rto_delivered` | Delivery Exception | Undelivered item returned to seller | Courier Webhook |
| `cancelled` | Order | Order cancelled before dispatch | Buyer / Seller / Admin |

---

## 3. Indian Logistics Integration (Shiprocket API v2 & Deterministic Sandbox)

ReValue ships pan-India through an adapter architecture conforming to `CourierProviderInterface`:
- **Production Adapter (`ShiprocketAdapter`)**: Communicates with official Shiprocket v2 REST endpoints.
- **Deterministic Sandbox Adapter (`MockCourierAdapter`)**: Provides zero-dependency sandbox emulation for development and offline testing with valid Indian 6-digit PIN codes.

### 3.1 PIN Code Serviceability Matrix
- **Metro & Tier 1 Hubs** (400001, 110001, 560001, etc.): Same-day or next-day surface/air express. Serviceable by Bluedart, Delhivery, Ecom Express, and Xpressbees.
- **Tier 2/3 Regions**: 2-4 day delivery windows with cash-on-delivery collection enabled.
- **Restricted/Special Regions**: Surface-only routing for safety compliance.

### 3.2 Dynamic Pricing & Rate Calculation
Shipping rates are calculated dynamically based on volumetric weight and delivery speed:
$$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{5000}$$
- **Standard Surface**: Base ₹80 for first 0.5 kg + ₹40 per additional 0.5 kg.
- **Express Air**: Base ₹150 for first 0.5 kg + ₹80 per additional 0.5 kg.
- **ReValue Transit Insurance (Optional)**: 1.5% of declared device value, covering transit loss, tampering, and courier damage.
- **COD Collection Surcharge**: ₹50 or 1.5% of invoice value (whichever is higher).

### 3.3 Shiprocket API v2 Endpoints Integrated
1. `POST /v1/external/auth/login`: JWT authentication with automatic 10-day token caching.
2. `GET /v1/external/courier/serviceability/`: Real-time courier partner rates, ETDs, and COD eligibility.
3. `POST /v1/external/orders/create/adhoc`: Manifest creation with pickup address and delivery PIN.
4. `POST /v1/external/courier/assign/awb`: Air Waybill booking and tracking code generation.
5. `POST /v1/external/courier/generate/pickup`: Pickup scheduling with selected courier partner.
6. `POST /v1/external/courier/generate/label`: Thermal printable shipping label with barcode.
7. `GET /v1/external/courier/track/awb/{awb_code}`: Real-time milestone polling.
8. `POST /api/v1/courier/webhook/shiprocket`: Webhook receiver with HMAC-SHA256 signature verification.

---

## 4. Physical Handover Rule & Seller Dispatch Deadline

Generating a shipping label assigns an AWB number but **does not constitute dispatch**.
1. **48-Hour Seller Dispatch SLA**: When an order is placed, a 48-hour countdown is attached (`dispatch_deadline`). If the seller fails to hand over the parcel within 48 hours, the order is flagged as overdue in the Admin Console, allowing buyer cancellation and penalty assignment.
2. **Physical Manifest Verification**: The shipment status advances to `picked_up` only when the courier agent scans the parcel's barcode at the seller's doorstep.
3. **Delivery OTP Provisioning**: The secure 6-digit Delivery OTP is generated only upon physical handover (`picked_up`), preventing premature delivery attempts.

---

## 5. Doorstep Delivery OTP & Proof of Delivery (POD)

To eliminate fraudulent claims of non-receipt:
1. **OTP Issuance**: The buyer receives a 6-digit numeric OTP via their account tracking dashboard.
2. **Doorstep Verification**: The courier delivery executive must request this OTP from the recipient.
3. **Delivery Finalization**: Verification triggers the immediate transition of the order to `delivered`, records the delivery timestamp, and activates the **48-hour inspection countdown**.

---

## 6. 48-Hour Buyer Inspection Period

Every buyer is granted exactly 48 hours from delivery to thoroughly test the pre-owned smartphone:
$$\text{Inspection Deadline} = \text{Delivery Timestamp} + 48\text{ Hours}$$

### 6.1 Seven-Point Hardware Checklist
Buyers evaluate the delivered smartphone against seven criteria:
1. **Packaging & Tamper Seal**: Box arrived undamaged with tamper seals intact.
2. **IMEI Verification**: Device settings and `*#06#` match the IMEI on the ReValue invoice.
3. **Screen & Touch Display**: No dead pixels, unauthorized glass replacements, or touch dead zones.
4. **Camera & Optical Sensors**: Front and rear cameras focus correctly; flash and lenses are clean.
5. **Battery Health & Charging**: Charges without overheating; battery percentage reflects listing claims.
6. **Network & Connectivity**: Wi-Fi, Bluetooth, mobile data, and cellular calls connect reliably.
7. **Biometric Security**: Face ID or fingerprint sensor unlocks consistently.

### 6.2 Acceptance & Timeout Policy
- **Manual Confirmation**: If the buyer checks all items and clicks "Confirm Device Acceptance", the order immediately transitions to `completed_settled` and seller payout is queued.
- **Automatic Timeout Settlement**: If no dispute is raised and 48 hours elapse, the system's scheduled worker automatically marks the order as accepted and triggers payout release.

---

## 7. Buyer Protection, Dispute, Return & Refund Engine

### 7.1 Payout Freeze Guarantee
Opening a dispute automatically switches the order status to `dispute_pending` and sets `payout_status = "frozen"`. Under no circumstances can funds be disbursed to the seller while a dispute is active.

### 7.2 Dispute Reasons & Evidence Collection
Buyers select an issue category and must provide proof:
- `imei_mismatch`: Photo of device `*#06#` screen beside packaging label.
- `undisclosed_damage`: High-resolution photos of physical defects not shown in listing.
- `functional_defect`: Description or video link demonstrating hardware failure.
- `wrong_item`: Photo of incorrect model or accessories.
- `counterfeit`: Documentation or diagnostic evidence.

### 7.3 Admin Resolution Workflows
Marketplace administrators resolve disputes via four pathways:
1. **Full Refund to Buyer**: For severe non-compliance or lost packages.
2. **Partial Refund / Price Adjustment**: For minor cosmetic discrepancies agreed upon by both parties.
3. **Return with Reverse Pickup**: ReValue generates a return AWB; courier collects device from buyer; refund is issued once seller confirms receipt.
4. **Release to Seller**: For invalid or abusive claims after administrative review.

---

## 8. Cash on Delivery (COD) & Cash Remittance Reconciliation

For buyers paying via Cash on Delivery:
1. **Courier Cash Collection**: Logistics partner collects invoice amount at doorstep upon OTP handover.
2. **Remittance Ledger**: ReValue maintains an independent COD reconciliation queue (`cod_status`: `pending_collection` $\rightarrow$ `collected_by_courier` $\rightarrow$ `remitted_to_revalue` $\rightarrow$ `reconciled`).
3. **Settlement Separation**: Seller payout remains held until the courier partner remits the collected cash to ReValue's bank account, preventing marketplace working-capital deficit.

---

## 9. Lithium-ion Battery Safety & Packaging Standards

Smartphones contain high-energy-density rechargeable lithium-ion cells subject to Indian road transit and DGCA air cargo regulations. ReValue enforces compliance before label generation:
1. **Regulatory Declaration**: Mandatory compliance declaration under **UN 3481** (Lithium-ion batteries contained in equipment).
2. **Charge Level**: Device battery must be discharged between 20% and 30% to minimize thermal runaway hazard in transit.
3. **Power Down**: Device must be fully powered off.
4. **Triple-Layer Packaging**:
   - Primary: Anti-static protective wrap or original phone box.
   - Secondary: Minimum 50mm heavy bubble wrap on all sides.
   - Tertiary: Rigid corrugated cardboard outer container sealed with reinforced tape.
5. **No Loose or Swollen Batteries**: Swollen cells, punctured batteries, or third-party loose batteries are strictly prohibited.

---

## 10. Admin Operations & Settlements Console

The Admin Delivery Operations Console (`/admin`) provides full lifecycle visibility:
- **Active Shipments Table**: Real-time tracking of all transit packages with courier partner, AWB, delivery status, and SLA violation alerts.
- **Dispatch Deadline Monitoring**: Immediate visibility of sellers failing to hand over parcels within 48 hours.
- **COD Reconciliation Queue**: Tabular ledger tracking unremitted courier cash collections with reconciliation action.
- **Dispute Resolution Console**: Side-by-side comparison of listing photos versus buyer-submitted dispute evidence with resolution actions.
- **Courier Provider Health**: Live status indicator displaying Shiprocket API response times and webhook connection health.
