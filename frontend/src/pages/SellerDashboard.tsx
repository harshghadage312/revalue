import React, { useState, useEffect } from 'react';
import {
  Package, Handshake, Truck, Sparkles,
  CheckCircle, XCircle, ArrowRight, AlertCircle, PlusCircle, Star, X, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Offer, Order, NegotiationSuggestion } from '../types';
import { useAuth } from '../context/AuthContext';

interface SellerDashboardProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'offers' | 'shipments' | 'listings'>('offers');

  const [listings, setListings] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Negotiation AI suggestion modal state
  const [suggestionOffer, setSuggestionOffer] = useState<Offer | null>(null);
  const [suggestion, setSuggestion] = useState<NegotiationSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Counter offer state
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [counterNote, setCounterNote] = useState<string>('');

  // Shipping form state
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [courierName, setCourierName] = useState('Blue Dart Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipLoading, setShipLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, offList, ordList] = await Promise.all([
        api.listProducts({ seller_id: user?.id, status: '' }).catch(() => ({ items: [] })),
        api.getMyOffers('seller').catch(() => []),
        api.getMyOrders('seller').catch(() => []),
      ]);
      setListings(prodRes.items);
      setOffers(offList);
      setOrders(ordList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleGetAiAdvice = async (offer: Offer) => {
    setSuggestionOffer(offer);
    setSuggestionLoading(true);
    try {
      const advice = await api.getNegotiationSuggestion(offer.id);
      setSuggestion(advice);
      if (advice.suggested_counter_amount) {
        setCounterAmount(String(advice.suggested_counter_amount));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch negotiation advice.');
      setSuggestionOffer(null);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      await api.acceptOffer(offerId);
      alert('Offer accepted! The listing is now reserved for the buyer.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept offer.');
    }
  };

  const handleSendCounter = async (offerId: string) => {
    if (!counterAmount) return;
    try {
      await api.counterOffer(offerId, Number(counterAmount), counterNote);
      alert('Counteroffer sent to buyer!');
      setSuggestionOffer(null);
      setCounterAmount('');
      setCounterNote('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit counteroffer.');
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

  const handleShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOrderId) return;
    setShipLoading(true);
    try {
      await api.updateShipment(shippingOrderId, courierName, trackingNumber);
      alert('Order marked as SHIPPED! Courier tracking information updated.');
      setShippingOrderId(null);
      setTrackingNumber('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch order.');
    } finally {
      setShipLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to your seller account</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Access active smartphone listings, rule-assisted buyer negotiation suggestions, and shipment dispatches.
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

  const pendingOffers = offers.filter(o => o.status === 'pending' || o.status === 'countered');
  const paidOrdersToShip = orders.filter(o => o.status === 'paid' || o.status === 'processing');

  const popularCouriers = [
    'Blue Dart Express',
    'Delhivery Express',
    'DTDC Express',
    'India Post Speed Post',
    'Shadowfax E-Commerce',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Seller Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Seller Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage smartphone inventory, evaluate buyer offers with rule-based AI advice, and fulfill orders.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create-listing')}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Smartphone Listing</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('offers')}
          className={`pb-3.5 px-1 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'offers'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span>Buyer Offers</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'offers' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {pendingOffers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('shipments')}
          className={`pb-3.5 px-1 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'shipments'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Fulfillment & Payouts</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'shipments' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {paidOrdersToShip.length} to ship
          </span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`pb-3.5 px-1 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'listings'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Listings</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            activeTab === 'listings' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {listings.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: OFFERS */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          {offers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <Handshake className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No buyer offers yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Incoming counteroffers on negotiation-enabled smartphones will appear here with AI recommendations.
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
                      <h4 className="font-bold text-base text-slate-900">{off.product_title || 'Smartphone Listing'}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Buyer: <strong className="text-slate-800">{off.buyer_name || 'Prospective Buyer'}</strong>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border self-start sm:self-auto ${
                      statusBadges[off.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {off.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Offered Amount:</span>
                    <span className="text-2xl font-bold text-slate-900">₹{off.amount.toLocaleString('en-IN')}</span>
                    {off.note && (
                      <span className="text-xs text-slate-500 italic bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                        "{off.note}"
                      </span>
                    )}
                  </div>

                  {/* Actions for pending / countered offers */}
                  {(off.status === 'pending' || off.status === 'countered') && (
                    <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 flex-wrap">
                      <button
                        onClick={() => handleGetAiAdvice(off)}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Get AI Negotiation Advice</span>
                      </button>

                      <button
                        onClick={() => handleAcceptOffer(off.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        Accept (₹{off.amount.toLocaleString('en-IN')})
                      </button>

                      <button
                        onClick={() => {
                          setSuggestionOffer(off);
                          setCounterAmount(String(off.amount + 1000));
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors"
                      >
                        Counter
                      </button>

                      <button
                        onClick={() => handleRejectOffer(off.id)}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: SHIPMENTS & PAYOUTS */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No sold orders to ship</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When buyers complete escrow payment for your listings, fulfillment tasks appear here.
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const statusBadges: Record<string, string> = {
                paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                shipped: 'bg-sky-50 text-sky-700 border-sky-200',
                completed: 'bg-slate-100 text-slate-700 border-slate-200',
                disputed: 'bg-rose-50 text-rose-700 border-rose-200',
              };

              return (
                <div
                  key={ord.order_id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-400">Order #{ord.order_id}</span>
                      <h4 className="font-bold text-base text-slate-900">{ord.product_title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        statusBadges[ord.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {ord.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        Payout: <strong className="text-slate-800 uppercase">{ord.payout_status || 'held'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-900">
                      Deliver To: {ord.shipping_address?.full_name} ({ord.shipping_address?.phone})
                    </div>
                    <div>
                      {ord.shipping_address?.street}, {ord.shipping_address?.city}, {ord.shipping_address?.state} - {ord.shipping_address?.postal_code}
                    </div>
                  </div>

                  {/* Dispatch Button if paid */}
                  {ord.status === 'paid' && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShippingOrderId(ord.order_id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Enter Courier Tracking & Confirm Dispatch</span>
                      </button>
                    </div>
                  )}

                  {ord.status === 'shipped' && ord.shipment_info && (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Shipped via <strong>{ord.shipment_info.courier_name}</strong> (AWB: <span className="font-mono">{ord.shipment_info.tracking_number}</span>)</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: LISTINGS */}
      {activeTab === 'listings' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.brand}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{p.title}</h4>
                <div className="text-base font-bold text-slate-900 mt-2">
                  ₹{p.asking_price ? p.asking_price.toLocaleString('en-IN') : p.starting_bid?.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-400 mt-1 capitalize">
                  Method: {p.selling_method?.replace('_', ' ') || 'Negotiation'}
                </div>
              </div>

              <button
                onClick={() => onNavigate('product-detail', { id: p.id })}
                className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                View Listing
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI Negotiation Suggestion & Counter Modal */}
      {suggestionOffer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5">
            <button
              onClick={() => setSuggestionOffer(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI Negotiation Advisor</h3>
                <p className="text-xs text-slate-500">
                  Rule-based evaluation for offer of ₹{suggestionOffer.amount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {suggestionLoading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-500">
                Evaluating against market comps and asking price rules...
              </div>
            ) : suggestion && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span className="uppercase tracking-wider text-[10px] text-emerald-700">Recommendation</span>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                    {suggestion.recommendation}
                  </span>
                </div>
                <p className="leading-relaxed text-slate-700">{suggestion.reason}</p>
                {suggestion.suggested_counter_amount && (
                  <div className="font-bold text-slate-900 pt-1 text-xs">
                    Suggested Counter: <span className="text-emerald-700 font-extrabold">₹{suggestion.suggested_counter_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Counteroffer Input */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Counteroffer (₹ INR)</label>
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all"
                  placeholder="Enter counter amount"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note to Buyer (Optional)</label>
                <input
                  type="text"
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-600 outline-none transition-all"
                  placeholder="e.g. Includes original fast charger and tempered glass screen"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => handleSendCounter(suggestionOffer.id)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Send Counteroffer
                </button>
                <button
                  onClick={() => setSuggestionOffer(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enter Shipment Modal */}
      {shippingOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Ship Order #{shippingOrderId}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Provide tracking details for buyer confirmation</p>
              </div>
              <button
                onClick={() => setShippingOrderId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShipOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Courier Partner</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                >
                  {popularCouriers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tracking Number / AWB</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD789012345"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={shipLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {shipLoading ? 'Recording Dispatch...' : 'Confirm Shipment & Update Buyer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShippingOrderId(null)}
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
