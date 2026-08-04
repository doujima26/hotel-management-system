"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ShiftScheduleGrid,
  ShiftScheduleLegend,
  SHIFT_LABELS,
} from "@/components/shared/ShiftScheduleGrid";
import { formatDate } from "@/lib/utils/format";
import { addDaysToDateString, startOfWeekString, todayDateString } from "@/lib/utils/date";
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";

// Xem theo tuan, dung khung voi trang xep lich cua quan ly.
const WINDOW_DAYS = 7;

export default function StaffSchedulePage() {
  const today = todayDateString();
  const currentWeek = startOfWeekString(today);
  const [weekStart, setWeekStart] = useState(currentWeek);
  const weekEnd = addDaysToDateString(weekStart, WINDOW_DAYS - 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-schedule-calendar", weekStart, weekEnd],
    queryFn: () => staffApi.scheduleCalendar({ from_date: weekStart, to_date: weekEnd }),
    placeholderData: (previous) => previous,
  });

  const myShifts = useMemo(
    () => data?.items.find((row) => row.staff_id === data.viewer_staff_id)?.shifts ?? [],
    [data],
  );
  const todayShifts = myShifts.filter((shift) => shift.shift_date === today);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Lịch làm việc"
        description={`Tuần ${formatDate(weekStart)} - ${formatDate(weekEnd)} · bạn có ${myShifts.length} ca`}
        action={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDaysToDateString(weekStart, -WINDOW_DAYS))}
              aria-label="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDaysToDateString(weekStart, WINDOW_DAYS))}
              aria-label="Tuần sau"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(currentWeek)} disabled={weekStart === currentWeek}>
              Tuần này
            </Button>
          </>
        }
      />

      {/* Ca cua hom nay dua len dau vi do la thu can biet ngay khi mo trang. */}
      {todayShifts.length > 0 && (
        <p className="text-sm">
          Hôm nay bạn trực{" "}
          {todayShifts
            .map(
              (shift) =>
                `ca ${SHIFT_LABELS[shift.shift_type]} ${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`,
            )
            .join(", ")}
          .
        </p>
      )}

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải lịch làm việc"}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ShiftScheduleGrid data={data} highlightStaffId={data.viewer_staff_id} />
      )}

      {data && myShifts.length === 0 && (
        <EmptyState
          title="Tuần này bạn chưa được xếp ca nào"
          hint="Lịch do quản lý khách sạn xếp. Dùng mũi tên để xem tuần khác."
        />
      )}

      <ShiftScheduleLegend hint="Ca của bạn được viền đậm; ca mờ là của đồng nghiệp trực cùng." />
    </div>
  );
}
