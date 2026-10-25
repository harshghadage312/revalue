import {
  AuthResponse, User, Product, ProductListResponse,
  Offer, NegotiationSuggestion, Auction, Order,
  PriceEstimate, MobileCondition, RecommendationItem,
  Review, Notification
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

  // --- Delivery & Fulfillment ---
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

  async openDispute(orderId: string, reason: string, details: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}/disputes`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
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

  async resolveAdminDispute(disputeId: string, resolution: string, resolutionNotes: string): Promise<any> {
    return this.request<any>(`/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, resolution_notes: resolutionNotes }),
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
}

export const api = new ApiClient();
