"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hotelsApi } from "@/lib/api/hotels";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

export default function AdminAmenitiesPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [hotelAmenityError, setHotelAmenityError] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [roomAmenityError, setRoomAmenityError] = useState<string | null>(null);

  const { data: hotelCatalog, isLoading: hotelCatalogLoading } = useQuery({
    queryKey: ["amenities", "hotel"],
    queryFn: () => roomsApi.listAmenities("hotel"),
    enabled: approved,
  });

  const { data: assignedHotelAmenities } = useQuery({
    queryKey: ["hotel-amenities", hotel.id],
    queryFn: () => hotelsApi.listAmenities(),
    enabled: approved,
  });

  const { data: roomCatalog, isLoading: roomCatalogLoading } = useQuery({
    queryKey: ["amenities", "room"],
    queryFn: () => roomsApi.listAmenities("room"),
    enabled: approved,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
    enabled: approved,
  });

  const roomTypeId = selectedRoomTypeId ? Number(selectedRoomTypeId) : null;

  const { data: assignedRoomTypeAmenities } = useQuery({
    queryKey: ["room-type-amenities", roomTypeId],
    queryFn: () => roomsApi.listRoomTypeAmenities(roomTypeId as number),
    enabled: approved && roomTypeId !== null,
  });

  async function handleToggleHotelAmenity(amenityId: number, assigned: boolean) {
    setHotelAmenityError(null);
    try {
      if (assigned) {
        await hotelsApi.unassignAmenity(amenityId);
        toast.success("Đã gỡ tiện nghi khỏi khách sạn");
      } else {
        await hotelsApi.assignAmenity(amenityId);
        toast.success("Gán tiện nghi vào khách sạn thành công");
      }
      await queryClient.invalidateQueries({ queryKey: ["hotel-amenities", hotel.id] });
    } catch (err) {
      setHotelAmenityError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  }

  async function handleAssignRoomAmenity(amenityId: number) {
    if (roomTypeId === null) return;
    setRoomAmenityError(null);
    try {
      await roomsApi.assignAmenityToRoomType(roomTypeId, amenityId);
      toast.success("Gán tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
    } catch (err) {
      setRoomAmenityError(err instanceof ApiError ? err.message : "Gán tiện nghi thất bại");
    }
  }

  async function handleUnassignRoomAmenity(amenityId: number) {
    if (roomTypeId === null) return;
    setRoomAmenityError(null);
    try {
      await roomsApi.unassignAmenityFromRoomType(roomTypeId, amenityId);
      toast.success("Đã gỡ tiện nghi khỏi loại phòng");
      await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
    } catch (err) {
      setRoomAmenityError(err instanceof ApiError ? err.message : "Gỡ tiện nghi thất bại");
    }
  }

  const assignedHotelAmenityIds = new Set(assignedHotelAmenities?.map((a) => a.id));
  const assignedRoomTypeAmenityIds = new Set(assignedRoomTypeAmenities?.map((a) => a.id));

  if (!approved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tiện nghi</CardTitle>
          <CardDescription>Khách sạn cần được duyệt trước khi chọn tiện nghi.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tiện nghi</CardTitle>
          <CardDescription>
            Tiện nghi chung của khách sạn (hồ bơi, bãi đỗ xe, gym...). Chọn từ danh mục do Super Admin quản lý.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {hotelCatalogLoading && <p className="text-muted-foreground">Đang tải...</p>}
          {hotelAmenityError && <p className="text-sm text-destructive">{hotelAmenityError}</p>}
          <div className="flex flex-wrap gap-2">
            {hotelCatalog?.map((amenity) => {
              const assigned = assignedHotelAmenityIds.has(amenity.id);
              return (
                <Button
                  key={amenity.id}
                  type="button"
                  size="sm"
                  variant={assigned ? "secondary" : "outline"}
                  onClick={() => handleToggleHotelAmenity(amenity.id, assigned)}
                >
                  {amenity.name} {assigned ? "✓ (bấm để gỡ)" : ""}
                </Button>
              );
            })}
            {hotelCatalog && hotelCatalog.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có tiện nghi nào trong danh mục.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiện nghi phòng</CardTitle>
          <CardDescription>
            Tiện nghi riêng của từng loại phòng (điều hòa, TV, minibar...). Chọn 1 loại phòng, sau đó bấm gán cho từng tiện nghi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room_type_select">Loại phòng</Label>
            <Select
              value={selectedRoomTypeId || "none"}
              onValueChange={(v) => setSelectedRoomTypeId(!v || v === "none" ? "" : v)}
            >
              <SelectTrigger id="room_type_select" className="w-full sm:w-64">
                {/* Phai tu format: mac dinh SelectValue hien gia tri tho (id loai phong). */}
                <SelectValue>
                  {(current) => roomTypes?.find((rt) => String(rt.id) === current)?.name ?? "Chọn loại phòng"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn loại phòng</SelectItem>
                {roomTypes?.map((rt) => (
                  <SelectItem key={rt.id} value={String(rt.id)}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {roomCatalogLoading && <p className="text-muted-foreground">Đang tải...</p>}
          {roomAmenityError && <p className="text-sm text-destructive">{roomAmenityError}</p>}
          {roomTypeId !== null && (
            <div className="flex flex-wrap gap-2">
              {roomCatalog?.map((amenity) => {
                const assigned = assignedRoomTypeAmenityIds.has(amenity.id);
                return (
                  <Button
                    key={amenity.id}
                    type="button"
                    size="sm"
                    variant={assigned ? "secondary" : "outline"}
                    onClick={() => (assigned ? handleUnassignRoomAmenity(amenity.id) : handleAssignRoomAmenity(amenity.id))}
                  >
                    {amenity.name} {assigned ? "✓ (bấm để gỡ)" : ""}
                  </Button>
                );
              })}
              {roomCatalog && roomCatalog.length === 0 && (
                <p className="text-sm text-muted-foreground">Chưa có tiện nghi nào trong danh mục.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
