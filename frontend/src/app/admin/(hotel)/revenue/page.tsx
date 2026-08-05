"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { revenueApi } from "@/lib/api/revenue";
import { ApiError } from "@/types/api";
import type { DailyRevenuePoint, RevenueByRoomTypeItem } from "@/types/revenue";

// Trang Doanh thu - tach doc lap hoan toan khoi trang Dashboard (khong dung
// chung component/API/type), tap trung vao hieu qua kinh doanh/tai chinh.
// Bieu do dung thu vien recharts, mau lay tu dung token thiet ke he thong
// (qua CSS variable) thay vi hardcode.

const compactMoneyFormatter = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
function formatCompactMoney(value: number): string {
  return compactMoneyFormatter.format(value);
}

function formatShortDate(value: string): string {
  const d = new Date(value);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// Style dung chung cho tooltip cua moi bieu do - theo dung mau card/border cua theme.
const tooltipContentStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  padding: "6px 10px",
};
const tooltipLabelStyle = { color: "var(--popover-foreground)", fontWeight: 600, marginBottom: 2 };
const tooltipItemStyle = { color: "var(--popover-foreground)" };

function formatPct(value: number): string {
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

// Nhan % thay doi so ky truoc - mau theo huong tot/xau (tang = success, giam = danger),
// dung dung nghia token trang thai vi day thuc su la tin hieu tot/xau.
function DeltaLabel({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">Chưa có kỳ trước để so sánh</span>;
  }
  return (
    <span className={cn("text-xs font-medium", value >= 0 ? "text-success-strong" : "text-danger-strong")}>
      {formatPct(value)} so với kỳ trước
    </span>
  );
}

function KpiCard({ label, value, change }: { label: string; value: string; change: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <DeltaLabel value={change} />
      </CardContent>
    </Card>
  );
}

// Bieu do cot xu huong doanh thu theo ngay - chi 1 mau (--primary) vi day la 1
// chuoi so lieu duy nhat (sequential), khong phai nhieu series can phan biet
// danh tinh nen khong can chu thich mau.
function RevenueTrendChart({ points }: { points: DailyRevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompactMoney}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value) => [formatMoney(Number(value)), "Doanh thu"]}
          labelFormatter={(value) => formatDate(String(value))}
        />
        <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// So sanh doanh thu phong vs dich vu - dang "emphasis": phong la muc chinh
// (--primary), dich vu la muc phu de-emphasis (--muted-foreground), 1 thanh
// ngang duy nhat gom 2 doan xep chong (stacked).
function RoomServiceSplitBar({ roomRevenue, serviceRevenue }: { roomRevenue: number; serviceRevenue: number }) {
  const data = [{ name: "revenue", room: roomRevenue, service: serviceRevenue }];
  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={56}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={tooltipContentStyle}
            labelStyle={{ display: "none" }}
            itemStyle={tooltipItemStyle}
            formatter={(value, name) => [formatMoney(Number(value)), name === "room" ? "Phòng" : "Dịch vụ"]}
          />
          <Bar dataKey="room" stackId="split" fill="var(--primary)" radius={[4, 0, 0, 4]} />
          <Bar dataKey="service" stackId="split" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full bg-primary" />
          Phòng: {formatMoney(roomRevenue)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground" />
          Dịch vụ: {formatMoney(serviceRevenue)}
        </span>
      </div>
    </div>
  );
}

// Top loai phong theo doanh thu - thanh ngang, 1 mau duy nhat (so sanh do
// lon, khong phai danh tinh nhieu series).
function TopRoomTypesChart({ items }: { items: RevenueByRoomTypeItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có doanh thu phòng trong khoảng này.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(items.length * 40, 120)}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickFormatter={formatCompactMoney}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="room_type_name"
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value) => [formatMoney(Number(value)), "Doanh thu"]}
        />
        <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Khoi doi soat: nen tang thu tien cua khach roi tru hoa hong, phan con lai
// chuyen tra cho khach san. Tach khoi cac chi so kinh doanh phia duoi vi day la
// dong tien thuc te chu khong phai hieu qua kinh doanh.
function SettlementCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-settlement"],
    queryFn: () => hotelsApi.getMySettlement(),
  });
  const { data: payouts } = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => hotelsApi.listMyPayouts(),
  });

  if (isLoading || !data) return null;

  const lanGanNhat = payouts?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đối soát với nền tảng</CardTitle>
        <CardDescription>
          Khách thanh toán về tài khoản nền tảng. Sau khi trừ hoa hồng {data.commission_rate}%, phần còn lại
          được chuyển trả cho khách sạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SettlementFigure label="Khách đã thanh toán" value={data.total_collected} />
          <SettlementFigure label={`Hoa hồng nền tảng`} value={data.total_commission} />
          <SettlementFigure label="Đã nhận" value={data.total_paid} />
          <SettlementFigure
            label={data.outstanding < 0 ? "Đã nhận dư" : "Nền tảng đang giữ"}
            value={Math.abs(data.outstanding)}
            highlight
          />
        </div>

        {/* Con no am: don bi huy va hoan tien SAU khi nen tang da chuyen tra.
            Phai giai thich, khong thi chu khach san tuong he thong tinh sai. */}
        {data.outstanding < 0 && (
          <p className="text-sm text-amber-600">
            Khoản này phát sinh do có đơn bị hủy và hoàn tiền sau khi nền tảng đã chuyển trả. Số tiền sẽ được
            bù trừ vào kỳ chi trả tiếp theo.
          </p>
        )}

        {lanGanNhat && (
          <p className="text-sm text-muted-foreground">
            Lần nhận gần nhất: {formatMoney(lanGanNhat.amount)} ngày {formatDate(lanGanNhat.created_at)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SettlementFigure({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-semibold", highlight ? "text-lg text-primary" : "text-sm")}>
        {formatMoney(value)}
      </p>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-revenue", fromDate, toDate],
    queryFn: () => revenueApi.getHotelRevenue({ from_date: fromDate || undefined, to_date: toDate || undefined }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Doanh thu</h2>
        <p className="text-sm text-muted-foreground">Hiệu quả kinh doanh của khách sạn theo khoảng ngày đã chọn.</p>
      </div>

      <SettlementCard />

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
          {error instanceof ApiError ? error.message : "Không thể tải dữ liệu doanh thu"}
        </p>
      )}

      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            Kỳ báo cáo: {formatDate(data.from_date)} &rarr; {formatDate(data.to_date)}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Doanh thu" value={formatMoney(data.revenue)} change={data.revenue_change_pct} />
            <KpiCard
              label="Tỷ lệ lấp đầy"
              value={`${(data.occupancy_rate * 100).toFixed(1)}%`}
              change={data.occupancy_rate_change_pct}
            />
            <KpiCard label="Số booking" value={String(data.total_bookings)} change={data.total_bookings_change_pct} />
            <KpiCard label="Giá phòng bình quân/đêm" value={formatMoney(data.adr)} change={data.adr_change_pct} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Xu hướng doanh thu theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {data.daily_revenue.length > 0 ? (
                <RevenueTrendChart points={data.daily_revenue} />
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Doanh thu phòng vs dịch vụ</CardTitle>
            </CardHeader>
            <CardContent>
              <RoomServiceSplitBar roomRevenue={data.room_revenue} serviceRevenue={data.service_revenue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top loại phòng theo doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
              <TopRoomTypesChart items={data.top_room_types} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
