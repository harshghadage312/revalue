export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
  address?: string;
  created_at: string;
  average_rating?: number;
  review_count: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export type ProductCondition = 'excellent' | 'good' | 'bad' | 'defective';
export type SellingMethod = 'negotiation' | 'bidding';
export type ProductStatus = 'active' | 'reserved' | 'sold' | 'inactive' | 'cancelled';

export interface SmartphoneSpecs {
  storage_gb?: number;
  ram_gb?: number;
  battery_health_percent?: number;
  screen_size_inches?: number;
  color?: string;
  has_original_box?: boolean;
  has_original_charger?: boolean;
  known_faults?: string;
}

export interface AuctionInfo {
  auction_id: string;
  starting_bid: number;
  min_increment: number;
  deadline: string;
  status: string;
  total_bids: number;
  has_reserve_price: boolean;
  winning_amount?: number;
  winner_id?: string;
}

export interface Product {
  id: string;
  seller_id: string;
  seller_name?: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  condition: ProductCondition;
  asking_price: number;
  starting_bid?: number;
  currency: string;
  original_retail_price?: number;
  approximate_age_months?: number;
  specs?: SmartphoneSpecs;
  location_city?: string;
  selling_method: SellingMethod;
  images: string[];
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  auction_info?: AuctionInfo;
  seller_rating?: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface CounterHistoryItem {
  sender_id: string;
  sender_role: string;
  amount: number;
  note?: string;
  created_at: string;
}

export interface Offer {
  id: string;
  product_id: string;
  product_title?: string;
  buyer_id: string;
  buyer_name?: string;
  seller_id: string;
  seller_name?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  note?: string;
  counter_history: CounterHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface NegotiationSuggestion {
  recommendation: 'accept' | 'counter' | 'reject' | 'manual_review';
  suggested_counter_amount?: number;
  discount_percentage: number;
  reason: string;
  rule_version: string;
}

export interface Auction {
  id: string;
  product_id: string;
  seller_id: string;
  starting_bid: number;
  min_increment: number;
  deadline: string;
  status: 'active' | 'finalized' | 'closed_no_winner' | 'cancelled';
  total_bids_count: number;
  winner_id?: string;
  winning_amount?: number;
  has_reserve_price: boolean;
  user_own_bid?: {
    id: string;
    amount: number;
    created_at: string;
    is_winning_bid: boolean;
  };
  created_at: string;
  finalized_at?: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'receipt_confirmed'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  order_id: string;
  product_id: string;
  product_title: string;
  product_image?: string;
  buyer_id: string;
  buyer_name?: string;
  seller_id: string;
  seller_name?: string;
  transaction_price: number;
  currency: string;
  status: OrderStatus;
  purchase_source: 'buy_now' | 'offer' | 'auction';
  shipping_address: ShippingAddress;
  shipment_info?: {
    courier_name: string;
    tracking_number: string;
    dispatch_date: string;
    is_courier_verified: boolean;
    notes?: string;
  };
  payment_info?: {
    provider: string;
    provider_payment_id: string;
    amount_paid: number;
    paid_at: string;
  };
  payout_status?: string;
  status_history: Array<{
    status: OrderStatus;
    timestamp: string;
    updated_by: string;
    note?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface PriceEstimate {
  estimated_price: number;
  price_range_low: number;
  price_range_high: number;
  currency: string;
  model_version: string;
  dataset_version: string;
  features_used: string[];
  is_model_available: boolean;
  prediction_timestamp: string;
  explanation: string;
}

export interface MobileCondition {
  predicted_condition?: string | null;
  confidence_score?: number | null;
  class_probabilities: Record<string, number>;
  model_version: string;
  is_model_available: boolean;
  status?: string;
  error_message?: string | null;
  disclaimer: string;
  evaluated_at: string;
}

export interface RecommendationItem {
  product_id: string;
  title: string;
  brand: string;
  model: string;
  asking_price: number;
  condition: string;
  image_url?: string;
  similarity_score: number;
  recommendation_reason: string;
  is_personalized: boolean;
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewer_name: string;
  target_user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  is_reported: boolean;
}

export interface Notification {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
