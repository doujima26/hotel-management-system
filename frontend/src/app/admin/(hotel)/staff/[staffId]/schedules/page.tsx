"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";
import type { ShiftType } from "@/types/enums";
import type { StaffSchedule } from "@/types/models";

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  night: "Đêm",
};

interface SchedulesPageProps {
  params: Promise<{ staffId: string }>;
}

export default function AdminStaffSchedulesPage({ params }: SchedulesPageProps) {
  const { staffId } = use(params);
  const id = Number(staffId);
  const queryClient = useQueryClient();

  const [shiftDate, setShiftDate] = useState("");
  const [shiftType, setShiftType] = useState<ShiftType>("morning");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffSchedule | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ["staff-schedules", id],
    queryFn: () => staffApi.listSchedulesForAdmin(id),
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await staffApi.createSchedule(id, {
        shift_date: shiftDate,
        shift_type: shiftType,
        start_time: startTime,
        end_time: endTime,
      });
      toast.success("Xếp ca làm việc thành công");
      setShiftDate("");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedules", id] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Xếp ca thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(scheduleId: number) {
    try {
      await staffApi.deleteSchedule(scheduleId);
      toast.success("Xóa ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedules", id] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xóa ca thất bại");
    }
  }

  function openEdit(schedule: StaffSchedule) {
    setEditing(schedule);
    setEditError(null);
  }

  async function saveEdit(values: { shift_date: string; shift_type: ShiftType; start_time: string; end_time: string }) {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await staffApi.updateSchedule(editing.id, values);
      toast.success("Cập nhật ca làm việc thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-schedules", id] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href="/admin/staff" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách nhân viên
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Xếp ca làm việc mới</CardTitle>
          <CardDescription>Chọn ngày, ca và khung giờ làm việc cho nhân viên.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift_date">Ngày</Label>
              <Input id="shift_date" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift_type">Ca</Label>
              <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
                <SelectTrigger id="shift_type" className="w-full">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                  <SelectValue>{(current) => SHIFT_TYPE_LABELS[current as ShiftType] ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Sáng</SelectItem>
                  <SelectItem value="afternoon">Chiều</SelectItem>
                  <SelectItem value="night">Đêm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start_time">Giờ bắt đầu</Label>
              <Input id="start_time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end_time">Giờ kết thúc</Label>
              <Input id="end_time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleCreate} disabled={submitting || !shiftDate} className="self-start">
            {submitting ? "Đang xếp ca..." : "Xếp ca"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Lịch làm việc</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Không thể tải lịch làm việc"}
          </p>
        )}
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
            <CardContent className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(schedule)}>
                Sửa
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(schedule.id)}>
                Xóa
              </Button>
            </CardContent>
          </Card>
        ))}
        {schedules && schedules.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có ca làm việc nào.</p>
        )}
      </div>

      {editing && (
        <EditScheduleDialog
          schedule={editing}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditScheduleDialog({
  schedule,
  error,
  submitting,
  onClose,
  onSave,
}: {
  schedule: StaffSchedule;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: { shift_date: string; shift_type: ShiftType; start_time: string; end_time: string }) => void;
}) {
  const [shiftDate, setShiftDate] = useState(schedule.shift_date);
  const [shiftType, setShiftType] = useState<ShiftType>(schedule.shift_type);
  const [startTime, setStartTime] = useState(schedule.start_time);
  const [endTime, setEndTime] = useState(schedule.end_time);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa ca làm việc</DialogTitle>
          <DialogDescription>Cập nhật thông tin ca làm việc.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_shift_date">Ngày</Label>
            <Input id="edit_shift_date" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_shift_type">Ca</Label>
            <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
              <SelectTrigger id="edit_shift_type" className="w-full">
                {/* Phai tu format: mac dinh SelectValue hien gia tri tho (ma enum). */}
                <SelectValue>{(current) => SHIFT_TYPE_LABELS[current as ShiftType] ?? ""}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Sáng</SelectItem>
                <SelectItem value="afternoon">Chiều</SelectItem>
                <SelectItem value="night">Đêm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_start_time">Giờ bắt đầu</Label>
              <Input id="edit_start_time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit_end_time">Giờ kết thúc</Label>
              <Input id="edit_end_time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => onSave({ shift_date: shiftDate, shift_type: shiftType, start_time: startTime, end_time: endTime })}
            disabled={submitting}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
