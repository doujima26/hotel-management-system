"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import type { ShiftType } from "@/types/enums";
import type { StaffScheduleCalendarShift } from "@/types/models";
import { canOperate, useAdminHotel } from "../../layout";

// Xem theo tuan (backend gioi han toi da 31 ngay).
const WINDOW_DAYS = 7;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Ngay lam viec cua khach san chay 06:00 -> 06:00 hom sau, chia dung 3 ca 8 tieng:
// Sang 06-14, Chieu 14-22, Dem 22-06. Lay 06:00 lam moc 0 cua truc doc.
const DAY_START_MIN = 6 * 60;
const DAY_TOTAL_MIN = 24 * 60;
const HOUR_PX = 32;
const GRID_HEIGHT_PX = (DAY_TOTAL_MIN / 60) * HOUR_PX;
// Be ngang toi thieu cua 1 lan the trong cot ngay - nhieu nguoi cung khung gio
// thi cot tu gian ra thay vi bop the lai den muc khong doc duoc.
const LANE_MIN_PX = 76;

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Đêm",
};

// Mau phan biet CA LAM VIEC - truc token rieng (--shift-*), khong dung bang mau
// trang thai de tranh 1 mau mang 2 y nghia khac nhau.
const SHIFT_CLASSES: Record<ShiftType, string> = {
  morning: "bg-shift-am-subtle text-shift-am-strong border-shift-am-strong/25",
  afternoon: "bg-shift-pm-subtle text-shift-pm-strong border-shift-pm-strong/25",
  night: "bg-shift-night-subtle text-shift-night-strong border-shift-night-strong/25",
};

// Dai nen danh dau vung 3 ca - nhat hon han the de the noi len tren.
const BAND_CLASSES: Record<ShiftType, string> = {
  morning: "bg-shift-am-subtle/30",
  afternoon: "bg-shift-pm-subtle/30",
  night: "bg-shift-night-subtle/30",
};

// 3 dai ca theo dung moc gio nghiep vu, moi dai 8 tieng lien tiep nhau.
const SHIFT_BANDS: { type: ShiftType; range: string }[] = [
  { type: "morning", range: "06:00–14:00" },
  { type: "afternoon", range: "14:00–22:00" },
  { type: "night", range: "22:00–06:00" },
];
const BAND_MIN = DAY_TOTAL_MIN / SHIFT_BANDS.length;

// Khung gio co dinh theo tung ca - nhan vien chi chon CA, khong tu nhap gio
// (dung khi xep ca moi/sua ca ngay tren luoi nay).
const SHIFT_HOURS: Record<ShiftType, { start: string; end: string; range: string }> = {
  morning: { start: "06:00", end: "14:00", range: "06:00–14:00" },
  afternoon: { start: "14:00", end: "22:00", range: "14:00–22:00" },
  night: { start: "22:00", end: "06:00", range: "22:00–06:00" },
};

// "HH:MM:SS" -> so phut ke tu moc 06:00 (0..1439).
function toOffsetMin(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour * 60 + minute - DAY_START_MIN + DAY_TOTAL_MIN) % DAY_TOTAL_MIN;
}

// Vi tri + do dai cua 1 ca tren truc doc. Ca qua nua dem (gio ket thuc <= gio bat
// dau) duoc cong them 1 ngay; neu van vuot khoi khung 24h thi cat va danh dau.
function shiftGeometry(shift: StaffScheduleCalendarShift) {
  const top = toOffsetMin(shift.start_time);
  const end = toOffsetMin(shift.end_time);
  let length = end - top;
  if (length <= 0) length += DAY_TOTAL_MIN;
  const clipped = top + length > DAY_TOTAL_MIN;
  return { top, length: clipped ? DAY_TOTAL_MIN - top : length, clipped };
}

interface PlacedShift {
  shift: StaffScheduleCalendarShift;
  staffId: number;
  fullName: string;
  isActive: boolean;
  top: number;
  length: number;
  clipped: boolean;
  lane: number;
}

// Xep the vao cac "lan" doc trong 1 cot ngay: the nao trung khung gio voi the
// dang chiem lan thi day sang lan ke tiep, de khong the nao de len the nao.
function assignLanes(items: PlacedShift[]): number {
  const laneEnds: number[] = [];
  for (const item of [...items].sort((a, b) => a.top - b.top || a.length - b.length)) {
    let lane = laneEnds.findIndex((end) => end <= item.top);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.top + item.length;
    item.lane = lane;
  }
  return Math.max(laneEnds.length, 1);
}

