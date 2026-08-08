"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/shared/DateField";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ShiftScheduleGrid,
  ShiftScheduleLegend,
  SHIFT_LABELS,
  type PlacedShift,
} from "@/components/shared/ShiftScheduleGrid";
import { cn } from "@/lib/utils";
import { staffApi } from "@/lib/api/staff";
import { getErrorMessage } from "@/types/api";
import { addDaysToDateString, todayDateString } from "@/lib/utils/date";
import type { ShiftType } from "@/types/enums";
import { canOperate, useAdminHotel } from "../../layout";

// Xem theo tuan (backend gioi han toi da 31 ngay).
const WINDOW_DAYS = 7;

// Khung gio co dinh theo tung ca - nhan vien chi chon CA, khong tu nhap gio
// (dung khi xep ca moi/sua ca ngay tren luoi nay).
const SHIFT_HOURS: Record<ShiftType, { start: string; end: string; range: string }> = {
  morning: { start: "06:00", end: "14:00", range: "06:00–14:00" },
  afternoon: { start: "14:00", end: "22:00", range: "14:00–22:00" },
  night: { start: "22:00", end: "06:00", range: "22:00–06:00" },
};

export default function AdminStaffSchedulePage() {
  const hotel = useAdminHotel();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(todayDateString());
  const endDate = addDaysToDateString(startDate, WINDOW_DAYS - 1);

  // Dialog xep ca moi.
  const [createOpen, setCreateOpen] = useState(false);
  const [createStaffId, setCreateStaffId] = useState("");
  const [createDate, setCreateDate] = useState(startDate);
  const [createShiftType, setCreateShiftType] = useState<ShiftType>("morning");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Dialog sua/xoa 1 ca da xep - mo tu the ca duoc bam tren luoi.
  const [editing, setEditing] = useState<PlacedShift | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editShiftType, setEditShiftType] = useState<ShiftType>("morning");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-schedule-calendar", startDate, endDate],
    queryFn: () => staffApi.scheduleCalendar({ from_date: startDate, to_date: endDate }),
    enabled: canOperate(hotel.status),
  });

  if (!canOperate(hotel.status)) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xếp lịch nhân viên.</p>;
  }

  // Chi nhan vien dang lam moi duoc xep ca moi.
  const activeStaff = (data?.items ?? []).filter((row) => row.is_active);

  function openCreate() {
    setCreateError(null);
    setCreateStaffId(activeStaff[0] ? String(activeStaff[0].staff_id) : "");
    setCreateDate(startDate);
    setCreateShiftType("morning");
    setCreateOpen(true);
  }

  async function handleCreateSubmit() {
    if (!createStaffId || !createDate) return;
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      const { start, end } = SHIFT_HOURS[createShiftType];
      await staffApi.createSchedule(Number(createStaffId), {
        shift_date: createDate,
        shift_type: createShiftType,
        start_time: start,
        end_time: end,
      });
      toast.success("Xếp ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedule-calendar", startDate, endDate] });
      setCreateOpen(false);
    } catch (err) {
      setCreateError(getErrorMessage(err, "Xếp ca thất bại"));
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openEdit(item: PlacedShift) {
    setEditError(null);
    setEditDate(item.shift.shift_date);
    setEditShiftType(item.shift.shift_type);
    setEditing(item);
  }

  async function handleEditSave() {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      const { start, end } = SHIFT_HOURS[editShiftType];
      await staffApi.updateSchedule(editing.shift.schedule_id, {
        shift_date: editDate,
        shift_type: editShiftType,
        start_time: start,
        end_time: end,
      });
      toast.success("Cập nhật ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedule-calendar", startDate, endDate] });
      setEditing(null);
    } catch (err) {
      setEditError(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleEditDelete() {
    if (!editing) return;
    setEditSubmitting(true);
    try {
      await staffApi.deleteSchedule(editing.shift.schedule_id);
      toast.success("Xóa ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedule-calendar", startDate, endDate] });
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Xóa ca thất bại"));
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chon ngay bat dau tuan: mui ten lui/toi 1 tuan, o chon ngay de nhay
          thang toi ngay bat ky, nut "Tuan nay" de quay lai nhanh. */}
      <PageHeader
        title="Lịch làm việc"
        description="Ca làm việc của toàn bộ nhân viên theo tuần. Ngày làm việc tính từ 06:00 hôm nay tới 06:00 hôm sau."
        action={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(addDaysToDateString(startDate, -WINDOW_DAYS))}
              aria-label="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <DateField
              value={startDate}
              onChange={(value) => {
                if (value) setStartDate(value);
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
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <Button size="sm" onClick={openCreate} disabled={activeStaff.length === 0}>
              <Plus className="size-4" />
              Thêm ca
            </Button>
          </>
        }
      />

      {isLoading && <p className="text-muted-foreground">Đang tải…</p>}
      {error && (
        <p className="text-sm text-destructive">
          {getErrorMessage(error, "Không thể tải lịch làm việc")}
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
        <ShiftScheduleGrid data={data} onShiftClick={openEdit} />
      )}

      <ShiftScheduleLegend hint="Bấm vào thẻ ca để sửa lịch của nhân viên đó." />

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xếp ca làm việc mới</DialogTitle>
            <DialogDescription>
              Khung giờ được tính tự động theo ca (Sáng 06:00–14:00, Chiều 14:00–22:00, Đêm 22:00–06:00 sáng hôm
              sau).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create_staff">Nhân viên</Label>
              <Select value={createStaffId} onValueChange={(v) => v && setCreateStaffId(v)}>
                <SelectTrigger id="create_staff" className="w-full">
                  <SelectValue>
                    {(current) =>
                      activeStaff.find((s) => String(s.staff_id) === current)?.full_name ?? "Chọn nhân viên"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map((s) => (
                    <SelectItem key={s.staff_id} value={String(s.staff_id)}>
                      {s.full_name} · {s.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create_date">Ngày</Label>
              <DateField id="create_date" value={createDate} onChange={setCreateDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create_shift_type">Ca</Label>
              <Select value={createShiftType} onValueChange={(v) => v && setCreateShiftType(v as ShiftType)}>
                <SelectTrigger id="create_shift_type" className="w-full">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                  <SelectValue>{(current) => SHIFT_LABELS[current as ShiftType] ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Sáng</SelectItem>
                  <SelectItem value="afternoon">Chiều</SelectItem>
                  <SelectItem value="night">Đêm</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground tabular-nums">{SHIFT_HOURS[createShiftType].range}</p>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createSubmitting || !createStaffId || !createDate}>
              {createSubmitting ? "Đang xếp ca…" : "Xếp ca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sửa ca làm việc</DialogTitle>
              <DialogDescription>{editing.fullName}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_date">Ngày</Label>
                <DateField id="edit_date" value={editDate} onChange={setEditDate} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit_shift_type">Ca</Label>
                <Select value={editShiftType} onValueChange={(v) => v && setEditShiftType(v as ShiftType)}>
                  <SelectTrigger id="edit_shift_type" className="w-full">
                    {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                    <SelectValue>{(current) => SHIFT_LABELS[current as ShiftType] ?? ""}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Sáng</SelectItem>
                    <SelectItem value="afternoon">Chiều</SelectItem>
                    <SelectItem value="night">Đêm</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground tabular-nums">{SHIFT_HOURS[editShiftType].range}</p>
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="destructive" onClick={handleEditDelete} disabled={editSubmitting}>
                Xóa ca
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Hủy
                </Button>
                <Button onClick={handleEditSave} disabled={editSubmitting}>
                  {editSubmitting ? "Đang lưu…" : "Lưu"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
