import {
  AuthResponse, User, Product, ProductListResponse,
  Offer, NegotiationSuggestion, Auction, Order,
  PriceEstimate, MobileCondition, RecommendationItem,
  Review, Notification, ShippingQuoteResponse,
  OrderTrackingResponse, InspectionChecklist, AdminShipmentItem,
  AdminCodOrder, RiderProfile, DeliveryJob, ServiceArea,
  RiderEarningsSummary, RiderCompensationRecord
} from '../types';

/**
 * Normalizes and resolves the versioned API base URL (`.../api/v1`).
 *
 * Handles:
 * - Empty string / undefined in local dev -> fallback to '/api/v1' (for Vite proxy)
 * - Base host: 'https://revalue-api-qk4m.onrender.com' -> 'https://revalue-api-qk4m.onrender.com/api/v1'
 * - Trailing slash: 'https://revalue-api-qk4m.onrender.com/' -> 'https://revalue-api-qk4m.onrender.com/api/v1'
 * - Already versioned: 'https://revalue-api-qk4m.onrender.com/api/v1' -> 'https://revalue-api-qk4m.onrender.com/api/v1'
 * - Partial api path: 'https://revalue-api-qk4m.onrender.com/api' -> 'https://revalue-api-qk4m.onrender.com/api/v1'
 * - Production fallback: When VITE_API_BASE_URL is not supplied at build time in production mode,
 *   defaults automatically to the deployed Render backend 'https://revalue-api-qk4m.onrender.com/api/v1'
 */
export function resolveApiBaseUrl(rawInput?: string): string {
  const envVal = (rawInput !== undefined ? rawInput : (import.meta.env?.VITE_API_BASE_URL as string | undefined))?.trim();

  if (!envVal) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
      return 'https://revalue-api-qk4m.onrender.com/api/v1';
    }
    return '/api/v1';
  }

  // Remove trailing slashes
  const trimmed = envVal.replace(/\/+$/, '');

  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
}

