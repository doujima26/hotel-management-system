"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, DoorOpen, LogIn, LogOut, Star, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { dashboardApi } from "@/lib/api/dashboard";
import { ApiError } from "@/types/api";
import type { DailyTrendPoint, RoomStatusOverview, StaffShiftItem } from "@/types/models";

// Dashboard - tong quan van hanh HOM NAY (Lop 2 trong tai lieu thiet ke), tach
// biet voi trang Doanh thu (Lop 1+3, tai chinh/xu huong). Moi khoi LUON hien
// (khong an di khi = 0) va toan bo khoi bam duoc de vao thang trang chi tiet.

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-subtle text-success-strong",
  info: "bg-info-subtle text-info-strong",
  warning: "bg-warning-subtle text-warning-strong",
  danger: "bg-danger-subtle text-danger-strong",
  neutral: "bg-muted text-muted-foreground",
};

const compactMoneyFormatter = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
function formatCompactMoney(value: number): string {
  return compactMoneyFormatter.format(value);
}

function formatShortDate(value: string): string {
  const d = new Date(value);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// Style dung chung cho tooltip cua 2 bieu do - theo dung mau card/border cua theme.
const tooltipContentStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  padding: "6px 10px",
};
const tooltipLabelStyle = { color: "var(--popover-foreground)", fontWeight: 600, marginBottom: 2 };
const tooltipItemStyle = { color: "var(--popover-foreground)" };

// Doanh thu + ty le lap day 7 ngay - 2 bieu do nho xep chong, chung 1 truc
// ngay nhung MOI bieu do co truc doc rieng (khong dung dual-axis 1 bieu do -
// doanh thu (VND, so lon) va ty le lap day (%, 0-100) khac thang do, ve chung
// 1 truc se kho doc).
function RevenueAndOccupancyTrend({ points }: { points: DailyTrendPoint[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Doanh thu</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Tỷ lệ lấp đầy</p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Tỷ lệ lấp đầy"]}
              labelFormatter={(value) => formatDate(String(value))}
            />
            <Line type="monotone" dataKey="occupancy_rate" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: "var(--primary)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 1 the thong ke don, ca khoi bam duoc, dan thang toi trang chi tiet.
function StatTile({
  href,
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 transition-opacity hover:opacity-80",
        TONE_CLASSES[tone],
      )}
    >
      <Icon className="size-5 shrink-0" />
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm">{label}</p>
      </div>
    </Link>
  );
}

function RoomStatusTile({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-xl border p-3", TONE_CLASSES[tone])}>
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

const ROOM_STATUS_TILES: { key: keyof RoomStatusOverview; label: string; tone: Tone }[] = [
  { key: "available", label: "Trống", tone: "success" },
  { key: "occupied", label: "Đang ở", tone: "info" },
  { key: "cleaning", label: "Đang dọn", tone: "warning" },
  { key: "maintenance", label: "Bảo trì", tone: "danger" },
  { key: "blocked_today", label: "Đang khóa lịch", tone: "neutral" },
];

const SHIFT_ORDER: { key: StaffShiftItem["shift_type"]; label: string }[] = [
  { key: "morning", label: "Sáng" },
  { key: "afternoon", label: "Chiều" },
  { key: "night", label: "Tối" },
];

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-operations-overview"],
    queryFn: () => dashboardApi.getHotelOperationsOverview(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Tổng quan</h2>
        <p className="text-sm text-muted-foreground">Tổng quan vận hành hôm nay - bấm vào từng khối để xem chi tiết.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">{error instanceof ApiError ? error.message : "Không thể tải dashboard"}</p>
      )}

      {data && (
        <>
          <p className="-mt-3 text-sm text-muted-foreground">Hôm nay, {formatDate(data.date)}</p>

          {/* Cac o co trang thai tuong ung thi truyen ?status= de trang Booking
              mo san dung bo loc do (trang Booking mac dinh xem tat ca). Nhan
              phong / tra phong hom nay khong co bo loc tuong ung vi chung loc
              theo NGAY chu khong theo trang thai. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile
              href="/admin/bookings?status=pending"
              icon={CalendarClock}
              label="Chờ xác nhận"
              value={data.pending_bookings}
              tone={data.pending_bookings > 0 ? "warning" : "neutral"}
            />
            <StatTile
              href="/admin/bookings?status=overdue_checkin"
              icon={CalendarClock}
              label="Chưa check-in"
              value={data.overdue_confirmed_bookings}
              tone={data.overdue_confirmed_bookings > 0 ? "danger" : "neutral"}
            />
            <StatTile href="/admin/bookings" icon={LogIn} label="Nhận phòng hôm nay" value={data.arrivals_today} />
            <StatTile href="/admin/bookings" icon={LogOut} label="Trả phòng hôm nay" value={data.departures_today} />
            <StatTile href="/admin/bookings?status=checked_in" icon={Users} label="Đang lưu trú" value={data.in_house} />
          </div>

          <Link href="/admin/revenue" className="block">
            <Card className="transition-shadow hover:ring-primary/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-muted-foreground" />
                  <CardTitle>Doanh thu và hiệu suất 7 ngày</CardTitle>
                </div>
                <CardDescription>Bấm để xem trang Doanh thu đầy đủ</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueAndOccupancyTrend points={data.daily_trend} />
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rooms" className="block">
            <Card className="transition-shadow hover:ring-primary/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DoorOpen className="size-4 text-muted-foreground" />
                  <CardTitle>Trạng thái phòng</CardTitle>
                </div>
                <CardDescription>Bấm để xem sơ đồ phòng chi tiết</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {ROOM_STATUS_TILES.map((tile) => (
                    <RoomStatusTile key={tile.key} label={tile.label} value={data.room_status[tile.key]} tone={tile.tone} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/staff/schedule" className="block">
            <Card className="transition-shadow hover:ring-primary/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  <CardTitle>Lịch làm việc hôm nay</CardTitle>
                </div>
                <CardDescription>Bấm để xem/sửa lịch làm việc đầy đủ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {SHIFT_ORDER.map((shift) => {
                    const staffInShift = data.staff_shifts_today.filter((s) => s.shift_type === shift.key);
                    return (
                      <div key={shift.key} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">Ca {shift.label}</p>
                        {staffInShift.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">Chưa xếp ca</p>
                        ) : (
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {staffInShift.map((s) => (
                              <li key={s.staff_id} className="text-sm">
                                {s.staff_name}
                                <span className="text-muted-foreground"> · {s.staff_position}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reviews" className="block">
            <Card className="transition-shadow hover:ring-primary/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-muted-foreground" />
                  <CardTitle>Đánh giá mới</CardTitle>
                </div>
                <CardDescription>Bấm để xem toàn bộ đánh giá</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recent_reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {data.recent_reviews.map((review) => (
                      <div key={review.id} className="flex items-start gap-2 text-sm">
                        <span className="shrink-0 rounded bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {review.rating}
                        </span>
                        <p className="line-clamp-1 text-muted-foreground">
                          <span className="font-medium text-foreground">{review.reviewer_name}</span>
                          {review.comment ? `: ${review.comment}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </>
      )}
    </div>
  );
}
