"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { dashboardApi } from "@/lib/api/dashboard";
import { ApiError } from "@/types/api";

export default function SuperAdminDashboardPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hotelId, setHotelId] = useState<string>("");

  const hotelsQuery = useQuery({
    queryKey: ["admin-hotels-for-dashboard"],
    queryFn: () => adminApi.listHotels({ status: "approved", page_size: 50 }),
  });

  const dashboardQuery = useQuery({
    queryKey: ["platform-dashboard", fromDate, toDate, hotelId],
    queryFn: () =>
      dashboardApi.getPlatformDashboard({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        hotel_id: hotelId ? Number(hotelId) : undefined,
      }),
  });

  const data = dashboardQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from_date">Từ ngày</Label>
          <Input id="from_date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to_date">Đến ngày</Label>
          <Input id="to_date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hotel_id">Xem chi tiết khách sạn (không bắt buộc)</Label>
          <Select
            value={hotelId || "none"}
            onValueChange={(v) => setHotelId(!v || v === "none" ? "" : v)}
          >
            <SelectTrigger id="hotel_id" className="w-full">
              {/* Phai tu format: mac dinh SelectValue hien gia tri tho (id khach san). */}
              <SelectValue>
                {(current) =>
                  hotelsQuery.data?.items.find((hotel) => String(hotel.id) === current)?.name ?? "Toàn nền tảng"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Toàn nền tảng</SelectItem>
              {hotelsQuery.data?.items.map((hotel) => (
                <SelectItem key={hotel.id} value={String(hotel.id)}>
                  {hotel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dashboardQuery.isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {dashboardQuery.error && (
        <p className="text-sm text-destructive">
          {dashboardQuery.error instanceof ApiError ? dashboardQuery.error.message : "Không thể tải dashboard"}
        </p>
      )}

      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            Kỳ báo cáo: {data.from_date} &rarr; {data.to_date}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Tổng doanh thu nền tảng</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(data.total_revenue)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Tổng số booking</CardDescription>
                <CardTitle className="text-2xl">{data.total_bookings}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Người dùng mới</CardDescription>
                <CardTitle className="text-2xl">{data.new_users_count}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {data.hotel && (
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết khách sạn #{data.hotel.hotel_id}</CardTitle>
                <CardDescription>
                  Doanh thu {formatMoney(data.hotel.revenue)} - Tỷ lệ lấp đầy{" "}
                  {(data.hotel.occupancy_rate * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm font-medium">Dịch vụ dùng nhiều nhất</p>
                {data.hotel.top_services.length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu dịch vụ.</p>
                )}
                <div className="flex flex-col gap-1">
                  {data.hotel.top_services.map((service) => (
                    <div key={service.service_id} className="flex justify-between text-sm">
                      <span>
                        {service.service_name} x{service.total_quantity}
                      </span>
                      <span>{formatMoney(service.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
