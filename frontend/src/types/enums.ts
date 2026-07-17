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

export const HOTEL_STATUS_LABELS: Record<HotelStatus, string> = {
  pending: "Cho duyet",
  approved: "Da duyet",
  rejected: "Tu choi",
  suspended: "Tam dung",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Cho xac nhan",
  confirmed: "Da xac nhan",
  checked_in: "Dang luu tru",
  checked_out: "Da tra phong",
  cancelled: "Da huy",
  no_show: "Khong den",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  zalopay: "ZaloPay",
  momo: "MoMo",
  credit_card: "The tin dung",
  bank_transfer: "Chuyen khoan",
};
