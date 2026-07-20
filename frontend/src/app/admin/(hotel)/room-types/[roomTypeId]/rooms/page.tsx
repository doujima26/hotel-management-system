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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { RoomItem } from "@/types/models";
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
  const [editing, setEditing] = useState<RoomItem | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const {
    data: roomList,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.listRooms(id),
  });

  async function handleToggleActive(room: RoomItem) {
    setToggleError(null);
    setToggleBusyId(room.id);
    try {
      await roomsApi.updateRoom(room.id, { is_active: !room.is_active });
      await queryClient.invalidateQueries({ queryKey: ["rooms", id] });
    } catch (err) {
      setToggleError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setToggleBusyId(null);
    }
  }

  async function saveEdit(values: { room_number: string; floor: string }) {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await roomsApi.updateRoom(editing.id, {
        room_number: values.room_number.trim(),
        floor: values.floor ? Number(values.floor) : undefined,
      });
      toast.success("Cập nhật phòng thành công");
      await queryClient.invalidateQueries({ queryKey: ["rooms", id] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleAddRoom() {
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createRoom({
        room_type_id: id,
        room_number: roomNumber.trim(),
        floor: floor ? Number(floor) : undefined,
      });
      toast.success("Tạo phòng thành công");
      setRoomNumber("");
      setFloor("");
      await queryClient.invalidateQueries({ queryKey: ["rooms", id] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo phòng thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/room-types" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách loại phòng
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Thêm phòng vật lý</CardTitle>
          <CardDescription>
            {approved
              ? roomList
                ? `Đã tạo ${roomList.current_rooms}/${roomList.max_rooms} phòng (còn lại ${roomList.remaining_rooms})`
                : ""
              : "Khách sạn cần được duyệt trước khi thêm phòng vật lý."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="room_number">Số phòng</Label>
                <Input id="room_number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Ví dụ: 101" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="floor">Tầng (không bắt buộc)</Label>
                <Input id="floor" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleAddRoom} disabled={submitting || !roomNumber.trim()} className="self-start">
              {submitting ? "Đang thêm..." : "Thêm phòng"}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách phòng vật lý</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Không thể tải danh sách phòng"}
          </p>
        )}
        {toggleError && <p className="text-sm text-destructive">{toggleError}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roomList?.items.map((room) => (
            <Card key={room.id}>
              <CardContent className="flex flex-col items-center gap-2 py-4">
                <span className="text-lg font-semibold">{room.room_number}</span>
                <span className="text-xs text-muted-foreground">{room.floor ? `Tầng ${room.floor}` : "Chưa rõ tầng"}</span>
                <div className="flex gap-1.5">
                  <Badge variant={room.status === "available" ? "secondary" : "outline"}>{room.status}</Badge>
                  {!room.is_active && <Badge variant="destructive">Đã tắt</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(room)}>
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant={room.is_active ? "destructive" : "default"}
                    onClick={() => handleToggleActive(room)}
                    disabled={toggleBusyId === room.id}
                  >
                    {room.is_active ? "Tắt" : "Bật lại"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {roomList && roomList.items.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có phòng vật lý nào.</p>
        )}
      </div>

      <RoomTypeImagesSection roomTypeId={id} />

      {editing && (
        <EditRoomDialog
          room={editing}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditRoomDialog({
  room,
  error,
  submitting,
  onClose,
  onSave,
}: {
  room: RoomItem;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: { room_number: string; floor: string }) => void;
}) {
  const [roomNumber, setRoomNumber] = useState(room.room_number);
  const [floor, setFloor] = useState(room.floor ? String(room.floor) : "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa phòng</DialogTitle>
          <DialogDescription>Cập nhật số phòng/tầng.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_room_number">Số phòng</Label>
            <Input id="edit_room_number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_room_floor">Tầng (không bắt buộc)</Label>
            <Input id="edit_room_floor" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSave({ room_number: roomNumber, floor })} disabled={submitting}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      toast.success("Thêm ảnh thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-type-images", roomTypeId] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Thêm ảnh thất bại");
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
      setActionError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  async function handleDelete(imageId: number) {
    setActionError(null);
    try {
      await roomsApi.deleteRoomTypeImage(roomTypeId, imageId);
      toast.success("Xóa ảnh thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-type-images", roomTypeId] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Xóa ảnh thất bại");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ảnh loại phòng</CardTitle>
        <CardDescription>Dán URL ảnh (chưa hỗ trợ upload file trực tiếp).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input placeholder="https://..." value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
          <Button onClick={handleAdd} disabled={submitting || !newImageUrl.trim()}>
            Thêm ảnh
          </Button>
        </div>
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images?.map((image) => (
            <div key={image.id} className="flex flex-col gap-1.5 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.image_url} alt="" className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-1 px-2 pb-2">
                {image.is_primary ? (
                  <span className="text-xs font-medium text-muted-foreground">Ảnh đại diện</span>
                ) : (
                  <button type="button" onClick={() => handleSetPrimary(image.id)} className="text-xs text-primary hover:underline">
                    Đặt đại diện
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(image.id)} className="text-xs text-destructive hover:underline">
                  Xóa
                </button>
              </div>
            </div>
          ))}
          {images && images.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Chưa có ảnh nào.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
