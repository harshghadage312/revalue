import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle,
  RotateCw, ArrowRight, Bike, MapPin, Phone, Car
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RiderProfile } from '../types';

interface DeliveryPartnerApplicationStatusPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth?: () => void;
}

export const DeliveryPartnerApplicationStatusPage: React.FC<DeliveryPartnerApplicationStatusPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getRiderProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve delivery partner profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <Bike className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Delivery Partner Portal</h2>
          <p className="text-xs text-slate-600 mb-6">
            Please log in with your delivery partner account to check your onboarding status or access your fleet dashboard.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => onOpenAuth ? onOpenAuth() : onNavigate('landing')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              Sign In to Account
            </button>
            <button
              onClick={() => onNavigate('delivery-partner-signup')}
              className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Apply to Become a Partner
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Checking application status...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Application Found</h2>
          <p className="text-xs text-slate-600 mb-6">
            You do not currently have an active delivery partner profile linked with this account.
          </p>
          <button
            onClick={() => onNavigate('delivery-partner-signup')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Submit a Partner Application
          </button>
        </div>
      </div>
    );
  }

  const isApproved = profile.application_status === 'approved';
  const isPending = profile.application_status === 'pending' || profile.application_status === 'under_review';
  const isRejected = profile.application_status === 'rejected';
  const isSuspended = profile.application_status === 'suspended';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top bar with refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Partner Application Status</h1>
            <p className="text-xs text-slate-500">Application ID: {profile.id}</p>
          </div>
          <button
            onClick={() => fetchProfile(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Status Banner */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Under Operations Review
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Your application is being verified by ReValue Operations
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thank you for applying to deliver for ReValue! Our operations team is currently reviewing your driving license and service pincode coverage. Approvals typically take 24–48 business hours. You will receive an SMS and email notification once activated.
                </p>

                {/* Progress Timeline */}
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-800">1. Application Submitted</span>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span className="text-[11px] font-bold text-amber-900">2. Verification in Progress</span>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl border border-dashed border-amber-200 flex items-center gap-2 opacity-60">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-500">3. Fleet Activation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-block px-2.5 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Approved & Ready to Deliver
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Welcome aboard, {profile.name}! Your account is active.
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your delivery partner profile has been approved. You can now toggle your online status, receive local pickup & delivery tasks within your PIN codes, and start earning.
                </p>

                <div className="pt-3">
                  <button
                    onClick={() => onNavigate('rider-dashboard')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <span>Launch Rider Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Application Not Approved
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  We could not approve your partner application at this time
                </h2>
                <p className="text-xs text-rose-800 font-medium">
                  Reason: {profile.rejection_reason || 'Verification criteria could not be fulfilled.'}
                </p>
                <p className="text-xs text-slate-600">
                  If you believe this is in error or you have updated documentation, please contact ReValue partner support at support@revalue.in.
                </p>
              </div>
            </div>
          </div>
        )}

        {isSuspended && (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 bg-slate-300 text-slate-800 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Partner Account Suspended
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Account temporarily suspended
                </h2>
                <p className="text-xs text-slate-600">
                  Your delivery partner privileges are suspended pending operational review. Reason: {profile.rejection_reason || 'Administrative review'}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Details Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Submitted Partner Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Partner Name</span>
              <span className="font-semibold text-slate-800">{profile.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email</span>
              <span className="font-semibold text-slate-800">{profile.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Mobile Phone</span>
              <span className="font-semibold text-slate-800">{profile.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Operating City</span>
              <span className="font-semibold text-slate-800">{profile.city}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block mb-1">Covered Service PIN Codes</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.service_pincodes.map((pin) => (
                  <span
                    key={pin}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px] font-medium"
                  >
                    {pin}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Vehicle Type & Reg</span>
              <span className="font-semibold text-slate-800 capitalize">
                {profile.vehicle_type.replace(/_/g, ' ')} • {profile.vehicle_registration_number}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Driving License</span>
              <span className="font-semibold text-slate-800">{profile.driving_license_number}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Emergency Contact</span>
              <span className="font-semibold text-slate-800">
                {profile.emergency_contact?.name} ({profile.emergency_contact?.relationship}) • {profile.emergency_contact?.phone}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Deliveries Completed</span>
              <span className="font-semibold text-slate-800">
                {profile.successful_deliveries} / {profile.total_deliveries} (⭐ {profile.rating.toFixed(1)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
