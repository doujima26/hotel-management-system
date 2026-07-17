"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../../../layout";

interface RoomsPageProps {
  params: Promise<{ roomTypeId: string }>;
}

export default function AdminRoomTypeRoomsPage({ params }: RoomsPageProps) {
  const { roomTypeId } = use(params);
  const id = Number(roomTypeId);
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: roomList,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.listRooms(id),
  });

  async function handleAddRoom() {
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createRoom({
        room_type_id: id,
        room_number: roomNumber.trim(),
        floor: floor ? Number(floor) : undefined,
      });
      toast.success("Tao phong thanh cong");
      setRoomNumber("");
      setFloor("");
      await queryClient.invalidateQueries({ queryKey: ["rooms", id] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tao phong that bai");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/room-types" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sach loai phong
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Them phong vat ly</CardTitle>
          <CardDescription>
            {approved
              ? roomList
                ? `Da tao ${roomList.current_rooms}/${roomList.max_rooms} phong (con lai ${roomList.remaining_rooms})`
                : ""
              : "Khach san can duoc duyet truoc khi them phong vat ly."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="room_number">So phong</Label>
                <Input id="room_number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Vi du: 101" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="floor">Tang (khong bat buoc)</Label>
                <Input id="floor" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleAddRoom} disabled={submitting || !roomNumber.trim()} className="self-start">
              {submitting ? "Dang them..." : "Them phong"}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sach phong vat ly</h2>
        {isLoading && <p className="text-muted-foreground">Dang tai...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Khong the tai danh sach phong"}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roomList?.items.map((room) => (
            <Card key={room.id}>
              <CardContent className="flex flex-col items-center gap-2 py-4">
                <span className="text-lg font-semibold">{room.room_number}</span>
                <span className="text-xs text-muted-foreground">{room.floor ? `Tang ${room.floor}` : "Chua ro tang"}</span>
                <Badge variant={room.status === "available" ? "secondary" : "outline"}>{room.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
        {roomList && roomList.items.length === 0 && (
          <p className="text-center text-muted-foreground">Chua co phong vat ly nao.</p>
        )}
      </div>

      <RoomTypeImagesSection roomTypeId={id} />
    </div>
  );
}

function RoomTypeImagesSection({ roomTypeId }: { roomTypeId: number }) {
  const queryClient = useQueryClient();
  const [newImageUrl, setNewImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ["room-type-images", roomTypeId],
    queryFn: () => roomsApi.listRoomTypeImages(roomTypeId),
  });

  async function handleAdd() {
    if (!newImageUrl.trim()) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await roomsApi.createRoomTypeImage(roomTypeId, {
        image_url: newImageUrl.trim(),
        is_primary: !images || images.length === 0,
      });
      setNewImageUrl("");
      toast.success("Them anh thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["room-type-images", roomTypeId] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Them anh that bai");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPrimary(imageId: number) {
    setActionError(null);
    try {
      await roomsApi.setPrimaryRoomTypeImage(roomTypeId, imageId);
      await queryClient.invalidateQueries({ queryKey: ["room-type-images", roomTypeId] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cap nhat that bai");
    }
  }

  async function handleDelete(imageId: number) {
    setActionError(null);
    try {
      await roomsApi.deleteRoomTypeImage(roomTypeId, imageId);
      toast.success("Xoa anh thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["room-type-images", roomTypeId] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Xoa anh that bai");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anh loai phong</CardTitle>
        <CardDescription>Dan URL anh (chua ho tro upload file truc tiep).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input placeholder="https://..." value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
          <Button onClick={handleAdd} disabled={submitting || !newImageUrl.trim()}>
            Them anh
          </Button>
        </div>
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">Dang tai...</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images?.map((image) => (
            <div key={image.id} className="flex flex-col gap-1.5 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.image_url} alt="" className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-1 px-2 pb-2">
                {image.is_primary ? (
                  <span className="text-xs font-medium text-muted-foreground">Anh dai dien</span>
                ) : (
                  <button type="button" onClick={() => handleSetPrimary(image.id)} className="text-xs text-primary hover:underline">
                    Dat dai dien
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(image.id)} className="text-xs text-destructive hover:underline">
                  Xoa
                </button>
              </div>
            </div>
          ))}
          {images && images.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Chua co anh nao.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
