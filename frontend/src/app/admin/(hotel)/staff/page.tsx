"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { staffApi } from "@/lib/api/staff";
import { ApiError } from "@/types/api";
import type { CreateStaffResult, StaffMember } from "@/types/models";

// Bam vao 1 dong trong bang de nap thong tin len form ben tren sua - chi con 2
// cot cho sap xep (Ho ten, Chuc vu), cac cot con lai chi de xem.
type SortKey = "full_name" | "position";
type SortDir = "asc" | "desc";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "full_name", label: "Họ tên" },
  { key: "position", label: "Chức vụ" },
];

function sortValue(staff: StaffMember, key: SortKey): string {
  return staff[key].toLowerCase();
}

export default function AdminStaffPage() {
  const queryClient = useQueryClient();

  // Form dung chung cho ca tao moi va sua: selectedStaff = null la dang tao
  // moi, khac null la dang sua nhan vien do (bam tu dong trong bang).
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<CreateStaffResult | null>(null);

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

  // "Lam moi": xoa trang form, quay ve che do tao moi.
  function resetForm() {
    setSelectedStaff(null);
    setEmail("");
    setFullName("");
    setPosition("");
    setPhone("");
    setFormError(null);
  }

  // Bam 1 dong trong bang: nap du lieu len form de xem/sua. Ho ten, Email, SDT
  // chi hien de xem (backend hien chi cho sua Chuc vu cua nhan vien da tao).
  function selectStaff(staff: StaffMember) {
    setSelectedStaff(staff);
    setEmail(staff.email);
    setFullName(staff.full_name);
    setPosition(staff.position);
    setPhone(staff.phone ?? "");
    setFormError(null);
  }

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
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tạo nhân viên thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!selectedStaff) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await staffApi.update(selectedStaff.id, { position: position.trim() });
      toast.success("Cập nhật nhân viên thành công");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  // Khong co API xoa han nhan vien - nut "Xoa" thuc chat la cho nghi viec
  // (is_active=false); neu nhan vien dang nghi thi doi thanh "Khoi phuc".
  async function handleToggleActive() {
    if (!selectedStaff) return;
    setSubmitting(true);
    try {
      await staffApi.update(selectedStaff.id, { is_active: !selectedStaff.is_active });
      toast.success(selectedStaff.is_active ? "Đã cho nhân viên nghỉ việc" : "Đã nhận lại nhân viên làm việc");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
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

  const isEditing = selectedStaff !== null;

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
          <CardTitle>{isEditing ? `Sửa nhân viên: ${selectedStaff.full_name}` : "Tạo nhân viên mới"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "Chỉ Chức vụ sửa được. Họ tên, Email, Số điện thoại của tài khoản đã tạo không đổi được ở đây."
              : "Tài khoản đăng nhập được tạo ngay, chưa gửi email thật nên cần copy mật khẩu tạm."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_email">Email</Label>
              <Input
                id="staff_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEditing}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_name">Họ tên</Label>
              <Input
                id="staff_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isEditing}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_position">Chức vụ</Label>
              <Input
                id="staff_position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ví dụ: Lễ tân"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff_phone">Số điện thoại (không bắt buộc)</Label>
              <Input
                id="staff_phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isEditing}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCreate}
              disabled={submitting || isEditing || !email.trim() || !fullName.trim() || !position.trim()}
            >
              {submitting && !isEditing ? "Đang tạo..." : "Thêm mới"}
            </Button>
            <Button
              variant="outline"
              onClick={handleUpdate}
              disabled={submitting || !isEditing || !position.trim()}
            >
              Cập nhật
            </Button>
            <Button
              variant="destructive"
              onClick={handleToggleActive}
              disabled={submitting || !isEditing}
            >
              {selectedStaff?.is_active === false ? "Khôi phục" : "Xóa"}
            </Button>
            <Button variant="ghost" onClick={resetForm} disabled={submitting}>
              Làm mới
            </Button>
          </div>
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
        <p className="text-xs text-muted-foreground">Bấm vào một dòng để xem và sửa thông tin ở form phía trên.</p>

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
                {/* Hang tieu de nen cam dac (dung mau accent chinh cua web),
                    chu doi sang primary-foreground de du tuong phan. */}
                <tr className="border-b bg-primary">
                  {SORTABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-left font-semibold text-primary-foreground">
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="flex cursor-pointer items-center gap-1 hover:opacity-80"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-60" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold text-primary-foreground">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-primary-foreground">Số điện thoại</th>
                  <th className="px-3 py-2 text-left font-semibold text-primary-foreground">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sortedStaff.map((staff) => (
                  <tr
                    key={staff.id}
                    onClick={() => selectStaff(staff)}
                    className={cn(
                      "cursor-pointer border-b last:border-0 hover:bg-muted/30",
                      selectedStaff?.id === staff.id && "bg-accent hover:bg-accent",
                    )}
                  >
                    <td className="px-3 py-2 font-medium">{staff.full_name}</td>
                    <td className="px-3 py-2">{staff.position}</td>
                    <td className="px-3 py-2">{staff.email}</td>
                    <td className="px-3 py-2 tabular-nums">{staff.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={staff.is_active ? "secondary" : "destructive"}>
                        {staff.is_active ? "Đang làm việc" : "Đã nghỉ"}
                      </Badge>
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
    </div>
  );
}
