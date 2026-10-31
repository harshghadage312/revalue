import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, CheckCircle2, AlertCircle, ArrowLeft,
  CreditCard, Truck, Check, Banknote, ShieldAlert, Clock, Sparkles, Bike, Zap
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Order, ShippingRateQuote } from '../types';
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

  // Logistics & delivery selection
  const [quotes, setQuotes] = useState<ShippingRateQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<ShippingRateQuote | null>(null);
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);
  const [quotingLoading, setQuotingLoading] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);

  // Payment method & options
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'cod'>('prepaid');
  const [optInInsurance, setOptInInsurance] = useState(true);

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

  // Fetch live shipping quotes whenever PIN code, COD, or insurance changes
  const fetchQuotes = async (pincode: string, isCod: boolean, insurance: boolean) => {
    if (!productId || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setQuotes([]);
      setIsServiceable(null);
      return;
    }
    setQuotingLoading(true);
    setQuoteMessage(null);
    try {
      const res = await api.getShippingQuotes(productId, pincode, isCod, insurance);
      setIsServiceable(res.is_serviceable);
      setQuotes(res.quotes || []);
      setQuoteMessage(res.message || null);
      if (res.quotes && res.quotes.length > 0) {
        setSelectedQuote(res.quotes[0]);
      } else {
        setSelectedQuote(null);
      }
    } catch (err: any) {
      setIsServiceable(false);
      setQuoteMessage(err.message || 'Unable to retrieve courier rates for this PIN code.');
      setQuotes([]);
      setSelectedQuote(null);
    } finally {
      setQuotingLoading(false);
    }
  };

  useEffect(() => {
    if (postalCode.length === 6) {
      fetchQuotes(postalCode, paymentMethod === 'cod', optInInsurance);
    }
  }, [productId, postalCode, paymentMethod, optInInsurance]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to complete checkout</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Log in to your ReValue account to secure this smartphone with escrow payment protection and courier tracking.
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
    if (isServiceable === false) {
      setError('Selected PIN code is not serviceable by courier partners. Please select another PIN code.');
      return;
    }

    setSubmittingOrder(true);
    setError(null);
    try {
      const ord = await api.createOrder({
        product_id: productId,
        purchase_source: source,
        offer_id: offerId,
        auction_id: auctionId,
        payment_method: paymentMethod,
        quote_id: selectedQuote?.quote_id,
        courier_id: selectedQuote?.courier_id,
        opt_in_insurance: optInInsurance,
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
      alert('Payment confirmed! Funds are held in escrow. 48-Hour Seller Dispatch Deadline is now active.');
    } catch (err: any) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  // Price calculations
  const basePrice = activeOrder
    ? (activeOrder.item_price ?? activeOrder.transaction_price)
    : (product?.asking_price || 0);

  const shippingFee = activeOrder
    ? (activeOrder.shipping_fee ?? 0)
    : (selectedQuote ? selectedQuote.rate : 0);

  const insuranceFee = activeOrder
    ? (activeOrder.insurance_fee ?? 0)
    : (optInInsurance && selectedQuote ? selectedQuote.insurance_fee : (optInInsurance ? 149 : 0));

  const codFee = activeOrder
    ? (activeOrder.cod_fee ?? 0)
    : (paymentMethod === 'cod' ? (selectedQuote ? selectedQuote.cod_charges : 50) : 0);

  const totalAmount = activeOrder
    ? (activeOrder.total_amount ?? activeOrder.transaction_price)
    : Math.round(basePrice + shippingFee + insuranceFee + codFee);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => onNavigate('marketplace')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Marketplace</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Shipping, Delivery Method & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {activeOrder ? 'Delivery & Escrow Settlement' : 'Delivery Address & Logistics'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeOrder ? 'Review verified shipping details and authorize escrow' : 'Doorstep courier serviceability check across 28,000+ Indian PIN codes'}
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
              <form onSubmit={handleCreateOrder} className="space-y-6">
                {/* 1. Recipient Information */}
                <div className="space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Recipient Information</h3>
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Mobile (for Delivery OTP)</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
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
                      placeholder="Flat, Wing, Building, Street name"
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Indian PIN Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="e.g. 560034"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Courier Serviceability & Rate Selection */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Courier Partner</h3>
                    {quotingLoading && <span className="text-[11px] text-slate-400 animate-pulse">Calculating rates...</span>}
                  </div>

                  {isServiceable === false ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{quoteMessage || `PIN Code ${postalCode} is currently outside our verified delivery network.`}</span>
                    </div>
                  ) : quotes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {quotes.map((q) => {
                        const isLocal = q.provider === 'revalue_local' || q.courier_name.toLowerCase().includes('local');
                        const isSelected = selectedQuote?.courier_id === q.courier_id;
                        return (
                          <div
                            key={q.courier_id}
                            onClick={() => setSelectedQuote(q)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                              isSelected
                                ? isLocal
                                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                                  : 'border-slate-800 bg-slate-50/70 shadow-xs'
                                : isLocal
                                ? 'border-emerald-200 bg-white hover:border-emerald-400'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            {isLocal && (
                              <div className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white mb-2 shadow-2xs">
                                <Zap className="w-2.5 h-2.5" />
                                <span>ReValue Direct Fleet</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-slate-900">{q.courier_name}</span>
                              <span className="text-xs font-bold text-slate-900">₹{q.rate}</span>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              {isLocal ? (
                                <Bike className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span>
                                {isLocal
                                  ? `Same-Day / Rush Delivery (${q.estimated_delivery_days} day)`
                                  : `Estimated ${q.estimated_delivery_days} business days`}
                              </span>
                            </div>

                            <div className="mt-2 text-[10px] text-emerald-700 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded w-fit">
                              Doorstep OTP Verification
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">Enter a 6-digit Indian PIN code to view live courier options.</div>
                  )}
                </div>

                {/* 3. Transit Insurance Opt-In */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optInInsurance}
                      onChange={(e) => setOptInInsurance(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>All-Risk Smartphone Transit Protection (+₹{selectedQuote?.insurance_fee || 149})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        100% full replacement value coverage against physical transit damage, water damage, or courier theft.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 4. Payment Method Selection */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Payment Preference</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPaymentMethod('prepaid')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'prepaid'
                          ? 'border-emerald-600 bg-emerald-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-slate-900">Prepaid Online Escrow</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        UPI, Credit/Debit Card, NetBanking. Funds held in escrow until you inspect and accept the phone.
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        Fastest Dispatch
                      </span>
                    </div>

                    <div
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-emerald-600 bg-emerald-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-slate-900">Cash on Delivery (COD)</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Pay cash to courier agent upon doorstep delivery. Includes ₹50 cash handling charge.
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        OTP Protected
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingOrder || isServiceable === false}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors active:scale-[0.99] disabled:opacity-50"
                >
                  {submittingOrder
                    ? 'Reserving Smartphone Inventory...'
                    : paymentMethod === 'cod'
                    ? `Confirm COD Order — ₹${totalAmount.toLocaleString('en-IN')}`
                    : 'Confirm Delivery Details & Continue to Payment'}
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
                    <span>
                      {activeOrder.payment_method === 'cod' ? 'Cash on Delivery Order Confirmed' : 'Escrow Payment Authorization'}
                    </span>
                  </h3>

                  {activeOrder.payment_method === 'cod' ? (
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">COD Order Confirmed</div>
                          <div className="text-slate-600">
                            Seller has 48 hours to book courier pickup. Pay ₹{activeOrder.transaction_price.toLocaleString('en-IN')} in cash upon delivery.
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={() => onNavigate('delivery-tracking', { orderId: activeOrder.order_id })}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track Delivery & View OTP</span>
                        </button>
                        <button
                          onClick={() => onNavigate('buyer-dashboard')}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
                        >
                          Buyer Dashboard
                        </button>
                      </div>
                    </div>
                  ) : activeOrder.status === 'pending_payment' ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs leading-relaxed space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Protected by ReValue Escrow</span>
                        </div>
                        <p className="text-slate-700">
                          Your payment of ₹{activeOrder.transaction_price.toLocaleString('en-IN')} will be held in our settlement vault. The seller does not receive funds until you inspect and accept the smartphone during your 48-hour inspection period.
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
                        onClick={() => onNavigate('delivery-tracking', { orderId: activeOrder.order_id })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Delivery Timeline</span>
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
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Order Price Breakdown</h3>

            <div>
              <div className="font-bold text-base text-slate-900">
                {activeOrder ? activeOrder.product_title : (product?.title || 'Pre-owned Smartphone')}
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
                <span>Smartphone Price</span>
                <span className="font-semibold text-slate-900">₹{basePrice.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Courier Shipping</span>
                <span className={`font-semibold ${shippingFee === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}
                </span>
              </div>

              {optInInsurance && (
                <div className="flex justify-between text-slate-600">
                  <span>Transit Insurance Protection</span>
                  <span className="font-semibold text-slate-900">₹{insuranceFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="flex justify-between text-slate-600">
                  <span>Cash on Delivery Handling</span>
                  <span className="font-semibold text-slate-900">₹{codFee.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Buyer Protection & Escrow Fee</span>
                <span className="font-semibold text-emerald-700">INCLUDED (₹0)</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline text-base font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="text-xl font-extrabold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payout Protection Guarantee */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed space-y-2">
              <div className="flex items-start gap-2 text-slate-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>ReValue 48-Hour Buyer Protection Guarantee</span>
              </div>
              <p className="text-slate-500">
                You receive 48 hours from delivery to inspect touchscreen, cameras, battery, and IMEI. Seller payout is only released when you confirm or the 48-hour inspection window elapses with zero disputes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
