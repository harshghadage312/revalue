import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, ArrowLeft, CreditCard, Truck, Check } from 'lucide-react';
import { api } from '../services/api';
import { Product, Order } from '../types';
import { useAuth } from '../context/AuthContext';

interface CheckoutPageProps {
  productId?: string;
  source?: 'buy_now' | 'offer' | 'auction';
  offerId?: string;
  auctionId?: string;
  orderId?: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  productId,
  source = 'buy_now',
  offerId,
  auctionId,
  orderId: initialOrderId,
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Shipping form state
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91-9876543210');
  const [street, setStreet] = useState(user?.address || '123 MG Road, Koramangala');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('560034');

  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderId) {
      api.getOrder(initialOrderId)
        .then(setExistingOrder)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (productId) {
      api.getProduct(productId)
        .then(setProduct)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [productId, initialOrderId]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to complete checkout</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Log in to your ReValue account to secure this smartphone with escrow payment protection.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-700/20"
        >
          Sign In
        </button>
      </div>
    );
  }

  const activeOrder = createdOrder || existingOrder;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setSubmittingOrder(true);
    setError(null);
    try {
      const ord = await api.createOrder({
        product_id: productId,
        purchase_source: source,
        offer_id: offerId,
        auction_id: auctionId,
        shipping_address: {
          full_name: fullName,
          phone,
          street,
          city,
          state,
          postal_code: postalCode,
          country: 'India',
        },
      });
      setCreatedOrder(ord);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSimulatePayment = async () => {
    const oId = activeOrder?.order_id;
    if (!oId) return;
    setPaying(true);
    setError(null);
    try {
      await api.completeSandboxPayment(oId);
      const updated = await api.getOrder(oId);
      setCreatedOrder(updated);
      alert('Payment confirmed! Funds are held in escrow and your order is queued for courier dispatch.');
    } catch (err: any) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  const transactionPrice = activeOrder
    ? activeOrder.transaction_price
    : product?.asking_price || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => onNavigate('marketplace')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Marketplace</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Shipping & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {activeOrder ? 'Delivery & Payment Details' : 'Delivery Address'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeOrder ? 'Review verified address and authorize escrow payment' : 'Enter recipient details for insured courier delivery'}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                {activeOrder ? 'Step 2 of 2' : 'Step 1 of 2'}
              </span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!activeOrder ? (
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="House / Flat No., Apartment, Street name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors active:scale-[0.99] disabled:opacity-50"
                >
                  {submittingOrder ? 'Reserving Smartphone Inventory...' : 'Confirm Delivery Details & Continue to Payment'}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Confirmed Shipping Address</span>
                    <span className="font-mono font-bold text-emerald-700">Order #{activeOrder.order_id}</span>
                  </div>
                  <div className="font-bold text-slate-900">{activeOrder.shipping_address?.full_name}</div>
                  <div className="text-slate-600">
                    {activeOrder.shipping_address?.street}, {activeOrder.shipping_address?.city}, {activeOrder.shipping_address?.state} - {activeOrder.shipping_address?.postal_code}
                  </div>
                  <div className="text-slate-500 font-medium">Contact: {activeOrder.shipping_address?.phone}</div>
                </div>

                {/* Payment Module */}
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Escrow Payment Authorization</span>
                  </h3>

                  {activeOrder.status === 'pending_payment' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs leading-relaxed space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Protected by ReValue Escrow</span>
                        </div>
                        <p className="text-slate-700">
                          Your payment of ₹{activeOrder.transaction_price.toLocaleString('en-IN')} will be held in our settlement vault. The seller does not receive funds until you inspect and confirm receipt of the smartphone.
                        </p>
                      </div>

                      <button
                        onClick={handleSimulatePayment}
                        disabled={paying}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{paying ? 'Verifying with Payment Gateway...' : `Authorize Escrow Payment — ₹${activeOrder.transaction_price.toLocaleString('en-IN')}`}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Escrow Payment Confirmed</div>
                          <div className="text-slate-600">Order is paid and pending courier dispatch by seller.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('buyer-dashboard')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0"
                      >
                        Go to Buyer Dashboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Summary Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Order Summary</h3>

            <div>
              <div className="font-bold text-base text-slate-900">
                {activeOrder ? activeOrder.product_title : product?.title}
              </div>
              <div className="text-xs text-slate-500 mt-1 capitalize flex items-center gap-2">
                <span>Channel:</span>
                <span className="font-semibold text-slate-700">
                  {activeOrder?.purchase_source?.replace('_', ' ') || source.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-2 border-t border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Agreed Resale Price</span>
                <span className="font-semibold text-slate-900">₹{transactionPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Insured Doorstep Courier</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ReValue Verification & Escrow</span>
                <span className="font-semibold text-emerald-700">INCLUDED</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline text-base font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="text-xl font-extrabold text-slate-900">₹{transactionPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payout Protection Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Funds remain held in escrow until you confirm delivery or the inspection window completes without dispute.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
