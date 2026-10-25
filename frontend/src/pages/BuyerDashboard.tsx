import React, { useState, useEffect } from 'react';
import {
  Package, Handshake, Heart, Star,
  Truck, ArrowRight, CheckCircle2, AlertCircle, Sparkles, X, ChevronRight, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Order, Offer, Product } from '../types';
import { useAuth } from '../context/AuthContext';

interface BuyerDashboardProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: () => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'offers' | 'wishlist'>('orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordList, offList, wishList] = await Promise.all([
        api.getMyOrders('buyer').catch(() => []),
        api.getMyOffers('buyer').catch(() => []),
        api.getWishlist().catch(() => []),
      ]);
      setOrders(ordList);
      setOffers(offList);
      setWishlist(wishList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleConfirmReceipt = async (orderId: string) => {
    try {
      await api.confirmReceipt(orderId);
      alert('Receipt confirmed! Order completed and seller payout released.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm receipt.');
    }
  };

  const handleAcceptCounter = async (offerId: string) => {
    try {
      await api.acceptOffer(offerId);
      alert('Counteroffer accepted! You can now proceed to checkout.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept counteroffer.');
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      await api.rejectOffer(offerId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject offer.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder) return;
    setReviewSubmitting(true);
    try {
      await api.createReview(reviewOrder.order_id, rating, comment);
      alert('Review submitted successfully! Thank you for rating the transaction.');
      setReviewOrder(null);
      setComment('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to your account</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Access your buyer order history, active sealed-bid and open price negotiations, and saved smartphones.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-emerald-700/20"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const ratingLabels: Record<number, string> = {
    1: '1 - Poor (Did not match description)',
    2: '2 - Fair (Visible issues beyond listing)',
    3: '3 - Good (Acceptable, minor discrepancies)',
    4: '4 - Very Good (Accurate description and packaging)',
    5: '5 - Excellent (Pristine condition, fast shipment)',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Buyer Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Buyer Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track confirmed purchases, real-time courier shipments, and active price negotiations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>Browse Smartphones</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3.5 px-1 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Purchases & Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'orders' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`pb-3.5 px-1 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'offers'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span>Negotiations & Offers</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'offers' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {offers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`pb-3.5 px-1 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'wishlist'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Saved Devices</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'wishlist' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {wishlist.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No orders placed yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Explore verified smartphones, submit an offer, or win an auction to purchase with escrow protection.
              </p>
              <button
                onClick={() => onNavigate('marketplace')}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs"
              >
                Explore Marketplace
              </button>
            </div>
          ) : (
            orders.map((ord) => {
              const statusColors: Record<string, string> = {
                pending_payment: 'bg-amber-50 text-amber-700 border-amber-200',
                paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                shipped: 'bg-sky-50 text-sky-700 border-sky-200',
                delivered: 'bg-teal-50 text-teal-700 border-teal-200',
                completed: 'bg-slate-100 text-slate-700 border-slate-200',
                disputed: 'bg-rose-50 text-rose-700 border-rose-200',
              };

              return (
                <div
                  key={ord.order_id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-semibold text-slate-400">Order #{ord.order_id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                        statusColors[ord.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {ord.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium capitalize">
                        Source: {ord.purchase_source?.replace('_', ' ') || 'Direct'}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900">{ord.product_title}</h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <div>
                        Amount: <span className="font-bold text-slate-900 text-sm">₹{ord.transaction_price.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div>
                        Escrow Payout: <span className="font-semibold text-slate-700 uppercase">{ord.payout_status || 'held'}</span>
                      </div>
                    </div>

                    {ord.shipment_info && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 font-medium mt-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Carrier: <strong className="text-slate-900">{ord.shipment_info.courier_name}</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>AWB / Tracking: <strong className="font-mono text-slate-900">{ord.shipment_info.tracking_number}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                    {ord.status === 'pending_payment' && (
                      <button
                        onClick={() => onNavigate('checkout', { orderId: ord.order_id, productId: ord.product_id, source: ord.purchase_source })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        Complete Payment
                      </button>
                    )}

                    {ord.status === 'shipped' && (
                      <>
                        <button
                          onClick={() => handleConfirmReceipt(ord.order_id)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Receipt</span>
                        </button>

                        <button
                          onClick={() => onNavigate('delivery-tracking', { orderId: ord.order_id })}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
                        >
                          Tracking & Disputes
                        </button>
                      </>
                    )}

                    {ord.status === 'paid' && (
                      <button
                        onClick={() => onNavigate('delivery-tracking', { orderId: ord.order_id })}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
                      >
                        Awaiting Courier Dispatch
                      </button>
                    )}

                    {ord.status === 'completed' && (
                      <button
                        onClick={() => setReviewOrder(ord)}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Rate Transaction</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: OFFERS */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          {offers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <Handshake className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No active offers</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Make a private counteroffer on any negotiation-enabled smartphone listing.
              </p>
            </div>
          ) : (
            offers.map((off) => {
              const statusBadges: Record<string, string> = {
                accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                countered: 'bg-amber-50 text-amber-800 border-amber-200',
                rejected: 'bg-rose-50 text-rose-800 border-rose-200',
                pending: 'bg-slate-50 text-slate-700 border-slate-200',
              };

              return (
                <div
                  key={off.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{off.product_title || 'Smartphone'}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Negotiation ID: <span className="font-mono text-slate-600">{off.id}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border self-start sm:self-auto ${
                      statusBadges[off.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {off.status}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Offer:</span>
                    <span className="text-xl font-bold text-emerald-700">₹{off.amount.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Negotiation Trail */}
                  {off.counter_history && off.counter_history.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                        Counter Trail ({off.counter_history.length} round{off.counter_history.length > 1 ? 's' : ''})
                      </div>
                      <div className="divide-y divide-slate-100">
                        {off.counter_history.map((h, i) => (
                          <div key={i} className="py-1.5 flex items-center justify-between text-slate-600">
                            <div>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mr-2 ${
                                h.sender_role === 'seller' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {h.sender_role}
                              </span>
                              <span className="font-bold text-slate-900">₹{h.amount.toLocaleString('en-IN')}</span>
                              {h.note && <span className="text-slate-500 italic ml-2">"{h.note}"</span>}
                            </div>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(h.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions if countered or accepted */}
                  <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                    {off.status === 'countered' && (
                      <>
                        <button
                          onClick={() => handleAcceptCounter(off.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                        >
                          Accept Counter (₹{off.amount.toLocaleString('en-IN')})
                        </button>
                        <button
                          onClick={() => handleRejectOffer(off.id)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {off.status === 'accepted' && (
                      <button
                        onClick={() => onNavigate('checkout', { productId: off.product_id, source: 'offer', offerId: off.id })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <span>Proceed to Escrow Checkout (₹{off.amount.toLocaleString('en-IN')})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Your wishlist is empty</h3>
              <p className="text-xs text-slate-500 mt-1">Tap the heart icon on any smartphone card to save it for later.</p>
            </div>
          ) : (
            wishlist.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex justify-between items-center hover:border-slate-300 transition-all"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{prod.brand}</span>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{prod.title}</h4>
                  <div className="text-xs font-bold text-emerald-700 mt-1">₹{prod.asking_price.toLocaleString('en-IN')}</div>
                </div>
                <button
                  onClick={() => onNavigate('product-detail', { id: prod.id })}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Review & Rating Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Rate Transaction</h3>
                <p className="text-xs text-slate-500 mt-0.5">{reviewOrder.product_title}</p>
              </div>
              <button
                onClick={() => setReviewOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setRating(s)}
                      className="p-1.5 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star className={`w-6 h-6 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-slate-600 mt-1.5">
                  {ratingLabels[rating]}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Review Feedback</label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details regarding physical condition, charger, battery health, and packaging accuracy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Verified Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewOrder(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
