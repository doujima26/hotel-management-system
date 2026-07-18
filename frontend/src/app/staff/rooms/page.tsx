"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import type { RoomStatus } from "@/types/enums";

const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  available: "Trống",
  occupied: "Đang ở",
  cleaning: "Đang dọn",
  maintenance: "Bảo trì",
};

export default function StaffRoomsPage() {
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ["room-status-board"],
    queryFn: () => roomsApi.statusBoard(),
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Sơ đồ phòng</h2>
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải sơ đồ phòng"}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rooms?.map((room) => (
          <Card key={room.room_id}>
            <CardContent className="flex flex-col items-center gap-1.5 py-4 text-center">
              <span className="text-lg font-semibold">{room.room_number}</span>
              <span className="text-xs text-muted-foreground">{room.room_type_name}</span>
              <Badge variant={room.status === "available" ? "secondary" : "outline"}>
                {ROOM_STATUS_LABELS[room.status]}
              </Badge>
              {room.current_booking_code && (
                <span className="text-xs text-muted-foreground">
                  {room.current_booking_code}
                  {room.expected_check_out ? ` - trả ${formatDate(room.expected_check_out)}` : ""}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {rooms && rooms.length === 0 && <p className="text-center text-muted-foreground">Chưa có phòng nào.</p>}
    </div>
  );
}
