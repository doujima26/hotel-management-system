import { serverFetch } from "./server";
import { apiFetch } from "./client";
import type { Review } from "@/types/models";

export interface CreateReviewPayload {
  booking_id: number;
  rating: number;
  comment?: string;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
}

export const reviewsApi = {
  // Endpoint cong khai, chi goi tu Server Component (xem lib/api/server.ts).
  listForHotel: (hotelId: number) => serverFetch<Review[]>("/reviews", { params: { hotel_id: hotelId } }),

  // Endpoint cong khai nhung goi tu Client Component (xem lib/api/client.ts) -
  // dung khi trang can vua fetch phia client vua khong can dang nhap.
  listForHotelClient: (hotelId: number) => apiFetch<Review[]>("/reviews", { params: { hotel_id: hotelId } }),

  // Client Component (can auth), goi qua rewrites proxy.
  create: (payload: CreateReviewPayload) => apiFetch<Review>("/reviews", { method: "POST", body: payload, auth: true }),
  update: (reviewId: number, payload: UpdateReviewPayload) =>
    apiFetch<Review>(`/reviews/${reviewId}`, { method: "PATCH", body: payload, auth: true }),
  remove: (reviewId: number) => apiFetch<{ id: number }>(`/reviews/${reviewId}`, { method: "DELETE", auth: true }),
};
