# ReValue — AI-Assisted Resale Marketplace

> **A real-data, secure, full-stack resale marketplace for used smartphones featuring Machine Learning price estimation, rule-based negotiation assistance, sealed-bid auctions with private reserve protection, provider-ready escrow fulfillment, and verified reviews.**

---

## 1. System Architecture & Overview

ReValue is built from scratch without fake mockups or synthetic production balances. Every transaction, offer, sealed bid, and delivery milestone connects to a real database model with atomic state transitions and server-side authorization.

```
revalue/
├── backend/                  # Python 3.11/3.10 FastAPI backend
│   ├── app/
│   │   ├── api/v1/           # Versioned API routes (auth, products, offers, auctions, orders, payments, delivery, reviews, ml, admin)
│   │   ├── core/             # Configuration, bcrypt security, sensitive-data redacting logger, error handlers
│   │   ├── db/               # MongoDB Atlas connection manager with thread-safe in-memory test fallback, explicit indexes
│   │   ├── schemas/          # Pydantic v2 schemas and request/response models
│   │   ├── services/         # Business logic (Auth, Products, Negotiation Rule Engine, Auctions, Orders, Delivery, Reviews)
│   │   ├── integrations/     # Payment Provider abstraction (Sandbox & Razorpay Route adapters)
│   │   └── tests/            # 25 automated integration tests (Auth, Products, Auctions, Negotiation, Orders, Delivery, ML)
│   ├── requirements.txt
│   └── main.py
├── frontend/                 # React 19 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Reusable components (Navbar, Footer, ProductCard, AI Valuator, Condition Scanner, AuthModal)
│   │   ├── context/          # React AuthContext with token rotation & 1-click test personas
│   │   ├── pages/            # Landing, Marketplace, Detail, Create Listing, Buyer/Seller/Admin Dashboards, Checkout, Tracking
│   │   ├── services/         # Typed API client connecting to /api/v1
│   │   ├── types/            # TypeScript domain schemas
│   │   ├── App.tsx           # Client router and layout wrapper
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── ml/                       # Machine Learning and Decision Modules
│   ├── price_prediction/     # Random Forest resale price estimator (scikit-learn pipeline, dataset, trained artifacts)
│   ├── mobile_condition/     # MobileNetV2 visual condition classification pipeline & labels
│   ├── recommendations/      # Content-based recommendation engine using real product signals
│   └── object_detection_integration/ # Modular interface and null adapter for future YOLO integration
├── scripts/                  # Windows PowerShell scripts
│   ├── setup.ps1             # Environment verification, model training & build script
│   ├── start-backend.ps1     # Starts FastAPI server on http://localhost:8000
│   ├── start-frontend.ps1    # Starts Vite dev server on http://localhost:5173
│   ├── run-tests.ps1         # Runs pytest test suite
│   └── seed_dev.py           # Explicit development database seed script
├── .env.example              # Safe environment variable template
├── .gitignore
└── README.md
```

---

## 2. Core Trading Mechanisms

### 🤝 Open Negotiation
- **Buyer Offers**: Buyers submit private offers to the seller with optional notes.
- **Rule-Based Assistant**: The seller can request instant deterministic advice (`accept`, `counter`, `reject`, `manual_review`). The engine assesses discount depth, physical condition, and seller private minimum limits.
- **Counteroffer Timeline**: Counteroffers preserve complete negotiation history.
- **Concurrency-Safe Acceptance**: Accepting an offer atomically reserves the product, blocking competing buyers and preventing double-selling.

### 🔨 Sealed Bidding (Auctions)
- **Private Reserve Price**: Sellers configure a secret reserve floor that is **never** leaked to clients or logged.
- **Bid Privacy**: Bidders can only see their own bid. Competitor bids and identities remain completely sealed prior to finalization.
- **Deterministic Finalizer**:
  1. Finalization is strictly rejected before the server deadline.
  2. The highest bid meeting or exceeding the private reserve wins.
  3. Ties are broken deterministically by the earliest server timestamp.
  4. If the reserve is unmet, the auction safely closes with `closed_no_winner`.
  5. The winner is granted an exclusive order reservation.

---

## 3. Four AI & Decision Modules

