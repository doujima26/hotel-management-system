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
import { addMonthsToDateString, firstDayOfMonthString, lastDayOfMonthString, todayDateString } from "@/lib/utils/date";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { DiscountType } from "@/types/enums";
import type { RoomTypeRateDay } from "@/types/models";
import { useAdminHotel } from "../../../layout";

type GridCell =
  | { kind: "header"; label: string }
  | { kind: "blank"; key: string }
  | { kind: "day"; day: RoomTypeRateDay };

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

  const [monthAnchor, setMonthAnchor] = useState(firstDayOfMonthString(todayDateString()));
  const startDate = monthAnchor;
  const endDate = lastDayOfMonthString(monthAnchor);
  const currentMonthAnchor = firstDayOfMonthString(todayDateString());

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
            <Button variant="outline" size="sm" onClick={() => setMonthAnchor(addMonthsToDateString(monthAnchor, -1))} aria-label="Tháng trước">
              <ChevronLeft className="size-4" />
            </Button>
            <Input
              type="month"
              value={monthAnchor.slice(0, 7)}
              onChange={(event) => {
                if (event.target.value) setMonthAnchor(`${event.target.value}-01`);
              }}
              aria-label="Chọn tháng xem lịch giá"
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={() => setMonthAnchor(addMonthsToDateString(monthAnchor, 1))} aria-label="Tháng sau">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonthAnchor(currentMonthAnchor)} disabled={monthAnchor === currentMonthAnchor}>
              Tháng này
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">{error instanceof ApiError ? error.message : "Không thể tải lịch giá"}</p>
        )}
        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        {data &&
          (() => {
            // Dung 1 mang phang duy nhat (tieu de + o trong dau/cuoi thang +
            // tung ngay) de tinh dung hang/cot, ve khung luoi gon gang bao
            // quanh toan bo lich thay vi tung o roi rac co khoang cach.
            const leadingBlanks = new Date(startDate).getDay();
            const contentCells = leadingBlanks + data.days.length;
            const trailingBlanks = (7 - (contentCells % 7)) % 7;
            const cells: GridCell[] = [
              ...WEEKDAYS.map((label) => ({ kind: "header" as const, label })),
              ...Array.from({ length: leadingBlanks }, (_, index) => ({ kind: "blank" as const, key: `lead-${index}` })),
              ...data.days.map((day) => ({ kind: "day" as const, day })),
              ...Array.from({ length: trailingBlanks }, (_, index) => ({ kind: "blank" as const, key: `trail-${index}` })),
            ];
            const totalRows = cells.length / 7;

            return (
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-7">
                  {cells.map((cell, index) => {
                    const borderClass = cn(index % 7 !== 6 && "border-r", Math.floor(index / 7) !== totalRows - 1 && "border-b");

                    if (cell.kind === "header") {
                      return (
                        <div
                          key={`header-${cell.label}`}
                          className={cn("bg-primary py-1.5 text-center text-xs font-medium text-primary-foreground", borderClass)}
                        >
                          {cell.label}
                        </div>
                      );
                    }
                    if (cell.kind === "blank") {
                      return <div key={cell.key} className={cn("bg-muted/10", borderClass)} />;
                    }

                    const day = cell.day;
                    const d = new Date(day.date);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isEditing = editingDate === day.date;
                    return (
                      <div key={day.date} className={cn("flex flex-col gap-1 p-2 sm:p-3", isWeekend && "bg-muted/20", borderClass)}>
                        <span className="text-xs text-muted-foreground">{d.getDate()}</span>
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
                              className="truncate text-left text-sm font-semibold hover:underline sm:text-base"
                            >
                              {formatMoney(day.effective_price)}
                            </button>
                            {day.override_price !== null ? (
                              <button
                                type="button"
                                onClick={() => clearOverride(day.date)}
                                className="text-left text-xs text-destructive hover:underline"
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
              </div>
            );
          })()}
      </div>
    </div>
  );
}
