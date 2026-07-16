import type { BookingStatus, PaymentMethod, PaymentStatus, UserRole } from "./enums";

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
