"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { todayDateString } from "@/lib/utils/date";
import { bookingsApi } from "@/lib/api/bookings";
import { ApiError } from "@/types/api";
import { type BookingStatus } from "@/types/enums";
import { BookingStatusBadge } from "@/components/shared/StatusBadge";

const FILTER_OPTIONS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "checked_in", label: "Đang lưu trú" },
  { value: "checked_out", label: "Đã trả phòng" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "no_show", label: "Không đến" },
];

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("pending");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-bookings", statusFilter],
    queryFn: () => bookingsApi.listForHotel(statusFilter === "all" ? undefined : statusFilter),
  });

  async function handleConfirm(id: number) {
    setActionError(null);
    setBusyId(id);
    try {
      await bookingsApi.confirm(id);
      toast.success("Xác nhận booking thành công, đã gửi email cho khách");
      await queryClient.invalidateQueries({ queryKey: ["hotel-bookings"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Xác nhận thất bại");
    } finally {
      setBusyId(null);
    }
  }

  function openCancelDialog(id: number) {
    setCancelReason("");
    setCancelTarget(id);
  }

  async function confirmCancel() {
    if (cancelTarget === null) return;
    setActionError(null);
    setBusyId(cancelTarget);
    try {
      await bookingsApi.adminCancel(cancelTarget, { cancellation_reason: cancelReason || undefined });
      toast.success("Hủy booking thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-bookings"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Hủy booking thất bại");
    } finally {
      setBusyId(null);
      setCancelTarget(null);
    }
  }

  // Chi cho danh dau khong den voi booking da xac nhan va da qua ngay nhan
  // phong (so sanh chuoi ISO YYYY-MM-DD hop le vi cung do dai). Backend van
  // tu kiem tra lai, day chi la dieu kien de hien nut cho dung.
  async function handleMarkNoShow(id: number) {
    setActionError(null);
    setBusyId(id);
    try {
      await bookingsApi.markNoShow(id);
      toast.success("Đã đánh dấu booking không đến");
      await queryClient.invalidateQueries({ queryKey: ["hotel-bookings"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Đánh dấu không đến thất bại");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Booking của khách sạn</h2>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | "all")}>
          <SelectTrigger className="w-44">
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
              {booking.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => handleConfirm(booking.id)} disabled={busyId === booking.id}>
                    Xác nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openCancelDialog(booking.id)}
                    disabled={busyId === booking.id}
                  >
                    Hủy hộ khách
                  </Button>
                </>
              )}
              {booking.status === "confirmed" && (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openCancelDialog(booking.id)}
                    disabled={busyId === booking.id}
                  >
                    Hủy hộ khách
                  </Button>
                  {booking.check_in_date < todayDateString() && (
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
            </CardContent>
          </Card>
        ))}
        {data && data.length === 0 && (
          <p className="text-center text-muted-foreground">Không có booking nào ở trạng thái này.</p>
        )}
      </div>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy booking thay khách</DialogTitle>
            <DialogDescription>Không áp dụng chính sách 24h. Dùng cho overbooking hoặc theo yêu cầu của khách.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cancel_reason">Lý do (không bắt buộc)</Label>
            <textarea
              id="cancel_reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Đóng
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={busyId === cancelTarget}>
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
