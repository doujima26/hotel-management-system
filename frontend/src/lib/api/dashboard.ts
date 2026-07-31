import { apiFetch } from "./client";
import type {
  HotelDashboard,
  HotelOperationsOverview,
  PlatformDashboard,
  PlatformOverview,
} from "@/types/models";

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
  getHotelOperationsOverview: () => apiFetch<HotelOperationsOverview>("/dashboard/hotel/operations", { auth: true }),
  // Anh chup nen tang hom nay - khac getPlatformDashboard (bao cao theo ky).
  getPlatformOverview: () => apiFetch<PlatformOverview>("/dashboard/platform/overview", { auth: true }),
};
