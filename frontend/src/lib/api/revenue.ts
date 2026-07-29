import { apiFetch } from "./client";
import type { HotelRevenueDashboard } from "@/types/revenue";

export interface RevenueDateRangeParams {
  from_date?: string;
  to_date?: string;
  [key: string]: string | number | boolean | undefined;
}

// API client rieng cho module Doanh thu - khong dung chung voi lib/api/dashboard.ts.
export const revenueApi = {
  getHotelRevenue: (params: RevenueDateRangeParams) =>
    apiFetch<HotelRevenueDashboard>("/revenue/hotel", { params, auth: true }),
};
