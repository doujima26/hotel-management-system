"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock, DoorOpen, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { dashboardApi } from "@/lib/api/dashboard";
import { getErrorMessage } from "@/types/api";

// Bieu do dung recharts, mau lay tu token thiet ke he thong qua CSS variable.
const tooltipContentStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  padding: "6px 10px",
};
const tooltipLabelStyle = { color: "var(--popover-foreground)", fontWeight: 600, marginBottom: 2 };
const tooltipItemStyle = { color: "var(--popover-foreground)" };

const compactMoneyFormatter = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });

function formatShortDate(value: string): string {
  const d = new Date(value);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "warning";
}) {
  const content = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-xl border p-3 transition-colors",
        tone === "warning" ? "border-warning-strong/30 bg-warning-subtle/40" : "bg-card",
        href && "hover:border-primary",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-xl font-semibold">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function SuperAdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => dashboardApi.getPlatformOverview(),
  });

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getErrorMessage(error, "Không thể tải tổng quan nền tảng")}
      </p>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Tổng quan nền tảng</h2>
        <p className="text-sm text-muted-foreground">Hôm nay, {formatDate(data.date)}</p>
      </div>

      {/* Hang doi duyet dat len dau vi day la viec DUY NHAT tren trang nay ma
          Super Admin phai tu tay xu ly - cac khoi con lai chi de theo doi. */}
      <Link href="/super-admin/hotels?status=pending" className="block">
        <Card
          className={cn(
            "transition-colors hover:border-primary",
            data.pending_hotels > 0 && "border-warning-strong/30 bg-warning-subtle/40",
          )}
        >
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>
                  {data.pending_hotels > 0
                    ? `${data.pending_hotels} hồ sơ khách sạn chờ duyệt`
                    : "Không có hồ sơ nào chờ duyệt"}
                </CardTitle>
                <CardDescription>
                  {data.oldest_pending_days != null
                    ? `Hồ sơ chờ lâu nhất đã ${data.oldest_pending_days} ngày.`
                    : "Hàng đợi đang trống."}
                </CardDescription>
              </div>
              <Clock
                className={cn("size-6", data.pending_hotels > 0 ? "text-warning-strong" : "text-muted-foreground")}
              />
            </div>
          </CardHeader>
        </Card>
      </Link>

      <div>
        <p className="mb-2 text-sm font-medium">Quy mô nền tảng</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            href="/super-admin/hotels?status=approved"
            icon={Building2}
            label="Khách sạn hoạt động"
            value={data.approved_hotels}
            hint={`${data.total_hotels} tổng hồ sơ`}
          />
          <StatTile
            href="/super-admin/hotels?status=suspended"
            icon={Building2}
            label="Đang tạm dừng"
            value={data.suspended_hotels}
            tone={data.suspended_hotels > 0 ? "warning" : "neutral"}
          />
          <StatTile icon={DoorOpen} label="Tổng số phòng" value={data.total_rooms} hint="của khách sạn đang hoạt động" />
          <StatTile
            href="/super-admin/users"
            icon={Users}
            label="Khách hàng"
            value={data.users_by_role.user ?? 0}
          />
          <StatTile
            href="/super-admin/users"
            icon={Users}
            label="Chủ khách sạn"
            value={data.users_by_role.admin ?? 0}
            hint={`${data.users_by_role.staff ?? 0} nhân viên`}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Hôm nay</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={TrendingUp} label="Doanh thu" value={formatMoney(data.revenue_today)} />
          <StatTile icon={TrendingUp} label="Booking mới" value={data.bookings_today} />
          <StatTile icon={Users} label="Tài khoản mới" value={data.new_users_today} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doanh thu và booking 7 ngày</CardTitle>
          <CardDescription>Toàn nền tảng, tính cả hôm nay.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {/* Hai bieu do nho xep chong dung chung truc ngay, KHONG dung 2 truc
              doc tren cung 1 bieu do: hai don vi khac nhau (tien va so don) dat
              chung mot khung se tu ve ra mot moi tuong quan khong co that. */}
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data.daily_trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => compactMoneyFormatter.format(Number(value))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => [formatMoney(Number(value)), "Doanh thu"]}
                labelFormatter={(value) => formatDate(String(value))}
              />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={data.daily_trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => [`${Number(value)} đơn`, "Booking"]}
                labelFormatter={(value) => formatDate(String(value))}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Khách sạn dẫn đầu doanh thu</CardTitle>
          <CardDescription>30 ngày gần nhất. Bấm vào tên để xem hồ sơ.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.top_hotels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có doanh thu nào trong 30 ngày qua.</p>
          ) : (
            data.top_hotels.map((hotel, index) => (
              <div key={hotel.hotel_id} className="flex items-center gap-3 text-sm">
                <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
                <Link href={`/super-admin/hotels/${hotel.hotel_id}`} className="mr-auto hover:text-primary hover:underline">
                  {hotel.name}
                </Link>
                <span className="font-medium tabular-nums">{formatMoney(hotel.revenue)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cần xem khách sạn nào đang có vấn đề (điểm thấp, tỷ lệ hủy cao, chưa có phòng)? Vào mục{" "}
        <Link href="/super-admin/hotels?sort=lowest_rated" className="text-primary hover:underline">
          Khách sạn
        </Link>{" "}
        và sắp xếp theo điểm thấp nhất.
      </p>
    </div>
  );
}
