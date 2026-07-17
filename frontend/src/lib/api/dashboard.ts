import { apiFetch } from "./client";
import type { HotelDashboard, PlatformDashboard } from "@/types/models";

export interface DashboardDateRangeParams {
  from_date?: string;
  to_date?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PlatformDashboardParams extends DashboardDateRangeParams {
  hotel_id?: number;
}

export const dashboardApi = {
  getHotelDashboard: (params: DashboardDateRangeParams) =>
    apiFetch<HotelDashboard>("/dashboard/hotel", { params, auth: true }),
  getPlatformDashboard: (params: PlatformDashboardParams) =>
    apiFetch<PlatformDashboard>("/dashboard/platform", { params, auth: true }),
};
