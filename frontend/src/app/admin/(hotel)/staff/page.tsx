"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
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

type SortKey = "full_name" | "position" | "email" | "phone" | "is_active";
type SortDir = "asc" | "desc";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "full_name", label: "Họ tên" },
  { key: "position", label: "Chức vụ" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Số điện thoại" },
  { key: "is_active", label: "Trạng thái" },
];

// Gia tri dung de so sanh khi sap xep - is_active so theo 0/1, con lai so chuoi
// khong phan biet hoa/thuong (theo bang chu cai tieng Viet).
function sortValue(staff: StaffMember, key: SortKey): string {
  if (key === "is_active") return staff.is_active ? "1" : "0";
  return (staff[key] ?? "").toLowerCase();
}

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

  // Tim kiem + sap xep bang - mac dinh sap theo Chuc vu de gom nhom vi tri lam
  // viec giong nhau lai voi nhau.
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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

  // Loc theo tu khoa (khong phan biet hoa/thuong) tren ca 4 truong hien thi,
  // sau do sap xep theo cot dang chon - ca 2 buoc deu chay o client vi danh
  // sach nhan vien 1 khach san thuong khong lon, khong can goi API rieng.
  const query = search.trim().toLowerCase();
  const filteredStaff = (staffList ?? []).filter((staff) => {
    if (!query) return true;
    return (
      staff.full_name.toLowerCase().includes(query) ||
      staff.position.toLowerCase().includes(query) ||
      staff.email.toLowerCase().includes(query) ||
      (staff.phone ?? "").toLowerCase().includes(query)
    );
  });
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    const cmp = sortValue(a, sortKey).localeCompare(sortValue(b, sortKey), "vi");
    return sortDir === "asc" ? cmp : -cmp;
  });

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Danh sách nhân viên</h2>
          <div className="relative w-full max-w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, chức vụ, email, SĐT..."
              className="pl-8"
            />
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Không thể tải danh sách nhân viên"}
          </p>
        )}

        {staffList && staffList.length > 0 && (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/60">
                  {SORT_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-left font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="flex cursor-pointer items-center gap-1 hover:text-foreground"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {sortedStaff.map((staff) => (
                  <tr key={staff.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{staff.full_name}</td>
                    <td className="px-3 py-2">{staff.position}</td>
                    <td className="px-3 py-2">{staff.email}</td>
                    <td className="px-3 py-2 tabular-nums">{staff.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={staff.is_active ? "secondary" : "destructive"}>
                        {staff.is_active ? "Đang làm việc" : "Đã nghỉ"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {staffList && staffList.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có nhân viên nào.</p>
        )}
        {staffList && staffList.length > 0 && sortedStaff.length === 0 && (
          <p className="text-center text-muted-foreground">Không tìm thấy nhân viên phù hợp.</p>
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
