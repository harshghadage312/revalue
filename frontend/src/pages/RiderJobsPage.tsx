import React, { useState, useEffect } from 'react';
import {
  Package, CheckCircle2, AlertCircle, Clock,
  ArrowRight, RotateCw, Bike, ChevronRight, DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DeliveryJob } from '../types';

interface RiderJobsPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth?: () => void;
}

export const RiderJobsPage: React.FC<RiderJobsPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'active' | 'available' | 'history'>('available');
  const [activeJob, setActiveJob] = useState<DeliveryJob | null>(null);
  const [availableJobs, setAvailableJobs] = useState<DeliveryJob[]>([]);
  const [historyJobs, setHistoryJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, available, historyRes] = await Promise.all([
        api.getRiderActiveJob().catch(() => null),
        api.getRiderAvailableJobs().catch(() => []),
        api.getRiderJobHistory(1, 30).catch(() => ({ jobs: [], total: 0 })),
      ]);
      setActiveJob(active);
      setAvailableJobs(available);
      setHistoryJobs(historyRes.jobs || []);

      if (active) {
        setTab('active');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load delivery jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <Bike className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Delivery Partner Jobs</h2>
          <p className="text-xs text-slate-600 mb-6">
            Please log in with your delivery partner account to access your job history.
          </p>
          <button
            onClick={() => onOpenAuth ? onOpenAuth() : onNavigate('landing')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Delivery Jobs</h1>
            <p className="text-xs text-slate-500">Manage ongoing tasks and review completed smartphone dispatches</p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            onClick={() => setTab('active')}
            className={`pb-2.5 px-1 relative transition-colors ${
              tab === 'active'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Active Job {activeJob && <span className="ml-1.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">1</span>}
          </button>
          <button
            onClick={() => setTab('available')}
            className={`pb-2.5 px-1 relative transition-colors ${
              tab === 'available'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Available Nearby ({availableJobs.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`pb-2.5 px-1 relative transition-colors ${
              tab === 'history'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Completed History ({historyJobs.length})
          </button>
        </div>

        {/* TAB 1: Active Job */}
        {tab === 'active' && (
          <div className="space-y-4">
            {!activeJob ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No active delivery currently</h3>
                <p className="text-xs text-slate-500">
                  Accept an available job from the broadcast list to start a new delivery run.
                </p>
                <button
                  onClick={() => setTab('available')}
                  className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  View Available Deliveries
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    In Progress: {activeJob.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Order #{activeJob.order_id.slice(-6)}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{activeJob.product_title}</h3>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pickup</span>
                      <p className="font-semibold text-slate-800">{activeJob.pickup_location.contact_name}</p>
                      <p className="text-slate-600">{activeJob.pickup_location.street}, {activeJob.pickup_location.city}</p>
                      <p className="text-slate-500 font-mono mt-0.5">PIN: {activeJob.pickup_location.pincode}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Dropoff</span>
                      <p className="font-semibold text-slate-800">{activeJob.dropoff_location.contact_name}</p>
                      <p className="text-slate-600">{activeJob.dropoff_location.street}, {activeJob.dropoff_location.city}</p>
                      <p className="text-slate-500 font-mono mt-0.5">PIN: {activeJob.dropoff_location.pincode}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Compensation</span>
                    <span className="text-base font-extrabold text-emerald-600">
                      ₹{activeJob.compensation.total_compensation}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('rider-job-detail', { jobId: activeJob.id })}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <span>Execute Job</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Available Jobs */}
        {tab === 'available' && (
          <div className="space-y-3">
            {availableJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No jobs waiting right now</h3>
                <p className="text-xs text-slate-500">
                  Deliveries in your registered pincodes will show up here automatically when placed.
                </p>
              </div>
            ) : (
              availableJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] font-mono text-slate-400">Order #{job.order_id.slice(-6)}</span>
                    <h4 className="text-sm font-bold text-slate-900">{job.product_title}</h4>
                    <p className="text-xs text-slate-500">
                      From {job.pickup_location.city} ({job.pickup_location.pincode}) → {job.dropoff_location.city} ({job.dropoff_location.pincode})
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-3 shrink-0">
                    <div>
                      <span className="text-base font-extrabold text-emerald-600">
                        ₹{job.compensation.total_compensation}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate('rider-job-detail', { jobId: job.id })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                    >
                      View & Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Completed History */}
        {tab === 'history' && (
          <div className="space-y-3">
            {historyJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No completed jobs yet</h3>
                <p className="text-xs text-slate-500">
                  Completed deliveries and verified OTP handovers will be recorded here.
                </p>
              </div>
            ) : (
              historyJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                        Delivered
                      </span>
                      <span className="text-xs text-slate-400">Order #{job.order_id.slice(-6)}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{job.product_title}</h4>
                    <p className="text-[11px] text-slate-400">
                      Delivered on {job.delivered_at ? new Date(job.delivered_at).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                      +₹{job.compensation.total_compensation}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold capitalize">
                      {job.compensation.payout_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
