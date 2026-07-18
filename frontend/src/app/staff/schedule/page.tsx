"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";
import type { ShiftType } from "@/types/enums";

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Đêm",
};

export default function StaffSchedulePage() {
  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ["my-schedules"],
    queryFn: () => staffApi.listMySchedules(),
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Lịch làm việc của tôi</h2>
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải lịch làm việc"}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {schedules?.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {formatDate(schedule.shift_date)} - Ca {SHIFT_TYPE_LABELS[schedule.shift_type]}
              </CardTitle>
              <CardDescription>
                {schedule.start_time} - {schedule.end_time}
                {schedule.notes ? ` - ${schedule.notes}` : ""}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
        {schedules && schedules.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có ca làm việc nào được xếp.</p>
        )}
      </div>
    </div>
  );
}
