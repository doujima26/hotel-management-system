"use client";

import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { Amenity } from "@/types/models";
import { useAdminHotel } from "../layout";

export default function AdminAmenitiesPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: amenities,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["amenities"],
    queryFn: () => roomsApi.listAmenities(),
    enabled: approved,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
    enabled: approved,
  });

  const roomTypeId = selectedRoomTypeId ? Number(selectedRoomTypeId) : null;

  const { data: assignedAmenities } = useQuery({
    queryKey: ["room-type-amenities", roomTypeId],
    queryFn: () => roomsApi.listRoomTypeAmenities(roomTypeId as number),
    enabled: approved && roomTypeId !== null,
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createAmenity({ name: name.trim(), category: category.trim() || undefined });
      toast.success("Tạo tiện nghi thành công");
      setName("");
      setCategory("");
      await queryClient.invalidateQueries({ queryKey: ["amenities"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo tiện nghi thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(amenityId: number) {
    if (roomTypeId === null) return;
    setAssignError(null);
    try {
      await roomsApi.assignAmenityToRoomType(roomTypeId, amenityId);
      toast.success("Gán tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Gán tiện nghi thất bại");
    }
  }

  async function handleUnassign(amenityId: number) {
    if (roomTypeId === null) return;
    setAssignError(null);
    try {
      await roomsApi.unassignAmenityFromRoomType(roomTypeId, amenityId);
      toast.success("Đã gỡ tiện nghi khỏi loại phòng");
      await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Gỡ tiện nghi thất bại");
    }
  }

  async function handleDelete(amenityId: number) {
    setDeleteError(null);
    setDeleteBusyId(amenityId);
    try {
      await roomsApi.deleteAmenity(amenityId);
      toast.success("Xóa tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["amenities"] });
      if (roomTypeId !== null) {
        await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
      }
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Xóa tiện nghi thất bại");
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function saveEdit(values: { name: string; category: string }) {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await roomsApi.updateAmenity(editing.id, {
        name: values.name.trim(),
        category: values.category.trim() || undefined,
      });
      toast.success("Cập nhật tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["amenities"] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  const assignedIds = new Set(assignedAmenities?.map((a) => a.id));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo tiện nghi khách sạn</CardTitle>
          <CardDescription>
            {approved
              ? "Tiện nghi dùng chung cho toàn khách sạn, sẽ gán vào từng loại phòng bên dưới."
              : "Khách sạn cần được duyệt trước khi tạo tiện nghi."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amenity_name">Tên tiện nghi</Label>
                <Input id="amenity_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Wifi miễn phí" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amenity_category">Danh mục (không bắt buộc)</Label>
                <Input id="amenity_category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ví dụ: Kết nối" />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleCreate} disabled={submitting || !name.trim()} className="self-start">
              {submitting ? "Đang tạo..." : "Tạo tiện nghi"}
            </Button>
          </CardContent>
        )}
      </Card>

      {approved && (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Danh sách tiện nghi</h2>
            {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
            {error && (
              <p className="text-sm text-destructive">
                {error instanceof ApiError ? error.message : "Không thể tải danh sách tiện nghi"}
              </p>
            )}
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <div className="flex flex-wrap gap-2">
              {amenities?.map((amenity) => (
                <div key={amenity.id} className="flex items-center gap-1 rounded-full border px-1 py-1 pl-3">
                  <Badge variant="outline" className="border-0 p-0">
                    {amenity.name}
                    {amenity.category ? ` · ${amenity.category}` : ""}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setEditing(amenity)}
                    className="px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(amenity.id)}
                    disabled={deleteBusyId === amenity.id}
                    className="px-1.5 text-xs text-destructive hover:underline"
                  >
                    Xóa
                  </button>
                </div>
              ))}
              {amenities && amenities.length === 0 && <p className="text-sm text-muted-foreground">Chưa có tiện nghi nào.</p>}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gán tiện nghi vào loại phòng</CardTitle>
              <CardDescription>Chọn 1 loại phòng, sau đó bấm gán cho từng tiện nghi.</CardDescription>
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
              {assignError && <p className="text-sm text-destructive">{assignError}</p>}
              {roomTypeId !== null && (
                <div className="flex flex-wrap gap-2">
                  {amenities?.map((amenity) => {
                    const assigned = assignedIds.has(amenity.id);
                    return (
                      <Button
                        key={amenity.id}
                        type="button"
                        size="sm"
                        variant={assigned ? "secondary" : "outline"}
                        onClick={() => (assigned ? handleUnassign(amenity.id) : handleAssign(amenity.id))}
                      >
                        {amenity.name} {assigned ? "✓ (bấm để gỡ)" : ""}
                      </Button>
                    );
                  })}
                  {amenities && amenities.length === 0 && (
                    <p className="text-sm text-muted-foreground">Chưa có tiện nghi nào để gán.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {editing && (
        <EditAmenityDialog
          amenity={editing}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditAmenityDialog({
  amenity,
  error,
  submitting,
  onClose,
  onSave,
}: {
  amenity: Amenity;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: { name: string; category: string }) => void;
}) {
  const [name, setName] = useState(amenity.name);
  const [category, setCategory] = useState(amenity.category ?? "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa tiện nghi</DialogTitle>
          <DialogDescription>Cập nhật tên/danh mục tiện nghi.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_amenity_name">Tên tiện nghi</Label>
            <Input id="edit_amenity_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_amenity_category">Danh mục (không bắt buộc)</Label>
            <Input id="edit_amenity_category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSave({ name, category })} disabled={submitting}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
