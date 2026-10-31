export type UserRole = 'buyer' | 'seller' | 'admin' | 'rider';

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
  | 'shipment_booked'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivery_attempted'
  | 'delivered'
  | 'inspection_passed'
  | 'receipt_confirmed'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'return_requested'
  | 'return_in_transit'
  | 'returned'
  | 'refunded'
  | 'rto_initiated'
  | 'rto_delivered'
  | 'shipped';

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
  item_price?: number;
  shipping_fee?: number;
  insurance_fee?: number;
  cod_fee?: number;
  transaction_price: number;
  total_amount?: number;
  currency: string;
  status: OrderStatus;
  payment_method?: 'prepaid' | 'cod';
  purchase_source: 'buy_now' | 'offer' | 'auction';
  shipping_address: ShippingAddress;
  shipment_info?: {
    courier_name: string;
    tracking_number: string;
    awb_code?: string;
    dispatch_date: string;
    is_courier_verified: boolean;
    label_url?: string;
    manifest_url?: string;
    pickup_token?: string;
    handover_confirmed_at?: string;
    delivered_at?: string;
    pod_url?: string;
    notes?: string;
  };
  payment_info?: {
    provider: string;
    provider_payment_id: string;
    amount_paid: number;
    paid_at: string;
  };
  payout_status?: string;
  dispatch_deadline?: string;
  inspection_deadline?: string;
  delivery_otp_masked?: string;
  cod_status?: string;
  status_history: Array<{
    status: OrderStatus;
    timestamp: string;
    updated_by: string;
    note?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ShippingRateQuote {
  quote_id: string;
  courier_id: string;
  courier_name: string;
  rate: number;
  cod_charges: number;
  insurance_fee: number;
  estimated_delivery_days: number;
  pickup_pincode: string;
  delivery_pincode: string;
  provider: string;
  expires_at: string;
}

export interface ShippingQuoteResponse {
  is_serviceable: boolean;
  pickup_pincode: string;
  delivery_pincode: string;
  quotes: ShippingRateQuote[];
  message?: string;
}

export interface TrackingMilestone {
  status: string;
  activity: string;
  location?: string;
  timestamp: string;
  raw_status?: string;
}

export interface CourierTrackingInfo {
  awb_code: string;
  courier_name: string;
  current_status: string;
  current_location?: string;
  estimated_delivery?: string;
  milestones: TrackingMilestone[];
  is_delivered: boolean;
  is_rto: boolean;
  rto_reason?: string;
}

export interface OrderTrackingResponse {
  order_id: string;
  product_id?: string;
  product_title?: string;
  status: OrderStatus;
  payout_status?: string;
  payment_method?: 'prepaid' | 'cod';
  dispatch_deadline?: string;
  dispatch_hours_left?: number;
  inspection_deadline?: string;
  inspection_hours_left?: number;
  delivery_otp_masked?: string;
  delivery_otp?: string;
  local_delivery_job?: DeliveryJob;
  cod_status?: string;
  shipping_address?: ShippingAddress;
  shipment_info?: {
    courier_name: string;
    tracking_number: string;
    awb_code?: string;
    dispatch_date: string;
    is_courier_verified: boolean;
    label_url?: string;
    manifest_url?: string;
    pickup_token?: string;
    handover_confirmed_at?: string;
    delivered_at?: string;
    pod_url?: string;
    notes?: string;
  };
  inspection_checklist?: InspectionChecklist;
  status_history: Array<{
    status: OrderStatus;
    timestamp: string;
    updated_by: string;
    note?: string;
  }>;
  courier_tracking?: CourierTrackingInfo;
}

export interface InspectionChecklist {
  screen_ok: boolean;
  touch_ok: boolean;
  cameras_ok: boolean;
  audio_ok: boolean;
  charging_battery_ok: boolean;
  physical_condition_matches: boolean;
  imei_matches: boolean;
  notes?: string;
  submitted_at?: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  opened_by_user_id: string;
  reason: string;
  details: string;
  evidence_images: string[];
  preferred_resolution?: string;
  requested_refund_amount?: number;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution_notes?: string;
  resolved_action?: string;
  refund_amount_issued?: number;
  created_at: string;
  resolved_at?: string;
}

export interface AdminShipmentItem {
  order_id: string;
  product_id?: string;
  product_title?: string;
  buyer_id?: string;
  seller_id?: string;
  status: OrderStatus;
  payout_status?: string;
  courier_name: string;
  awb_code?: string;
  label_url?: string;
  pickup_token?: string;
  is_courier_verified: boolean;
  dispatch_deadline?: string;
  is_overdue_dispatch: boolean;
  inspection_deadline?: string;
  payment_method: 'prepaid' | 'cod';
  cod_status: string;
  total_amount: number;
  created_at: string;
}

export interface AdminCodOrder {
  order_id: string;
  awb_code?: string;
  buyer_id?: string;
  seller_id?: string;
  expected_amount: number;
  cod_status: string;
  remittance_info?: any;
  order_status: OrderStatus;
  created_at: string;
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

// -------------------------------------------------------------
// Hybrid Local Delivery & Rider Types
// -------------------------------------------------------------

export type RiderApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';

export type RiderVehicleType = 'motorcycle' | 'scooter' | 'electric_two_wheeler' | 'bicycle';

export interface RiderEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface RiderProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  service_pincodes: string[];
  vehicle_type: RiderVehicleType;
  vehicle_registration_number: string;
  driving_license_number: string;
  emergency_contact: RiderEmergencyContact;
  application_status: RiderApplicationStatus;
  rejection_reason?: string;
  is_online: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
  total_deliveries: number;
  successful_deliveries: number;
  rating: number;
  created_at: string;
  updated_at?: string;
}

export type DeliveryJobStatus =
  | 'created'
  | 'broadcast'
  | 'accepted'
  | 'heading_to_pickup'
  | 'arrived_pickup'
  | 'pickup_confirmed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface DeliveryJobCompensation {
  base_pay: number;
  distance_bonus: number;
  tip: number;
  total_compensation: number;
  payout_status: 'pending' | 'processing' | 'paid' | 'failed';
  paid_at?: string;
  payout_reference?: string;
}

