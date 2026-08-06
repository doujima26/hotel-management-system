"use client";

import { cn } from "@/lib/utils";
import type { ShiftType } from "@/types/enums";
import type { StaffScheduleCalendar, StaffScheduleCalendarShift } from "@/types/models";

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

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Đêm",
};

// Mau phan biet CA LAM VIEC - truc token rieng (--shift-*), khong dung bang mau
// trang thai de tranh 1 mau mang 2 y nghia khac nhau.
export const SHIFT_CLASSES: Record<ShiftType, string> = {
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
export const SHIFT_BANDS: { type: ShiftType; range: string }[] = [
  { type: "morning", range: "06:00–14:00" },
  { type: "afternoon", range: "14:00–22:00" },
  { type: "night", range: "22:00–06:00" },
];
const BAND_MIN = DAY_TOTAL_MIN / SHIFT_BANDS.length;

// "HH:MM:SS" -> so phut ke tu moc 06:00 (0..1439).
export function toOffsetMin(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour * 60 + minute - DAY_START_MIN + DAY_TOTAL_MIN) % DAY_TOTAL_MIN;
}

// Vi tri + do dai cua 1 ca tren truc doc. Ca qua nua dem (gio ket thuc <= gio bat
// dau) duoc cong them 1 ngay; neu van vuot khoi khung 24h thi cat va danh dau.
export function shiftGeometry(shift: StaffScheduleCalendarShift) {
  const top = toOffsetMin(shift.start_time);
  const end = toOffsetMin(shift.end_time);
  let length = end - top;
  if (length <= 0) length += DAY_TOTAL_MIN;
  const clipped = top + length > DAY_TOTAL_MIN;
  return { top, length: clipped ? DAY_TOTAL_MIN - top : length, clipped };
}

export interface PlacedShift {
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
export function assignLanes(items: PlacedShift[]): number {
  const laneEnds: number[] = [];
  for (const item of [...items].sort((a, b) => a.top - b.top || a.length - b.length)) {
    let lane = laneEnds.findIndex((end) => end <= item.top);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.top + item.length;
    item.lane = lane;
  }
  return Math.max(laneEnds.length, 1);
}

interface ShiftScheduleGridProps {
  data: StaffScheduleCalendar;
  // Co truyen thi the ca bam duoc de sua; khong truyen thi luoi chi de xem.
  onShiftClick?: (item: PlacedShift) => void;
  // Ca cua nhan vien nay duoc to dam, ca cua nguoi khac lam nhat di.
  highlightStaffId?: number | null;
}

// Luoi ca lam viec: truc doc la gio trong ngay nghiep vu, truc ngang la ngay.
// Dung chung cho trang xep lich cua Admin va trang lich ca nhan cua Staff.
export function ShiftScheduleGrid({ data, onShiftClick, highlightStaffId }: ShiftScheduleGridProps) {
  // Gom ca theo NGAY (thay vi theo nhan vien) va tinh san vi tri tren luoi.
  const byDate = new Map<string, PlacedShift[]>();
  for (const row of data.items) {
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
    <div className="overflow-x-auto rounded-xl border">
      <div className="min-w-max">
        {/* Hang tieu de: cot gio + cac cot ngay - nen cam dac (dung mau accent
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
              <div key={day} style={{ minWidth: lanes * LANE_MIN_PX }} className="relative flex-1 border-l">
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
                  <div key={i} style={{ top: i * HOUR_PX }} className="absolute inset-x-0 border-t border-border/35" />
                ))}

                {/* The ca - dat theo dung gio bat dau va do dai that. */}
                {placed.map((item) => {
                  const mine = highlightStaffId != null && item.staffId === highlightStaffId;
                  const dimmed = highlightStaffId != null && !mine;
                  const title = `${item.fullName} · ${SHIFT_LABELS[item.shift.shift_type]} ${item.shift.start_time.slice(0, 5)}–${item.shift.end_time.slice(0, 5)}${item.clipped ? " (kéo sang ngày hôm sau)" : ""}${item.shift.notes ? ` · ${item.shift.notes}` : ""}`;
                  const style = {
                    top: (item.top * HOUR_PX) / 60 + 1,
                    height: (item.length * HOUR_PX) / 60 - 2,
                    left: `${(item.lane * 100) / lanes}%`,
                    width: `${100 / lanes}%`,
                  };
                  const className = cn(
                    "absolute overflow-hidden rounded-md border px-1.5 py-1 text-left transition-colors duration-150 ease-out",
                    SHIFT_CLASSES[item.shift.shift_type],
                    !item.isActive && "opacity-60",
                    dimmed && "opacity-45",
                    mine && "ring-2 ring-primary",
                    onShiftClick && "cursor-pointer hover:brightness-95",
                  );
                  const content = (
                    <>
                      <span className="block truncate text-xs leading-tight font-medium">
                        {mine ? "Tôi" : item.fullName}
                      </span>
                      <span className="block truncate text-[11px] leading-tight tabular-nums opacity-80">
                        {item.shift.start_time.slice(0, 5)}–{item.shift.end_time.slice(0, 5)}
                      </span>
                      {item.clipped && <span className="block text-[10px] leading-tight opacity-70">→ hôm sau</span>}
                    </>
                  );

                  // Chi dung the bam duoc khi that su co hanh dong, tranh tao nut
                  // rong khong lam gi o man hinh chi de xem.
                  return onShiftClick ? (
                    <button
                      key={item.shift.schedule_id}
                      type="button"
                      onClick={() => onShiftClick(item)}
                      title={title}
                      style={style}
                      className={className}
                    >
                      {content}
                    </button>
                  ) : (
                    <div key={item.shift.schedule_id} title={title} style={style} className={className}>
                      {content}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Chu thich mau 3 ca, dung kem luoi o ca hai trang.
export function ShiftScheduleLegend({ hint }: { hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {SHIFT_BANDS.map((band) => (
        <span key={band.type} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded border", SHIFT_CLASSES[band.type])} />
          Ca {SHIFT_LABELS[band.type]} <span className="tabular-nums">{band.range}</span>
        </span>
      ))}
      {hint && <span>{hint}</span>}
    </div>
  );
}
