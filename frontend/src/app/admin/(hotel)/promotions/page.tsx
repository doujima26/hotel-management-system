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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import type { DiscountType } from "@/types/enums";
import type { Promotion } from "@/types/models";
import { useAdminHotel } from "../layout";
import { EmptyState } from "@/components/shared/EmptyState";

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Phần trăm",
  fixed_amount: "Số tiền cố định",
};

export default function AdminPromotionsPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: promotions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => hotelsApi.listPromotions(),
    enabled: approved,
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await hotelsApi.createPromotion({
        name: name.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        start_date: startDate,
        end_date: endDate,
      });
      toast.success("Tạo khuyến mãi thành công");
      setName("");
      setDiscountValue("");
      setStartDate("");
      setEndDate("");
      await queryClient.invalidateQueries({ queryKey: ["promotions"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo khuyến mãi thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(promotion: Promotion) {
    try {
      await hotelsApi.updatePromotion(promotion.id, { is_active: !promotion.is_active });
      await queryClient.invalidateQueries({ queryKey: ["promotions"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  async function handleDelete(promotionId: number) {
    setDeleteError(null);
    setDeleteBusyId(promotionId);
    try {
      await hotelsApi.deletePromotion(promotionId);
      toast.success("Xóa khuyến mãi thành công");
      await queryClient.invalidateQueries({ queryKey: ["promotions"] });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Xóa thất bại");
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function saveEdit(values: { name: string; discount_value: string; start_date: string; end_date: string }) {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await hotelsApi.updatePromotion(editing.id, {
        name: values.name.trim(),
        discount_value: Number(values.discount_value),
        start_date: values.start_date,
        end_date: values.end_date,
      });
      toast.success("Cập nhật khuyến mãi thành công");
      await queryClient.invalidateQueries({ queryKey: ["promotions"] });
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
          <CardTitle>Tạo khuyến mãi</CardTitle>
          <CardDescription>
            {approved
              ? "Áp dụng trên tổng giá trị booking của khách sạn."
              : "Khách sạn cần được duyệt trước khi tạo khuyến mãi."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="promo_name">Tên khuyến mãi</Label>
                <Input id="promo_name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="promo_type">Loại giảm giá</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger id="promo_type" className="w-full">
                    {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                    <SelectValue>
                      {(current) => DISCOUNT_TYPE_LABELS[current as DiscountType] ?? ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                    <SelectItem value="fixed_amount">Số tiền cố định (VND)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="promo_value">Giá trị giảm</Label>
                <Input
                  id="promo_value"
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              <div />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="promo_start">Ngày bắt đầu</Label>
                <Input id="promo_start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="promo_end">Ngày kết thúc</Label>
                <Input id="promo_end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button
              onClick={handleCreate}
              disabled={submitting || !name.trim() || !discountValue || !startDate || !endDate}
              className="self-start"
            >
              {submitting ? "Đang tạo..." : "Tạo khuyến mãi"}
            </Button>
          </CardContent>
        )}
      </Card>

      {approved && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Danh sách khuyến mãi</h2>
          {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.message : "Không thể tải danh sách khuyến mãi"}
            </p>
          )}
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          {promotions?.map((promotion) => (
            <Card key={promotion.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{promotion.name}</CardTitle>
                  <Badge variant={promotion.is_active ? "secondary" : "destructive"}>
                    {promotion.is_active ? "Đang áp dụng" : "Đã tắt"}
                  </Badge>
                </div>
                <CardDescription>
                  {DISCOUNT_TYPE_LABELS[promotion.discount_type]}:{" "}
                  {promotion.discount_type === "percentage"
                    ? `${promotion.discount_value}%`
                    : formatMoney(promotion.discount_value)}{" "}
                  · {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)} · Đã dùng {promotion.used_count} lần
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(promotion)}>
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant={promotion.is_active ? "destructive" : "default"}
                  onClick={() => handleToggleActive(promotion)}
                >
                  {promotion.is_active ? "Tắt" : "Bật lại"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(promotion.id)}
                  disabled={deleteBusyId === promotion.id}
                >
                  Xóa
                </Button>
              </CardContent>
            </Card>
          ))}
          {promotions && promotions.length === 0 && (
            <EmptyState
              title="Chưa có khuyến mãi nào"
              hint="Tạo khuyến mãi để khách thấy giá giảm ngay ở trang tìm kiếm và trang chủ."
            />
          )}
        </div>
      )}

      {editing && (
        <EditPromotionDialog
          promotion={editing}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditPromotionDialog({
  promotion,
  error,
  submitting,
  onClose,
  onSave,
}: {
  promotion: Promotion;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: { name: string; discount_value: string; start_date: string; end_date: string }) => void;
}) {
  const [name, setName] = useState(promotion.name);
  const [discountValue, setDiscountValue] = useState(String(promotion.discount_value));
  const [startDate, setStartDate] = useState(promotion.start_date);
  const [endDate, setEndDate] = useState(promotion.end_date);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa khuyến mãi</DialogTitle>
          <DialogDescription>Cập nhật thông tin khuyến mãi.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_promo_name">Tên khuyến mãi</Label>
            <Input id="edit_promo_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_promo_value">Giá trị giảm</Label>
            <Input id="edit_promo_value" type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_promo_start">Ngày bắt đầu</Label>
              <Input id="edit_promo_start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_promo_end">Ngày kết thúc</Label>
              <Input id="edit_promo_end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSave({ name, discount_value: discountValue, start_date: startDate, end_date: endDate })} disabled={submitting}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
