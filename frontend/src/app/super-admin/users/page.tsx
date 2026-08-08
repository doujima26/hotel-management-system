"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Lock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api/admin";
import { getErrorMessage } from "@/types/api";
import type { UserRole } from "@/types/enums";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Nhân viên",
  user: "Khách hàng",
};

const ROLE_OPTIONS: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "Tất cả vai trò" },
  { value: "user", label: "Khách hàng" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Nhân viên" },
  { value: "super_admin", label: "Super Admin" },
];

const ACTIVE_OPTIONS: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Đã khóa" },
];

export default function SuperAdminUsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  // Cho go xong moi goi API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", roleFilter, activeFilter, search, page],
    queryFn: () =>
      adminApi.listUsers({
        role: roleFilter === "all" ? undefined : roleFilter,
        is_active: activeFilter === "all" ? undefined : activeFilter === "active",
        search: search || undefined,
        page,
        page_size: 10,
      }),
    placeholderData: (previous) => previous,
  });

  const roleCounts = data?.role_counts ?? {};

  async function handleToggleActive(userId: number, nextActive: boolean) {
    setActionError(null);
    setBusyUserId(userId);
    try {
      await adminApi.setUserActive(userId, nextActive);
      toast.success(nextActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      setActionError(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Quản lý người dùng</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="w-full sm:w-60"
          />
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v as UserRole | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
              <SelectValue>
                {(current) => ROLE_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {/* So dem tren toan he thong, khong doi theo bo loc dang chon. */}
                  {opt.label}
                  {opt.value !== "all" && ` (${roleCounts[opt.value] ?? 0})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activeFilter}
            onValueChange={(v) => {
              setActiveFilter(v as "all" | "active" | "inactive");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
              <SelectValue>
                {(current) => ACTIVE_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACTIVE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {getErrorMessage(error, "Không thể tải danh sách người dùng")}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{user.full_name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                  <Badge variant={user.is_active ? "secondary" : "destructive"}>
                    {user.is_active ? "Đang hoạt động" : "Đã khóa"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  {user.email}
                  {user.is_verified ? "" : " - chưa xác thực"}
                  {user.phone ? ` · ${user.phone}` : ""}
                </span>
                {/* Admin gan voi khach san so huu, nhan vien gan voi noi lam viec. */}
                {user.hotel && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {user.role === "admin" ? "Chủ khách sạn" : "Nhân viên tại"}
                    </span>
                    <Link href={`/super-admin/hotels/${user.hotel.hotel_id}`} className="text-primary hover:underline">
                      {user.hotel.hotel_name}
                    </Link>
                    <HotelStatusBadge status={user.hotel.hotel_status} />
                    {user.hotel.position && <span className="text-muted-foreground">· {user.hotel.position}</span>}
                    {user.hotel.is_working === false && (
                      <span className="text-muted-foreground">· đã nghỉ việc</span>
                    )}
                  </span>
                )}
                {!user.hotel && user.role === "admin" && (
                  <span className="text-warning-strong">Chưa đăng ký khách sạn nào</span>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/super-admin/users/${user.id}`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Xem hồ sơ
                </Link>
                {/* Tai khoan Super Admin khong khoa duoc: khoa het la mat quyen
                    quan tri nen tang va khong khoi phuc duoc tu trong ung dung. */}
                {user.role === "super_admin" ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Lock className="size-3.5" />
                    Không thể khóa
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={user.is_active ? "destructive" : "default"}
                    onClick={() => handleToggleActive(user.id, !user.is_active)}
                    disabled={busyUserId === user.id}
                  >
                    {user.is_active ? "Khóa" : "Mở khóa"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data && data.items.length === 0 && (
          <p className="text-center text-muted-foreground">Không có người dùng nào phù hợp.</p>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
          >
            Trước
          </button>
          <span className="text-sm text-muted-foreground">
            Trang {data.page} / {data.total_pages}
          </span>
          <button
            type="button"
            disabled={page >= data.total_pages}
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page >= data.total_pages && "pointer-events-none opacity-50"
            )}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
