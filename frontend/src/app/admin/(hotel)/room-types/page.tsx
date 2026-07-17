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
      toast.success("Tạo loại phòng thành công");
      setName("");
      setBasePrice("");
      setMaxGuests("2");
      setTotalRooms("1");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo loại phòng thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo loại phòng mới</CardTitle>
          <CardDescription>
            {approved
              ? "Không có API sửa/xóa loại phòng sau khi tạo, kiểm tra kỹ trước khi lưu."
              : "Khách sạn cần được duyệt trước khi tạo loại phòng."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_name">Tên loại phòng</Label>
                <Input id="rt_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Deluxe" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_price">Giá mỗi đêm (VND)</Label>
                <Input
                  id="rt_price"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_guests">Số khách tối đa/phòng</Label>
                <Input
                  id="rt_guests"
                  type="number"
                  min={1}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rt_total">Tổng số phòng loại này</Label>
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
              {submitting ? "Đang tạo..." : "Tạo loại phòng"}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách loại phòng</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Không thể tải danh sách loại phòng"}
          </p>
        )}
        {roomTypes?.map((roomType) => (
          <Card key={roomType.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{roomType.name}</CardTitle>
                <span className="font-semibold">{formatMoney(roomType.base_price)}/đêm</span>
              </div>
              <CardDescription>
                Tối đa {roomType.max_guests} khách/phòng - {roomType.total_rooms} phòng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/admin/room-types/${roomType.id}/rooms`} className="text-sm text-primary hover:underline">
                Quản lý phòng vật lý &amp; ảnh &rarr;
              </Link>
            </CardContent>
          </Card>
        ))}
        {roomTypes && roomTypes.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có loại phòng nào.</p>
        )}
      </div>
    </div>
  );
}
