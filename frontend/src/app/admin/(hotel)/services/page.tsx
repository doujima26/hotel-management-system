"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import type { HotelServiceItem } from "@/types/models";
import { canEditListing, listingLockMessage, useAdminHotel } from "../layout";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AdminServicesPage() {
  const hotel = useAdminHotel();
  const approved = canEditListing(hotel.status);
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HotelServiceItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: services,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["hotel-services"],
    queryFn: () => hotelsApi.listServices(),
    enabled: approved,
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await hotelsApi.createService({ name: name.trim(), price: Number(price), unit: unit.trim() || undefined });
      toast.success("Tạo dịch vụ thành công");
      setName("");
      setPrice("");
      setUnit("");
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo dịch vụ thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(service: HotelServiceItem) {
    try {
      await hotelsApi.updateService(service.id, { is_active: !service.is_active });
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  async function handleDelete(serviceId: number) {
    setDeleteError(null);
    setDeleteBusyId(serviceId);
    try {
      await hotelsApi.deleteService(serviceId);
      toast.success("Xóa dịch vụ thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Xóa thất bại");
    } finally {
      setDeleteBusyId(null);
    }
  }

  function openEdit(service: HotelServiceItem) {
    setEditing(service);
    setEditName(service.name);
    setEditPrice(String(service.price));
    setEditUnit(service.unit ?? "");
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await hotelsApi.updateService(editing.id, {
        name: editName.trim(),
        price: Number(editPrice),
        unit: editUnit.trim() || undefined,
      });
      toast.success("Cập nhật dịch vụ thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
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
          <CardTitle>Tạo dịch vụ khách sạn</CardTitle>
          <CardDescription>
            {approved
              ? "Ví dụ: đưa đón sân bay, giặt ủi, ăn sáng..."
              : listingLockMessage(hotel.status, "tạo dịch vụ")}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc_name">Tên dịch vụ</Label>
                <Input id="svc_name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc_price">Giá (VND)</Label>
                <Input id="svc_price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc_unit">Đơn vị (không bắt buộc)</Label>
                <Input id="svc_unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ví dụ: lượt" />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleCreate} disabled={submitting || !name.trim() || !price} className="self-start">
              {submitting ? "Đang tạo..." : "Tạo dịch vụ"}
            </Button>
          </CardContent>
        )}
      </Card>

      {approved && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Danh sách dịch vụ</h2>
          {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : "Không thể tải danh sách dịch vụ"}
            </p>
          )}
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          {services?.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{service.name}</CardTitle>
                  <Badge variant={service.is_active ? "secondary" : "destructive"}>
                    {service.is_active ? "Đang hoạt động" : "Đã tắt"}
                  </Badge>
                </div>
                <CardDescription>
                  {formatMoney(service.price)}
                  {service.unit ? ` / ${service.unit}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                  Sửa
                </Button>
                <Button size="sm" variant={service.is_active ? "destructive" : "default"} onClick={() => handleToggleActive(service)}>
                  {service.is_active ? "Tắt" : "Bật lại"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(service.id)}
                  disabled={deleteBusyId === service.id}
                >
                  Xóa
                </Button>
              </CardContent>
            </Card>
          ))}
          {services && services.length === 0 && <EmptyState
              title="Chưa có dịch vụ nào"
              hint="Thêm dịch vụ (đưa đón sân bay, giặt là, spa...) để khách chọn kèm khi đặt phòng."
            />}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa dịch vụ</DialogTitle>
            <DialogDescription>Cập nhật thông tin dịch vụ.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_svc_name">Tên dịch vụ</Label>
              <Input id="edit_svc_name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_svc_price">Giá (VND)</Label>
              <Input id="edit_svc_price" type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_svc_unit">Đơn vị</Label>
              <Input id="edit_svc_unit" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={saveEdit} disabled={editSubmitting}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
