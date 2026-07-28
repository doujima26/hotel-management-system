"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAdminHotel } from "../layout";

// Cua so mac dinh xem danh sach khoa lich dang co hieu luc/sap toi.
const LIST_WINDOW_DAYS = 180;

export default function AdminRoomBlocksPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);

  const fromDate = todayDateString();
  const toDate = addDaysToDateString(fromDate, LIST_WINDOW_DAYS);

  const { data: rooms } = useQuery({
    queryKey: ["room-status-board"],
    queryFn: () => roomsApi.statusBoard(),
    enabled: approved,
  });

  const {
    data: blocks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["room-blocks", fromDate, toDate],
    queryFn: () => roomsApi.listRoomBlocks({ from_date: fromDate, to_date: toDate }),
    enabled: approved,
  });

  async function handleCreate() {
    if (!selectedRoomId) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createRoomBlock({
        room_id: Number(selectedRoomId),
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });
      toast.success("Tạo khóa lịch phòng thành công");
      setStartDate("");
      setEndDate("");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["room-blocks"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo khóa lịch thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(blockId: number) {
    setDeleteBusyId(blockId);
    try {
      await roomsApi.deleteRoomBlock(blockId);
      toast.success("Đã hủy khóa lịch");
      await queryClient.invalidateQueries({ queryKey: ["room-blocks"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Hủy khóa lịch thất bại");
    } finally {
      setDeleteBusyId(null);
    }
  }

  function roomLabel(roomId: number) {
    const room = rooms?.find((r) => r.room_id === roomId);
    return room ? `${room.room_number} (${room.room_type_name})` : `Phòng #${roomId}`;
  }

  if (!approved) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi khóa lịch phòng.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Khóa lịch phòng</CardTitle>
          <CardDescription>
            Chặn 1 phòng vật lý không bán được trong 1 khoảng ngày cụ thể (bảo trì đã lên lịch trước, giữ phòng ngoài mục đích bán...).
            Phòng vẫn bán được bình thường cho các khoảng ngày khác.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block_room">Phòng</Label>
              <Select value={selectedRoomId || "none"} onValueChange={(v) => setSelectedRoomId(!v || v === "none" ? "" : v)}>
                <SelectTrigger id="block_room" className="w-full">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (id phong). */}
                  <SelectValue>{(current) => (current === "none" ? "Chọn phòng" : roomLabel(Number(current)))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chọn phòng</SelectItem>
                  {rooms?.map((room) => (
                    <SelectItem key={room.room_id} value={String(room.room_id)}>
                      {room.room_number} ({room.room_type_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block_start">Từ ngày</Label>
              <Input id="block_start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block_end">Đến ngày</Label>
              <Input id="block_end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block_reason">Lý do (không bắt buộc)</Label>
              <Input id="block_reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Bảo trì đường ống" />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleCreate} disabled={submitting || !selectedRoomId || !startDate || !endDate} className="self-start">
            {submitting ? "Đang tạo..." : "Tạo khóa lịch"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách khóa lịch hiện có</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">{error instanceof ApiError ? error.message : "Không thể tải danh sách khóa lịch"}</p>
        )}
        {blocks?.map((block) => (
          <Card key={block.id}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{roomLabel(block.room_id)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(block.start_date)} - {formatDate(block.end_date)}
                  {block.reason ? ` · ${block.reason}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(block.id)}
                disabled={deleteBusyId === block.id}
              >
                Hủy khóa
              </Button>
            </CardContent>
          </Card>
        ))}
        {blocks && blocks.length === 0 && (
          <EmptyState title="Chưa có khóa lịch nào" hint="Tạo khóa lịch khi cần bảo trì hoặc giữ phòng ngoài mục đích bán." />
        )}
      </div>
    </div>
  );
}
