import type { BookingStatus, DiscountType, HotelStatus, PaymentMethod, PaymentStatus, RoomStatus, UserRole } from "./enums";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
}

export interface LoginUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface RegisterResult extends User {
  otp_mock: string;
}

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: LoginUser;
}

export interface RefreshResult {
  access_token: string;
  token_type: string;
}

export interface HotelSearchItem {
  id: number;
  name: string;
  city: string;
  district: string | null;
  address: string;
  star_rating: number | null;
  avg_rating: number;
  total_reviews: number;
}

export interface HotelSearchResult {
  items: HotelSearchItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface HotelImage {
  id: number;
  hotel_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface HotelDetail {
  id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  star_rating: number | null;
  avg_rating: number;
  total_reviews: number;
  images: HotelImage[];
}

export interface RoomTypeAvailability {
  room_type_id: number;
  name: string;
  base_price: number;
  max_guests: number;
  total_rooms: number;
  available_rooms: number;
}

export interface RoomAvailability {
  hotel_id: number;
  check_in: string;
  check_out: string;
  items: RoomTypeAvailability[];
}

export interface BookingRoomItem {
  id: number;
  room_type_id: number;
  quantity: number;
  price_per_night: number;
  num_nights: number;
  subtotal: number;
}

export interface Booking {
  id: number;
  booking_code: string;
  hotel_id: number;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_room_price: number;
  total_service_price: number;
  discount_amount: number;
  total_amount: number;
  status: BookingStatus;
  special_requests: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  rooms: BookingRoomItem[];
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  paid_at: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  booking_id: number;
  payment_id: number;
  total_room_price: number;
  total_service_price: number;
  discount_amount: number;
  total_amount: number;
  issued_at: string;
}

export interface PayBookingResult {
  payment: Payment;
  invoice: Invoice;
}

export interface AdminHotel {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  star_rating: number | null;
  avg_rating: number;
  total_reviews: number;
  status: HotelStatus;
  rejection_reason: string | null;
}

export interface AdminHotelListResult {
  items: AdminHotel[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminUserListResult {
  items: User[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ReviewHotelResult {
  id: number;
  status: HotelStatus;
  rejection_reason: string | null;
}

export interface SetUserActiveResult {
  user_id: number;
  email: string;
  is_active: boolean;
}

export interface TopServiceItem {
  service_id: number;
  service_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface HotelDashboard {
  hotel_id: number;
  from_date: string;
  to_date: string;
  revenue: number;
  occupancy_rate: number;
  top_services: TopServiceItem[];
}

export interface PlatformDashboard {
  from_date: string;
  to_date: string;
  total_revenue: number;
  total_bookings: number;
  new_users_count: number;
  hotel: HotelDashboard | null;
}

export interface HotelServiceItem {
  id: number;
  hotel_id: number;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  is_active: boolean;
}

export interface Promotion {
  id: number;
  hotel_id: number;
  name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_booking_amount: number | null;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

export interface DeleteHotelImageResult {
  id: number;
}

export interface RoomType {
  id: number;
  hotel_id: number;
  name: string;
  base_price: number;
  max_guests: number;
  total_rooms: number;
  is_active: boolean;
}

export interface RoomItem {
  id: number;
  room_type_id: number;
  room_number: string;
  floor: number | null;
  status: RoomStatus;
  is_active: boolean;
}

export interface RoomListResult {
  items: RoomItem[];
  current_rooms: number;
  max_rooms: number;
  remaining_rooms: number;
}

export interface Amenity {
  id: number;
  hotel_id: number;
  name: string;
  icon: string | null;
  category: string | null;
}

export interface RoomTypeAmenityLinkResult {
  room_type_id: number;
  amenity_id: number;
}

export interface RoomTypeImage {
  id: number;
  room_type_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface DeleteRoomTypeImageResult {
  id: number;
}
