"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import { useAdminHotel } from "../layout";

// So ngay hien thi 1 lan tren lich (backend gioi han toi da 62 ngay).
const WINDOW_DAYS = 14;

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function AdminCalendarPage() {
  const hotel = useAdminHotel();
  const [startDate, setStartDate] = useState(todayDateString());
  const endDate = addDaysToDateString(startDate, WINDOW_DAYS - 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["room-calendar", startDate, endDate],
    queryFn: () => roomsApi.calendar({ from_date: startDate, to_date: endDate }),
    enabled: hotel.status === "approved",
  });

  if (hotel.status !== "approved") {
    return (
      <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xem lịch phòng.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lịch phòng</h2>
          <p className="text-sm text-muted-foreground">
            Số phòng còn trống theo từng ngày. Ô đỏ là đã kín phòng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(addDaysToDateString(startDate, -WINDOW_DAYS))}
            aria-label="Kỳ trước"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(todayDateString())}>
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(addDaysToDateString(startDate, WINDOW_DAYS))}
            aria-label="Kỳ sau"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải lịch phòng"}
        </p>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Chưa có loại phòng nào</p>
          <p className="text-sm text-muted-foreground">Tạo loại phòng và phòng vật lý để bắt đầu bán phòng.</p>
          <Link href="/admin/room-types" className={cn(buttonVariants({ size: "sm" }))}>
            Thêm loại phòng
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 min-w-40 bg-muted/60 px-3 py-2 text-left font-semibold">
                  Loại phòng
                </th>
                {data.dates.map((day) => {
                  const d = new Date(day);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={day}
                      className={cn(
                        "min-w-14 px-1 py-2 text-center font-medium",
                        isWeekend && "text-primary",
                      )}
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
                <tr key={row.room_type_id} className="border-t">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.total_rooms} phòng</p>
                  </td>
                  {row.days.map((day) => {
                    const soldOut = day.available_rooms === 0;
                    const almostFull = !soldOut && row.total_rooms > 0 && day.available_rooms <= row.total_rooms * 0.3;
                    return (
                      <td key={day.date} className="px-1 py-1 text-center">
                        <span
                          title={`Còn ${day.available_rooms}/${row.total_rooms} · đã đặt ${day.booked_rooms}`}
                          className={cn(
                            "flex h-9 items-center justify-center rounded-md text-sm font-semibold",
                            soldOut
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : almostFull
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
                          )}
                        >
                          {day.available_rooms}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chu thich mau - theo he mau trang thai chung cua he thong. */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-green-100 dark:bg-green-950" /> Còn nhiều phòng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-amber-100 dark:bg-amber-950" /> Sắp hết phòng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-red-100 dark:bg-red-950" /> Hết phòng
        </span>
      </div>
    </div>
  );
}
