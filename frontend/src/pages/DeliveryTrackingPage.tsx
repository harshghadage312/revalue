import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle2, AlertTriangle, ShieldCheck,
  ArrowLeft, Clock, MapPin, Package, AlertCircle, X, Check
} from 'lucide-react';
import { api } from '../services/api';
import { Order } from '../types';

interface DeliveryTrackingPageProps {
  orderId: string;
  onNavigate: (page: string, params?: any) => void;
}

export const DeliveryTrackingPage: React.FC<DeliveryTrackingPageProps> = ({
  orderId,
  onNavigate,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('damaged_item');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleConfirmReceipt = async () => {
    try {
      await api.confirmReceipt(orderId);
      alert('Receipt confirmed! Order completed and escrow payout released to seller.');
      fetchOrder();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm receipt.');
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisputeLoading(true);
    try {
      await api.openDispute(orderId, disputeReason, disputeDetails);
      alert('Dispute opened successfully. Escrow payout is now BLOCKED pending admin resolution.');
      setShowDisputeModal(false);
      fetchOrder();
    } catch (err: any) {
      alert(err.message || 'Failed to submit dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-semibold text-slate-500">Loading delivery tracking details...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">We could not locate this order in the marketplace records.</p>
        <button
          onClick={() => onNavigate('buyer-dashboard')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          Back to Buyer Dashboard
        </button>
      </div>
    );
  }

  const steps = [
    { id: 'placed', label: 'Order Placed', desc: 'Escrow payment held', done: true },
    { id: 'shipped', label: 'Dispatched', desc: order.shipment_info ? order.shipment_info.courier_name : 'Awaiting carrier', done: order.status === 'shipped' || order.status === 'completed' },
    { id: 'transit', label: 'In Transit', desc: order.shipment_info ? `AWB: ${order.shipment_info.tracking_number}` : 'Courier processing', done: order.status === 'shipped' || order.status === 'completed' },
    { id: 'delivered', label: 'Delivered & Verified', desc: 'Payout released to seller', done: order.status === 'completed' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button
        onClick={() => onNavigate('buyer-dashboard')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Buyer Dashboard</span>
      </button>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fulfillment & Tracking</span>
            <h1 className="text-xl font-bold text-slate-900">Order #{order.order_id}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border self-start sm:self-auto ${
            order.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            order.status === 'shipped' ? 'bg-sky-50 text-sky-800 border-sky-200' :
            order.status === 'disputed' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>

        {/* Visual Progress Stepper */}
        <div className="py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {steps.map((st, idx) => (
              <div key={st.id} className="relative space-y-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  st.done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {st.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <div className="text-xs font-bold text-slate-900">{st.label}</div>
                <div className="text-[11px] text-slate-500 truncate">{st.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Details */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-slate-50 border border-slate-200/70 gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">{order.product_title}</h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Price: <strong className="text-slate-900">₹{order.transaction_price.toLocaleString('en-IN')}</strong>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Escrow Protection</span>
            <span className={`text-xs font-bold uppercase ${
              order.payout_status === 'released' ? 'text-emerald-700' :
              order.payout_status === 'blocked_dispute' ? 'text-rose-700' : 'text-amber-700'
            }`}>
              {order.payout_status === 'released' ? 'Payout Released' :
               order.payout_status === 'blocked_dispute' ? 'Payout Blocked (Dispute)' : 'Held in Escrow'}
            </span>
          </div>
        </div>

        {/* Courier Shipment Card */}
        {order.shipment_info ? (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">{order.shipment_info.courier_name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                AWB: {order.shipment_info.tracking_number}
              </span>
            </div>

            <div className="text-xs text-slate-500">
              Dispatched Date: <strong className="text-slate-700">{new Date(order.shipment_info.dispatch_date).toLocaleDateString()}</strong>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
              <strong>Inspection Checklist:</strong> Inspect smartphone unboxing, screen condition, IMEI matching, cameras, and charging port before confirming receipt.
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>The seller has received escrow payment confirmation and is preparing the smartphone package for courier pickup.</span>
          </div>
        )}

        {/* Buyer Actions: Confirm Receipt vs Dispute */}
        {order.status === 'shipped' && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button
              onClick={handleConfirmReceipt}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Have Received & Verified the Smartphone (Confirm Receipt)</span>
            </button>

            <button
              onClick={() => setShowDisputeModal(true)}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Issue or Open a Dispute</span>
            </button>
          </div>
        )}

        {order.status === 'completed' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Transaction successfully completed. Delivery confirmed and seller payout released.</span>
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Open a Dispute</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order #{order.order_id}</p>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200/70 text-amber-900">
              Opening a dispute immediately blocks the seller escrow payout and alerts marketplace administrators for case review.
            </p>

            <form onSubmit={handleOpenDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dispute Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                >
                  <option value="damaged_item">Item arrived damaged or cracked</option>
                  <option value="not_delivered">Package was not delivered</option>
                  <option value="wrong_item">Received completely wrong model</option>
                  <option value="significantly_not_as_described">Significantly not as described</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Explain the problem in detail</label>
                <textarea
                  required
                  rows={3}
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Describe the discrepancy, damage, or delivery issue clearly..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={disputeLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {disputeLoading ? 'Opening Dispute...' : 'Submit Dispute & Freeze Payout'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
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