export default function AdminStaffSchedulePage() {
  const hotel = useAdminHotel();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(todayDateString());
  const endDate = addDaysToDateString(startDate, WINDOW_DAYS - 1);

  // Dialog xep ca moi.
  const [createOpen, setCreateOpen] = useState(false);
  const [createStaffId, setCreateStaffId] = useState("");
  const [createDate, setCreateDate] = useState(startDate);
  const [createShiftType, setCreateShiftType] = useState<ShiftType>("morning");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Dialog sua/xoa 1 ca da xep - mo tu the ca duoc bam tren luoi.
  const [editing, setEditing] = useState<PlacedShift | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editShiftType, setEditShiftType] = useState<ShiftType>("morning");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-schedule-calendar", startDate, endDate],
    queryFn: () => staffApi.scheduleCalendar({ from_date: startDate, to_date: endDate }),
    enabled: canOperate(hotel.status),
  });

  if (!canOperate(hotel.status)) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xếp lịch nhân viên.</p>;
  }

  // Chi nhan vien dang lam moi duoc xep ca moi.
  const activeStaff = (data?.items ?? []).filter((row) => row.is_active);

  function openCreate() {
    setCreateError(null);
    setCreateStaffId(activeStaff[0] ? String(activeStaff[0].staff_id) : "");
    setCreateDate(startDate);
    setCreateShiftType("morning");
    setCreateOpen(true);
  }

  async function handleCreateSubmit() {
    if (!createStaffId || !createDate) return;
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      const { start, end } = SHIFT_HOURS[createShiftType];
      await staffApi.createSchedule(Number(createStaffId), {
        shift_date: createDate,
        shift_type: createShiftType,
        start_time: start,
        end_time: end,
      });
      toast.success("Xếp ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedule-calendar", startDate, endDate] });
      setCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Xếp ca thất bại");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openEdit(item: PlacedShift) {
    setEditError(null);
    setEditDate(item.shift.shift_date);
    setEditShiftType(item.shift.shift_type);
    setEditing(item);
  }

  async function handleEditSave() {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      const { start, end } = SHIFT_HOURS[editShiftType];
      await staffApi.updateSchedule(editing.shift.schedule_id, {
        shift_date: editDate,
        shift_type: editShiftType,
        start_time: start,
        end_time: end,
      });
      toast.success("Cập nhật ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedule-calendar", startDate, endDate] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleEditDelete() {
    if (!editing) return;
    setEditSubmitting(true);
    try {
      await staffApi.deleteSchedule(editing.shift.schedule_id);
      toast.success("Xóa ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedule-calendar", startDate, endDate] });
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa ca thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Gom ca theo NGAY (thay vi theo nhan vien) va tinh san vi tri tren luoi.
  const byDate = new Map<string, PlacedShift[]>();
  for (const row of data?.items ?? []) {
    for (const shift of row.shifts) {
      const placed: PlacedShift = {
        shift,
        staffId: row.staff_id,
        fullName: row.full_name,
        isActive: row.is_active,
        lane: 0,
        ...shiftGeometry(shift),
      };
      const list = byDate.get(shift.shift_date);
      if (list) list.push(placed);
      else byDate.set(shift.shift_date, [placed]);
    }
  }
  const laneCountByDate = new Map<string, number>();
  for (const [day, list] of byDate) laneCountByDate.set(day, assignLanes(list));

  return (
    <div className="flex flex-col gap-4">
      {/* Chon ngay bat dau tuan: mui ten lui/toi 1 tuan, o chon ngay de nhay
          thang toi ngay bat ky, nut "Tuan nay" de quay lai nhanh. */}
      <PageHeader
        title="Lịch làm việc"
        description="Ca làm việc của toàn bộ nhân viên theo tuần. Ngày làm việc tính từ 06:00 hôm nay tới 06:00 hôm sau."
        action={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(addDaysToDateString(startDate, -WINDOW_DAYS))}
              aria-label="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                if (event.target.value) setStartDate(event.target.value);
              }}
              aria-label="Ngày bắt đầu xem lịch làm việc"
              className="w-40"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(addDaysToDateString(startDate, WINDOW_DAYS))}
              aria-label="Tuần sau"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(todayDateString())}
              disabled={startDate === todayDateString()}
            >
              Tuần này
            </Button>
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <Button size="sm" onClick={openCreate} disabled={activeStaff.length === 0}>
              <Plus className="size-4" />
              Thêm ca
            </Button>
          </>
        }
      />

      {isLoading && <p className="text-muted-foreground">Đang tải…</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải lịch làm việc"}
        </p>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={Users}
          title="Chưa có nhân viên nào"
          hint="Thêm nhân viên trước, sau đó xếp ca làm việc cho từng người."
          action={
            <Link href="/admin/staff" className={cn(buttonVariants({ size: "sm" }), "mt-2")}>
              Thêm nhân viên
            </Link>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <div className="min-w-max">
            {/* Hang tieu de: cot gio + 7 cot ngay - nen cam dac (dung mau accent
                chinh cua web), chu doi sang primary-foreground de du tuong phan. */}
            <div className="flex border-b bg-primary">
              <div className="flex w-24 shrink-0 items-center px-2 py-2 text-xs font-semibold text-primary-foreground">
                Ca / Giờ
              </div>
              {data.dates.map((day) => {
                const d = new Date(day);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const lanes = laneCountByDate.get(day) ?? 1;
                return (
                  <div
                    key={day}
                    style={{ minWidth: lanes * LANE_MIN_PX }}
                    className="flex-1 border-l border-primary-foreground/20 px-1 py-2 text-center text-sm font-medium text-primary-foreground"
                  >
                    <span className="block text-[11px] text-primary-foreground/70">{WEEKDAYS[d.getDay()]}</span>
                    {/* Cuoi tuan: dam chu thay vi doi mau (nen da la mau accent, doi mau se bien mat). */}
                    <span className={cn("tabular-nums", isWeekend && "font-bold")}>
                      {d.getDate()}/{d.getMonth() + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Than luoi */}
            <div className="flex" style={{ height: GRID_HEIGHT_PX }}>
              {/* Cot trai: ten 3 ca + nhan gio moi 2 tieng */}
              <div className="relative w-24 shrink-0">
                {SHIFT_BANDS.map((band, index) => (
                  <div
                    key={band.type}
                    style={{ top: (index * BAND_MIN * HOUR_PX) / 60, height: (BAND_MIN * HOUR_PX) / 60 }}
                    className={cn("absolute inset-x-0 flex flex-col justify-center border-t px-2", BAND_CLASSES[band.type])}
                  >
                    <p className="text-xs font-semibold">Ca {SHIFT_LABELS[band.type]}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{band.range}</p>
                  </div>
                ))}
                {/* Bo tick trung moc bat dau dai ca (0/8/16h) - da co ten ca the hien roi. */}
                {Array.from({ length: DAY_TOTAL_MIN / 60 }, (_, i) => i)
                  .filter((i) => i % 2 === 0 && i % 8 !== 0)
                  .map((i) => (
                    <span
                      key={i}
                      style={{ top: i * HOUR_PX }}
                      className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
                    >
                      {String((6 + i) % 24).padStart(2, "0")}:00
                    </span>
                  ))}
              </div>

              {/* Cac cot ngay */}
              {data.dates.map((day) => {
                const placed = byDate.get(day) ?? [];
                const lanes = laneCountByDate.get(day) ?? 1;
                return (
                  <div
                    key={day}
                    style={{ minWidth: lanes * LANE_MIN_PX }}
                    className="relative flex-1 border-l"
                  >
                    {/* Dai nen 3 ca */}
                    {SHIFT_BANDS.map((band, index) => (
                      <div
                        key={band.type}
                        style={{ top: (index * BAND_MIN * HOUR_PX) / 60, height: (BAND_MIN * HOUR_PX) / 60 }}
                        className={cn("absolute inset-x-0 border-t", BAND_CLASSES[band.type])}
                      />
                    ))}
                    {/* Vach gio */}
                    {Array.from({ length: DAY_TOTAL_MIN / 60 }, (_, i) => i).map((i) => (
                      <div
                        key={i}
                        style={{ top: i * HOUR_PX }}
                        className="absolute inset-x-0 border-t border-border/35"
                      />
                    ))}

                    {/* The ca - dat theo dung gio bat dau va do dai that. Bam vao
                        de mo dialog sua/xoa ngay tren luoi, khong dieu huong trang. */}
                    {placed.map((item) => (
                      <button
                        key={item.shift.schedule_id}
                        type="button"
                        onClick={() => openEdit(item)}
                        title={`${item.fullName} · ${SHIFT_LABELS[item.shift.shift_type]} ${item.shift.start_time.slice(0, 5)}–${item.shift.end_time.slice(0, 5)}${item.clipped ? " (kéo sang ngày hôm sau)" : ""}${item.shift.notes ? ` · ${item.shift.notes}` : ""}`}
                        style={{
                          top: (item.top * HOUR_PX) / 60 + 1,
                          height: (item.length * HOUR_PX) / 60 - 2,
                          left: `${(item.lane * 100) / lanes}%`,
                          width: `${100 / lanes}%`,
                        }}
                        className={cn(
                          "absolute cursor-pointer overflow-hidden rounded-md border px-1.5 py-1 text-left transition-colors duration-150 ease-out hover:brightness-95",
                          SHIFT_CLASSES[item.shift.shift_type],
                          !item.isActive && "opacity-60",
                        )}
                      >
                        <span className="block truncate text-xs leading-tight font-medium">{item.fullName}</span>
                        <span className="block truncate text-[11px] leading-tight tabular-nums opacity-80">
                          {item.shift.start_time.slice(0, 5)}–{item.shift.end_time.slice(0, 5)}
                        </span>
                        {item.clipped && <span className="block text-[10px] leading-tight opacity-70">→ hôm sau</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chu thich ca lam viec. */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {SHIFT_BANDS.map((band) => (
          <span key={band.type} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded border", SHIFT_CLASSES[band.type])} />
            Ca {SHIFT_LABELS[band.type]} <span className="tabular-nums">{band.range}</span>
          </span>
        ))}
        <span>Bấm vào thẻ ca để sửa lịch của nhân viên đó.</span>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xếp ca làm việc mới</DialogTitle>
            <DialogDescription>
              Khung giờ được tính tự động theo ca (Sáng 06:00–14:00, Chiều 14:00–22:00, Đêm 22:00–06:00 sáng hôm
              sau).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create_staff">Nhân viên</Label>
              <Select value={createStaffId} onValueChange={(v) => v && setCreateStaffId(v)}>
                <SelectTrigger id="create_staff" className="w-full">
                  <SelectValue>
                    {(current) =>
                      activeStaff.find((s) => String(s.staff_id) === current)?.full_name ?? "Chọn nhân viên"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map((s) => (
                    <SelectItem key={s.staff_id} value={String(s.staff_id)}>
                      {s.full_name} · {s.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create_date">Ngày</Label>
              <Input id="create_date" type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create_shift_type">Ca</Label>
              <Select value={createShiftType} onValueChange={(v) => v && setCreateShiftType(v as ShiftType)}>
                <SelectTrigger id="create_shift_type" className="w-full">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                  <SelectValue>{(current) => SHIFT_LABELS[current as ShiftType] ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Sáng</SelectItem>
                  <SelectItem value="afternoon">Chiều</SelectItem>
                  <SelectItem value="night">Đêm</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground tabular-nums">{SHIFT_HOURS[createShiftType].range}</p>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createSubmitting || !createStaffId || !createDate}>
              {createSubmitting ? "Đang xếp ca…" : "Xếp ca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sửa ca làm việc</DialogTitle>
              <DialogDescription>{editing.fullName}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_date">Ngày</Label>
                <Input id="edit_date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_shift_type">Ca</Label>
                <Select value={editShiftType} onValueChange={(v) => v && setEditShiftType(v as ShiftType)}>
                  <SelectTrigger id="edit_shift_type" className="w-full">
                    {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                    <SelectValue>{(current) => SHIFT_LABELS[current as ShiftType] ?? ""}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Sáng</SelectItem>
                    <SelectItem value="afternoon">Chiều</SelectItem>
                    <SelectItem value="night">Đêm</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground tabular-nums">{SHIFT_HOURS[editShiftType].range}</p>
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="destructive" onClick={handleEditDelete} disabled={editSubmitting}>
                Xóa ca
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Hủy
                </Button>
                <Button onClick={handleEditSave} disabled={editSubmitting}>
                  {editSubmitting ? "Đang lưu…" : "Lưu"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
