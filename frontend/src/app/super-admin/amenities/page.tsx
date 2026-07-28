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
import { AMENITY_SCOPE_LABELS, type AmenityScope } from "@/types/enums";
import type { Amenity } from "@/types/models";

const SCOPE_OPTIONS: { value: AmenityScope; label: string }[] = [
  { value: "hotel", label: AMENITY_SCOPE_LABELS.hotel },
  { value: "room", label: AMENITY_SCOPE_LABELS.room },
];

export default function SuperAdminAmenitiesPage() {
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<AmenityScope>("hotel");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
    queryKey: ["super-admin-amenities", scope],
    queryFn: () => roomsApi.listAmenities(scope),
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createAmenity({ name: name.trim(), scope, category: category.trim() || undefined });
      toast.success("Tạo tiện nghi thành công");
      setName("");
      setCategory("");
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo tiện nghi thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(amenityId: number) {
    setDeleteError(null);
    setDeleteBusyId(amenityId);
    try {
      await roomsApi.deleteAmenity(amenityId);
      toast.success("Xóa tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
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
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Danh mục tiện nghi</CardTitle>
          <CardDescription>
            Danh mục tiện nghi dùng chung toàn hệ thống, tách theo 2 loại: "Tiện nghi" (chung khách sạn) và "Tiện nghi
            phòng" (riêng từng loại phòng). Admin từng khách sạn chỉ chọn từ danh mục này, không tự tạo mới.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amenity_scope">Loại tiện nghi</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as AmenityScope)}>
                <SelectTrigger id="amenity_scope">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
                  <SelectValue>{(current) => SCOPE_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amenity_name">Tên tiện nghi</Label>
              <Input id="amenity_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Hồ bơi" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amenity_category">Danh mục con (không bắt buộc)</Label>
              <Input
                id="amenity_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ví dụ: Giải trí"
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleCreate} disabled={submitting || !name.trim()} className="self-start">
            {submitting ? "Đang tạo..." : "Tạo tiện nghi"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách {AMENITY_SCOPE_LABELS[scope].toLowerCase()}</h2>
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
          <DialogDescription>Cập nhật tên/danh mục con của tiện nghi.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_amenity_name">Tên tiện nghi</Label>
            <Input id="edit_amenity_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_amenity_category">Danh mục con (không bắt buộc)</Label>
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
