"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/format";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

export default function AdminRoomTypesPage() {
  const hotel = useAdminHotel();
  const queryClient = useQueryClient();
  const approved = hotel.status === "approved";

  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [totalRooms, setTotalRooms] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: roomTypes, isLoading, error } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createRoomType({
        hotel_id: hotel.id,
        name,
        base_price: Number(basePrice),
        max_guests: Number(maxGuests),
        total_rooms: Number(totalRooms),
      });
      toast.success("Tao loai phong thanh cong");
      setName("");
      setBasePrice("");
      setMaxGuests("2");
      setTotalRooms("1");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tao loai phong that bai");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tao loai phong moi</CardTitle>
          <CardDescription>
            {approved
              ? "Khong co API sua/xoa loai phong sau khi tao, kiem tra ky truoc khi luu."
              : "Khach san can duoc duyet truoc khi tao loai phong."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_name">Ten loai phong</Label>
                <Input id="rt_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vi du: Deluxe" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_price">Gia moi dem (VND)</Label>
                <Input
                  id="rt_price"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_guests">So khach toi da/phong</Label>
                <Input
                  id="rt_guests"
                  type="number"
                  min={1}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_total">Tong so phong loai nay</Label>
                <Input
                  id="rt_total"
                  type="number"
                  min={1}
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              onClick={handleCreate}
              disabled={submitting || !name.trim() || !basePrice || !maxGuests || !totalRooms}
              className="self-start"
            >
              {submitting ? "Dang tao..." : "Tao loai phong"}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sach loai phong</h2>
        {isLoading && <p className="text-muted-foreground">Dang tai...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Khong the tai danh sach loai phong"}
          </p>
        )}
        {roomTypes?.map((roomType) => (
          <Card key={roomType.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{roomType.name}</CardTitle>
                <span className="font-semibold">{formatMoney(roomType.base_price)}/dem</span>
              </div>
              <CardDescription>
                Toi da {roomType.max_guests} khach/phong - {roomType.total_rooms} phong
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/room-types/${roomType.id}/rooms`} className="text-sm text-primary hover:underline">
                Quan ly phong vat ly &amp; anh &rarr;
              </Link>
            </CardContent>
          </Card>
        ))}
        {roomTypes && roomTypes.length === 0 && (
          <p className="text-center text-muted-foreground">Chua co loai phong nao.</p>
        )}
      </div>
    </div>
  );
}
