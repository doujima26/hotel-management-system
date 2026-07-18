"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/format";
import { dashboardApi } from "@/lib/api/dashboard";
import { ApiError } from "@/types/api";

export default function AdminDashboardPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-dashboard", fromDate, toDate],
    queryFn: () => dashboardApi.getHotelDashboard({ from_date: fromDate || undefined, to_date: toDate || undefined }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from_date">Từ ngày</Label>
          <Input id="from_date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to_date">Đến ngày</Label>
          <Input id="to_date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải dashboard"}
        </p>
      )}

      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            Kỳ báo cáo: {data.from_date} &rarr; {data.to_date}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>Doanh thu</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(data.revenue)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Tỷ lệ lấp đầy</CardDescription>
                <CardTitle className="text-2xl">{(data.occupancy_rate * 100).toFixed(1)}%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dịch vụ dùng nhiều nhất</CardTitle>
              <CardDescription>
                Mục này sẽ luôn rỗng cho tới khi hệ thống theo dõi dịch vụ đã dùng theo booking được xây dựng.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.top_services.length === 0 && (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu dịch vụ.</p>
              )}
              <div className="flex flex-col gap-1">
                {data.top_services.map((service) => (
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
        </>
      )}
    </div>
  );
}