| Module | Architecture | Operational Status | Metrics / Description |
|---|---|---|---|
| **1. Resale Price Estimator** | scikit-learn `Pipeline` (ColumnTransformer + `RandomForestRegressor`, 200 estimators) | **Active & Loaded** | **Production MindValue Model** (17 features: `Brand`, `Model`, `OS`, `RAM_GB`, `Storage_GB`, `Battery_mAh`, `Display_Size_Inches`, `Refresh_Rate_Hz`, `5G_Support`, `Original_Price_INR`, `Days_Used`, `Condition`, `Battery_Health_Percent`, `Screen_Crack`, `Scratches`, `Repair_History`, `Warranty_Available`). Target: `Used_Resale_Price_INR`. Singleton cached. |
| **2. Smartphone Catalogue** | Dynamic Catalogue & Curated Hardware Spec Service | **Active** | Covers 26 brands and 754 smartphone models. Smart specification auto-fill for MSRP, RAM, storage, battery, display, and 5G support. |
| **3. Negotiation Assistant** | Configurable Deterministic Rule Engine | **Active** | Evaluates asking price, offer depth, condition weight, and seller minimum to output counter strategies |
| **4. Visual Condition Classifier** | TensorFlow/Keras `MobileNetV2` (224x224 RGB) | **Active & Trained** | **4-Class Cosmetic Classifier** (`excellent`, `good`, `bad`, `defective`). Trained via transfer learning on MobileNetV2 using 277 clean deduplicated images (70% train, 15% val, 15% held-out test). Artifact: `mobilenet_condition.keras` (20.2 MB). Singleton cached inference returning 4-class probability distributions. Prototype status & synthetic dataset limits honestly documented. |
| **5. Recommendations** | Attribute-Affinity Content Engine | **Active** | Analyzes authentic user wishlist and order signals; includes deterministic cold-start fallback |
| **6. Object Detection Adapter** | Future Integration Interface | **Modular Interface** | Strictly returns `model_status: "not_configured"` without fabricating bounding boxes |

---

## 4. Quick Start on Windows

### Prerequisites
- **Python 3.10 or 3.11** (Installed on Windows with `py` launcher or `python`)
- **Node.js v18+** & **npm**

### Step 1: Clone and Configure Environment
Copy the example environment configuration:
```powershell
Copy-Item .env.example .env
```

### Step 2: Run Setup
Run the automated Windows setup script:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

### Step 3: Seed Development Database (Optional for Testing)
Populate the development database with real smartphone listings and test accounts:
```powershell
py -3.10 .\scripts\seed_dev.py
```
**Default Seed Test Accounts:**
- **Admin**: `admin@revalue.market` / `AdminSecurePass!2026`
- **Seller**: `rajesh.seller@revalue.market` / `SellerPass123!`
- **Buyer**: `anita.buyer@revalue.market` / `BuyerPass123!`

### Step 4: Run Automated Tests
Execute the 35 backend, security, auction, and ML integration tests:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-tests.ps1
```

### Step 5: Start Servers
Open two terminal windows:

**Terminal 1 (Backend API):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```
*API runs at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs` or `http://localhost:8000/api/docs`)*

**Terminal 2 (Frontend UI):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```
*Frontend runs at `http://localhost:5173`*

---

## 5. Security & Payment Integrity

1. **Password Hashing**: Salted Bcrypt rounds with Argon2-compatible security architecture. Plain-text passwords are never persisted.
2. **Token Security**: Dual-token strategy with short-lived JWT access tokens (60 min) and rotating refresh tokens (7 days). Token reuse is immediately detected and blocked.
3. **No Fake Escrow**: ReValue does not hold customer funds in an ordinary application database or claim unlicensed escrow. Payments integrate via the provider-ready `PaymentProviderInterface`.
4. **Webhook Verification**: Incoming payment webhooks require cryptographic HMAC-SHA256 signature verification. Unverified requests are rejected with 401.
5. **Receipt Confirmation & Seller Settlement**: Payouts are marked `held` until the buyer confirms receipt or the inspection window elapses. If a dispute is opened, payout release is immediately frozen.

---

## 6. Production Deployment Readiness

- **Database**: Configure `MONGODB_URI` pointing to your MongoDB Atlas cluster (`mongodb+srv://...`). Database indexes initialize automatically on startup.
- **Payment Provider**: To enable live payments in India, configure:
  - `PAYMENT_PROVIDER=razorpay`
  - `RAZORPAY_KEY_ID=<your_live_key>`
  - `RAZORPAY_KEY_SECRET=<your_live_secret>`
  - `RAZORPAY_WEBHOOK_SECRET=<your_webhook_secret>`
- **Health Probes**:
  - `GET /api/health` — Service liveness
  - `GET /api/ready` — Comprehensive readiness reporting on database, payment provider, and ML models.
