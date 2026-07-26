"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";

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
    return <p className="px-4 py-12 text-center text-muted-foreground">Đang tải...</p>;
  }
  if (bookingQuery.error || !booking) {
    return (
      <p className="px-4 py-12 text-center text-destructive">
        {bookingQuery.error instanceof ApiError ? bookingQuery.error.message : "Không tìm thấy booking"}
      </p>
    );
  }
  if (booking.status !== "confirmed") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-muted-foreground">
        Booking phải ở trạng thái &quot;Đã xác nhận&quot; mới check-in được.
        <div className="mt-4">
          <Link href="/staff/bookings" className="text-primary underline-offset-4 hover:underline">
            Quay lại danh sách booking
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
      setFormError(err instanceof ApiError ? err.message : "Check-in thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href="/staff/bookings" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách booking
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Check-in booking {booking.booking_code}</CardTitle>
          <CardDescription>Gán phòng vật lý cụ thể cho từng suất phòng đã đặt.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {booking.rooms.map((room) => {
            const slots = getSlots(room.id, room.quantity);
            const availableForType = rooms?.filter((r) => r.room_type_id === room.room_type_id && r.status === "available");
            return (
              <div key={room.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <p className="font-medium">
                  {roomTypeNames[room.room_type_id] ?? `Loại phòng #${room.room_type_id}`} x{room.quantity}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {slots.map((slot, index) => (
                    <div key={index} className="flex flex-col gap-1.5">
                      <Label>Phòng #{index + 1}</Label>
                      <Select
                        value={slot !== null ? String(slot) : "none"}
                        onValueChange={(v) => setSlot(room.id, room.quantity, index, v === "none" ? null : Number(v))}
                      >
                        <SelectTrigger className="w-full">
                          {/* Phai tu format: mac dinh SelectValue hien gia tri tho (room_id). */}
                          <SelectValue>
                            {(current) => {
                              const picked = rooms?.find((r) => String(r.room_id) === current);
                              if (!picked) return "Chọn phòng";
                              return `${picked.room_number}${picked.floor ? ` (tầng ${picked.floor})` : ""}`;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Chọn phòng</SelectItem>
                          {availableForType?.map((r) => (
                            <SelectItem
                              key={r.room_id}
                              value={String(r.room_id)}
                              disabled={selectedRoomIds.has(r.room_id) && slot !== r.room_id}
                            >
                              {r.room_number}
                              {r.floor ? ` (tầng ${r.floor})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
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
  );
}
