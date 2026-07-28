"use client";

import { useQuery } from "@tanstack/react-query";
import { DoorClosed, Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { RoomStatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { ROOM_STATUS_LABELS, type RoomStatus } from "@/types/enums";
import type { RoomStatusItem } from "@/types/models";

const STATUS_ORDER: RoomStatus[] = ["available", "occupied", "cleaning", "maintenance"];

// Vien trai cua o phong theo trang thai - dung cung y nghia mau voi RoomStatusBadge.
const STATUS_BORDER: Record<RoomStatus, string> = {
  available: "border-l-green-500",
  occupied: "border-l-blue-500",
  cleaning: "border-l-amber-500",
  maintenance: "border-l-red-500",
};

// Mau rieng cho phong dang bi khoa lich (room_blocks) - uu tien hien thi mau
// nay thay cho mau theo status, vi phong nay thuc te khong ban/su dung duoc
// hom nay du status van la gi.
const BLOCKED_BORDER = "border-l-purple-500";

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: "bg-green-500", label: ROOM_STATUS_LABELS.available },
  { color: "bg-blue-500", label: ROOM_STATUS_LABELS.occupied },
  { color: "bg-amber-500", label: ROOM_STATUS_LABELS.cleaning },
  { color: "bg-red-500", label: ROOM_STATUS_LABELS.maintenance },
  { color: "bg-purple-500", label: "Đang khóa lịch" },
];

// Chu thich mau dung chung cho so do phong.
function ColorLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-full", item.color)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// Dem so phong theo tung trang thai.
function countByStatus(rooms: RoomStatusItem[]): Record<RoomStatus, number> {
  const counts = { available: 0, occupied: 0, cleaning: 0, maintenance: 0 } as Record<RoomStatus, number>;
  for (const room of rooms) counts[room.status] += 1;
  return counts;
}

// Dong tom tat "x Trong · y Dang o ..." - bo qua trang thai co so luong 0.
function StatusSummary({ rooms }: { rooms: RoomStatusItem[] }) {
  const counts = countByStatus(rooms);
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
        <span key={status}>
          {counts[status]} {ROOM_STATUS_LABELS[status].toLowerCase()}
        </span>
      ))}
    </span>
  );
}

// So do phong: gom phong theo TANG, moi phong hien trang thai bang mau + icon.
// Dung chung cho khu Staff va Admin (API /rooms/status cho ca 2 vai tro).
export function RoomStatusBoard() {
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ["room-status-board"],
    queryFn: () => roomsApi.statusBoard(),
  });

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Không thể tải sơ đồ phòng"}
      </p>
    );
  }
  if (!rooms || rooms.length === 0) {
    return (
      <EmptyState
        icon={DoorClosed}
        title="Chưa có phòng nào"
        hint="Tạo loại phòng rồi thêm phòng vật lý (số phòng cụ thể) để sơ đồ hiển thị."
      />
    );
  }

  // Gom theo tang; phong chua gan tang xep xuong cuoi.
  const byFloor = new Map<number | null, RoomStatusItem[]>();
  for (const room of rooms) {
    if (!byFloor.has(room.floor)) byFloor.set(room.floor, []);
    byFloor.get(room.floor)!.push(room);
  }
  const floors = [...byFloor.entries()].sort((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return a[0] - b[0];
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Tong ket toan khach san */}
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Tổng {rooms.length} phòng</span>
          <StatusSummary rooms={rooms} />
        </div>
        <ColorLegend />
      </div>

      {floors.map(([floor, floorRooms]) => (
        <section key={floor ?? "unknown"} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-1.5">
            <h3 className="font-semibold">
              {floor === null ? "Chưa gán tầng" : `Tầng ${floor}`}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({floorRooms.length} phòng)</span>
            </h3>
            <StatusSummary rooms={floorRooms} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {floorRooms.map((room) => (
              <div
                key={room.room_id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border border-l-4 p-3",
                  room.is_blocked ? BLOCKED_BORDER : STATUS_BORDER[room.status],
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-bold">{room.room_number}</span>
                  <span className="truncate text-xs text-muted-foreground">{room.room_type_name}</span>
                </div>
                <RoomStatusBadge status={room.status} />
                {room.is_blocked && (
                  <span
                    className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    title={room.block_reason ?? undefined}
                  >
                    <Lock className="size-3 shrink-0" />
                    Đang khóa lịch
                  </span>
                )}
                {room.current_booking_code && (
                  <p className="text-xs text-muted-foreground">
                    {room.current_booking_code}
                    {room.expected_check_out ? ` · trả ${formatDate(room.expected_check_out)}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
