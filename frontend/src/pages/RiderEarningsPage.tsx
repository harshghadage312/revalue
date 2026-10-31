import React, { useState, useEffect } from 'react';
import {
  DollarSign, CheckCircle2, Clock, Bike,
  RotateCw, ArrowLeft, ShieldCheck, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RiderEarningsSummary } from '../types';

interface RiderEarningsPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth?: () => void;
}

export const RiderEarningsPage: React.FC<RiderEarningsPageProps> = ({
  onNavigate,
  onOpenAuth,
}) => {
  const { isAuthenticated } = useAuth();
  const [earnings, setEarnings] = useState<RiderEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRiderEarnings();
      setEarnings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load earnings records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadEarnings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
          <DollarSign className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Partner Earnings</h2>
          <p className="text-xs text-slate-600 mb-6">
            Please log in with your delivery partner account to review your compensation ledger.
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('rider-dashboard')}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Partner Earnings Ledger</h1>
              <p className="text-xs text-slate-500">Transparent per-delivery payout accounting</p>
            </div>
          </div>

          <button
            onClick={loadEarnings}
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

        {/* Earnings Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Earned
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              ₹{earnings?.total_earned ?? 0}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Across {earnings?.completed_jobs_count ?? 0} verified deliveries
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
              Pending Payout
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              ₹{earnings?.pending_payout ?? 0}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Scheduled for next settlement cycle
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
              Paid Out to Bank
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              ₹{earnings?.paid_out ?? 0}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Direct transfer to registered account
            </span>
          </div>
        </div>

        {/* How ReValue Calculates Compensation */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ReValue Delivery Partner Compensation Policy</span>
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-800">
            • <strong>Base Pay:</strong> ₹100 flat rate for every successfully delivered smartphone handover verified with OTP.<br />
            • <strong>Distance Bonus:</strong> Additional ₹15/km for deliveries spanning wider radii.<br />
            • <strong>No Hidden Cuts:</strong> 100% of the compensation stated at job broadcast is credited directly to your partner ledger.
          </p>
        </div>

        {/* Completed Deliveries Table / List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Payout Breakdown by Delivery</h2>
            <span className="text-xs text-slate-500 font-medium">
              {earnings?.jobs.length ?? 0} completed records
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading payout records...</div>
          ) : !earnings || earnings.jobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No completed delivery payout records found yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {earnings.jobs.map((item, idx) => (
                <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-600">
                        Order #{item.order_id.slice(-6)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.compensation.payout_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.compensation.payout_status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{item.product_title || 'Smartphone Delivery'}</p>
                    <p className="text-[11px] text-slate-400">
                      Base: ₹{item.compensation.base_pay} • Bonus: ₹{item.compensation.distance_bonus}
                      {item.compensation.paid_at && ` • Settled: ${new Date(item.compensation.paid_at).toLocaleDateString()}`}
                      {item.compensation.payout_reference && ` (Ref: ${item.compensation.payout_reference})`}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-base font-extrabold text-slate-900 block">
                      +₹{item.compensation.total_compensation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