export interface DeliveryJobLocation {
  contact_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryJobStatusHistory {
  status: DeliveryJobStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface DeliveryJob {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_image?: string;
  status: DeliveryJobStatus;
  assigned_rider_id?: string;
  assigned_rider_name?: string;
  assigned_rider_phone?: string;
  pickup_location: DeliveryJobLocation;
  dropoff_location: DeliveryJobLocation;
  compensation: DeliveryJobCompensation;
  pickup_token?: string;
  pickup_confirmed_at?: string;
  pickup_notes?: string;
  delivery_otp_verified_at?: string;
  delivered_at?: string;
  failure_reason?: string;
  status_history: DeliveryJobStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface ServiceArea {
  id: string;
  city: string;
  state: string;
  name: string;
  pincodes: string[];
  is_active: boolean;
  max_package_weight_kg: number;
  estimated_delivery_hours: number;
  base_shipping_rate: number;
  created_at: string;
}

export interface RiderEarningsSummary {
  total_earned: number;
  pending_payout: number;
  paid_out: number;
  completed_jobs_count: number;
  jobs: Array<{
    job_id: string;
    order_id: string;
    product_title?: string;
    completed_at?: string;
    compensation: DeliveryJobCompensation;
  }>;
}

export interface RiderCompensationRecord {
  job_id: string;
  order_id: string;
  rider_id: string;
  rider_name: string;
  rider_phone: string;
  amount: number;
  payout_status: 'pending' | 'processing' | 'paid' | 'failed';
  paid_at?: string;
  payout_reference?: string;
  created_at: string;
}

