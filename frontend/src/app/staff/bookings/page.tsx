"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { bookingsApi } from "@/lib/api/bookings";
import { ApiError } from "@/types/api";
import { type BookingStatus } from "@/types/enums";
import { BookingStatusBadge } from "@/components/shared/StatusBadge";

const FILTER_OPTIONS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "confirmed", label: "Đã xác nhận (chờ check-in)" },
  { value: "checked_in", label: "Đang lưu trú" },
  { value: "checked_out", label: "Đã trả phòng" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "no_show", label: "Không đến" },
];

export default function StaffBookingsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("confirmed");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-bookings", statusFilter],
    queryFn: () => bookingsApi.listForHotel(statusFilter === "all" ? undefined : statusFilter),
  });

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Booking của khách sạn</h2>
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

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách booking"}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {data?.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{booking.booking_code}</CardTitle>
                <BookingStatusBadge status={booking.status} />
              </div>
              <CardDescription>
                {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} - {booking.num_guests} khách -{" "}
                {formatMoney(booking.total_amount)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              {booking.status === "confirmed" && (
                <Link href={`/staff/check-in/${booking.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                  Check-in
                </Link>
              )}
              {booking.status === "checked_in" && (
                <Button size="sm" onClick={() => handleCheckOut(booking.id)} disabled={busyId === booking.id}>
                  Check-out
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {data && data.length === 0 && (
          <p className="text-center text-muted-foreground">Không có booking nào ở trạng thái này.</p>
        )}
      </div>
    </div>
  );
}
