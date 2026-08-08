"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthField } from "@/components/shared/MonthField";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { addMonthsToDateString, firstDayOfMonthString, lastDayOfMonthString, todayDateString } from "@/lib/utils/date";
import { roomsApi } from "@/lib/api/rooms";
import { getErrorMessage } from "@/types/api";
import type { RoomType, RoomTypeRateDay } from "@/types/models";

type GridCell =
  | { kind: "header"; label: string }
  | { kind: "blank"; key: string }
  | { kind: "day"; day: RoomTypeRateDay };

const WEEKDAYS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

// Lich gia cua 1 loai phong theo tung thang: xem gia hieu luc, biet gia den tu
// dau, sua tay tung ngay va xoa gia sua tay hang loat.
export function RateCalendarSection({
  roomTypes,
  selectedRoomTypeId,
  onSelectRoomType,
  canEdit,
}: {
  roomTypes: RoomType[];
  selectedRoomTypeId: number | null;
  onSelectRoomType: (roomTypeId: number) => void;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();

  const [monthAnchor, setMonthAnchor] = useState(firstDayOfMonthString(todayDateString()));
  const startDate = monthAnchor;
  const endDate = lastDayOfMonthString(monthAnchor);
  const currentMonthAnchor = firstDayOfMonthString(todayDateString());

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [clearBusy, setClearBusy] = useState(false);

  const id = selectedRoomTypeId;
  const { data, isLoading, error } = useQuery({
    queryKey: ["room-type-rates", id, startDate, endDate],
    queryFn: () => roomsApi.getRateCalendar(id as number, { from_date: startDate, to_date: endDate }),
    enabled: id !== null,
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
      await roomsApi.setRate(id as number, date, price);
      toast.success("Cập nhật giá thành công");
      setEditingDate(null);
      await refresh();
    } catch (err) {
      setRowError(getErrorMessage(err, "Cập nhật giá thất bại"));
    } finally {
      setEditBusy(false);
    }
  }

  async function clearOverride(date: string) {
    setRowError(null);
    try {
      await roomsApi.clearRate(id as number, date);
      toast.success("Đã xóa giá sửa tay, ngày này quay về theo quy tắc");
      await refresh();
    } catch (err) {
      setRowError(getErrorMessage(err, "Xóa thất bại"));
    }
  }

  async function clearMonth() {
    setRowError(null);
    setClearBusy(true);
    try {
      const result = await roomsApi.clearRatesInRange(id as number, { from_date: startDate, to_date: endDate });
      toast.success(
        result.cleared > 0
          ? `Đã xóa ${result.cleared} ngày giá sửa tay trong tháng này`
          : "Tháng này không có ngày nào đang sửa tay",
      );
      await refresh();
    } catch (err) {
      setRowError(getErrorMessage(err, "Xóa hàng loạt thất bại"));
    } finally {
      setClearBusy(false);
    }
  }

  const manualDays = data?.days.filter((day) => day.source === "manual").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate_room_type">Loại phòng</Label>
          <Select
            value={id === null ? "" : String(id)}
            onValueChange={(v) => v && onSelectRoomType(Number(v))}
          >
            <SelectTrigger id="rate_room_type" className="w-64">
              <SelectValue>
                {(current) => roomTypes.find((item) => String(item.id) === current)?.name ?? "Chọn loại phòng"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roomTypes.map((roomType) => (
                <SelectItem key={roomType.id} value={String(roomType.id)}>
                  {roomType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthAnchor(addMonthsToDateString(monthAnchor, -1))}
            aria-label="Tháng trước"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <MonthField
            value={monthAnchor.slice(0, 7)}
            onChange={(value) => {
              if (value) setMonthAnchor(`${value}-01`);
            }}
            aria-label="Chọn tháng xem lịch giá"
            className="w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthAnchor(addMonthsToDateString(monthAnchor, 1))}
            aria-label="Tháng sau"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthAnchor(currentMonthAnchor)}
            disabled={monthAnchor === currentMonthAnchor}
          >
            Tháng này
          </Button>
        </div>
      </div>

      {canEdit && manualDays > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
          <p className="text-sm text-muted-foreground">
            Tháng này có <span className="font-medium text-foreground">{manualDays} ngày</span> đang dùng giá sửa tay
            nên không chịu tác động của quy tắc.
          </p>
          <Button variant="outline" size="sm" onClick={clearMonth} disabled={clearBusy}>
            {clearBusy ? "Đang xóa..." : "Trả cả tháng về theo quy tắc"}
          </Button>
        </div>
      )}

      {id === null && <p className="text-muted-foreground">Khách sạn chưa có loại phòng nào để xem lịch giá.</p>}
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">{getErrorMessage(error, "Không thể tải lịch giá")}</p>
      )}
      {rowError && <p className="text-sm text-destructive">{rowError}</p>}

      {data &&
        (() => {
          // Dung 1 mang phang duy nhat (tieu de + o trong dau/cuoi thang + tung
          // ngay) de tinh dung hang/cot, ve khung luoi gon gang bao quanh toan
          // bo lich thay vi tung o roi rac co khoang cach.
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
                  const borderClass = cn(
                    index % 7 !== 6 && "border-r",
                    Math.floor(index / 7) !== totalRows - 1 && "border-b",
                  );

                  if (cell.kind === "header") {
                    return (
                      <div
                        key={`header-${cell.label}`}
                        className={cn(
                          "bg-primary py-1.5 text-center text-xs font-medium text-primary-foreground",
                          borderClass,
                        )}
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
                    <div
                      key={day.date}
                      className={cn("flex flex-col gap-1 p-2 sm:p-3", isWeekend && "bg-muted/20", borderClass)}
                    >
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
                            disabled={!canEdit}
                            onClick={() => startEdit(day.date, day.effective_price)}
                            className="truncate text-left text-sm font-semibold hover:underline sm:text-base"
                          >
                            {formatMoney(day.effective_price)}
                          </button>
                          {day.source === "manual" ? (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => clearOverride(day.date)}
                              className="text-left text-xs text-destructive hover:underline"
                            >
                              Xóa giá sửa tay
                            </button>
                          ) : day.source === "rule" ? (
                            <span className="truncate text-xs text-primary" title={day.rule_name ?? undefined}>
                              {day.rule_name}
                            </span>
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
  );
}
