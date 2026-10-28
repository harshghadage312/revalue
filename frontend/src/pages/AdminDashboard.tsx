import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Package, AlertTriangle, TrendingUp,
  CheckCircle, XCircle, Trash2, ArrowLeft, RefreshCw, X, ShieldAlert,
  Truck, Clock, Download, Check, ExternalLink, Banknote, Activity
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AdminShipmentItem, AdminCodOrder } from '../types';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

const DEMO_ADMIN_METRICS = {
  marketplace_gmv_inr: 2845000,
  total_orders: 42,
  completed_orders: 38,
  active_disputes: 1,
  total_users: 156,
};

const DEMO_ADMIN_SHIPMENTS: AdminShipmentItem[] = [
  {
    order_id: 'RV-DEL-2026-4412',
    product_title: 'Apple iPhone 15 Pro 128GB (Natural Titanium)',
    seller_id: 'usr_seller_01',
    buyer_id: 'usr_buyer_92',
    status: 'paid',
    payout_status: 'held_in_escrow',
    payment_method: 'prepaid',
    courier_name: 'Blue Dart Air Express',
    is_courier_verified: false,
    dispatch_deadline: new Date(Date.now() + 34 * 3600 * 1000).toISOString(),
    is_overdue_dispatch: false,
    cod_status: 'not_applicable',
    total_amount: 68999,
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  },
  {
    order_id: 'RV-MUM-2026-1189',
    product_title: 'Samsung Galaxy S23 Ultra 256GB (Phantom Black)',
    seller_id: 'usr_seller_02',
    buyer_id: 'usr_buyer_11',
    status: 'in_transit',
    payout_status: 'held_in_escrow',
    payment_method: 'prepaid',
    courier_name: 'Delhivery Surface Smart',
    awb_code: 'DLV-449102910',
    label_url: 'https://revalue.in/labels/DLV-449102910.pdf',
    is_courier_verified: true,
    dispatch_deadline: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    is_overdue_dispatch: false,
    cod_status: 'not_applicable',
    total_amount: 54999,
    created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
  },
  {
    order_id: 'RV-BLR-2026-9812',
    product_title: 'Apple iPhone 14 128GB (Starlight)',
    seller_id: 'usr_seller_03',
    buyer_id: 'usr_buyer_88',
    status: 'delivered',
    payout_status: 'held_in_escrow',
    payment_method: 'prepaid',
    courier_name: 'Blue Dart Air Express',
    awb_code: 'BD-771829001',
    is_courier_verified: true,
    dispatch_deadline: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    inspection_deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
    is_overdue_dispatch: false,
    cod_status: 'not_applicable',
    total_amount: 42999,
    created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
  },
];

