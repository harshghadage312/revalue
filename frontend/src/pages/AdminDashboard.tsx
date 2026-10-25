import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Package, AlertTriangle, TrendingUp,
  CheckCircle, XCircle, Trash2, ArrowLeft, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [reportedReviews, setReportedReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispute resolution modal
  const [selectedDispute, setSelectedDispute] = useState<{ id: string; action: string } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [m, u, d, r] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.listAdminUsers().then(res => res.users).catch(() => []),
        api.listAdminDisputes().catch(() => []),
        api.listAdminReportedReviews().catch(() => []),
      ]);
      setMetrics(m);
      setUsers(u);
      setDisputes(d);
      setReportedReviews(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (userId: string, currentStatus: boolean) => {
    try {
      await api.setAdminUserStatus(userId, !currentStatus);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resolutionNotes.trim()) return;
    setSubmittingResolution(true);
    try {
      await api.resolveAdminDispute(selectedDispute.id, selectedDispute.action, resolutionNotes);
      alert(`Dispute resolved with action '${selectedDispute.action}'.`);
      setSelectedDispute(null);
      setResolutionNotes('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve dispute.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this reported review?')) return;
    try {
      await api.deleteAdminReview(reviewId);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Administrator Access Required</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          You must have administrator privileges to view the moderation console and platform governance tools.
        </p>
        <button
          onClick={() => onNavigate('landing')}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-xs"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Platform Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Administrator Console</h1>
          <p className="text-sm text-slate-500 mt-1">
            Marketplace metrics, escrow dispute arbitration, user governance, and review moderation.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Operational Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total GMV Volume</span>
            <span className="text-2xl font-bold text-slate-900 block">
              ₹{(metrics.marketplace_gmv_inr || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500">Gross transaction turnover</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Registered Users</span>
            <span className="text-2xl font-bold text-slate-900 block">
              {metrics.total_users}
            </span>
            <span className="text-[11px] text-slate-500">Active buyers and sellers</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Listings</span>
            <span className="text-2xl font-bold text-emerald-700 block">
              {metrics.active_listings}
            </span>
            <span className="text-[11px] text-slate-500">Available inventory</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Open Disputes</span>
            <span className={`text-2xl font-bold block ${metrics.open_disputes > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {metrics.open_disputes}
            </span>
            <span className="text-[11px] text-slate-500">Requiring admin arbitration</span>
          </div>
        </div>
      )}

      {/* Open Disputes Moderation */}
      <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Disputes Requiring Arbitration</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {disputes.length} cases
          </span>
        </div>

        {disputes.length === 0 ? (
          <div className="text-xs text-slate-400 py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No open disputes requiring arbitration at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">Order #{d.order_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                      {d.reason?.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[11px] text-slate-500">
                      Opened: {new Date(d.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200">
                    "{d.details}"
                  </p>
                </div>

                {d.status === 'open' && (
                  <div className="flex sm:flex-col items-center justify-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedDispute({ id: d.id, action: 'release_seller' });
                        setResolutionNotes('Inspection verified; releasing payout to seller as agreed.');
                      }}
                      className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
                    >
                      Release to Seller
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDispute({ id: d.id, action: 'refund_buyer' });
                        setResolutionNotes('Item discrepancy confirmed; refunding buyer and cancelling settlement.');
                      }}
                      className="w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-colors"
                    >
                      Refund Buyer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* User Governance */}
      <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">User Governance & Status</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {users.length} accounts
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-slate-900">{u.name}</span>
                <span className="text-slate-400">({u.email})</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  u.role === 'admin' ? 'bg-amber-100 text-amber-800' :
                  u.role === 'seller' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {u.role}
                </span>
              </div>
              <button
                onClick={() => handleToggleUser(u.id, u.is_active)}
                className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-colors self-start sm:self-auto ${
                  u.is_active
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {u.is_active ? 'Disable Account' : 'Reactivate'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Reported Reviews */}
      {reportedReviews.length > 0 && (
        <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-rose-700 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Reported Reviews ({reportedReviews.length})</span>
          </h3>
          <div className="space-y-2">
            {reportedReviews.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs gap-3">
                <div>
                  <span className="font-bold text-slate-900">{r.reviewer_name}: </span>
                  <span className="text-slate-600 italic">"{r.comment}"</span>
                </div>
                <button
                  onClick={() => handleDeleteReview(r.id)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Arbitration Decision</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action: <strong className="uppercase text-slate-900">{selectedDispute.action.replace('_', ' ')}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Justification & Auditor Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record reasons for this decision..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className={`flex-1 py-2.5 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                    selectedDispute.action === 'refund_buyer'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submittingResolution ? 'Executing...' : 'Confirm Resolution'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
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
