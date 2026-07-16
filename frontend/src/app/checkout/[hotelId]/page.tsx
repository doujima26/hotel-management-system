"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/utils/format";
import { apiFetch } from "@/lib/api/client";
import { bookingsApi } from "@/lib/api/bookings";
import { paymentsApi } from "@/lib/api/payments";
import { ApiError } from "@/types/api";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/types/enums";
import type { Booking, HotelDetail, PayBookingResult, RoomAvailability } from "@/types/models";

interface CheckoutPageProps {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{ room_type_id?: string; check_in?: string; check_out?: string; num_guests?: string }>;
}

export default function CheckoutPage(props: CheckoutPageProps) {
  return (
    <RequireAuth allow={["user"]}>
      <CheckoutContent {...props} />
    </RequireAuth>
  );
}

function CheckoutContent({ params, searchParams }: CheckoutPageProps) {
  const { hotelId } = use(params);
  const query = use(searchParams);
  const id = Number(hotelId);
  const roomTypeId = Number(query.room_type_id ?? "0");
  const checkIn = query.check_in ?? "";
  const checkOut = query.check_out ?? "";
  const numGuests = query.num_guests ? Number(query.num_guests) : 1;

  const [quantity, setQuantity] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payResult, setPayResult] = useState<PayBookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payingLoading, setPayingLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hotelQuery = useQuery({
    queryKey: ["hotel-detail", id],
    queryFn: () => apiFetch<HotelDetail>(`/hotels/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });

  const availabilityQuery = useQuery({
    queryKey: ["room-availability", id, checkIn, checkOut, numGuests],
    queryFn: () =>
      apiFetch<RoomAvailability>("/rooms/availability", {
        params: { hotel_id: id, check_in: checkIn, check_out: checkOut, num_guests: numGuests },
      }),
    enabled: Boolean(id && checkIn && checkOut),
  });

  const selectedRoom = availabilityQuery.data?.items.find((item) => item.room_type_id === roomTypeId);

  if (!roomTypeId || !checkIn || !checkOut) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-muted-foreground">
        Thieu thong tin dat phong. Vui long chon phong tu trang chi tiet khach san.
        <div className="mt-4">
          <Link href={`/hotels/${id}`} className="text-primary underline-offset-4 hover:underline">
            Quay lai trang khach san
          </Link>
        </div>
      </div>
    );
  }

  async function handleCreateBooking() {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await bookingsApi.create({
        hotel_id: id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_guests: numGuests,
        rooms: [{ room_type_id: roomTypeId, quantity }],
        special_requests: specialRequests || undefined,
      });
      setBooking(result);
      toast.success("Tao booking thanh cong. Vui long thanh toan de hoan tat.");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tao booking that bai");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!booking) return;
    setFormError(null);
    setPayingLoading(true);
    try {
      const result = await paymentsApi.pay({ booking_id: booking.id, payment_method: paymentMethod });
      setPayResult(result);
      toast.success("Thanh toan thanh cong!");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Thanh toan that bai");
    } finally {
      setPayingLoading(false);
    }
  }

  if (payResult && booking) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Dat phong thanh cong!</h1>
        <p className="text-muted-foreground">
          Hoa don so {payResult.invoice.invoice_number} - Tong tien {formatMoney(payResult.invoice.total_amount)}.
          Booking dang cho khach san xac nhan, ban se nhan duoc thong bao qua email khi duoc xac nhan.
        </p>
        <div className="flex justify-center gap-3">
          <Link href={`/bookings/${booking.id}`} className="text-primary underline-offset-4 hover:underline">
            Xem chi tiet booking
          </Link>
          <Link href="/bookings" className="text-primary underline-offset-4 hover:underline">
            Danh sach booking cua toi
          </Link>
        </div>
      </div>
    );
  }

  if (booking) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Thanh toan booking {booking.booking_code}</CardTitle>
            <CardDescription>Tong tien: {formatMoney(booking.total_amount)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment_method">Phuong thuc thanh toan</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger id="payment_method" className="w-full">
                  <SelectValue placeholder="Chon phuong thuc" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handlePay} disabled={payingLoading}>
              {payingLoading ? "Dang thanh toan..." : `Thanh toan ${formatMoney(booking.total_amount)}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{hotelQuery.data?.name ?? "Dat phong"}</CardTitle>
          <CardDescription>
            {checkIn} &rarr; {checkOut} - {numGuests} khach
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {availabilityQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Dang tai thong tin phong...</p>
          )}
          {!availabilityQuery.isLoading && !selectedRoom && (
            <p className="text-sm text-destructive">Khong tim thay loai phong nay hoac da het phong trong.</p>
          )}
          {selectedRoom && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{selectedRoom.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(selectedRoom.base_price)}/dem - con {selectedRoom.available_rooms} phong
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">So luong phong</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={selectedRoom?.available_rooms}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="special_requests">Yeu cau dac biet (khong bat buoc)</Label>
            <textarea
              id="special_requests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleCreateBooking} disabled={submitting || !selectedRoom}>
            {submitting ? "Dang xu ly..." : "Xac nhan dat phong"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
