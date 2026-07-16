"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { bookingsApi } from "@/lib/api/bookings";
import { ApiError } from "@/types/api";
import { BOOKING_STATUS_LABELS } from "@/types/enums";

interface BookingDetailPageProps {
  params: Promise<{ bookingId: string }>;
}

export default function BookingDetailPage(props: BookingDetailPageProps) {
  return (
    <RequireAuth allow={["user"]}>
      <BookingDetailContent {...props} />
    </RequireAuth>
  );
}

function BookingDetailContent({ params }: BookingDetailPageProps) {
  const { bookingId } = use(params);
  const id = Number(bookingId);
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const bookingQuery = useQuery({
    queryKey: ["booking-detail", id],
    queryFn: () => bookingsApi.getDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const booking = bookingQuery.data;

  const invoiceQuery = useQuery({
    queryKey: ["booking-invoice", id],
    queryFn: () => bookingsApi.getInvoice(id),
    enabled: Boolean(booking && booking.status !== "pending"),
    retry: false,
  });

  const cancellable = booking && (booking.status === "pending" || booking.status === "confirmed");

  async function handleCancel() {
    if (!booking) return;
    setCancelError(null);
    setCancelling(true);
    try {
      await bookingsApi.cancel(booking.id, {});
      toast.success("Huy booking thanh cong");
      queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Huy booking that bai");
    } finally {
      setCancelling(false);
    }
  }

  if (bookingQuery.isLoading) {
    return <p className="px-4 py-12 text-center text-muted-foreground">Dang tai...</p>;
  }
  if (bookingQuery.error || !booking) {
    return (
      <p className="px-4 py-12 text-center text-destructive">
        {bookingQuery.error instanceof ApiError ? bookingQuery.error.message : "Khong tim thay booking"}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href="/bookings" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sach booking
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Booking {booking.booking_code}</CardTitle>
            <Badge variant="secondary">{BOOKING_STATUS_LABELS[booking.status]}</Badge>
          </div>
          <CardDescription>
            {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} - {booking.num_guests} khach
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {booking.rooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between text-sm">
                <span>
                  Loai phong #{room.room_type_id} x{room.quantity} ({room.num_nights} dem)
                </span>
                <span>{formatMoney(room.subtotal)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tien phong</span>
              <span>{formatMoney(booking.total_room_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tien dich vu</span>
              <span>{formatMoney(booking.total_service_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giam gia</span>
              <span>-{formatMoney(booking.discount_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Tong cong</span>
              <span>{formatMoney(booking.total_amount)}</span>
            </div>
          </div>
          {booking.special_requests && (
            <p className="text-sm text-muted-foreground">Yeu cau: {booking.special_requests}</p>
          )}
          {booking.cancellation_reason && (
            <p className="text-sm text-destructive">Ly do huy: {booking.cancellation_reason}</p>
          )}
        </CardContent>
      </Card>

      {invoiceQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Hoa don {invoiceQuery.data.invoice_number}</CardTitle>
            <CardDescription>Xuat ngay {formatDate(invoiceQuery.data.issued_at)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Tong tien da thanh toan: {formatMoney(invoiceQuery.data.total_amount)}</p>
          </CardContent>
        </Card>
      )}

      {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}

      {cancellable && (
        <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
          {cancelling ? "Dang huy..." : "Huy booking"}
        </Button>
      )}
    </div>
  );
}
