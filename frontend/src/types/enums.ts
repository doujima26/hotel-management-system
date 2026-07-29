// Map 1:1 voi backend/app/core/enums.py

export type UserRole = "super_admin" | "admin" | "staff" | "user";

export type HotelStatus = "pending" | "approved" | "rejected" | "suspended";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";

export type PaymentMethod = "zalopay" | "momo" | "credit_card" | "bank_transfer";

export type DiscountType = "percentage" | "fixed_amount";

export type ShiftType = "morning" | "afternoon" | "night";

export type CheckType = "check_in" | "check_out";

export type AmenityScope = "hotel" | "room";

export const HOTEL_STATUS_LABELS: Record<HotelStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  suspended: "Tạm dừng",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  checked_in: "Đang lưu trú",
  checked_out: "Đã trả phòng",
  cancelled: "Đã hủy",
  no_show: "Không đến",
};

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  available: "Trống",
  occupied: "Đang ở",
  cleaning: "Đang dọn",
  maintenance: "Bảo trì",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  zalopay: "ZaloPay",
  momo: "MoMo",
  credit_card: "Thẻ tín dụng",
  bank_transfer: "Chuyển khoản",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Chờ thanh toán",
  completed: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};

export const AMENITY_SCOPE_LABELS: Record<AmenityScope, string> = {
  hotel: "Tiện nghi",
  room: "Tiện nghi phòng",
};
