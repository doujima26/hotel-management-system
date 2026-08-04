"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageSquareText, Phone, User } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { todayDateString } from "@/lib/utils/date";
import { bookingsApi } from "@/lib/api/bookings";
import { ApiError } from "@/types/api";
import { PAYMENT_METHOD_LABELS, type BookingStatus } from "@/types/enums";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";

const FILTER_OPTIONS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "confirmed", label: "Đã xác nhận (chờ check-in)" },
  { value: "checked_in", label: "Đang lưu trú" },
  { value: "checked_out", label: "Đã trả phòng" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "no_show", label: "Không đến" },
];

// Hai viec lam moi ca truc: don nao den hom nay, don nao tra phong hom nay.
const DAY_TABS: { value: "all" | "arrivals" | "departures"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "arrivals", label: "Nhận phòng hôm nay" },
  { value: "departures", label: "Trả phòng hôm nay" },
];

export default function StaffBookingsPage() {
  const queryClient = useQueryClient();
  // Mac dinh xem tat ca don, khong loc san theo trang thai nao.
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [dayTab, setDayTab] = useState<"all" | "arrivals" | "departures">("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-bookings", statusFilter],
    queryFn: () => bookingsApi.listForHotel(statusFilter === "all" ? undefined : statusFilter),
  });

  const today = todayDateString();

  // Loc ngay va tu khoa lam o phia trinh duyet vi API tra ve ca danh sach.
  const bookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (data ?? []).filter((booking) => {
      if (dayTab === "arrivals" && booking.check_in_date !== today) return false;
      if (dayTab === "departures" && booking.check_out_date !== today) return false;
      if (!keyword) return true;
      return (
        booking.booking_code.toLowerCase().includes(keyword) ||
        booking.customer_name.toLowerCase().includes(keyword) ||
        booking.customer_email.toLowerCase().includes(keyword) ||
        (booking.customer_phone ?? "").includes(keyword)
      );
    });
  }, [data, dayTab, search, today]);

  async function handleCheckOut(id: number) {
    setActionError(null);
    setBusyId(id);
    try {
      await bookingsApi.checkOut(id, {});
      toast.success("Check-out thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-bookings"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Check-out thất bại");
    } finally {
      setBusyId(null);
    }
  }

  // Chi hien voi booking da xac nhan nhung da qua ngay nhan phong ma khach
  // chua check-in - backend van tu kiem tra lai dieu kien nay.
  async function handleMarkNoShow(id: number) {
    setActionError(null);
    setBusyId(id);
    try {
      await bookingsApi.markNoShow(id);
      toast.success("Đã đánh dấu đơn không đến");
      await queryClient.invalidateQueries({ queryKey: ["hotel-bookings"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Đánh dấu không đến thất bại");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Đơn đặt phòng</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên hoặc số điện thoại khách"
            className="w-full sm:w-72"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
            <SelectTrigger className="w-56">
              {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma trang thai). */}
              <SelectValue>
                {(current) => FILTER_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DAY_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? (data?.length ?? 0)
              : (data ?? []).filter((booking) =>
                  tab.value === "arrivals" ? booking.check_in_date === today : booking.check_out_date === today,
                ).length;
          const active = dayTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setDayTab(tab.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary",
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("text-xs font-semibold tabular-nums", !active && "text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách đơn đặt phòng"}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{booking.booking_code}</CardTitle>
                <BookingStatusBadge status={booking.status} />
              </div>
              <CardDescription>
                {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} - {booking.num_guests} khách
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Le tan la nguoi doi mat khach nen phai goi duoc khi khach qua gio chua toi. */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="size-3.5 text-muted-foreground" />
                  {booking.customer_name}
                </span>
                {booking.customer_phone && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3.5" />
                    {booking.customer_phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3.5" />
                  {booking.customer_email}
                </span>
              </div>

              <div className="flex flex-col gap-1 rounded-lg border p-2.5 text-sm">
                {booking.rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between gap-2">
                    <span>
                      {room.room_type_name} x{room.quantity} · {room.num_nights} đêm
                    </span>
                    <span className="font-medium">{formatMoney(room.subtotal)}</span>
                  </div>
                ))}
                {booking.services.map((service) => (
                  <div key={service.service_id} className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span>
                      {service.name} x{service.quantity}
                    </span>
                    <span>{formatMoney(service.subtotal)}</span>
                  </div>
                ))}
                {booking.discount_amount > 0 && (
                  <div className="flex items-center justify-between gap-2 text-success-strong">
                    <span>Khuyến mãi</span>
                    <span>-{formatMoney(booking.discount_amount)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between gap-2 border-t pt-1 font-semibold">
                  <span>Tổng tiền</span>
                  <span>{formatMoney(booking.total_amount)}</span>
                </div>
              </div>

              {booking.special_requests && (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
                  {booking.special_requests}
                </p>
              )}

              {/* Phai biet khach con no tien khong truoc khi cho tra phong. */}
              <div className="flex items-center gap-2">
                {booking.payment_status ? (
                  <>
                    <PaymentStatusBadge status={booking.payment_status} />
                    {booking.payment_method && (
                      <span className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[booking.payment_method]}
                      </span>
                    )}
                  </>
                ) : booking.hold_expired ? (
                  <span className="text-xs text-destructive">Hết hạn giữ chỗ</span>
                ) : (
                  <span className="text-xs text-warning-strong">Chưa thanh toán</span>
                )}
              </div>
            </CardContent>
            {(booking.status === "confirmed" || booking.status === "checked_in") && (
              <CardFooter className="gap-2">
                {booking.status === "confirmed" && (
                  <>
                    <Link href={`/staff/check-in/${booking.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                      Check-in
                    </Link>
                    {booking.check_in_date < today && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkNoShow(booking.id)}
                        disabled={busyId === booking.id}
                      >
                        Đánh dấu không đến
                      </Button>
                    )}
                  </>
                )}
                {booking.status === "checked_in" && (
                  <Button size="sm" onClick={() => handleCheckOut(booking.id)} disabled={busyId === booking.id}>
                    Check-out
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        ))}
        {data && bookings.length === 0 && (
          <p className="text-center text-muted-foreground">Không có đơn nào khớp bộ lọc.</p>
        )}
      </div>
    </div>
  );
}
