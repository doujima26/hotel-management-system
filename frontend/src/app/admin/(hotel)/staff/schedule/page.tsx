"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import type { ShiftType } from "@/types/enums";
import { useAdminHotel } from "../../layout";

// Xem theo tuan (backend gioi han toi da 31 ngay).
const WINDOW_DAYS = 7;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Đêm",
};

// Mau phan biet CA LAM VIEC - dung bang mau rieng, khong dung bang mau trang
// thai (xanh/cam/do) de tranh 1 mau mang 2 y nghia khac nhau.
const SHIFT_CLASSES: Record<ShiftType, string> = {
  morning: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  afternoon: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  night: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
};

export default function AdminStaffSchedulePage() {
  const hotel = useAdminHotel();
  const [startDate, setStartDate] = useState(todayDateString());
  const endDate = addDaysToDateString(startDate, WINDOW_DAYS - 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-schedule-calendar", startDate, endDate],
    queryFn: () => staffApi.scheduleCalendar({ from_date: startDate, to_date: endDate }),
    enabled: hotel.status === "approved",
  });

  if (hotel.status !== "approved") {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xếp lịch nhân viên.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lịch làm việc</h2>
          <p className="text-sm text-muted-foreground">Ca làm việc của toàn bộ nhân viên theo tuần.</p>
        </div>
        {/* Chon ngay bat dau tuan: mui ten lui/toi 1 tuan, o chon ngay de nhay
            thang toi ngay bat ky, nut "Tuan nay" de quay lai nhanh. */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 min-w-44 bg-muted/60 px-3 py-2 text-left font-semibold">
                  Nhân viên
                </th>
                {data.dates.map((day) => {
                  const d = new Date(day);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={day}
                      className={cn("min-w-24 px-1 py-2 text-center font-medium", isWeekend && "text-primary")}
                    >
                      <span className="block text-[11px] text-muted-foreground">{WEEKDAYS[d.getDay()]}</span>
                      {d.getDate()}/{d.getMonth() + 1}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.staff_id} className="border-t align-top">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2">
                    <Link
                      href={`/admin/staff/${row.staff_id}/schedules`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.full_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.position}
                      {!row.is_active && " · đã nghỉ"}
                    </p>
                  </td>
                  {data.dates.map((day) => {
                    const shifts = row.shifts.filter((shift) => shift.shift_date === day);
                    return (
                      <td key={day} className="px-1 py-1.5">
                        <div className="flex flex-col gap-1">
                          {shifts.map((shift) => (
                            <span
                              key={shift.schedule_id}
                              title={`${SHIFT_LABELS[shift.shift_type]}: ${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}${shift.notes ? ` · ${shift.notes}` : ""}`}
                              className={cn(
                                "rounded-md px-1.5 py-1 text-center text-xs font-medium",
                                SHIFT_CLASSES[shift.shift_type],
                              )}
                            >
                              <span className="block">{SHIFT_LABELS[shift.shift_type]}</span>
                              <span className="block text-[11px] opacity-80">
                                {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chu thich ca lam viec. */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.keys(SHIFT_LABELS) as ShiftType[]).map((shift) => (
          <span key={shift} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded", SHIFT_CLASSES[shift])} /> {SHIFT_LABELS[shift]}
          </span>
        ))}
        <span>Bấm tên nhân viên để thêm/sửa ca.</span>
      </div>
    </div>
  );
}
