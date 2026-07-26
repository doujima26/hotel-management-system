"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/format";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { RoomType } from "@/types/models";
import { useAdminHotel } from "../layout";
import { EmptyState } from "@/components/shared/EmptyState";

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
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: roomTypes, isLoading, error } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
  });

  async function handleToggleActive(roomType: RoomType) {
    setToggleBusyId(roomType.id);
    try {
      await roomsApi.updateRoomType(roomType.id, { is_active: !roomType.is_active });
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setToggleBusyId(null);
    }
  }

  async function handleDelete(roomTypeId: number) {
    setDeleteError(null);
    setDeleteBusyId(roomTypeId);
    try {
      await roomsApi.deleteRoomType(roomTypeId);
      toast.success("Xóa loại phòng thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Xóa thất bại");
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function saveEdit(values: { name: string; base_price: string; max_guests: string; total_rooms: string }) {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await roomsApi.updateRoomType(editing.id, {
        name: values.name.trim(),
        base_price: Number(values.base_price),
        max_guests: Number(values.max_guests),
        total_rooms: Number(values.total_rooms),
      });
      toast.success("Cập nhật loại phòng thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-types", hotel.id] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

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
              ? "Có thể sửa, tắt hoặc xóa loại phòng sau khi tạo (chỉ xóa được khi chưa có phòng vật lý/booking nào)."
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
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        {roomTypes?.map((roomType) => (
          <Card key={roomType.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{roomType.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatMoney(roomType.base_price)}/đêm</span>
                  <Badge variant={roomType.is_active ? "secondary" : "destructive"}>
                    {roomType.is_active ? "Đang mở" : "Đã tắt"}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Tối đa {roomType.max_guests} khách/phòng - {roomType.total_rooms} phòng
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Link href={`/admin/room-types/${roomType.id}/rooms`} className="text-sm text-primary hover:underline">
                Quản lý phòng vật lý &amp; ảnh &rarr;
              </Link>
              <Button size="sm" variant="outline" onClick={() => setEditing(roomType)}>
                Sửa
              </Button>
              <Button
                size="sm"
                variant={roomType.is_active ? "destructive" : "default"}
                onClick={() => handleToggleActive(roomType)}
                disabled={toggleBusyId === roomType.id}
              >
                {roomType.is_active ? "Tắt" : "Bật lại"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(roomType.id)}
                disabled={deleteBusyId === roomType.id}
              >
                Xóa
              </Button>
            </CardContent>
          </Card>
        ))}
        {roomTypes && roomTypes.length === 0 && (
          <EmptyState
            title="Chưa có loại phòng nào"
            hint="Dùng biểu mẫu phía trên để tạo loại phòng đầu tiên, sau đó thêm phòng vật lý để bắt đầu bán."
          />
        )}
      </div>

      {editing && (
        <EditRoomTypeDialog
          roomType={editing}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditRoomTypeDialog({
  roomType,
  error,
  submitting,
  onClose,
  onSave,
}: {
  roomType: RoomType;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: { name: string; base_price: string; max_guests: string; total_rooms: string }) => void;
}) {
  const [name, setName] = useState(roomType.name);
  const [basePrice, setBasePrice] = useState(String(roomType.base_price));
  const [maxGuests, setMaxGuests] = useState(String(roomType.max_guests));
  const [totalRooms, setTotalRooms] = useState(String(roomType.total_rooms));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa loại phòng</DialogTitle>
          <DialogDescription>Cập nhật thông tin loại phòng.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_rt_name">Tên loại phòng</Label>
            <Input id="edit_rt_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_rt_price">Giá mỗi đêm (VND)</Label>
            <Input id="edit_rt_price" type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_rt_guests">Số khách tối đa/phòng</Label>
              <Input id="edit_rt_guests" type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_rt_total">Tổng số phòng</Label>
              <Input id="edit_rt_total" type="number" min={1} value={totalRooms} onChange={(e) => setTotalRooms(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => onSave({ name, base_price: basePrice, max_guests: maxGuests, total_rooms: totalRooms })}
            disabled={submitting}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
