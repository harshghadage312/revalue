import React, { useState, useEffect } from 'react';
import {
  Bike, MapPin, Phone, ShieldCheck, CheckCircle2,
  AlertTriangle, ArrowLeft, ExternalLink, RotateCw, KeyRound,
  FileText, Check, Navigation, AlertOctagon, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DeliveryJob } from '../types';

interface RiderJobDetailPageProps {
  jobId: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth?: () => void;
}

export const RiderJobDetailPage: React.FC<RiderJobDetailPageProps> = ({
  jobId,
  onNavigate,
  onOpenAuth,
}) => {
  const { isAuthenticated } = useAuth();
  const [job, setJob] = useState<DeliveryJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pickup step states
  const [pickupToken, setPickupToken] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [deviceInspected, setDeviceInspected] = useState(false);

  // Delivery OTP states
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Failure modal state
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState('Customer Unreachable');
  const [failureNotes, setFailureNotes] = useState('');

  const loadJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRiderJobDetail(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load delivery job details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && jobId) {
      loadJob();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, jobId]);

  // Actions
  const handleAcceptJob = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await api.acceptRiderJob(jobId);
      setJob(updated);
      setSuccessMsg('Job accepted! Proceed to pickup location.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to accept job.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!deviceInspected) {
      setError('Please confirm that you have physically inspected and received the package.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const updated = await api.confirmRiderPickup(jobId, {
        pickup_token: pickupToken.trim() || undefined,
        notes: pickupNotes.trim() || undefined,
        package_condition_ok: true,
      });
      setJob(updated);
      setSuccessMsg('Pickup confirmed! Now proceeding to delivery destination.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm pickup. Please check pickup token if required.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryOtp.trim() || deliveryOtp.trim().length !== 6) {
      setError('Please enter the 6-digit delivery OTP provided by the buyer.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const updated = await api.verifyRiderDeliveryOtp(jobId, deliveryOtp.trim(), deliveryNotes.trim() || undefined);
      setJob(updated);
      setSuccessMsg('🎉 Doorstep OTP verified successfully! Delivery completed.');
    } catch (err: any) {
      setError(err?.message || 'Invalid delivery OTP. Please ask the buyer to check their tracking page or SMS.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportFailure = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await api.reportRiderJobFailure(jobId, failureReason, failureNotes.trim() || undefined);
      setJob(updated);
      setShowFailureModal(false);
      setSuccessMsg('Delivery failure reported. Operations will review the shipment.');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit failure report.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading delivery job...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-xs text-slate-600 mb-6">
            The requested delivery job could not be found or has been reassigned.
          </p>
          <button
            onClick={() => onNavigate('rider-dashboard')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isBroadcast = job.status === 'created' || job.status === 'broadcast';
  const isPickupStage = job.status === 'accepted' || job.status === 'heading_to_pickup' || job.status === 'arrived_pickup';
  const isDeliveryStage = job.status === 'pickup_confirmed' || job.status === 'in_transit' || job.status === 'out_for_delivery';
  const isDelivered = job.status === 'delivered';
  const isFailed = job.status === 'failed' || job.status === 'cancelled';

  const pickupMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${job.pickup_location.street}, ${job.pickup_location.city} ${job.pickup_location.pincode}`
  )}`;

  const dropoffMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${job.dropoff_location.street}, ${job.dropoff_location.city} ${job.dropoff_location.pincode}`
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top Back Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('rider-dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Rider Dashboard</span>
          </button>

          <span className="text-xs font-mono px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold">
            Order #{job.order_id.slice(-6)}
          </span>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Job Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase">
                Direct Local Delivery
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-1">{job.product_title}</h1>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Rider Payout</span>
              <span className="text-xl font-extrabold text-emerald-600">
                ₹{job.compensation.total_compensation}
              </span>
              <span className="text-[10px] text-slate-500 block">
                (Base ₹{job.compensation.base_pay} + Bonus ₹{job.compensation.distance_bonus})
              </span>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl">
            <span className="text-slate-500 font-medium">Lifecycle Status:</span>
            <span className="font-bold text-slate-900 capitalize px-2 py-0.5 bg-white border border-slate-200 rounded-md">
              {job.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* STEP 0: BROADCAST / UNACCEPTED STATE */}
        {isBroadcast && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-sm">
            <Bike className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Claim This Smartphone Delivery</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              This job is currently broadcasting to verified riders in {job.dropoff_location.city}. Accepting locks the dispatch exclusively to you.
            </p>
            <div className="pt-2">
              <button
                onClick={handleAcceptJob}
                disabled={actionLoading}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Claiming Delivery...' : 'Accept Delivery Job (₹' + job.compensation.total_compensation + ')'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: PICKUP CONFIRMATION STAGE */}
        {isPickupStage && (
          <div className="bg-white rounded-2xl border-2 border-emerald-500 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Step 1: Pickup Handover from Seller
                </h2>
              </div>
              <span className="text-xs text-emerald-600 font-semibold">Active Step</span>
            </div>

            {/* Seller Contact & Address */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Seller Contact</span>
                  <p className="font-bold text-slate-900 text-sm">{job.pickup_location.contact_name}</p>
                </div>
                <a
                  href={`tel:${job.pickup_location.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Seller</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Pickup Address</span>
                <p className="text-xs text-slate-700 font-medium">
                  {job.pickup_location.street}, {job.pickup_location.city}, {job.pickup_location.state} - {job.pickup_location.pincode}
                </p>
              </div>

              <div className="pt-1">
                <a
                  href={pickupMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open in Google Maps Navigation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Inspection Checklist */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Pickup Verification Checklist
              </h3>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Device Condition Protocol:</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Inspect the physical smartphone package with the seller. Verify that the device model matches: <strong>{job.product_title}</strong>. Ensure the box or protective bubble pouch is securely packed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seller Handover Token (Optional / Provided by Seller)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6-digit handover code"
                  value={pickupToken}
                  onChange={(e) => setPickupToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pickup Handover Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Box sealed in bubble wrap, accessories included"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deviceInspected}
                    onChange={(e) => setDeviceInspected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-800 font-semibold leading-relaxed">
                    I confirm that I have physically received the smartphone from the seller and it is in sound packaging.
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowFailureModal(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                >
                  Report Pickup Problem
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPickup}
                  disabled={actionLoading || !deviceInspected}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Confirming...' : 'Confirm Pickup Handover →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DELIVERY & OTP VERIFICATION STAGE */}
        {isDeliveryStage && (
          <div className="bg-white rounded-2xl border-2 border-emerald-500 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Step 2: Doorstep Handover & Buyer OTP Verification
                </h2>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                Out for Delivery
              </span>
            </div>

            {/* Buyer Contact & Address */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Buyer Contact</span>
                  <p className="font-bold text-slate-900 text-sm">{job.dropoff_location.contact_name}</p>
                </div>
                <a
                  href={`tel:${job.dropoff_location.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Buyer</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Destination Address</span>
                <p className="text-xs text-slate-700 font-medium">
                  {job.dropoff_location.street}, {job.dropoff_location.city}, {job.dropoff_location.state} - {job.dropoff_location.pincode}
                </p>
              </div>

              <div className="pt-1">
                <a
                  href={dropoffMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Dropoff in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* OTP Verification Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Doorstep Delivery Verification Protocol:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-blue-800">
                  Allow the buyer to physically inspect the phone package at their doorstep. Once satisfied, request their <strong>6-digit Delivery OTP</strong> (visible on their tracking page and sent via SMS).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Enter 6-Digit Buyer Delivery OTP *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  pattern="[0-9]{6}"
                  placeholder="123456"
                  value={deliveryOtp}
                  onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full sm:w-64 px-4 py-3 text-lg font-mono tracking-widest text-center border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes / Observations (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivered directly to buyer, verified physical condition"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowFailureModal(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                >
                  Report Delivery Issue
                </button>

                <button
                  type="submit"
                  disabled={actionLoading || deliveryOtp.length !== 6}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Verifying...' : 'Verify OTP & Complete Delivery'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: DELIVERED / COMPLETED CELEBRATION */}
        {isDelivered && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Delivery Successfully Completed!</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              The buyer's OTP was verified successfully. Payout of <strong>₹{job.compensation.total_compensation}</strong> has been credited to your rider earnings ledger.
            </p>
            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('rider-dashboard')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => onNavigate('rider-earnings')}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs"
              >
                View Earnings Ledger
              </button>
            </div>
          </div>
        )}

        {/* FAILED STATE */}
        {isFailed && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
            <AlertOctagon className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Delivery Closed as Failed / Cancelled</h3>
            <p className="text-xs text-rose-800">
              Reason: {job.failure_reason || 'Marked as unserviceable or cancelled.'}
            </p>
            <button
              onClick={() => onNavigate('rider-dashboard')}
              className="mt-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              Return to Dashboard
            </button>
          </div>
        )}

        {/* Failure Report Modal */}
        {showFailureModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Report Delivery Exception</span>
              </div>

              <p className="text-xs text-slate-600">
                If the pickup or delivery cannot proceed safely, select the reason below. Operations will review immediately.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="Customer Unreachable">Customer Unreachable / Not Answering Phone</option>
                  <option value="Customer Refused Package">Customer Refused Package</option>
                  <option value="Incorrect Address">Incorrect Address / Door Locked</option>
                  <option value="Device Discrepancy at Pickup">Device Discrepancy / Damaged at Pickup</option>
                  <option value="Severe Weather or Transit Breakdown">Vehicle Breakdown / Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation</label>
                <textarea
                  rows={3}
                  placeholder="Provide context so Operations can assist the customer..."
                  value={failureNotes}
                  onChange={(e) => setFailureNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFailureModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportFailure}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Failure Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
