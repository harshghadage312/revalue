import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle2, AlertTriangle, ShieldCheck,
  ArrowLeft, Clock, MapPin, Package, AlertCircle, X, Check,
  KeyRound, FileText, Download, RotateCcw, ShieldAlert, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { OrderTrackingResponse, InspectionChecklist } from '../types';

interface DeliveryTrackingPageProps {
  orderId: string;
  onNavigate: (page: string, params?: any) => void;
}

export const DeliveryTrackingPage: React.FC<DeliveryTrackingPageProps> = ({
  orderId,
  onNavigate,
}) => {
  const [tracking, setTracking] = useState<OrderTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Doorstep OTP Verification state
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Inspection Checklist state
  const [checklist, setChecklist] = useState<InspectionChecklist>({
    screen_ok: false,
    touch_ok: false,
    cameras_ok: false,
    audio_ok: false,
    charging_battery_ok: false,
    physical_condition_matches: false,
    imei_matches: false,
    notes: '',
  });
  const [submittingChecklist, setSubmittingChecklist] = useState(false);
  const [checklistSuccess, setChecklistSuccess] = useState(false);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('damaged_item');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [preferredResolution, setPreferredResolution] = useState('return_and_refund');
  const [disputeLoading, setDisputeLoading] = useState(false);

  const fetchTracking = async () => {
    setLoading(true);
    setError(null);
    if (!orderId) {
      setLoading(false);
      setError('No order ID provided.');
      setTracking(null);
      return;
    }
    try {
      const data = await api.getOrderTracking(orderId);
      setTracking(data);
      if (data.inspection_checklist) {
        setChecklist(data.inspection_checklist);
        setChecklistSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tracking data for this order.');
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp || enteredOtp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      await api.verifyDeliveryOtp(orderId, enteredOtp);
      alert('Delivery verified! 48-Hour Buyer Inspection Period is now active.');
      setEnteredOtp('');
      fetchTracking();
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmitChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingChecklist(true);
    try {
      await api.submitInspectionChecklist(orderId, checklist);
      setChecklistSuccess(true);
      alert('Hardware inspection checklist submitted successfully.');
      fetchTracking();
    } catch (err: any) {
      alert(err.message || 'Failed to submit inspection checklist.');
    } finally {
      setSubmittingChecklist(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirm('Are you satisfied with the smartphone? Confirming receipt will immediately release seller payout.')) return;
    try {
      await api.confirmReceipt(orderId);
      alert('Receipt confirmed! Order completed and seller payout released.');
      fetchTracking();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm receipt.');
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisputeLoading(true);
    try {
      const evidence = disputeEvidence ? [disputeEvidence] : [];
      await api.openDispute(orderId, disputeReason, disputeDetails, evidence, preferredResolution);
      alert('Dispute opened. Seller payout is FROZEN pending marketplace administration review.');
      setShowDisputeModal(false);
      fetchTracking();
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
        <span className="text-xs font-semibold text-slate-500">Retrieving real-time courier milestones...</span>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Tracking Information Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">{error || 'Could not find tracking records for this order.'}</p>
        <button
          onClick={() => onNavigate('buyer-dashboard')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Canonical milestones mapping
  const milestones = [
    {
      key: 'paid',
      label: 'Order Paid',
      desc: 'Funds held in escrow',
      done: true,
      time: tracking.status_history[0]?.timestamp,
    },
    {
      key: 'booked',
      label: 'Shipment Booked',
      desc: tracking.shipment_info ? `AWB: ${tracking.shipment_info.tracking_number}` : 'Awaiting carrier booking',
      done: ['shipment_booked', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'receipt_confirmed', 'completed'].includes(tracking.status),
      time: tracking.shipment_info?.dispatch_date,
    },
    {
      key: 'picked_up',
      label: 'Courier Handover',
      desc: tracking.shipment_info?.is_courier_verified ? 'Collected by carrier' : 'Physical handover pending',
      done: ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'receipt_confirmed', 'completed'].includes(tracking.status),
      time: tracking.shipment_info?.handover_confirmed_at,
    },
    {
      key: 'in_transit',
      label: 'In Transit',
      desc: tracking.courier_tracking?.current_location || 'Transit hub',
      done: ['in_transit', 'out_for_delivery', 'delivered', 'receipt_confirmed', 'completed'].includes(tracking.status),
    },
    {
      key: 'out_for_delivery',
      label: 'Out for Delivery',
      desc: 'Courier agent en route',
      done: ['out_for_delivery', 'delivered', 'receipt_confirmed', 'completed'].includes(tracking.status),
    },
    {
      key: 'delivered',
      label: 'Delivered',
      desc: 'Doorstep OTP verified',
      done: ['delivered', 'inspection_passed', 'receipt_confirmed', 'completed'].includes(tracking.status),
      time: tracking.shipment_info?.delivered_at,
    },
    {
      key: 'inspection',
      label: '48h Inspection',
      desc: tracking.inspection_hours_left ? `${tracking.inspection_hours_left}h remaining` : 'Hardware checks',
      done: ['inspection_passed', 'receipt_confirmed', 'completed'].includes(tracking.status),
    },
    {
      key: 'completed',
      label: 'Payout Released',
      desc: 'Settlement finalized',
      done: ['receipt_confirmed', 'completed'].includes(tracking.status),
    },
  ];

  const isInspectionActive = tracking.status === 'delivered';
  const isDisputed = tracking.status === 'disputed' || tracking.payout_status === 'blocked_dispute';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('buyer-dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Orders</span>
        </button>

        <span className="text-xs font-mono font-bold text-slate-400">
          Order ID: {tracking.order_id}
        </span>
      </div>

      {/* Prominent Dispute Warning Banner if Disputed */}
      {isDisputed && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-rose-950">Payout Frozen — Dispute Under Investigation</div>
            <p className="text-rose-800 leading-relaxed">
              A buyer protection dispute has been recorded. Seller funds remain securely frozen in the escrow settlement vault. A marketplace administrator will review evidence and issue a resolution (full refund, partial refund, or return reverse pickup).
            </p>
          </div>
        </div>
      )}

      {/* Main Fulfillment Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Delivery Status</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{tracking.product_title || 'Pre-Owned Smartphone'}</h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              tracking.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              tracking.status === 'delivered' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
              tracking.status === 'disputed' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              tracking.status === 'in_transit' ? 'bg-sky-50 text-sky-800 border-sky-200' :
              'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {tracking.status.replace(/_/g, ' ')}
            </span>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
              tracking.payout_status === 'released' ? 'bg-emerald-100 text-emerald-800' :
              tracking.payout_status === 'blocked_dispute' ? 'bg-rose-100 text-rose-800 font-bold' :
              'bg-amber-100 text-amber-800'
            }`}>
              Escrow: {tracking.payout_status || 'held'}
            </span>
          </div>
        </div>

        {/* 8-Stage Canonical Timeline */}
        <div className="py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Milestone Progress</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {milestones.map((m, idx) => (
              <div key={m.key} className="space-y-1 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    m.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {m.done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  {m.time && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(m.time).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900">{m.label}</div>
                <div className="text-[11px] text-slate-500 line-clamp-1">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dispatch Deadline Alert if pending handover */}
        {tracking.dispatch_hours_left !== null && tracking.dispatch_hours_left !== undefined && ['paid', 'processing', 'shipment_booked'].includes(tracking.status) && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong>48-Hour Seller Dispatch Window:</strong> Seller has{' '}
              <strong className="font-mono text-amber-950 font-bold">{tracking.dispatch_hours_left} hours left</strong> to hand over this package to the courier agent.
            </div>
          </div>
        )}

        {/* Courier Shipment Details Card */}
        {tracking.shipment_info && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-900">{tracking.shipment_info.courier_name}</span>
                {tracking.shipment_info.is_courier_verified && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Verified Pickup
                  </span>
                )}
              </div>
              <span className="font-mono text-xs font-bold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200">
                AWB: {tracking.shipment_info.tracking_number}
              </span>
            </div>

            {/* Courier Tracking Scan Activities */}
            {tracking.courier_tracking?.milestones && tracking.courier_tracking.milestones.length > 0 && (
              <div className="pt-2 border-t border-slate-200/70 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Transit Activity Log</span>
                <div className="space-y-1.5">
                  {tracking.courier_tracking.milestones.slice(-3).reverse().map((ml, idx) => (
                    <div key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div>
                        <strong className="text-slate-800">{ml.activity}</strong>
                        {ml.location && <span className="text-slate-500"> — {ml.location}</span>}
                        <span className="text-[10px] text-slate-400 block">{new Date(ml.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Doorstep Delivery OTP Verification Widget (if in transit / out for delivery) */}
        {['picked_up', 'in_transit', 'out_for_delivery'].includes(tracking.status) && (
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">Doorstep Delivery OTP</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              When the courier arrives at your doorstep, provide this verification code to inspect the parcel.
              {tracking.delivery_otp_masked && (
                <span> Masked OTP sent to recipient: <strong className="font-mono text-slate-900">{tracking.delivery_otp_masked}</strong>.</span>
              )}
            </p>

            <form onSubmit={handleVerifyOtp} className="flex gap-2 max-w-sm pt-1">
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-600 w-36"
              />
              <button
                type="submit"
                disabled={verifyingOtp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {verifyingOtp ? 'Verifying...' : 'Verify Doorstep OTP'}
              </button>
            </form>
            {otpError && <div className="text-[11px] text-rose-600 font-semibold">{otpError}</div>}
          </div>
        )}

        {/* 48-Hour Buyer Inspection Window Active Card */}
        {isInspectionActive && (
          <div className="p-6 rounded-3xl bg-indigo-50/60 border border-indigo-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-indigo-900">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-base">48-Hour Buyer Inspection Window is ACTIVE</h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Your smartphone is delivered. Test all hardware components using the checklist below before accepting.
                </p>
              </div>

              {tracking.inspection_hours_left !== null && tracking.inspection_hours_left !== undefined && (
                <div className="p-3 rounded-2xl bg-white border border-indigo-100 text-center shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Time Remaining</div>
                  <div className="text-xl font-mono font-extrabold text-indigo-900">
                    {tracking.inspection_hours_left}h
                  </div>
                  <div className="text-[10px] text-slate-500">until auto-acceptance</div>
                </div>
              )}
            </div>

            {/* Hardware Checklist Form */}
            <form onSubmit={handleSubmitChecklist} className="bg-white p-5 rounded-2xl border border-indigo-100/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Mandatory Hardware Inspection Checklist:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.screen_ok}
                    onChange={(e) => setChecklist({ ...checklist, screen_ok: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Display & Glass (no cracks, no touchlines)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.touch_ok}
                    onChange={(e) => setChecklist({ ...checklist, touch_ok: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Touchscreen responsiveness & multitouch</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.cameras_ok}
                    onChange={(e) => setChecklist({ ...checklist, cameras_ok: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Front & Rear camera autofocus & flash</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.audio_ok}
                    onChange={(e) => setChecklist({ ...checklist, audio_ok: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Earpiece, speaker, and microphone clarity</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.charging_battery_ok}
                    onChange={(e) => setChecklist({ ...checklist, charging_battery_ok: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Charging port & stable battery health</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.imei_matches}
                    onChange={(e) => setChecklist({ ...checklist, imei_matches: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>IMEI number matches listing specifications</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingChecklist}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {submittingChecklist ? 'Saving Checklist...' : 'Save Inspection Progress'}
                </button>
              </div>
            </form>

            {/* Final Acceptance vs Dispute Options */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleConfirmReceipt}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Everything is Perfect — Confirm Receipt & Release Escrow Payout</span>
              </button>

              <button
                onClick={() => setShowDisputeModal(true)}
                className="py-3 px-5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Report Problem / Open Dispute</span>
              </button>
            </div>
          </div>
        )}

        {/* Completion Confirmation Message */}
        {['receipt_confirmed', 'completed'].includes(tracking.status) && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-2 text-emerald-950 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Order Completed Successfully</span>
            </div>
            <p className="text-slate-700">
              Receipt was confirmed and the seller payout of funds has been released to their verified bank settlement account.
            </p>
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Open a Buyer Protection Dispute</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order #{orderId}</p>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <strong>Immediate Protection Effect:</strong>
              <p className="text-amber-800 leading-relaxed">
                Submitting this form immediately Freezes the seller payout. ReValue administrators will review the photos and hardware defects before authorizing a refund or return pickup.
              </p>
            </div>

            <form onSubmit={handleOpenDispute} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dispute Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                >
                  <option value="damaged_item">Item arrived physically damaged or cracked</option>
                  <option value="not_delivered">Package was marked delivered but not received</option>
                  <option value="wrong_item">Received wrong phone brand or model</option>
                  <option value="significantly_not_as_described">Significantly not as described</option>
                  <option value="undisclosed_defect">Undisclosed hardware defect (battery, screen, camera)</option>
                  <option value="missing_accessories">Missing promised charger or retail box</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation</label>
                <textarea
                  required
                  rows={3}
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Explain exactly what is wrong or does not match the listing..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Evidence Photo URL (Unboxing / Defect)</label>
                <input
                  type="url"
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  placeholder="https://images.example.com/phone-crack.jpg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Resolution</label>
                <select
                  value={preferredResolution}
                  onChange={(e) => setPreferredResolution(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                >
                  <option value="return_and_refund">Return Smartphone & Receive 100% Full Refund</option>
                  <option value="partial_refund">Keep Smartphone with Partial Refund Compromise</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={disputeLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {disputeLoading ? 'Freezing Escrow Payout...' : 'Submit Dispute & Freeze Payout'}
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
