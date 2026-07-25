"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Check, Maximize2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/utils/format";
import { RoomTypeDetailDialog } from "@/components/shared/RoomTypeDetailDialog";
import type { RoomTypeAvailability } from "@/types/models";

interface RoomAvailabilityTableProps {
  hotelId: number;
  items: RoomTypeAvailability[];
  numNights: number;
  checkIn: string;
  checkOut: string;
  numGuests: string;
}

// Bang chon phong trong: cho phep chon NHIEU loai phong kem so luong, tinh tong
// tien theo so dem, bam ten phong de mo modal chi tiet. Desktop hien dang bang,
// mobile chuyen sang danh sach the cho de doc.
export function RoomAvailabilityTable({
  hotelId,
  items,
  numNights,
  checkIn,
  checkOut,
  numGuests,
}: RoomAvailabilityTableProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [detailRoom, setDetailRoom] = useState<RoomTypeAvailability | null>(null);

  const selected = useMemo(
    () =>
      items
        .map((room) => ({ room, qty: quantities[room.room_type_id] ?? 0 }))
        .filter((row) => row.qty > 0),
    [items, quantities],
  );
  const totalRooms = selected.reduce((sum, row) => sum + row.qty, 0);
  const totalPrice = selected.reduce((sum, row) => sum + row.room.base_price * row.qty * numNights, 0);

  function setQuantity(roomTypeId: number, value: number) {
    setQuantities((prev) => ({ ...prev, [roomTypeId]: value }));
  }

  // Truyen nhieu loai phong sang checkout dang "rooms=<id>:<qty>,<id>:<qty>".
  function handleBook() {
    if (selected.length === 0) return;
    const params = new URLSearchParams({
      rooms: selected.map((row) => `${row.room.room_type_id}:${row.qty}`).join(","),
      check_in: checkIn,
      check_out: checkOut,
    });
    if (numGuests) params.set("num_guests", numGuests);
    router.push(`/checkout/${hotelId}?${params.toString()}`);
  }

  if (items.length === 0) {
    return <p className="text-center text-muted-foreground">Khách sạn chưa có loại phòng nào.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop: dang bang */}
      <div className="hidden overflow-hidden rounded-xl border lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Loại chỗ nghỉ</th>
              <th className="px-4 py-3 font-semibold">Số lượng khách</th>
              <th className="px-4 py-3 font-semibold">
                {numNights > 0 ? `Giá cho ${numNights} đêm` : "Giá mỗi đêm"}
              </th>
              <th className="px-4 py-3 font-semibold">Chọn phòng</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((room) => (
              <tr key={room.room_type_id} className="align-top">
                <td className="px-4 py-4">
                  <RoomSummary room={room} onOpenDetail={() => setDetailRoom(room)} />
                </td>
                <td className="px-4 py-4">
                  <GuestIcons count={room.max_guests} />
                </td>
                <td className="px-4 py-4">
                  <RoomPrice basePrice={room.base_price} numNights={numNights} />
                </td>
                <td className="px-4 py-4">
                  <QuantitySelect
                    room={room}
                    value={quantities[room.room_type_id] ?? 0}
                    onChange={(value) => setQuantity(room.room_type_id, value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: dang the */}
      <div className="flex flex-col gap-3 lg:hidden">
        {items.map((room) => (
          <div key={room.room_type_id} className="flex flex-col gap-3 rounded-xl border p-4">
            <RoomSummary room={room} onOpenDetail={() => setDetailRoom(room)} />
            <GuestIcons count={room.max_guests} />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <RoomPrice basePrice={room.base_price} numNights={numNights} />
              <QuantitySelect
                room={room}
                value={quantities[room.room_type_id] ?? 0}
                onChange={(value) => setQuantity(room.room_type_id, value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tong ket + nut dat */}
      <div className="flex flex-wrap items-center justify-end gap-4 rounded-xl border bg-muted/30 p-4">
        <div className="text-right">
          {totalRooms > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {totalRooms} phòng{numNights > 0 ? ` · ${numNights} đêm` : ""}
              </p>
              <p className="text-xl font-bold">{formatMoney(totalPrice)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Chọn số lượng phòng để tiếp tục</p>
          )}
        </div>
        <Button onClick={handleBook} disabled={totalRooms === 0} className="rounded-full">
          Tôi sẽ đặt
        </Button>
      </div>

      <RoomTypeDetailDialog
        room={detailRoom}
        open={detailRoom !== null}
        onOpenChange={(open) => !open && setDetailRoom(null)}
      />
    </div>
  );
}

// Ten loai phong (bam de mo chi tiet) + thong so nhanh + tien nghi noi bat.
function RoomSummary({ room, onOpenDetail }: { room: RoomTypeAvailability; onOpenDetail: () => void }) {
  const highlights = room.amenities.slice(0, 6);
  const remaining = room.amenities.length - highlights.length;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-fit text-left font-semibold text-primary hover:underline"
      >
        {room.name}
      </button>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {room.bed_type && (
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-3.5" /> {room.bed_type}
          </span>
        )}
        {room.area_sqm && (
          <span className="flex items-center gap-1.5">
            <Maximize2 className="size-3.5" /> {room.area_sqm} m²
          </span>
        )}
      </div>
      {highlights.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {highlights.map((amenity) => (
            <li key={amenity.name} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3.5 shrink-0 text-primary" />
              {amenity.name}
            </li>
          ))}
          {remaining > 0 && (
            <li>
              <button type="button" onClick={onOpenDetail} className="text-xs text-primary hover:underline">
                +{remaining} tiện nghi
              </button>
            </li>
          )}
        </ul>
      )}
      <p className={`text-xs font-medium ${room.available_rooms <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
        {room.available_rooms > 0 ? `Chúng tôi còn ${room.available_rooms} căn` : "Hết phòng"}
      </p>
    </div>
  );
}

// Moi khach = 1 icon nguoi (dung User chu khong dung Users - Users ve san 2
// nguoi nen phong 1 khach van trong nhu 2). Qua 4 khach thi hien so cho gon.
function GuestIcons({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5 text-sm text-muted-foreground" title={`Tối đa ${count} khách`}>
      {count <= 4 ? (
        Array.from({ length: count }).map((_, i) => <User key={i} className="size-4" />)
      ) : (
        <>
          <User className="size-4" />
          <span className="text-xs font-medium">× {count}</span>
        </>
      )}
    </span>
  );
}

function RoomPrice({ basePrice, numNights }: { basePrice: number; numNights: number }) {
  return (
    <div>
      <p className="text-lg font-bold">{formatMoney(numNights > 0 ? basePrice * numNights : basePrice)}</p>
      <p className="text-xs text-muted-foreground">
        {numNights > 0 ? `${formatMoney(basePrice)} / đêm` : "mỗi đêm"}
      </p>
    </div>
  );
}

// O chon so luong phong, gioi han theo so phong con trong.
function QuantitySelect({
  room,
  value,
  onChange,
}: {
  room: RoomTypeAvailability;
  value: number;
  onChange: (value: number) => void;
}) {
  if (room.available_rooms <= 0) {
    return <span className="text-sm text-muted-foreground">Hết phòng</span>;
  }
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next ?? 0))}>
      <SelectTrigger className="w-20" aria-label={`Số phòng ${room.name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: room.available_rooms + 1 }).map((_, index) => (
          <SelectItem key={index} value={String(index)}>
            {index}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
