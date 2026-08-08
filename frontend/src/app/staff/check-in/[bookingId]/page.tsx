"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageSquareText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { getErrorMessage } from "@/types/api";
import { PAYMENT_METHOD_LABELS } from "@/types/enums";
import { PaymentStatusBadge } from "@/components/shared/StatusBadge";

interface CheckInPageProps {
  params: Promise<{ bookingId: string }>;
}

export default function StaffCheckInPage({ params }: CheckInPageProps) {
  const { bookingId } = use(params);
  const id = Number(bookingId);
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // assignments[booking_room_id] = mang so phong da chon cho tung suat, null neu chua chon.
  const [assignments, setAssignments] = useState<Record<number, (number | null)[]>>({});

  const bookingQuery = useQuery({
    queryKey: ["booking-detail", id],
    queryFn: () => bookingsApi.getDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const roomsQuery = useQuery({
    queryKey: ["room-status-board"],
    queryFn: () => roomsApi.statusBoard(),
  });

  const booking = bookingQuery.data;
  const rooms = roomsQuery.data;

  const roomTypeNames = useMemo(() => {
    const map: Record<number, string> = {};
    rooms?.forEach((room) => {
      map[room.room_type_id] = room.room_type_name;
    });
    return map;
  }, [rooms]);

  const selectedRoomIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(assignments).forEach((slots) => slots.forEach((roomId) => roomId !== null && ids.add(roomId)));
    return ids;
  }, [assignments]);

  function getSlots(bookingRoomId: number, quantity: number): (number | null)[] {
    return assignments[bookingRoomId] ?? Array.from({ length: quantity }, () => null);
  }

  function setSlot(bookingRoomId: number, quantity: number, slotIndex: number, roomId: number | null) {
    setAssignments((prev) => {
      const current = prev[bookingRoomId] ?? Array.from({ length: quantity }, () => null);
      const next = [...current];
      next[slotIndex] = roomId;
      return { ...prev, [bookingRoomId]: next };
    });
  }

  if (bookingQuery.isLoading || roomsQuery.isLoading) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }
  if (bookingQuery.error || !booking) {
    return <p className="text-sm text-destructive">{getErrorMessage(bookingQuery.error, "Không tìm thấy booking")}</p>;
  }
  if (booking.status !== "confirmed") {
    return (
      <div className="text-muted-foreground">
        Đơn đặt phòng phải ở trạng thái &quot;Đã xác nhận&quot; mới check-in được.
        <div className="mt-4">
          <Link href="/staff/bookings" className="text-primary underline-offset-4 hover:underline">
            Quay lại danh sách đơn đặt phòng
          </Link>
        </div>
      </div>
    );
  }

  const allFilled = booking.rooms.every((room) => {
    const slots = getSlots(room.id, room.quantity);
    return slots.every((slot) => slot !== null);
  });

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);
    try {
      await bookingsApi.checkIn(id, {
        assignments: booking!.rooms.map((room) => ({
          booking_room_id: room.id,
          room_ids: getSlots(room.id, room.quantity).filter((roomId): roomId is number => roomId !== null),
        })),
      });
      toast.success("Check-in thành công");
      router.push("/staff/bookings");
    } catch (err) {
      setFormError(getErrorMessage(err, "Check-in thất bại"));
    } finally {
      setSubmitting(false);
    }
  }

  const nights = booking.rooms[0]?.num_nights ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/staff/bookings" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách booking
      </Link>

      <PageHeader
        title={`Check-in booking ${booking.booking_code}`}
        description="Đối chiếu thông tin khách rồi gán phòng vật lý cụ thể cho từng suất phòng đã đặt."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cot trai: thong tin khach, ngay luu tru, ghi chu va bang ke gia. */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin đơn</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="font-medium">{booking.customer_name}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" />
                  {booking.customer_email}
                </span>
                {booking.customer_phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    {booking.customer_phone}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Nhận phòng</p>
                <p className="font-medium">{formatDate(booking.check_in_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trả phòng</p>
                <p className="font-medium">{formatDate(booking.check_out_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Số đêm</p>
                <p className="font-medium">{nights}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Số khách</p>
                <p className="font-medium">{booking.num_guests}</p>
              </div>
            </div>

            {booking.special_requests && (
              <>
                <Separator />
                <p className="flex items-start gap-1.5">
                  <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {booking.special_requests}
                </p>
              </>
            )}

            <Separator />

            {/* Bang ke gia: tung dong phong/dich vu roi den cac muc cong don. */}
            <div className="flex flex-col gap-2">
              {booking.rooms.map((room) => (
                <div key={room.id} className="flex items-start justify-between gap-2">
                  <span>
                    {room.room_type_name} x{room.quantity}
                    <span className="block text-xs text-muted-foreground">
                      {formatMoney(room.price_per_night)}/đêm · {room.num_nights} đêm
                    </span>
                  </span>
                  <span className="font-medium">{formatMoney(room.subtotal)}</span>
                </div>
              ))}
              {booking.services.map((service) => (
                <div key={service.service_id} className="flex items-start justify-between gap-2">
                  <span>
                    {service.name} x{service.quantity}
                    <span className="block text-xs text-muted-foreground">{formatMoney(service.unit_price)}/lần</span>
                  </span>
                  <span className="font-medium">{formatMoney(service.subtotal)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền phòng</span>
                <span>{formatMoney(booking.total_room_price)}</span>
              </div>
              {booking.total_service_price > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền dịch vụ</span>
                  <span>{formatMoney(booking.total_service_price)}</span>
                </div>
              )}
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-success-strong">
                  <span>Giảm giá</span>
                  <span>-{formatMoney(booking.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Tổng cộng</span>
                <span>{formatMoney(booking.total_amount)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {booking.payment_method ? PAYMENT_METHOD_LABELS[booking.payment_method] : "Chưa chọn phương thức"}
              </span>
              {booking.payment_status && <PaymentStatusBadge status={booking.payment_status} />}
            </div>
          </CardContent>
        </Card>

        {/* Cot phai: chon phong vat ly con trong roi xac nhan check-in. */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Chọn phòng</CardTitle>
            <CardDescription>Bấm vào số phòng để gán cho từng suất phòng đã đặt.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {booking.rooms.map((room) => {
              const slots = getSlots(room.id, room.quantity);
              const availableForType = rooms?.filter(
                (r) => r.room_type_id === room.room_type_id && r.status === "available",
              );
              return (
                <div key={room.id} className="flex flex-col gap-3 rounded-lg border p-3">
                  <p className="font-medium">
                    {roomTypeNames[room.room_type_id] ?? `Loại phòng #${room.room_type_id}`} x{room.quantity}
                  </p>
                  {slots.map((slot, index) => (
                    <div key={index} className="flex flex-col gap-1.5">
                      <Label>Phòng #{index + 1}</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableForType?.map((r) => {
                          const isSelected = slot === r.room_id;
                          const isTakenElsewhere = selectedRoomIds.has(r.room_id) && !isSelected;
                          return (
                            <button
                              key={r.room_id}
                              type="button"
                              onClick={() => setSlot(room.id, room.quantity, index, isSelected ? null : r.room_id)}
                              disabled={isTakenElsewhere}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:border-primary/50",
                                isTakenElsewhere && "cursor-not-allowed opacity-40",
                              )}
                            >
                              {r.room_number}
                              {r.floor ? ` (tầng ${r.floor})` : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {(availableForType?.length ?? 0) === 0 && (
                    <p className="text-sm text-destructive">Không còn phòng trống thuộc loại này.</p>
                  )}
                </div>
              );
            })}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleSubmit} disabled={submitting || !allFilled} className="self-start">
              {submitting ? "Đang check-in..." : "Xác nhận check-in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
