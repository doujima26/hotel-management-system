"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";
import type { CreateStaffResult, StaffMember } from "@/types/models";

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<CreateStaffResult | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const { data: staffList, isLoading, error } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => staffApi.list(),
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await staffApi.create({
        email: email.trim(),
        full_name: fullName.trim(),
        position: position.trim(),
        phone: phone.trim() || undefined,
      });
      setJustCreated(result);
      toast.success("Tạo nhân viên thành công");
      setEmail("");
      setFullName("");
      setPosition("");
      setPhone("");
      await queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo nhân viên thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(staff: StaffMember) {
    try {
      await staffApi.update(staff.id, { is_active: !staff.is_active });
      await queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  function openEdit(staff: StaffMember) {
    setEditing(staff);
    setEditPosition(staff.position);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await staffApi.update(editing.id, { position: editPosition.trim() });
      toast.success("Cập nhật nhân viên thành công");
      await queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {justCreated && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Tài khoản nhân viên đã tạo</CardTitle>
            <CardDescription>
              Gửi thông tin này cho nhân viên qua kênh riêng (chưa có gửi email thật). Mật khẩu tạm chỉ hiển thị một
              lần ngay bây giờ.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm">
              Email: <span className="font-medium">{justCreated.email}</span>
            </p>
            <p className="text-sm">
              Mật khẩu tạm:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{justCreated.temp_password_mock}</code>
            </p>
            <Button size="sm" variant="outline" className="self-start" onClick={() => setJustCreated(null)}>
              Đã lưu, đóng thông báo
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tạo nhân viên mới</CardTitle>
          <CardDescription>Tài khoản đăng nhập được tạo ngay, chưa gửi email thật nên cần copy mật khẩu tạm.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_email">Email</Label>
              <Input id="staff_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_name">Họ tên</Label>
              <Input id="staff_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_position">Chức vụ</Label>
              <Input id="staff_position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ví dụ: Lễ tân" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_phone">Số điện thoại (không bắt buộc)</Label>
              <Input id="staff_phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button
            onClick={handleCreate}
            disabled={submitting || !email.trim() || !fullName.trim() || !position.trim()}
            className="self-start"
          >
            {submitting ? "Đang tạo..." : "Tạo nhân viên"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách nhân viên</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Không thể tải danh sách nhân viên"}
          </p>
        )}
        {staffList?.map((staff) => (
          <Card key={staff.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{staff.full_name}</CardTitle>
                <Badge variant={staff.is_active ? "secondary" : "destructive"}>
                  {staff.is_active ? "Đang làm việc" : "Đã nghỉ"}
                </Badge>
              </div>
              <CardDescription>
                {staff.position} - {staff.email}
                {staff.phone ? ` - ${staff.phone}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(staff)}>
                Sửa chức vụ
              </Button>
              <Button
                size="sm"
                variant={staff.is_active ? "destructive" : "default"}
                onClick={() => handleToggleActive(staff)}
              >
                {staff.is_active ? "Cho nghỉ việc" : "Nhận lại làm việc"}
              </Button>
              <Link href={`/admin/staff/${staff.id}/schedules`} className="text-sm text-primary hover:underline self-center">
                Xếp ca làm việc &rarr;
              </Link>
            </CardContent>
          </Card>
        ))}
        {staffList && staffList.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có nhân viên nào.</p>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa chức vụ</DialogTitle>
            <DialogDescription>Cập nhật chức vụ của nhân viên.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_position">Chức vụ</Label>
            <Input id="edit_position" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={saveEdit} disabled={editSubmitting}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