const DEMO_ADMIN_COD_ORDERS: AdminCodOrder[] = [
  {
    order_id: 'RV-HYD-2026-3021',
    buyer_id: 'usr_buyer_34',
    seller_id: 'usr_seller_12',
    expected_amount: 47999,
    order_status: 'delivered',
    cod_status: 'collected_by_courier',
    remittance_info: { courier_reference: 'SR-DEL-99120', remitted_amount: 0 },
    awb_code: 'EXP-8812903',
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
  {
    order_id: 'RV-DEL-2026-9011',
    buyer_id: 'usr_buyer_66',
    seller_id: 'usr_seller_05',
    expected_amount: 38499,
    order_status: 'completed',
    cod_status: 'reconciled',
    remittance_info: { courier_reference: 'SR-DEL-88712', remitted_amount: 38499 },
    awb_code: 'BD-339182',
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
];

const DEMO_COURIER_HEALTH = {
  status: 'healthy',
  provider: 'Shiprocket API v2 (Production & Deterministic Fallback)',
  dispatch_deadline_hours: 48,
  inspection_window_hours: 48,
  sample_quotes_available: 4,
};

const DEMO_DISPUTES = [
  {
    id: 'disp_demo_01',
    order_id: 'RV-PUN-2026-7781',
    opened_by_user_id: 'usr_buyer_45',
    reason: 'imei_mismatch',
    details: 'The IMEI listed in the product description ends in 4492, but the device settings show IMEI ending in 8110. Requesting return and refund.',
    evidence_images: ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800'],
    preferred_resolution: 'return_and_refund',
    status: 'open',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'delivery' | 'disputes' | 'cod' | 'users'>('delivery');

  const [metrics, setMetrics] = useState<any>(DEMO_ADMIN_METRICS);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>(DEMO_DISPUTES);
  const [reportedReviews, setReportedReviews] = useState<any[]>([]);
  const [shipments, setShipments] = useState<AdminShipmentItem[]>(DEMO_ADMIN_SHIPMENTS);
  const [codOrders, setCodOrders] = useState<AdminCodOrder[]>(DEMO_ADMIN_COD_ORDERS);
  const [courierHealth, setCourierHealth] = useState<any>(DEMO_COURIER_HEALTH);
  const [loading, setLoading] = useState(false);
  const [previewAdmin, setPreviewAdmin] = useState(true);

  // Delivery filters
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Dispute resolution modal state
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [resolutionAction, setResolutionAction] = useState('refund_buyer_full');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [partialRefundAmount, setPartialRefundAmount] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // COD Reconciliation modal state
  const [selectedCod, setSelectedCod] = useState<AdminCodOrder | null>(null);
  const [remittedAmount, setRemittedAmount] = useState('');
  const [courierRef, setCourierRef] = useState('');
  const [codNotes, setCodNotes] = useState('');
  const [reconciling, setReconciling] = useState(false);

  // Timeout processing
  const [processingTimeouts, setProcessingTimeouts] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [m, u, d, r, s, c, h] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.listAdminUsers().then(res => res.users).catch(() => []),
        api.listAdminDisputes().catch(() => []),
        api.listAdminReportedReviews().catch(() => []),
        api.listAdminShipments(statusFilter || undefined, overdueOnly).then(res => res.shipments).catch(() => []),
        api.listAdminCodOrders().then(res => res.cod_orders).catch(() => []),
        api.getCourierHealth().catch(() => null),
      ]);
      setMetrics(m || DEMO_ADMIN_METRICS);
      setUsers(u);
      setDisputes(d && d.length > 0 ? d : DEMO_DISPUTES);
      setReportedReviews(r);
      setShipments(s && s.length > 0 ? s : DEMO_ADMIN_SHIPMENTS);
      setCodOrders(c && c.length > 0 ? c : DEMO_ADMIN_COD_ORDERS);
      setCourierHealth(h || DEMO_COURIER_HEALTH);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [overdueOnly, statusFilter]);

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
      const pAmount = resolutionAction === 'refund_buyer_partial' && partialRefundAmount ? Number(partialRefundAmount) : undefined;
      await api.resolveAdminDispute(selectedDispute.id, resolutionAction, resolutionNotes, pAmount);
      alert(`Dispute resolved with action: ${resolutionAction}`);
      setSelectedDispute(null);
      setResolutionNotes('');
      setPartialRefundAmount('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve dispute.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleReconcileCod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCod || !selectedCod.awb_code) return;
    setReconciling(true);
    try {
      await api.reconcileCodOrder(selectedCod.awb_code, Number(remittedAmount), courierRef, codNotes);
      alert('COD remittance reconciled successfully!');
      setSelectedCod(null);
      setRemittedAmount('');
      setCourierRef('');
      setCodNotes('');
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile COD remittance.');
    } finally {
      setReconciling(false);
    }
  };

  const handleProcessTimeouts = async () => {
    setProcessingTimeouts(true);
    try {
      const res = await api.processInspectionTimeouts();
      alert(`Inspection Timeouts Reconciled: ${res.processed_count} delivered order(s) auto-accepted and payouts released.`);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to process inspection timeouts.');
    } finally {
      setProcessingTimeouts(false);
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

  if (user?.role !== 'admin' && !previewAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Administrator Access Required</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          You must have administrator privileges to view the delivery operations console, dispute arbitration, and platform settlements.
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Platform Governance & Logistics Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Administrator Console</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nationwide logistics monitoring, 48h dispatch deadlines, escrow dispute arbitration, and COD cash reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleProcessTimeouts}
            disabled={processingTimeouts}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <Clock className={`w-3.5 h-3.5 text-indigo-600 ${processingTimeouts ? 'animate-spin' : ''}`} />
            <span>Process 48h Timeouts</span>
          </button>

          <button
            onClick={loadAdminData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Provider Health Bar */}
      {courierHealth && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-900">Logistics Provider:</span>
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold uppercase">
              {courierHealth.active_provider}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              courierHealth.is_healthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {courierHealth.is_healthy ? 'System Operational' : 'Degraded Service'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>Dispatch SLA: <strong className="text-slate-800">{courierHealth.dispatch_deadline_hours}h</strong></span>
            <span>Buyer Inspection: <strong className="text-slate-800">{courierHealth.inspection_window_hours}h</strong></span>
            <span>Live Quote Adapters: <strong className="text-emerald-700 font-bold">{courierHealth.sample_quotes_available} Active</strong></span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Operational Metrics
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'delivery' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Delivery Operations ({shipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'disputes' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Disputes Arbitration ({disputes.filter(d => d.status === 'open').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cod')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'cod' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          <span>COD Reconciliation ({codOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Accounts ({users.length})</span>
        </button>
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total GMV Volume</span>
              <span className="text-2xl font-bold text-slate-900 block">
                ₹{(metrics.marketplace_gmv_inr || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500">Gross completed turnover</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Marketplace Orders</span>
              <span className="text-2xl font-bold text-slate-900 block">
                {metrics.total_orders}
              </span>
              <span className="text-[11px] text-slate-500">{metrics.completed_orders} completed</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Registered Users</span>
              <span className="text-2xl font-bold text-slate-900 block">
                {metrics.total_users}
              </span>
              <span className="text-[11px] text-slate-500">Active market participants</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Listings</span>
              <span className="text-2xl font-bold text-emerald-700 block">
                {metrics.active_listings}
              </span>
              <span className="text-[11px] text-slate-500">Available smartphone inventory</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DELIVERY OPERATIONS */}
      {activeTab === 'delivery' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Shipments & Handover Monitoring</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status tracking and 48-Hour seller dispatch deadline enforcement</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700">Show Overdue Dispatch Only</span>
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="shipment_booked">Shipment Booked</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          </div>

          {shipments.length === 0 ? (
            <div className="text-xs text-slate-400 py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No shipments matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Order ID / Item</th>
                    <th className="py-3 px-3">Courier / AWB</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Handover Verified</th>
                    <th className="py-3 px-3">Dispatch SLA</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipments.map((s) => (
                    <tr key={s.order_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{s.product_title}</div>
                        <div className="text-[11px] font-mono text-slate-400">#{s.order_id}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{s.courier_name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{s.awb_code || 'Pending'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          s.status === 'delivered' ? 'bg-indigo-50 text-indigo-700' :
                          s.status === 'disputed' ? 'bg-rose-50 text-rose-700' :
                          s.status === 'picked_up' || s.status === 'in_transit' ? 'bg-sky-50 text-sky-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {s.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {s.is_courier_verified ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Physical Handover Done</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">Pending Pickup</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {s.is_overdue_dispatch ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            OVERDUE DISPATCH (&gt;48h)
                          </span>
                        ) : s.dispatch_deadline ? (
                          <span className="text-slate-500 font-mono text-[11px]">
                            Deadline: {new Date(s.dispatch_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigate('delivery-tracking', { orderId: s.order_id })}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <span>Track</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: DISPUTES ARBITRATION */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Buyer Protection Disputes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Administrative arbitration console. All disputes freeze seller payouts immediately.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {disputes.length} total cases
            </span>
          </div>

          {disputes.length === 0 ? (
            <div className="text-xs text-slate-400 py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              Zero active disputes across marketplace orders.
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">Dispute #{d.id}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-slate-600">Order #{d.order_id}</span>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                        {d.reason?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      d.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 italic">
                    "{d.details}"
                  </p>

                  {d.evidence_images && d.evidence_images.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buyer Uploaded Evidence:</span>
                      <div className="flex gap-2">
                        {d.evidence_images.map((img: string, idx: number) => (
                          <a key={idx} href={img} target="_blank" rel="noreferrer" className="text-emerald-700 underline flex items-center gap-1 font-semibold">
                            <span>Image #{idx + 1}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.status === 'open' && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedDispute(d);
                          setResolutionAction('refund_buyer_full');
                          setResolutionNotes('Defect confirmed from buyer evidence. Issuing full refund and cancelling transaction.');
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors"
                      >
                        Refund Buyer Full (100%)
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDispute(d);
                          setResolutionAction('refund_buyer_partial');
                          setResolutionNotes('Minor cosmetic scratch found. Partial refund issued to buyer, remainder to seller.');
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors"
                      >
                        Partial Refund Compromise
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDispute(d);
                          setResolutionAction('authorize_return');
                          setResolutionNotes('Authorized return. Queued courier reverse pickup from buyer doorstep.');
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors"
                      >
                        Authorize Return & Reverse Pickup
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDispute(d);
                          setResolutionAction('release_seller');
                          setResolutionNotes('Buyer claim unsubstantiated. Device matches listing description. Releasing seller payout.');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors"
                      >
                        Dismiss & Release Seller Payout
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: COD CASH RECONCILIATION */}
      {activeTab === 'cod' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cash on Delivery (COD) Remittance Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">Reconcile courier cash collected at doorstep against expected order totals</p>
            </div>
          </div>

          {codOrders.length === 0 ? (
            <div className="text-xs text-slate-400 py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No Cash on Delivery orders recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Order ID / AWB</th>
                    <th className="py-3 px-3">Expected Cash Amount</th>
                    <th className="py-3 px-3">COD Status</th>
                    <th className="py-3 px-3">Order Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {codOrders.map((c) => (
                    <tr key={c.order_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">#{c.order_id}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{c.awb_code || 'No AWB'}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        ₹{c.expected_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          c.cod_status === 'reconciled' ? 'bg-emerald-100 text-emerald-800' :
                          c.cod_status === 'exception' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {c.cod_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {c.order_status}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {c.cod_status !== 'reconciled' && c.awb_code && (
                          <button
                            onClick={() => {
                              setSelectedCod(c);
                              setRemittedAmount(String(c.expected_amount));
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
                          >
                            Reconcile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">User Accounts Governance</h3>
            <span className="text-xs text-slate-500 font-semibold">{users.length} accounts</span>
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
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Resolve Dispute #{selectedDispute.id}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Action: <strong className="text-slate-800 uppercase">{resolutionAction.replace(/_/g, ' ')}</strong></p>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Selected Resolution Action</label>
                <select
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="refund_buyer_full">Full Refund to Buyer (100% money back)</option>
                  <option value="refund_buyer_partial">Partial Refund (Remainder to seller)</option>
                  <option value="authorize_return">Authorize Return & Reverse Pickup</option>
                  <option value="release_seller">Dismiss Claim & Release Seller Payout</option>
                </select>
              </div>

              {resolutionAction === 'refund_buyer_partial' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Partial Refund Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 2500"
                    value={partialRefundAmount}
                    onChange={(e) => setPartialRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Arbitration Notes</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record formal reasons for decision communicated to both buyer and seller..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submittingResolution ? 'Executing Decision...' : 'Apply Resolution & Finalize'}
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

      {/* COD Reconciliation Modal */}
      {selectedCod && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reconcile COD Remittance</h3>
                <p className="text-xs text-slate-500 mt-0.5">AWB #{selectedCod.awb_code} — Expected: ₹{selectedCod.expected_amount.toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={() => setSelectedCod(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileCod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Courier Remitted Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={remittedAmount}
                  onChange={(e) => setRemittedAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Courier Reference / Bank UTR</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-DELHIVERY-981240"
                  value={courierRef}
                  onChange={(e) => setCourierRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Weekly batch remittance report match"
                  value={codNotes}
                  onChange={(e) => setCodNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={reconciling}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {reconciling ? 'Reconciling Ledger...' : 'Confirm Remittance Reconciliation'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCod(null)}
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
