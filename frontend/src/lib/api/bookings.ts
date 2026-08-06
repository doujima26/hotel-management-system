import { apiFetch } from "./client";
import type { Booking, Invoice, Payment } from "@/types/models";
import type { BookingStatus, PaymentMethod } from "@/types/enums";

// Chi dung lam phan chung cua CheckoutPayload - khong con API tao don rieng.
export interface CreateBookingPayload {
  hotel_id: number;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  rooms: { room_type_id: number; quantity: number }[];
  services?: { service_id: number; quantity: number }[];
  special_requests?: string;
  promotion_id?: number;
}

// Dat phong va thanh toan trong 1 lan goi: hoac xong ca don lan hoa don, hoac
// khong tao gi.
export interface CheckoutPayload extends CreateBookingPayload {
  payment_method: PaymentMethod;
}

// Thong tin de khach quet ma QR chuyen khoan. Chi co khi chon bank_transfer.
export interface BankTransferInfo {
  // Noi dung chuyen khoan phai giu nguyen de he thong biet tien cua don nao.
  payment_code: string;
  amount: number;
  account_number: string;
  bank: string;
  qr_url: string;
  expires_at: string;
}

// Chon phuong thuc mock thi co ngay thanh toan va hoa don. Chon chuyen khoan
// thi chi co don kem thong tin QR; thanh toan sinh ra khi ngan hang bao tien ve.
export interface CheckoutResult {
  booking: Booking;
  payment: Payment | null;
  invoice: Invoice | null;
  bank_transfer: BankTransferInfo | null;
}

export interface CancelBookingPayload {
  cancellation_reason?: string;
}

export interface RoomAssignmentItemPayload {
  booking_room_id: number;
  room_ids: number[];
}

export interface CheckInPayload {
  assignments: RoomAssignmentItemPayload[];
  notes?: string;
}

export interface CheckOutPayload {
  notes?: string;
}

export const bookingsApi = {
  checkout: (payload: CheckoutPayload) =>
    apiFetch<CheckoutResult>("/bookings/checkout", { method: "POST", body: payload, auth: true }),
  listMine: () => apiFetch<Booking[]>("/bookings", { auth: true }),
  getDetail: (id: number) => apiFetch<Booking>(`/bookings/${id}`, { auth: true }),
  getInvoice: (id: number) => apiFetch<Invoice>(`/bookings/${id}/invoice`, { auth: true }),
  // Lay lai thong tin chuyen khoan cua don dang cho tra tien.
  getPaymentInstructions: (id: number) =>
    apiFetch<BankTransferInfo>(`/bookings/${id}/payment-instructions`, { auth: true }),
  cancel: (id: number, payload: CancelBookingPayload) =>
    apiFetch<Booking>(`/bookings/${id}/cancel`, { method: "PATCH", body: payload, auth: true }),

  // Cac ham ben duoi danh cho Admin/Staff cua khach san (list dung chung, con lai tach theo role).
  listForHotel: (statusFilter?: BookingStatus) =>
    apiFetch<Booking[]>("/bookings/hotel", { params: { status: statusFilter }, auth: true }),
  confirm: (id: number) => apiFetch<Booking>(`/bookings/${id}/confirm`, { method: "PATCH", auth: true }),
  adminCancel: (id: number, payload: CancelBookingPayload) =>
    apiFetch<Booking>(`/bookings/${id}/admin-cancel`, { method: "PATCH", body: payload, auth: true }),
  markNoShow: (id: number) => apiFetch<Booking>(`/bookings/${id}/no-show`, { method: "PATCH", auth: true }),
  checkIn: (id: number, payload: CheckInPayload) =>
    apiFetch<Booking>(`/bookings/${id}/check-in`, { method: "PATCH", body: payload, auth: true }),
  checkOut: (id: number, payload: CheckOutPayload) =>
    apiFetch<Booking>(`/bookings/${id}/check-out`, { method: "PATCH", body: payload, auth: true }),
};
