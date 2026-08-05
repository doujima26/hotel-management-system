"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageSquareText, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Booking } from "@/types/models";
import { PAYMENT_METHOD_LABELS, type BookingStatus } from "@/types/enums";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";

// Ngoai cac muc loc thang theo trang thai, con 3 muc ghep them dieu kien khac:
// "Cho xac nhan" chi lay don da tra tien vi don chua tra tien thi Admin khong
// bam xac nhan duoc, 2 muc "hom nay" loc theo ngay chu khong theo trang thai.
// Chung deu lay danh sach tu API roi loc lai o trinh duyet.
type BookingFilter = BookingStatus | "all" | "overdue_checkin" | "arrivals_today" | "departures_today";

const FILTER_OPTIONS: { value: BookingFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "arrivals_today", label: "Nhận phòng hôm nay" },
  { value: "departures_today", label: "Trả phòng hôm nay" },
  { value: "overdue_checkin", label: "Quá hạn nhận phòng" },
  { value: "checked_in", label: "Đang lưu trú" },
  { value: "checked_out", label: "Đã trả phòng" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "no_show", label: "Không đến" },
];

// Giu dung luat voi cac o tren Dashboard: khach den/di trong ngay tinh ca phan
// da lam xong, nen con so tren o va danh sach o day luon khop nhau.
function matchesFilter(booking: Booking, filter: BookingFilter, today: string): boolean {
  switch (filter) {
    case "pending":
      return booking.payment_status === "completed";
    case "overdue_checkin":
      return booking.check_in_date < today;
    case "arrivals_today":
      return (
        booking.check_in_date === today &&
        (booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "checked_out")
      );
    case "departures_today":
      return (
        booking.check_out_date === today && (booking.status === "checked_in" || booking.status === "checked_out")
      );
    default:
      return true;
  }
}

// Boc Suspense vi ben trong dung useSearchParams - dung khuyen nghi cua Next
// de phan con lai cua trang van duoc prerender.
export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Đang tải...</p>}>
      <AdminBookingsContent />
    </Suspense>
  );
}

function AdminBookingsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Mac dinh xem tat ca don. Chi mo san mot bo loc khi duoc dieu huong kem
  // ?status= (cac o tren Dashboard), va chi nhan gia tri co trong danh sach bo
  // loc de tham so bua khong bi gui thang len API.
  const statusParam = searchParams.get("status");
  const initialStatus = FILTER_OPTIONS.some((opt) => opt.value === statusParam)
    ? (statusParam as BookingFilter)
    : "all";
  const [statusFilter, setStatusFilter] = useState<BookingFilter>(initialStatus);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Hai muc loc theo ngay trai tren nhieu trang thai nen phai lay ca danh sach.
  const apiStatus: BookingStatus | undefined =
    statusFilter === "all" || statusFilter === "arrivals_today" || statusFilter === "departures_today"
      ? undefined
      : statusFilter === "overdue_checkin"
        ? "confirmed"
        : statusFilter;

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-bookings", apiStatus ?? "all"],
    queryFn: () => bookingsApi.listForHotel(apiStatus),
  });

  const today = todayDateString();
  const bookings = data?.filter((booking) => matchesFilter(booking, statusFilter, today));

  async function handleConfirm(id: number) {
    setActionError(null);
    setBusyId(id);
    try {
      await bookingsApi.confirm(id);
      toast.success("Xác nhận đơn thành công, đã gửi email cho khách");
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
      toast.success("Hủy đơn thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-bookings"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Hủy đơn thất bại");
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Đơn đặt phòng</h2>
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
          {error instanceof ApiError ? error.message : "Không thể tải danh sách đơn đặt phòng"}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {bookings?.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{booking.booking_code}</CardTitle>
                <BookingStatusBadge status={booking.status} />
              </div>
              <CardDescription>
                {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} - {booking.num_guests} khách
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
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

              <div className="flex items-center gap-2">
                {booking.payment_status ? (
                  <>
                    <PaymentStatusBadge status={booking.payment_status} />
                    {booking.payment_method && (
                      <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[booking.payment_method]}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-destructive">Chưa thanh toán</span>
                )}
              </div>
            </CardContent>
            {(booking.status === "pending" || booking.status === "confirmed") && (
              <CardFooter className="gap-2">
                {booking.status === "pending" && (
                  <>
                    {/* Chua thanh toan thi chua xac nhan duoc: hoa don chi sinh
                        ra khi khach tra tien, nen nut Xac nhan se luon that bai.
                        Chi con don cu tu truoc khi gop dat phong va thanh toan
                        vao 1 buoc moi roi vao nhanh nay. */}
                    {booking.payment_status === "completed" ? (
                      <Button size="sm" onClick={() => handleConfirm(booking.id)} disabled={busyId === booking.id}>
                        Xác nhận
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Đơn chưa thanh toán</span>
                    )}
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
              </CardFooter>
            )}
          </Card>
        ))}
        {bookings && bookings.length === 0 && (
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
