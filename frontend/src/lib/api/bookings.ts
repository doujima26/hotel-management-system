import { apiFetch } from "./client";
import type { Booking, Invoice } from "@/types/models";

export interface CreateBookingPayload {
  hotel_id: number;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  rooms: { room_type_id: number; quantity: number }[];
  special_requests?: string;
}

export interface CancelBookingPayload {
  cancellation_reason?: string;
}

export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    apiFetch<Booking>("/bookings", { method: "POST", body: payload, auth: true }),
  listMine: () => apiFetch<Booking[]>("/bookings", { auth: true }),
  getDetail: (id: number) => apiFetch<Booking>(`/bookings/${id}`, { auth: true }),
  getInvoice: (id: number) => apiFetch<Invoice>(`/bookings/${id}/invoice`, { auth: true }),
  cancel: (id: number, payload: CancelBookingPayload) =>
    apiFetch<Booking>(`/bookings/${id}/cancel`, { method: "PATCH", body: payload, auth: true }),
};
