"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, Building2, CalendarDays, Users } from "lucide-react";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AccountShell } from "@/components/shared/AccountShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { todayDateString } from "@/lib/utils/date";
import { bookingsApi } from "@/lib/api/bookings";
import { getErrorMessage } from "@/types/api";
import type { Booking } from "@/types/models";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";

// Loc theo viec khach dang quan tam chu khong theo ma trang thai ky thuat: don
// sap di, don dang o, don da xong, don khong thanh.
type TabValue = "all" | "upcoming" | "staying" | "completed" | "cancelled";

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "upcoming", label: "Sắp tới" },
  { value: "staying", label: "Đang ở" },
  { value: "completed", label: "Đã hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

// Don da tao nhung tien chua ve - khach can quay lai man hinh QR de tra tien.
function choThanhToan(booking: Booking): boolean {
  return booking.status === "pending" && booking.payment_status !== "completed";
}


function matchesTab(booking: Booking, tab: TabValue, today: string): boolean {
  switch (tab) {
    case "upcoming":
      return (booking.status === "pending" || booking.status === "confirmed") && booking.check_in_date >= today;
    case "staying":
      return booking.status === "checked_in";
    case "completed":
      return booking.status === "checked_out";
    case "cancelled":
      return booking.status === "cancelled" || booking.status === "no_show";
    default:
      return true;
  }
}

export default function BookingsPage() {
  return (
    <RequireAuth allow={["user"]}>
      <AccountShell>
        <BookingsList />
      </AccountShell>
    </RequireAuth>
  );
}

function BookingsList() {
  const [tab, setTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const today = todayDateString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => bookingsApi.listMine(),
  });

  const bookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (data ?? []).filter((booking) => {
      if (!matchesTab(booking, tab, today)) return false;
      if (!keyword) return true;
      return (
        booking.booking_code.toLowerCase().includes(keyword) ||
        booking.hotel_name.toLowerCase().includes(keyword) ||
        booking.hotel_city.toLowerCase().includes(keyword)
      );
    });
  }, [data, tab, search, today]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Đơn đặt phòng</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const count = (data ?? []).filter((booking) => matchesTab(booking, item.value, today)).length;
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary",
              )}
            >
              <span>{item.label}</span>
              <span className={cn("text-xs font-semibold tabular-nums", !active && "text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm theo mã đơn, tên khách sạn hoặc thành phố"
        className="sm:max-w-md"
      />

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {getErrorMessage(error, "Không thể tải danh sách booking")}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((booking) => {
          const nights = booking.rooms[0]?.num_nights ?? 0;
          return (
            <Link key={booking.id} href={`/bookings/${booking.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      {booking.hotel_name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {/* Don cho chuyen khoan doi nhan rieng: "Cho xac nhan" khien
                          khach tuong khach san dang duyet, trong khi thuc te he
                          thong dang cho TIEN cua ho va phong chi duoc giu 15 phut. */}
                      {choThanhToan(booking) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          Chờ thanh toán
                        </span>
                      ) : (
                        <BookingStatusBadge status={booking.status} />
                      )}
                      {booking.payment_status && <PaymentStatusBadge status={booking.payment_status} />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.hotel_city} · Mã đơn {booking.booking_code}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end justify-between gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                      {nights > 0 && <span className="text-muted-foreground">· {nights} đêm</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {booking.num_guests} khách
                      </span>
                      {booking.rooms.length > 0 && (
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="size-3.5" />
                          {booking.rooms.map((room) => `${room.room_type_name} x${room.quantity}`).join(", ")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold">{formatMoney(booking.total_amount)}</span>
                    {choThanhToan(booking) && (
                      <span className="text-xs font-medium text-primary">Bấm để tiếp tục thanh toán &rarr;</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {data && bookings.length === 0 && (
          <EmptyState
            title={data.length === 0 ? "Bạn chưa có đơn đặt phòng nào" : "Không có đơn nào khớp bộ lọc"}
            hint={data.length === 0 ? "Tìm khách sạn và đặt phòng để bắt đầu." : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
          />
        )}
      </div>
    </div>
  );
}
