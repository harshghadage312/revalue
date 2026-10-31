import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Package, AlertTriangle, TrendingUp,
  CheckCircle, XCircle, Trash2, ArrowLeft, RefreshCw, X, ShieldAlert,
  Truck, Clock, Download, Check, ExternalLink, Banknote, Activity,
  Bike, MapPin, KeyRound, CheckCheck, Power, Plus, Edit2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AdminShipmentItem, AdminCodOrder, RiderProfile, DeliveryJob,
  ServiceArea, RiderCompensationRecord
} from '../types';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'delivery' | 'disputes' | 'cod' | 'users' | 'riders' | 'local-dispatch' | 'service-areas' | 'rider-payouts'
  >('overview');

  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [reportedReviews, setReportedReviews] = useState<any[]>([]);
  const [shipments, setShipments] = useState<AdminShipmentItem[]>([]);
  const [codOrders, setCodOrders] = useState<AdminCodOrder[]>([]);
  const [courierHealth, setCourierHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hybrid Local Delivery Platform states
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [dispatchJobs, setDispatchJobs] = useState<DeliveryJob[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [riderLedger, setRiderLedger] = useState<RiderCompensationRecord[]>([]);

  // Rider Review Modal
  const [selectedRider, setSelectedRider] = useState<RiderProfile | null>(null);
  const [riderRejectionReason, setRiderRejectionReason] = useState('');
  const [updatingRiderStatus, setUpdatingRiderStatus] = useState(false);

  // Job Reassign Modal
  const [selectedJobToReassign, setSelectedJobToReassign] = useState<DeliveryJob | null>(null);
  const [targetRiderId, setTargetRiderId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Service Area Creation Modal
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newAreaCity, setNewAreaCity] = useState('');
  const [newAreaState, setNewAreaState] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaPincodes, setNewAreaPincodes] = useState('');
  const [newAreaRate, setNewAreaRate] = useState('120');
  const [newAreaWeight, setNewAreaWeight] = useState('3.0');
  const [newAreaHours, setNewAreaHours] = useState('4');
  const [savingArea, setSavingArea] = useState(false);

  // Rider Payout Modal
  const [selectedCompensation, setSelectedCompensation] = useState<RiderCompensationRecord | null>(null);
  const [payoutBankRef, setPayoutBankRef] = useState('');
  const [settlingPayout, setSettlingPayout] = useState(false);

  // Delivery filters
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [riderStatusFilter, setRiderStatusFilter] = useState('');

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
      const [m, u, d, r, s, c, h, rRes, djRes, saList, rLedgerRes] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.listAdminUsers().then(res => res.users).catch(() => []),
        api.listAdminDisputes().catch(() => []),
        api.listAdminReportedReviews().catch(() => []),
        api.listAdminShipments(statusFilter || undefined, overdueOnly).then(res => res.shipments).catch(() => []),
        api.listAdminCodOrders().then(res => res.cod_orders).catch(() => []),
        api.getCourierHealth().catch(() => null),
        api.listAdminRiders(riderStatusFilter || undefined).catch(() => ({ riders: [], total: 0 })),
        api.listAdminDispatchJobs().catch(() => ({ jobs: [], total: 0 })),
        api.listAdminServiceAreas().catch(() => []),
        api.listAdminRiderCompensationLedger().catch(() => ({ ledger: [], total: 0 })),
      ]);
      setMetrics(m);
      setUsers(u);
      setDisputes(d);
      setReportedReviews(r);
      setShipments(s);
      setCodOrders(c);
      setCourierHealth(h);
      setRiders(rRes?.riders || []);
      setDispatchJobs(djRes?.jobs || []);
      setServiceAreas(saList || []);
      setRiderLedger(rLedgerRes?.ledger || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [overdueOnly, statusFilter, riderStatusFilter]);

  // Hybrid Delivery Handlers
  const handleDirectApproveRider = async (rider: RiderProfile) => {
    const confirmed = window.confirm(
      `Approve delivery partner "${rider.name}" (${rider.email})?\n\n` +
      `Vehicle: ${rider.vehicle_type.replace(/_/g, ' ')} (${rider.vehicle_registration_number})\n` +
      `City: ${rider.city} | PIN Codes: ${rider.service_pincodes.join(', ')}\n\n` +
      `This will activate their account, grant them access to the Rider Dashboard, and allow them to go online and accept delivery jobs.`
    );
    if (!confirmed) return;

    setUpdatingRiderStatus(true);
    try {
      await api.updateAdminRiderStatus(rider.id, 'approved');
      alert(`Delivery partner "${rider.name}" has been approved successfully!`);
      await loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve rider.');
    } finally {
      setUpdatingRiderStatus(false);
    }
  };

  const handleDirectRejectRider = async (rider: RiderProfile) => {
    const reason = window.prompt(
      `Enter rejection reason for "${rider.name}" (${rider.email}):`,
      'Verification documents or vehicle details did not meet requirements.'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A rejection reason is required to reject an application.');
      return;
    }

    setUpdatingRiderStatus(true);
    try {
      await api.updateAdminRiderStatus(rider.id, 'rejected', reason.trim());
      alert(`Application for "${rider.name}" has been rejected.`);
      await loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject rider.');
    } finally {
      setUpdatingRiderStatus(false);
    }
  };

  const handleUpdateRiderStatus = async (status: string) => {
    if (!selectedRider) return;
    if ((status === 'rejected' || status === 'suspended') && !riderRejectionReason.trim()) {
      alert('Please provide a reason for rejecting or suspending this application.');
      return;
    }
    setUpdatingRiderStatus(true);
    try {
      await api.updateAdminRiderStatus(
        selectedRider.id,
        status,
        status === 'rejected' || status === 'suspended' ? riderRejectionReason.trim() : undefined
      );
      alert(`Rider application status updated to: ${status}`);
      setSelectedRider(null);
      setRiderRejectionReason('');
      await loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update rider status.');
    } finally {
      setUpdatingRiderStatus(false);
    }
  };

  const handleReassignJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobToReassign || !targetRiderId) return;
    setReassigning(true);
    try {
      await api.reassignAdminDispatchJob(selectedJobToReassign.id, targetRiderId, reassignReason || undefined);
      alert('Job reassigned successfully.');
      setSelectedJobToReassign(null);
      setTargetRiderId('');
      setReassignReason('');
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reassign delivery job.');
    } finally {
      setReassigning(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    const reason = prompt('Enter formal reason for cancelling this local delivery dispatch:');
    if (!reason || !reason.trim()) return;
    try {
      await api.cancelAdminDispatchJob(jobId, reason.trim());
      alert('Delivery job cancelled.');
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel job.');
    }
  };

  const handleCreateServiceArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const pincodes = newAreaPincodes
      .split(',')
      .map(p => p.trim())
      .filter(p => /^\d{6}$/.test(p));

    if (pincodes.length === 0) {
      alert('Please enter at least one valid 6-digit PIN code.');
      return;
    }

    setSavingArea(true);
    try {
      await api.createAdminServiceArea({
        city: newAreaCity.trim(),
        state: newAreaState.trim(),
        name: newAreaName.trim(),
        pincodes,
        base_shipping_rate: Number(newAreaRate) || 120,
        max_package_weight_kg: Number(newAreaWeight) || 3.0,
        estimated_delivery_hours: Number(newAreaHours) || 4,
        is_active: true,
      });
      alert('Service area registered successfully!');
      setShowAddAreaModal(false);
      setNewAreaCity('');
      setNewAreaState('');
      setNewAreaName('');
      setNewAreaPincodes('');
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create service area.');
    } finally {
      setSavingArea(false);
    }
  };

  const handleToggleServiceArea = async (area: ServiceArea) => {
    try {
      await api.updateAdminServiceArea(area.id, { is_active: !area.is_active });
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update service area status.');
    }
  };

  const handleDeleteServiceArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this service area?')) return;
    try {
      await api.deleteAdminServiceArea(areaId);
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete service area.');
    }
  };

  const handleSettleRiderPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompensation) return;
    setSettlingPayout(true);
    try {
      await api.markAdminRiderCompensationPaid(selectedCompensation.job_id, payoutBankRef.trim() || undefined);
      alert('Rider compensation marked as paid!');
      setSelectedCompensation(null);
      setPayoutBankRef('');
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Failed to settle payout.');
    } finally {
      setSettlingPayout(false);
    }
  };

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

  if (user?.role !== 'admin') {
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

        <button
          onClick={() => setActiveTab('riders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'riders' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bike className="w-3.5 h-3.5 text-emerald-600" />
          <span>Delivery Partners ({riders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('local-dispatch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'local-dispatch' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-blue-600" />
          <span>Local Dispatch ({dispatchJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('service-areas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'service-areas' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-purple-600" />
          <span>Service Areas ({serviceAreas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rider-payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'rider-payouts' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5 text-amber-600" />
          <span>Rider Payouts ({riderLedger.length})</span>
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

      {/* TAB: DELIVERY PARTNERS (RIDERS) */}
      {activeTab === 'riders' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Delivery Partner Fleet Governance</h3>
              <p className="text-xs text-slate-500">Review driver credentials, vehicle registrations, and service pincode coverage</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold">{riders.length} registered partners</span>
              <button
                onClick={() => loadAdminData()}
                disabled={loading}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh delivery partners"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: '', label: 'All Partners' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'approved', label: 'Approved Fleet' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'suspended', label: 'Suspended' },
            ].map((tab) => {
              const count = tab.id
                ? riders.filter((r) => r.application_status === tab.id).length
                : riders.length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRiderStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    riderStatusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      riderStatusFilter === tab.id
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-700 shadow-2xs'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {riders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Bike className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
              <p>No delivery partners matching this filter.</p>
              {riderStatusFilter && (
                <button
                  onClick={() => setRiderStatusFilter('')}
                  className="text-emerald-600 font-semibold underline text-xs mt-1"
                >
                  Clear filter and view all
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Applicant & Contact</th>
                    <th className="pb-3 px-3">Vehicle Details</th>
                    <th className="pb-3 px-3">Operating PIN Codes & City</th>
                    <th className="pb-3 px-3">Submission Date</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riders.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{r.name}</span>
                        <span className="text-slate-500 text-[11px] block">{r.email}</span>
                        <span className="text-slate-400 text-[10px] block font-mono">{r.phone}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <span className="capitalize font-semibold text-slate-800 block">
                          {r.vehicle_type?.replace(/_/g, ' ') || 'Motorcycle'}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          Reg: {r.vehicle_registration_number || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          DL: {r.driving_license_number || 'Submitted'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <span className="font-semibold text-slate-800 block">{r.city}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          PINs: {r.service_pincodes && r.service_pincodes.length > 0 ? r.service_pincodes.join(', ') : 'None'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {r.created_at
                              ? new Date(r.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                        </div>
                        {r.created_at && (
                          <span className="text-[10px] text-slate-400 block pl-4">
                            {new Date(r.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              r.application_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.application_status === 'pending' || r.application_status === 'under_review'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.application_status.replace(/_/g, ' ')}
                          </span>
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.is_online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  r.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              {r.is_online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(r.application_status === 'pending' || r.application_status === 'under_review') && (
                            <>
                              <button
                                type="button"
                                disabled={updatingRiderStatus}
                                onClick={() => handleDirectApproveRider(r)}
                                title="Approve application"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                disabled={updatingRiderStatus}
                                onClick={() => handleDirectRejectRider(r)}
                                title="Reject application"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {r.application_status === 'approved' && (
                            <button
                              type="button"
                              disabled={updatingRiderStatus}
                              onClick={() => {
                                const reason = window.prompt(
                                  `Enter suspension reason for "${r.name}":`,
                                  'Delivery performance review or policy compliance inquiry.'
                                );
                                if (reason !== null && reason.trim()) {
                                  api.updateAdminRiderStatus(r.id, 'suspended', reason.trim())
                                    .then(() => {
                                      alert(`Rider "${r.name}" has been suspended.`);
                                      loadAdminData();
                                    })
                                    .catch((err: any) => alert(err?.message || 'Failed to suspend rider.'));
                                }
                              }}
                              title="Suspend partner"
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}

                          {(r.application_status === 'rejected' || r.application_status === 'suspended') && (
                            <button
                              type="button"
                              disabled={updatingRiderStatus}
                              onClick={() => handleDirectApproveRider(r)}
                              title="Re-approve partner"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Re-approve</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRider(r);
                              setRiderRejectionReason(r.rejection_reason || '');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: LOCAL DISPATCH CONSOLE */}
      {activeTab === 'local-dispatch' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Local Smartphone Dispatch Console</h3>
              <p className="text-xs text-slate-500">Real-time status tracking, rider assignments, and exception interventions</p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{dispatchJobs.length} local jobs</span>
          </div>

          {dispatchJobs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No local delivery dispatches created yet. Local shipments are automatically generated when buyers choose ReValue Local Delivery.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Order / Device</th>
                    <th className="pb-3 px-3">Route (PIN to PIN)</th>
                    <th className="pb-3 px-3">Assigned Rider</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Compensation</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{job.product_title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Order #{job.order_id.slice(-6)}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        <span>{job.pickup_location.pincode} → {job.dropoff_location.pincode}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">{job.dropoff_location.city}</span>
                      </td>
                      <td className="py-3 px-3">
                        {job.assigned_rider_name ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">{job.assigned_rider_name}</span>
                            <span className="text-[10px] text-slate-400 block">{job.assigned_rider_phone}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                            Unassigned Broadcast
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          job.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          job.status === 'failed' || job.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">₹{job.compensation.total_compensation}</span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        {job.status !== 'delivered' && job.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedJobToReassign(job);
                                setTargetRiderId(job.assigned_rider_id || '');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                            >
                              Reassign
                            </button>
                            <button
                              onClick={() => handleCancelJob(job.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </>
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

      {/* TAB: SERVICE AREAS */}
      {activeTab === 'service-areas' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Local Delivery Service Areas</h3>
              <p className="text-xs text-slate-500">Configure serviceable cities, eligible pincodes, rates, and SLA limits</p>
            </div>
            <button
              onClick={() => setShowAddAreaModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Area</span>
            </button>
          </div>

          {serviceAreas.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No service areas defined. Add a service area to enable local direct deliveries.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceAreas.map((area) => (
                <div key={area.id} className="p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{area.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          area.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {area.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{area.city}, {area.state}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleServiceArea(area)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          area.is_active
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {area.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteServiceArea(area.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete Area"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Base Rate</span>
                      <span className="font-bold text-slate-900">₹{area.base_shipping_rate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Max Weight</span>
                      <span className="font-bold text-slate-900">{area.max_package_weight_kg} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Est. SLA</span>
                      <span className="font-bold text-slate-900">{area.estimated_delivery_hours}h</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold mb-1">
                      Covered PIN Codes ({area.pincodes.length})
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {area.pincodes.map((pin) => (
                        <span key={pin} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px]">
                          {pin}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: RIDER COMPENSATION LEDGER */}
      {activeTab === 'rider-payouts' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Rider Compensation Ledger</h3>
              <p className="text-xs text-slate-500">Audit per-delivery earnings and settle rider bank/UPI payouts</p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{riderLedger.length} ledger entries</span>
          </div>

          {riderLedger.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No rider compensation entries recorded yet. Entries are credited automatically when local deliveries are completed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Order / Job</th>
                    <th className="pb-3 px-3">Delivery Partner</th>
                    <th className="pb-3 px-3">Compensation Amount</th>
                    <th className="pb-3 px-3">Payout Status</th>
                    <th className="pb-3 px-3">Bank Reference</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riderLedger.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-slate-800 block">
                          Order #{item.order_id.slice(-6)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Job #{item.job_id.slice(-6)}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{item.rider_name}</span>
                        <span className="text-[11px] text-slate-400">{item.rider_phone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-emerald-600 text-sm">₹{item.amount}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.payout_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.payout_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {item.payout_reference || <span className="text-slate-400 italic">Pending Settlement</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.payout_status !== 'paid' && (
                          <button
                            onClick={() => setSelectedCompensation(item)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
                          >
                            Mark Paid
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

      {/* Review Rider Application Modal */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Review Partner: {selectedRider.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Application ID: {selectedRider.id}</p>
              </div>
              <button
                onClick={() => setSelectedRider(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                  <span className="font-semibold text-slate-800">{selectedRider.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">City</span>
                  <span className="font-semibold text-slate-800">{selectedRider.city}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {selectedRider.vehicle_type.replace(/_/g, ' ')} ({selectedRider.vehicle_registration_number})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">License</span>
                  <span className="font-semibold text-slate-800">{selectedRider.driving_license_number}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pincodes ({selectedRider.service_pincodes.length})</span>
                  <span className="font-mono text-slate-700">{selectedRider.service_pincodes.join(', ')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection or Suspension (Required for Reject/Suspend)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invalid driving license document, or out of service zone"
                  value={riderRejectionReason}
                  onChange={(e) => setRiderRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={updatingRiderStatus}
                  onClick={() => handleUpdateRiderStatus('approved')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  Approve Application
                </button>
                <button
                  type="button"
                  disabled={updatingRiderStatus}
                  onClick={() => handleUpdateRiderStatus('rejected')}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs transition-colors border border-rose-200 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={updatingRiderStatus}
                  onClick={() => handleUpdateRiderStatus('suspended')}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  Suspend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Job Modal */}
      {selectedJobToReassign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reassign Dispatch Job</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order #{selectedJobToReassign.order_id.slice(-6)}</p>
              </div>
              <button
                onClick={() => setSelectedJobToReassign(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignJob} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Delivery Partner *</label>
                <select
                  required
                  value={targetRiderId}
                  onChange={(e) => setTargetRiderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="">-- Choose Approved Rider --</option>
                  {riders
                    .filter((r) => r.application_status === 'approved')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.city} • {r.is_online ? 'Online' : 'Offline'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reassignment Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Initial rider vehicle breakdown, customer requested rush pickup"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={reassigning || !targetRiderId}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJobToReassign(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Area Modal */}
      {showAddAreaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Local Service Area</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enable ReValue Local Delivery in a new territory</p>
              </div>
              <button
                onClick={() => setShowAddAreaModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateServiceArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Territory Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Mumbai & Bandra"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={newAreaCity}
                    onChange={(e) => setNewAreaCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={newAreaState}
                    onChange={(e) => setNewAreaState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Service PIN Codes (Comma-separated 6-digit codes) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="400001, 400002, 400050"
                  value={newAreaPincodes}
                  onChange={(e) => setNewAreaPincodes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    value={newAreaRate}
                    onChange={(e) => setNewAreaRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Wt (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newAreaWeight}
                    onChange={(e) => setNewAreaWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SLA (Hours)</label>
                  <input
                    type="number"
                    value={newAreaHours}
                    onChange={(e) => setNewAreaHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={savingArea}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {savingArea ? 'Saving...' : 'Register Service Area'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAreaModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Rider Payout Modal */}
      {selectedCompensation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Settle Partner Compensation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rider: {selectedCompensation.rider_name} • Payout: ₹{selectedCompensation.amount}
                </p>
              </div>
              <button
                onClick={() => setSelectedCompensation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleRiderPayout} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Reference / UPI UTR / Transaction ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI-AXIS-9823410"
                  value={payoutBankRef}
                  onChange={(e) => setPayoutBankRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={settlingPayout}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {settlingPayout ? 'Recording Settlement...' : 'Confirm Payout Settled'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCompensation(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
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
