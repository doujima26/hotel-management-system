"use client";

import { RoomStatusBoard } from "@/components/shared/RoomStatusBoard";
import { canOperate, useAdminHotel } from "../layout";

export default function AdminRoomsPage() {
  const hotel = useAdminHotel();

  if (!canOperate(hotel.status)) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xem sơ đồ phòng.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Sơ đồ phòng</h2>
        <p className="text-sm text-muted-foreground">Trạng thái từng phòng ngay lúc này, gom theo tầng.</p>
      </div>
      <RoomStatusBoard canManageMaintenance />
    </div>
  );
}
