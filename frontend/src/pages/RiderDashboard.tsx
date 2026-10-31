import React, { useState, useEffect } from 'react';
import {
  Bike, Power, MapPin, Navigation, DollarSign,
  PackageCheck, AlertCircle, ArrowRight, RotateCw, CheckCircle,
  Clock, Shield, User, ChevronRight, Award
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RiderProfile, DeliveryJob } from '../types';

interface RiderDashboardProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth?: () => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [activeJob, setActiveJob] = useState<DeliveryJob | null>(null);
  const [availableJobs, setAvailableJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [updatingGps, setUpdatingGps] = useState(false);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const prof = await api.getRiderProfile();
      setProfile(prof);

      // If approved, fetch active job and available jobs
      if (prof.application_status === 'approved') {
        const [active, available] = await Promise.all([
          api.getRiderActiveJob().catch(() => null),
          api.getRiderAvailableJobs().catch(() => []),
        ]);
        setActiveJob(active);
        setAvailableJobs(available);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load rider dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleToggleOnline = async () => {
    if (!profile) return;
    if (profile.application_status !== 'approved') {
      setError('You can only go online after your application has been approved by Operations.');
      return;
    }

    setTogglingStatus(true);
    setError(null);
    try {
      const updated = await api.updateRiderStatus(!profile.is_online);
      setProfile(updated);
      setSuccessMsg(updated.is_online ? 'You are now ONLINE and ready for local dispatches!' : 'You are now OFFLINE.');
      setTimeout(() => setSuccessMsg(null), 3000);

      if (updated.is_online) {
        const jobs = await api.getRiderAvailableJobs().catch(() => []);
        setAvailableJobs(jobs);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not update online status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSyncGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setUpdatingGps(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.updateRiderLocation(pos.coords.latitude, pos.coords.longitude);
          setSuccessMsg('GPS location updated successfully.');
          setTimeout(() => setSuccessMsg(null), 3000);
          await loadData(true);
        } catch (err: any) {
          setError(err?.message || 'Failed to save location update.');
        } finally {
          setUpdatingGps(false);
        }
      },
      (geoErr) => {
        setUpdatingGps(false);
        setError(`Location access denied or unavailable: ${geoErr.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAcceptJob = async (jobId: string) => {
    setAcceptingJobId(jobId);
    setError(null);
    try {
      const job = await api.acceptRiderJob(jobId);
      setActiveJob(job);
      setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
      setSuccessMsg(`Delivery job accepted! Navigate to pickup.`);
      onNavigate('rider-job-detail', { jobId: job.id });
    } catch (err: any) {
      setError(err?.message || 'Failed to accept job. It may have already been claimed.');
      await loadData(true);
    } finally {
      setAcceptingJobId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <Bike className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Delivery Partner Dashboard</h2>
          <p className="text-xs text-slate-600 mb-6">
            Please log in with your registered delivery partner account.
          </p>
          <button
            onClick={() => onOpenAuth ? onOpenAuth() : onNavigate('landing')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Sign In to Account
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading partner dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Partner Profile</h2>
          <p className="text-xs text-slate-600 mb-6">
            You do not have a registered delivery partner profile linked to this account.
          </p>
          <button
            onClick={() => onNavigate('delivery-partner-signup')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Apply to Become a Partner
          </button>
        </div>
      </div>
    );
  }

  // If not approved, prompt to check application status
  if (profile.application_status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Application Pending Approval</h2>
          <p className="text-xs text-slate-600 mb-6">
            Your delivery partner profile is currently {profile.application_status.replace(/_/g, ' ')}. Once approved by Operations, your dispatch feed will unlock.
          </p>
          <button
            onClick={() => onNavigate('delivery-partner-application')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Check Application Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Header / App Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 shadow-md sticky top-14 sm:top-16 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/40 shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base leading-tight">{profile.name}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold uppercase">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {profile.city} • {profile.vehicle_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Online / Offline switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOnline}
              disabled={togglingStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                profile.is_online
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${profile.is_online ? 'animate-pulse' : ''}`} />
              <span>{profile.is_online ? 'ONLINE' : 'OFFLINE'}</span>
            </button>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* GPS Location Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold block">GPS Location Broadcast</span>
              <span className="text-[11px] text-slate-400">
                {profile.current_location
                  ? `Active (${profile.current_location.latitude.toFixed(3)}, ${profile.current_location.longitude.toFixed(3)})`
                  : 'Location not updated yet'}
              </span>
            </div>
          </div>
          <button
            onClick={handleSyncGps}
            disabled={updatingGps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${updatingGps ? 'animate-spin' : ''}`} />
            <span>{updatingGps ? 'Locating...' : 'Update GPS'}</span>
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => onNavigate('rider-earnings')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold">Earnings</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-slate-900">
              ₹{profile.successful_deliveries * 135}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
              <span>View breakdown</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div
            onClick={() => onNavigate('rider-jobs')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold">Completed</span>
              <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-slate-900">
              {profile.successful_deliveries}
            </p>
            <span className="text-[10px] text-slate-400">Total verified</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold">Rating</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-base sm:text-lg font-extrabold text-slate-900">
              ⭐ {profile.rating.toFixed(1)}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">Top tier</span>
          </div>
        </div>

        {/* ACTIVE JOB BANNER (If rider currently has a job accepted/in-progress) */}
        {activeJob && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                ⚡ Active Delivery in Progress
              </span>
              <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded">
                Order #{activeJob.order_id.slice(-6)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                {activeJob.product_title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-emerald-100">
                <span>Status: <strong className="text-white capitalize">{activeJob.status.replace(/_/g, ' ')}</strong></span>
                <span>•</span>
                <span>Payout: <strong className="text-white">₹{activeJob.compensation.total_compensation}</strong></span>
              </div>
              <div className="text-xs text-emerald-50 space-y-0.5 pt-1">
                <p>📍 Pickup: {activeJob.pickup_location.street}, {activeJob.pickup_location.city} ({activeJob.pickup_location.pincode})</p>
                <p>🏁 Dropoff: {activeJob.dropoff_location.street}, {activeJob.dropoff_location.city} ({activeJob.dropoff_location.pincode})</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('rider-job-detail', { jobId: activeJob.id })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <span>Continue Delivery Action</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AVAILABLE JOBS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Available Nearby Deliveries ({availableJobs.length})
              </h2>
              <p className="text-xs text-slate-500">
                Based on your registered pincodes: {profile.service_pincodes.slice(0, 3).join(', ')}...
              </p>
            </div>
            <button
              onClick={() => loadData(true)}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              Refresh Feed
            </button>
          </div>

          {!profile.is_online ? (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
              <Power className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">You are currently OFFLINE</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Turn your status to ONLINE using the button above to receive real-time delivery requests.
              </p>
              <button
                onClick={handleToggleOnline}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-700"
              >
                Go Online Now
              </button>
            </div>
          ) : availableJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-2xs">
              <PackageCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-xs font-bold text-slate-800">No active delivery requests right now</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Stay online! New smartphone orders in your covered pincodes will broadcast here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase">
                        Smartphone Delivery
                      </span>
                      <span className="text-xs text-slate-400">Order #{job.order_id.slice(-6)}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{job.product_title}</h4>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pickup Area</span>
                        <span className="font-semibold text-slate-800">
                          {job.pickup_location.city} ({job.pickup_location.pincode})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dropoff Area</span>
                        <span className="font-semibold text-slate-800">
                          {job.dropoff_location.city} ({job.dropoff_location.pincode})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0 gap-3">
                    <div className="sm:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Earnings</span>
                      <span className="text-base sm:text-lg font-extrabold text-emerald-600">
                        ₹{job.compensation.total_compensation}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (₹{job.compensation.base_pay} + ₹{job.compensation.distance_bonus} bonus)
                      </span>
                    </div>

                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={acceptingJobId === job.id}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      {acceptingJobId === job.id ? 'Claiming...' : 'Accept Job'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Mobile Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-6 flex items-center justify-around z-40 sm:hidden">
        <button
          onClick={() => onNavigate('rider-dashboard')}
          className="flex flex-col items-center text-emerald-600 font-bold text-[10px]"
        >
          <Bike className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => onNavigate('rider-jobs')}
          className="flex flex-col items-center text-slate-500 hover:text-slate-900 text-[10px]"
        >
          <PackageCheck className="w-5 h-5 mb-0.5" />
          <span>Jobs</span>
        </button>
        <button
          onClick={() => onNavigate('rider-earnings')}
          className="flex flex-col items-center text-slate-500 hover:text-slate-900 text-[10px]"
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span>Earnings</span>
        </button>
        <button
          onClick={() => onNavigate('rider-profile')}
          className="flex flex-col items-center text-slate-500 hover:text-slate-900 text-[10px]"
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </button>
      </div>
    </div>
  );
};
