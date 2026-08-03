"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import { canOperate, useAdminHotel } from "../layout";

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
    enabled: canOperate(hotel.status),
  });

  if (!canOperate(hotel.status)) {
    return (
      <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xem lịch phòng.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lịch trống phòng</h2>
          <p className="text-sm text-muted-foreground">
            Số phòng còn trống theo từng ngày. Ô đỏ là đã kín phòng.
          </p>
        </div>
        {/* Chon ngay bat dau xem: mui ten lui/toi 1 ky, o chon ngay de nhay
            thang toi ngay bat ky, nut "Hom nay" de quay lai nhanh. */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(addDaysToDateString(startDate, -WINDOW_DAYS))}
            aria-label="Kỳ trước"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => {
              if (event.target.value) setStartDate(event.target.value);
            }}
            aria-label="Ngày bắt đầu xem lịch"
            className="w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(addDaysToDateString(startDate, WINDOW_DAYS))}
            aria-label="Kỳ sau"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate(todayDateString())}
            disabled={startDate === todayDateString()}
          >
            Hôm nay
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
              {/* Hang tieu de nen cam dac (dung mau accent chinh cua web),
                  chu doi sang primary-foreground de du tuong phan. */}
              <tr className="bg-primary">
                <th className="sticky left-0 z-10 min-w-40 bg-primary px-3 py-2 text-left font-semibold text-primary-foreground">
                  Loại phòng
                </th>
                {data.dates.map((day) => {
                  const d = new Date(day);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={day}
                      className={cn(
                        "min-w-14 px-1 py-2 text-center font-medium text-primary-foreground",
                        isWeekend && "font-bold",
                      )}
                    >
                      <span className="block text-[11px] text-primary-foreground/70">{WEEKDAYS[d.getDay()]}</span>
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
                    const title = [
                      `Còn ${day.available_rooms}/${row.total_rooms}`,
                      `đã đặt ${day.booked_rooms}`,
                      day.blocked_rooms > 0 ? `khóa lịch ${day.blocked_rooms}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <td key={day.date} className="px-1 py-1 text-center">
                        <span
                          title={title}
                          className={cn(
                            "flex h-9 items-center justify-center rounded-md text-sm font-semibold",
                            soldOut
                              ? "bg-danger-subtle text-danger-strong"
                              : almostFull
                                ? "bg-warning-subtle text-warning-strong"
                                : "bg-success-subtle text-success-strong",
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
          <span className="size-3 rounded bg-success-subtle" /> Còn nhiều phòng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-warning-subtle" /> Sắp hết phòng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-danger-subtle" /> Hết phòng
        </span>
      </div>
    </div>
  );
}
