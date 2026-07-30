import type {
  AmenityScope,
  BookingStatus,
  DiscountType,
  HotelStatus,
  PaymentMethod,
  PaymentStatus,
  RoomStatus,
  ShiftType,
  UserRole,
} from "./enums";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
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
  primary_image_url: string | null;
  room_type_name: string | null;
  bed_type: string | null;
  room_amenities: string[];
  hotel_service_names: string[];
  promotion_name: string | null;
  price_per_night: number | null;
  num_nights: number | null;
  total_price: number | null;
  discounted_total_price: number | null;
  discount_percent: number | null;
}

export interface HotelHighlight {
  id: number;
  name: string;
  city: string;
  star_rating: number | null;
  avg_rating: number;
  total_reviews: number;
  primary_image_url: string | null;
  from_price: number | null;
  discounted_price: number | null;
  discount_percent: number | null;
}

export interface HotelSearchResult {
  items: HotelSearchItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AmenityFacetItem {
  name: string;
  count: number;
}

export interface HotelSearchFilters {
  price_min: number | null;
  price_max: number | null;
  districts: string[];
  amenities: AmenityFacetItem[];
  room_amenities: AmenityFacetItem[];
  services: string[];
}

export interface HotelImage {
  id: number;
  hotel_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface HotelAmenityItem {
  name: string;
  category: string | null;
}

export interface HotelDetail extends HotelPolicies {
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
  amenities: HotelAmenityItem[];
  services: string[];
  images: HotelImage[];
}

export interface RoomTypeAmenityItem {
  name: string;
  category: string | null;
}

export interface RoomTypeAvailability {
  room_type_id: number;
  name: string;
  description: string | null;
  base_price: number;
  max_guests: number;
  bed_type: string | null;
  area_sqm: number | null;
  total_rooms: number;
  available_rooms: number;
  images: string[];
  amenities: RoomTypeAmenityItem[];
}

export interface RoomCalendarDay {
  date: string;
  booked_rooms: number;
  blocked_rooms: number;
  available_rooms: number;
}

export interface RoomCalendarRow {
  room_type_id: number;
  name: string;
  total_rooms: number;
  days: RoomCalendarDay[];
}

export interface RoomCalendar {
  hotel_id: number;
  from_date: string;
  to_date: string;
  dates: string[];
  items: RoomCalendarRow[];
}

export interface RoomTypeRateDay {
  date: string;
  override_price: number | null;
  effective_price: number;
}

export interface RoomTypeRateCalendar {
  room_type_id: number;
  from_date: string;
  to_date: string;
  days: RoomTypeRateDay[];
}

export interface RoomBlock {
  id: number;
  room_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: number;
  created_at: string;
}

export interface DeleteRoomBlockResult {
  id: number;
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
  room_type_name: string;
  quantity: number;
  price_per_night: number;
  num_nights: number;
  subtotal: number;
}

export interface BookingServiceLine {
  service_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Booking {
  id: number;
  booking_code: string;
  hotel_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_room_price: number;
  total_service_price: number;
  discount_amount: number;
  promotion_id: number | null;
  total_amount: number;
  status: BookingStatus;
  payment_status: PaymentStatus | null;
  payment_method: PaymentMethod | null;
  special_requests: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  rooms: BookingRoomItem[];
  services: BookingServiceLine[];
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
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  seller_name: string;
  seller_address: string;
  seller_phone: string | null;
  seller_email: string | null;
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

export interface HotelPolicies {
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: string | null;
  children_policy: string | null;
  pets_allowed: boolean;
  payment_methods: PaymentMethod[];
}

export interface AdminHotel extends HotelPolicies {
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

export interface RoomStatusOverview {
  available: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  blocked_today: number;
}

export interface StaffShiftItem {
  staff_id: number;
  staff_name: string;
  staff_position: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
}

export interface RecentReviewItem {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface DailyTrendPoint {
  date: string;
  revenue: number;
  occupancy_rate: number;
}

export interface HotelOperationsOverview {
  hotel_id: number;
  date: string;
  pending_bookings: number;
  overdue_confirmed_bookings: number;
  arrivals_today: number;
  departures_today: number;
  in_house: number;
  room_status: RoomStatusOverview;
  daily_trend: DailyTrendPoint[];
  staff_shifts_today: StaffShiftItem[];
  recent_reviews: RecentReviewItem[];
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

export interface DeleteHotelServiceResult {
  id: number;
}

export interface DeletePromotionResult {
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

export interface AmenityCategory {
  id: number;
  name: string;
  // Icon dai dien cho ca danh muc - tien nghi khong co icon rieng.
  icon: string | null;
}

export interface Amenity {
  id: number;
  scope: AmenityScope;
  name: string;
  // category la TEN danh muc (chuoi) - giu nguyen de cac trang gom tien nghi
  // theo danh muc khong phai doi; category_id dung cho form chon danh muc;
  // category_icon de hien icon o tieu de nhom ma khong phai goi them API.
  category_id: number | null;
  category: string | null;
  category_icon: string | null;
}

export interface RoomTypeAmenityLinkResult {
  room_type_id: number;
  amenity_id: number;
}

export interface HotelAmenityLinkResult {
  hotel_id: number;
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

export interface DeleteAmenityResult {
  id: number;
}

export interface DeleteRoomTypeResult {
  id: number;
}

export interface DeleteRoomResult {
  id: number;
}

export interface StaffMember {
  id: number;
  user_id: number;
  hotel_id: number;
  email: string;
  full_name: string;
  phone: string | null;
  position: string;
  is_active: boolean;
  hired_at: string | null;
}

export interface CreateStaffResult extends StaffMember {
  temp_password_mock: string;
}

export interface StaffScheduleCalendarShift {
  schedule_id: number;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export interface StaffScheduleCalendarRow {
  staff_id: number;
  full_name: string;
  position: string;
  is_active: boolean;
  shifts: StaffScheduleCalendarShift[];
}

export interface StaffScheduleCalendar {
  from_date: string;
  to_date: string;
  dates: string[];
  items: StaffScheduleCalendarRow[];
}

export interface StaffSchedule {
  id: number;
  staff_id: number;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export interface RoomStatusItem {
  room_id: number;
  room_number: string;
  floor: number | null;
  room_type_id: number;
  room_type_name: string;
  status: RoomStatus;
  current_booking_code: string | null;
  expected_check_out: string | null;
  is_blocked: boolean;
  block_reason: string | null;
}

export interface DeleteScheduleResult {
  id: number;
}

export interface Review {
  id: number;
  user_id: number;
  reviewer_name: string;
  hotel_id: number;
  booking_id: number;
  booking_code: string;
  check_in_date: string;
  check_out_date: string;
  room_type_names: string[];
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Favorite {
  id: number;
  hotel_id: number;
  hotel_name: string;
  city: string;
  created_at: string;
}

export interface ChangePasswordResult {
  user_id: number;
}

export interface ForgotPasswordResult {
  email: string;
  otp_mock: string | null;
}

export interface ResetPasswordResult {
  user_id: number;
}

export interface SendVerifyOtpResult {
  email: string;
  otp_mock: string | null;
  is_verified: boolean | null;
}
