"use client";

import { RoomStatusBoard } from "@/components/shared/RoomStatusBoard";

export default function StaffRoomsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Sơ đồ phòng</h2>
        <p className="text-sm text-muted-foreground">Trạng thái từng phòng ngay lúc này, gom theo tầng.</p>
      </div>
      <RoomStatusBoard canManageStatus />
    </div>
  );
}
