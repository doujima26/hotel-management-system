// Type rieng cho module Doanh thu - khong dung chung voi types/models.ts (HotelDashboard...)
// vi domain revenue tach doc lap hoan toan khoi domain dashboard.

export interface DailyRevenuePoint {
  date: string;
  revenue: number;
}

export interface RevenueByRoomTypeItem {
  room_type_id: number;
  room_type_name: string;
  revenue: number;
}

export interface HotelRevenueDashboard {
  hotel_id: number;
  from_date: string;
  to_date: string;
  revenue: number;
  revenue_change_pct: number | null;
  occupancy_rate: number;
  occupancy_rate_change_pct: number | null;
  total_bookings: number;
  total_bookings_change_pct: number | null;
  adr: number;
  adr_change_pct: number | null;
  room_revenue: number;
  service_revenue: number;
  daily_revenue: DailyRevenuePoint[];
  top_room_types: RevenueByRoomTypeItem[];
}
