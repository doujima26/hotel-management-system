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
import { useAdminHotel } from "../layout";

export default function AdminServicesPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
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
      toast.success("Tao dich vu thanh cong");
      setName("");
      setPrice("");
      setUnit("");
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tao dich vu that bai");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(service: HotelServiceItem) {
    try {
      await hotelsApi.updateService(service.id, { is_active: !service.is_active });
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cap nhat that bai");
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
      toast.success("Cap nhat dich vu thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["hotel-services"] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cap nhat that bai");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tao dich vu khach san</CardTitle>
          <CardDescription>
            {approved ? "Vi du: dua don san bay, giat ui, an sang..." : "Khach san can duoc duyet truoc khi tao dich vu."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc_name">Ten dich vu</Label>
                <Input id="svc_name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc_price">Gia (VND)</Label>
                <Input id="svc_price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc_unit">Don vi (khong bat buoc)</Label>
                <Input id="svc_unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Vi du: luot" />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleCreate} disabled={submitting || !name.trim() || !price} className="self-start">
              {submitting ? "Dang tao..." : "Tao dich vu"}
            </Button>
          </CardContent>
        )}
      </Card>

      {approved && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Danh sach dich vu</h2>
          {isLoading && <p className="text-muted-foreground">Dang tai...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : "Khong the tai danh sach dich vu"}
            </p>
          )}
          {services?.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{service.name}</CardTitle>
                  <Badge variant={service.is_active ? "secondary" : "destructive"}>
                    {service.is_active ? "Dang hoat dong" : "Da tat"}
                  </Badge>
                </div>
                <CardDescription>
                  {formatMoney(service.price)}
                  {service.unit ? ` / ${service.unit}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                  Sua
                </Button>
                <Button size="sm" variant={service.is_active ? "destructive" : "default"} onClick={() => handleToggleActive(service)}>
                  {service.is_active ? "Tat" : "Bat lai"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {services && services.length === 0 && <p className="text-center text-muted-foreground">Chua co dich vu nao.</p>}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sua dich vu</DialogTitle>
            <DialogDescription>Cap nhat thong tin dich vu.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_svc_name">Ten dich vu</Label>
              <Input id="edit_svc_name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_svc_price">Gia (VND)</Label>
              <Input id="edit_svc_price" type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_svc_unit">Don vi</Label>
              <Input id="edit_svc_unit" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Huy
            </Button>
            <Button onClick={saveEdit} disabled={editSubmitting}>
              Luu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