export function buildApiUrl(endpoint: string, base?: string): string {
  const root = base ?? resolveApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${root}${cleanEndpoint}`;
}

export function resolveMediaUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const base = resolveApiBaseUrl().replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export const API_BASE = resolveApiBaseUrl();

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('revalue_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const targetUrl = buildApiUrl(endpoint);

    const response = await fetch(targetUrl, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token if expired or unauthorized
      if (endpoint !== '/auth/login') {
        localStorage.removeItem('revalue_token');
        localStorage.removeItem('revalue_user');
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --- Auth Endpoints ---
  async register(body: any): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: any): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    localStorage.setItem('revalue_token', data.access_token);
    localStorage.setItem('revalue_user', JSON.stringify(data.user));
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout(): void {
    localStorage.removeItem('revalue_token');
    localStorage.removeItem('revalue_user');
  }

  // --- Products Endpoints ---
  async listProducts(params: Record<string, any> = {}): Promise<ProductListResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    return this.request<ProductListResponse>(`/products?${query.toString()}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async createProduct(body: any): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateProduct(id: string, body: any): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async uploadImage(file: File): Promise<{ image_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ image_url: string; filename: string }>('/products/upload-image', {
      method: 'POST',
      body: formData,
    });
  }

  // --- Open Negotiation ---
  async createOffer(
    productIdOrBody: string | { product_id: string; amount: number; note?: string },
    amount?: number,
    note?: string
  ): Promise<Offer> {
    const body = typeof productIdOrBody === 'string'
      ? { product_id: productIdOrBody, amount: amount ?? 0, note }
      : productIdOrBody;
    return this.request<Offer>('/offers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getMyOffers(role: 'all' | 'buyer' | 'seller' = 'all'): Promise<Offer[]> {
    return this.request<Offer[]>(`/offers/my?role=${role}`);
  }

  async counterOffer(offerId: string, amount: number, note?: string): Promise<Offer> {
    return this.request<Offer>(`/offers/${offerId}/counter`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    });
  }

  async acceptOffer(offerId: string): Promise<Offer> {
    return this.request<Offer>(`/offers/${offerId}/accept`, {
      method: 'POST',
    });
  }

  async rejectOffer(offerId: string): Promise<Offer> {
    return this.request<Offer>(`/offers/${offerId}/reject`, {
      method: 'POST',
    });
  }

  async getNegotiationSuggestion(offerId: string): Promise<NegotiationSuggestion> {
    return this.request<NegotiationSuggestion>(`/offers/${offerId}/suggestion`);
  }

  // --- Sealed Bidding ---
  async getAuction(auctionId: string): Promise<Auction> {
    return this.request<Auction>(`/auctions/${auctionId}`);
  }

  async getAuctionByProduct(productId: string): Promise<Auction> {
    return this.request<Auction>(`/auctions/product/${productId}`);
  }

  async submitBid(auctionId: string, amount: number): Promise<any> {
    return this.request<any>(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async finalizeAuction(auctionId: string): Promise<Auction> {
    return this.request<Auction>(`/auctions/${auctionId}/finalize`, {
      method: 'POST',
    });
  }

  // --- Orders & Payments ---
  async createOrder(body: any): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}`);
  }

  async getMyOrders(role: 'buyer' | 'seller' = 'buyer'): Promise<Order[]> {
    return this.request<Order[]>(`/orders/my?role=${role}`);
  }

  async initiatePayment(orderId: string): Promise<any> {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  async completeSandboxPayment(orderId: string): Promise<any> {
    return this.request<any>(`/payments/sandbox-complete?order_id=${orderId}`, {
      method: 'POST',
    });
  }

  // --- Delivery, Courier & Inspection System ---
  async getShippingQuotes(
    productId: string,
    deliveryPincode: string,
    isCod = false,
    optInInsurance = false
  ): Promise<ShippingQuoteResponse> {
    return this.request<ShippingQuoteResponse>('/orders/shipping/quotes', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        delivery_pincode: deliveryPincode,
        is_cod: isCod,
        opt_in_insurance: optInInsurance,
      }),
    });
  }

  async bookShipment(orderId: string, bookingData: {
    courier_id?: string;
    package_weight_kg?: number;
    length_cm?: number;
    breadth_cm?: number;
    height_cm?: number;
    imei_or_serial?: string;
    is_battery_declared: boolean;
    pickup_time_slot?: string;
  }): Promise<any> {
    return this.request<any>(`/orders/${orderId}/shipment/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getShipmentLabel(orderId: string): Promise<{ order_id: string; awb_code: string; courier_name: string; label_url: string }> {
    return this.request<{ order_id: string; awb_code: string; courier_name: string; label_url: string }>(`/orders/${orderId}/shipment/label`);
  }

  async confirmHandover(orderId: string, notes?: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}/shipment/handover`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async getOrderTracking(orderId: string): Promise<OrderTrackingResponse> {
    return this.request<OrderTrackingResponse>(`/orders/${orderId}/tracking`);
  }

  async verifyDeliveryOtp(orderId: string, enteredOtp: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}/delivery/otp/verify`, {
      method: 'POST',
      body: JSON.stringify({ entered_otp: enteredOtp }),
    });
  }

  async submitInspectionChecklist(orderId: string, checklist: InspectionChecklist): Promise<any> {
    return this.request<any>(`/orders/${orderId}/inspection/checklist`, {
      method: 'POST',
      body: JSON.stringify(checklist),
    });
  }

  async bookReturn(orderId: string, reason: string, disputeId?: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}/return/book`, {
      method: 'POST',
      body: JSON.stringify({ reason, dispute_id: disputeId }),
    });
  }

  async updateShipment(orderId: string, courierName: string, trackingNumber: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}/shipment`, {
      method: 'POST',
      body: JSON.stringify({ courier_name: courierName, tracking_number: trackingNumber }),
    });
  }

  async confirmReceipt(orderId: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}/confirm-receipt`, {
      method: 'POST',
    });
  }

  async openDispute(
    orderId: string,
    reason: string,
    details: string,
    evidenceImages: string[] = [],
    preferredResolution = 'return_and_refund',
    requestedRefundAmount?: number
  ): Promise<any> {
    return this.request<any>(`/orders/${orderId}/disputes`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        details,
        evidence_images: evidenceImages,
        preferred_resolution: preferredResolution,
        requested_refund_amount: requestedRefundAmount,
      }),
    });
  }

  // --- Reviews ---
  async createReview(orderId: string, rating: number, comment: string): Promise<Review> {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, rating, comment }),
    });
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    return this.request<Review[]>(`/reviews/user/${userId}`);
  }

  // --- Wishlist & Notifications ---
  async getWishlist(): Promise<Product[]> {
    return this.request<Product[]>('/wishlist');
  }

  async addToWishlist(productId: string): Promise<any> {
    return this.request<any>(`/wishlist/${productId}`, { method: 'POST' });
  }

  async removeFromWishlist(productId: string): Promise<any> {
    return this.request<any>(`/wishlist/${productId}`, { method: 'DELETE' });
  }

  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<any> {
    return this.request<any>(`/notifications/${id}/read`, { method: 'POST' });
  }

  // --- Machine Learning Modules ---
  async getCatalogue(): Promise<{ brands: string[]; total_brands: number }> {
    return this.request<{ brands: string[]; total_brands: number }>('/ml/catalogue');
  }

  async getCatalogueModels(brand: string): Promise<{ brand: string; models: string[] }> {
    return this.request<{ brand: string; models: string[] }>(`/ml/catalogue/models?brand=${encodeURIComponent(brand)}`);
  }

  async getCatalogueSpecs(brand: string, model: string): Promise<any> {
    return this.request<any>(`/ml/catalogue/specs?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
  }

  async getPriceEstimate(body: any): Promise<PriceEstimate> {
    return this.request<PriceEstimate>('/ml/price-estimate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async assessCondition(file: File): Promise<MobileCondition> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<MobileCondition>('/ml/mobile-condition', {
      method: 'POST',
      body: formData,
    });
  }

  async getRecommendations(category?: string, limit = 6): Promise<{ items: RecommendationItem[] }> {
    const query = category ? `?category=${category}&limit=${limit}` : `?limit=${limit}`;
    return this.request<{ items: RecommendationItem[] }>(`/recommendations${query}`);
  }

  // --- Admin ---
  async getAdminMetrics(): Promise<any> {
    return this.request<any>('/admin/metrics');
  }

  async listAdminUsers(page = 1, size = 20): Promise<any> {
    return this.request<any>(`/admin/users?page=${page}&size=${size}`);
  }

  async setAdminUserStatus(userId: string, isActive: boolean): Promise<any> {
    return this.request<any>(`/admin/users/${userId}/status?is_active=${isActive}`, {
      method: 'PUT',
    });
  }

  async listAdminDisputes(): Promise<any[]> {
    return this.request<any[]>('/admin/disputes');
  }

  async resolveAdminDispute(
    disputeId: string,
    resolution: string,
    resolutionNotes: string,
    partialRefundAmount?: number
  ): Promise<any> {
    return this.request<any>(`/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        resolution,
        resolution_notes: resolutionNotes,
        partial_refund_amount: partialRefundAmount,
      }),
    });
  }

  async listAdminShipments(status?: string, overdueOnly = false, page = 1, size = 20): Promise<{ shipments: AdminShipmentItem[]; total: number }> {
    let url = `/admin/shipments?page=${page}&size=${size}&overdue_only=${overdueOnly}`;
    if (status) url += `&status=${status}`;
    return this.request<{ shipments: AdminShipmentItem[]; total: number }>(url);
  }

  async listAdminCodOrders(status?: string): Promise<{ cod_orders: AdminCodOrder[]; total: number }> {
    const url = status ? `/admin/cod/reconciliation?status=${status}` : '/admin/cod/reconciliation';
    return this.request<{ cod_orders: AdminCodOrder[]; total: number }>(url);
  }

  async reconcileCodOrder(awbCode: string, remittedAmount: number, courierReference: string, notes?: string): Promise<any> {
    return this.request<any>('/admin/cod/reconcile', {
      method: 'POST',
      body: JSON.stringify({
        awb_code: awbCode,
        remitted_amount: remittedAmount,
        courier_reference: courierReference,
        notes,
      }),
    });
  }

  async getCourierHealth(): Promise<any> {
    return this.request<any>('/admin/courier/health');
  }

  async processInspectionTimeouts(): Promise<any> {
    return this.request<any>('/orders/inspection/process-timeouts', {
      method: 'POST',
    });
  }

  async listAdminReportedReviews(): Promise<any[]> {
    return this.request<any[]>('/admin/reported-reviews');
  }

  async deleteAdminReview(reviewId: string): Promise<any> {
    return this.request<any>(`/admin/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  // -------------------------------------------------------------
  // Rider & Hybrid Delivery APIs
  // -------------------------------------------------------------

  async registerRider(data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    service_pincodes: string[];
    vehicle_type: string;
    vehicle_registration_number: string;
    driving_license_number: string;
    emergency_contact: { name: string; relationship: string; phone: string };
  }): Promise<AuthResponse & { rider_profile: RiderProfile }> {
    const res = await this.request<AuthResponse & { rider_profile: RiderProfile }>('/riders/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      localStorage.setItem('revalue_token', res.access_token);
      localStorage.setItem('revalue_user', JSON.stringify(res.user));
    }
    return res;
  }

  async getRiderProfile(): Promise<RiderProfile> {
    return this.request<RiderProfile>('/riders/profile');
  }

  async updateRiderStatus(isOnline: boolean): Promise<RiderProfile> {
    return this.request<RiderProfile>('/riders/status', {
      method: 'POST',
      body: JSON.stringify({ is_online: isOnline }),
    });
  }

  async updateRiderLocation(latitude: number, longitude: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/riders/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  async getRiderAvailableJobs(): Promise<DeliveryJob[]> {
    return this.request<DeliveryJob[]>('/riders/jobs/available');
  }

  async getRiderActiveJob(): Promise<DeliveryJob | null> {
    const res = await this.request<{ active_job: DeliveryJob | null }>('/riders/jobs/active');
    return res.active_job;
  }

  async getRiderJobHistory(page = 1, size = 20): Promise<{ jobs: DeliveryJob[]; total: number }> {
    return this.request<{ jobs: DeliveryJob[]; total: number }>(`/riders/jobs/history?page=${page}&size=${size}`);
  }

  async getRiderJobDetail(jobId: string): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/riders/jobs/${jobId}`);
  }

  async acceptRiderJob(jobId: string): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/riders/jobs/${jobId}/accept`, {
      method: 'POST',
    });
  }

  async confirmRiderPickup(
    jobId: string,
    payload: { pickup_token?: string; notes?: string; package_condition_ok?: boolean } = {}
  ): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/riders/jobs/${jobId}/pickup`, {
      method: 'POST',
      body: JSON.stringify({
        pickup_token: payload.pickup_token,
        notes: payload.notes,
        package_condition_ok: payload.package_condition_ok ?? true,
      }),
    });
  }

  async verifyRiderDeliveryOtp(jobId: string, deliveryOtp: string, notes?: string): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/riders/jobs/${jobId}/verify-delivery-otp`, {
      method: 'POST',
      body: JSON.stringify({
        delivery_otp: deliveryOtp,
        notes,
      }),
    });
  }

  async reportRiderJobFailure(jobId: string, reason: string, notes?: string): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/riders/jobs/${jobId}/report-failure`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        notes,
      }),
    });
  }

  async getRiderEarnings(): Promise<RiderEarningsSummary> {
    return this.request<RiderEarningsSummary>('/riders/earnings');
  }

  // -------------------------------------------------------------
  // Admin Delivery Operations Console APIs
  // -------------------------------------------------------------

  async listAdminRiders(
    status?: string,
    page = 1,
    size = 100
  ): Promise<{ riders: RiderProfile[]; total: number; page: number; size: number }> {
    let url = `/admin/riders?page=${page}&size=${size}`;
    if (status) url += `&status=${status}`;
    return this.request<{ riders: RiderProfile[]; total: number; page: number; size: number }>(url);
  }

  async getAdminRider(riderId: string): Promise<RiderProfile> {
    return this.request<RiderProfile>(`/admin/riders/${riderId}`);
  }

  async updateAdminRiderStatus(
    riderId: string,
    status: string,
    rejectionReason?: string
  ): Promise<{ message: string; status: string }> {
    return this.request<{ message: string; status: string }>(`/admin/riders/${riderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        reason: rejectionReason,
      }),
    });
  }

  async listAdminDispatchJobs(
    status?: string,
    riderId?: string,
    page = 1,
    size = 20
  ): Promise<{ jobs: DeliveryJob[]; total: number }> {
    let url = `/admin/dispatch/jobs?page=${page}&size=${size}`;
    if (status) url += `&status=${status}`;
    if (riderId) url += `&rider_id=${riderId}`;
    return this.request<{ jobs: DeliveryJob[]; total: number }>(url);
  }

  async reassignAdminDispatchJob(jobId: string, riderId: string, reason?: string): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/admin/dispatch/jobs/${jobId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({
        rider_id: riderId,
        reason,
      }),
    });
  }

  async cancelAdminDispatchJob(jobId: string, reason: string): Promise<DeliveryJob> {
    return this.request<DeliveryJob>(`/admin/dispatch/jobs/${jobId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async listAdminServiceAreas(isActive?: boolean): Promise<ServiceArea[]> {
    const url = isActive !== undefined ? `/admin/service-areas?is_active=${isActive}` : '/admin/service-areas';
    return this.request<ServiceArea[]>(url);
  }

  async createAdminServiceArea(data: {
    city: string;
    state: string;
    name: string;
    pincodes: string[];
    is_active?: boolean;
    max_package_weight_kg?: number;
    estimated_delivery_hours?: number;
    base_shipping_rate?: number;
  }): Promise<ServiceArea> {
    return this.request<ServiceArea>('/admin/service-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminServiceArea(
    areaId: string,
    data: {
      name?: string;
      pincodes?: string[];
      is_active?: boolean;
      max_package_weight_kg?: number;
      estimated_delivery_hours?: number;
      base_shipping_rate?: number;
    }
  ): Promise<ServiceArea> {
    return this.request<ServiceArea>(`/admin/service-areas/${areaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminServiceArea(areaId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/service-areas/${areaId}`, {
      method: 'DELETE',
    });
  }

  async listAdminRiderCompensationLedger(status?: string): Promise<{ ledger: RiderCompensationRecord[]; total: number }> {
    const url = status ? `/admin/riders/compensation/ledger?status=${status}` : '/admin/riders/compensation/ledger';
    return this.request<{ ledger: RiderCompensationRecord[]; total: number }>(url);
  }

  async markAdminRiderCompensationPaid(jobId: string, payoutReference?: string): Promise<RiderCompensationRecord> {
    return this.request<RiderCompensationRecord>(`/admin/riders/compensation/${jobId}/payout`, {
      method: 'PUT',
      body: JSON.stringify({
        payout_status: 'paid',
        payout_reference: payoutReference,
      }),
    });
  }
}

export const api = new ApiClient();
