"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { DiscountType } from "@/types/enums";
import { useAdminHotel } from "../../../layout";

const WINDOW_DAYS = 14;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const ADJUSTMENT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Phần trăm (%)",
  fixed_amount: "Số tiền cố định (VND)",
};

interface RatesPageProps {
  params: Promise<{ roomTypeId: string }>;
}

export default function AdminRoomTypeRatesPage({ params }: RatesPageProps) {
  const { roomTypeId } = use(params);
  const id = Number(roomTypeId);
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(todayDateString());
  const endDate = addDaysToDateString(startDate, WINDOW_DAYS - 1);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [seasonalFrom, setSeasonalFrom] = useState("");
  const [seasonalTo, setSeasonalTo] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<DiscountType>("percentage");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [seasonalSubmitting, setSeasonalSubmitting] = useState(false);
  const [seasonalError, setSeasonalError] = useState<string | null>(null);

  const queryKey = ["room-type-rates", id, startDate, endDate];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => roomsApi.getRateCalendar(id, { from_date: startDate, to_date: endDate }),
    enabled: approved,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["room-type-rates", id] });
  }

  function startEdit(date: string, currentPrice: number) {
    setEditingDate(date);
    setEditingPrice(String(currentPrice));
    setRowError(null);
  }

  async function saveEdit(date: string) {
    const price = Number(editingPrice);
    if (!price || price <= 0) {
      setRowError("Giá phải lớn hơn 0");
      return;
    }
    setEditBusy(true);
    setRowError(null);
    try {
      await roomsApi.setRate(id, date, price);
      toast.success("Cập nhật giá thành công");
      setEditingDate(null);
      await refresh();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Cập nhật giá thất bại");
    } finally {
      setEditBusy(false);
    }
  }

  async function clearOverride(date: string) {
    setRowError(null);
    try {
      await roomsApi.clearRate(id, date);
      toast.success("Đã xóa giá ghi đè, quay về giá mặc định");
      await refresh();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Xóa thất bại");
    }
  }

  async function applySeasonal() {
    setSeasonalError(null);
    setSeasonalSubmitting(true);
    try {
      await roomsApi.applySeasonalRate(id, {
        from_date: seasonalFrom,
        to_date: seasonalTo,
        adjustment_type: adjustmentType,
        adjustment_value: Number(adjustmentValue),
      });
      toast.success("Áp giá theo mùa thành công");
      setSeasonalFrom("");
      setSeasonalTo("");
      setAdjustmentValue("");
      await refresh();
    } catch (err) {
      setSeasonalError(err instanceof ApiError ? err.message : "Áp giá theo mùa thất bại");
    } finally {
      setSeasonalSubmitting(false);
    }
  }

  if (!approved) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi quản lý giá theo ngày.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/room-types" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách loại phòng
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Áp giá theo mùa</CardTitle>
          <CardDescription>
            Tính giá hàng loạt cho 1 khoảng ngày (mùa cao điểm, lễ hội...). Có thể sửa tay lại từng ngày cụ thể bên dưới sau khi áp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seasonal_from">Từ ngày</Label>
              <Input id="seasonal_from" type="date" value={seasonalFrom} onChange={(e) => setSeasonalFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seasonal_to">Đến ngày</Label>
              <Input id="seasonal_to" type="date" value={seasonalTo} onChange={(e) => setSeasonalTo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjustment_type">Loại điều chỉnh</Label>
              <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as DiscountType)}>
                <SelectTrigger id="adjustment_type" className="w-full">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                  <SelectValue>{(current) => ADJUSTMENT_TYPE_LABELS[current as DiscountType] ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                  <SelectItem value="fixed_amount">Số tiền cố định (VND)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjustment_value">
                Giá trị ({adjustmentType === "percentage" ? "âm = giảm giá, dương = phụ thu" : "VND, âm = giảm giá"})
              </Label>
              <Input
                id="adjustment_value"
                type="number"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                placeholder="Ví dụ: 20 hoặc -10"
              />
            </div>
          </div>
          {seasonalError && <p className="text-sm text-destructive">{seasonalError}</p>}
          <Button
            onClick={applySeasonal}
            disabled={seasonalSubmitting || !seasonalFrom || !seasonalTo || !adjustmentValue}
            className="self-start"
          >
            {seasonalSubmitting ? "Đang áp dụng..." : "Áp giá theo mùa"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Lịch giá theo ngày</h2>
            <p className="text-sm text-muted-foreground">Không có giá ghi đè thì dùng giá mặc định của loại phòng.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStartDate(addDaysToDateString(startDate, -WINDOW_DAYS))} aria-label="Kỳ trước">
              <ChevronLeft className="size-4" />
            </Button>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                if (event.target.value) setStartDate(event.target.value);
              }}
              aria-label="Ngày bắt đầu xem lịch giá"
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={() => setStartDate(addDaysToDateString(startDate, WINDOW_DAYS))} aria-label="Kỳ sau">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStartDate(todayDateString())} disabled={startDate === todayDateString()}>
              Hôm nay
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">{error instanceof ApiError ? error.message : "Không thể tải lịch giá"}</p>
        )}
        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        {data && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {data.days.map((day) => {
              const d = new Date(day.date);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isEditing = editingDate === day.date;
              return (
                <div key={day.date} className={cn("flex flex-col gap-1.5 rounded-lg border p-3", isWeekend && "bg-muted/30")}>
                  <span className="text-xs text-muted-foreground">
                    {WEEKDAYS[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                  </span>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        type="number"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => saveEdit(day.date)} disabled={editBusy}>
                          Lưu
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDate(null)}>
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(day.date, day.effective_price)}
                        className="text-left font-semibold hover:underline"
                      >
                        {formatMoney(day.effective_price)}
                      </button>
                      {day.override_price !== null ? (
                        <button
                          type="button"
                          onClick={() => clearOverride(day.date)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Xóa giá ghi đè
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Giá mặc định</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
