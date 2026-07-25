import { apiFetch } from "./client";
import type { Booking, Invoice } from "@/types/models";
import type { BookingStatus } from "@/types/enums";

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
  create: (payload: CreateBookingPayload) =>
    apiFetch<Booking>("/bookings", { method: "POST", body: payload, auth: true }),
  listMine: () => apiFetch<Booking[]>("/bookings", { auth: true }),
  getDetail: (id: number) => apiFetch<Booking>(`/bookings/${id}`, { auth: true }),
  getInvoice: (id: number) => apiFetch<Invoice>(`/bookings/${id}/invoice`, { auth: true }),
  cancel: (id: number, payload: CancelBookingPayload) =>
    apiFetch<Booking>(`/bookings/${id}/cancel`, { method: "PATCH", body: payload, auth: true }),

  // Cac ham ben duoi danh cho Admin/Staff cua khach san (list dung chung, con lai tach theo role).
  listForHotel: (statusFilter?: BookingStatus) =>
    apiFetch<Booking[]>("/bookings/hotel", { params: { status: statusFilter }, auth: true }),
  confirm: (id: number) => apiFetch<Booking>(`/bookings/${id}/confirm`, { method: "PATCH", auth: true }),
  adminCancel: (id: number, payload: CancelBookingPayload) =>
    apiFetch<Booking>(`/bookings/${id}/admin-cancel`, { method: "PATCH", body: payload, auth: true }),
  checkIn: (id: number, payload: CheckInPayload) =>
    apiFetch<Booking>(`/bookings/${id}/check-in`, { method: "PATCH", body: payload, auth: true }),
  checkOut: (id: number, payload: CheckOutPayload) =>
    apiFetch<Booking>(`/bookings/${id}/check-out`, { method: "PATCH", body: payload, auth: true }),
};
