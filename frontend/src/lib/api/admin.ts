import { apiFetch } from "./client";
import type { AdminHotelListResult, AdminUserListResult, ReviewHotelResult, SetUserActiveResult } from "@/types/models";
import type { HotelStatus, UserRole } from "@/types/enums";

export interface ListHotelsParams {
  status?: HotelStatus;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ListUsersParams {
  role?: UserRole;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ReviewHotelPayload {
  action: "approved" | "rejected" | "suspended";
  rejection_reason?: string;
}

export const adminApi = {
  listHotels: (params: ListHotelsParams) => apiFetch<AdminHotelListResult>("/admin/hotels", { params, auth: true }),
  reviewHotel: (hotelId: number, payload: ReviewHotelPayload) =>
    apiFetch<ReviewHotelResult>(`/admin/hotels/${hotelId}/review`, { method: "PATCH", body: payload, auth: true }),
  listUsers: (params: ListUsersParams) => apiFetch<AdminUserListResult>("/admin/users", { params, auth: true }),
  setUserActive: (userId: number, isActive: boolean) =>
    apiFetch<SetUserActiveResult>(`/admin/users/${userId}/active`, {
      method: "PATCH",
      body: { is_active: isActive },
      auth: true,
    }),
};
