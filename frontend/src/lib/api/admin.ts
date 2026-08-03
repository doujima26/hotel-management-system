import { apiFetch } from "./client";
import type {
  AdminActionLogListResult,
  AdminHotelDetail,
  AdminHotelListResult,
  AdminUserDetail,
  AdminUserListResult,
  ReviewHotelResult,
  SetUserActiveResult,
} from "@/types/models";
import type { HotelStatus, UserRole } from "@/types/enums";

export interface ListHotelsParams {
  status?: HotelStatus;
  search?: string;
  city?: string;
  sort?: "newest" | "lowest_rated" | "highest_rated" | "name";
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ListUsersParams {
  role?: UserRole;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ListActionLogsParams {
  target_type?: "hotel" | "user";
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

// reason dung chung cho ca tu choi lan tam dung.
export interface ReviewHotelPayload {
  action: "approved" | "rejected" | "suspended";
  reason?: string;
}

export const adminApi = {
  listHotels: (params: ListHotelsParams) => apiFetch<AdminHotelListResult>("/admin/hotels", { params, auth: true }),
  // Ho so day du de tham dinh truoc khi duyet.
  getHotelDetail: (hotelId: number) => apiFetch<AdminHotelDetail>(`/admin/hotels/${hotelId}`, { auth: true }),
  reviewHotel: (hotelId: number, payload: ReviewHotelPayload) =>
    apiFetch<ReviewHotelResult>(`/admin/hotels/${hotelId}/review`, { method: "PATCH", body: payload, auth: true }),
  listUsers: (params: ListUsersParams) => apiFetch<AdminUserListResult>("/admin/users", { params, auth: true }),
  // Ho so day du kem noi cong tac va lich su khoa/mo tai khoan.
  getUserDetail: (userId: number) => apiFetch<AdminUserDetail>(`/admin/users/${userId}`, { auth: true }),
  // Nhat ky hanh dong quan tri (duyet/tu choi/tam dung khach san, khoa tai khoan).
  listActionLogs: (params: ListActionLogsParams) =>
    apiFetch<AdminActionLogListResult>("/admin/action-logs", { params, auth: true }),
  setUserActive: (userId: number, isActive: boolean) =>
    apiFetch<SetUserActiveResult>(`/admin/users/${userId}/active`, {
      method: "PATCH",
      body: { is_active: isActive },
      auth: true,
    }),
};
