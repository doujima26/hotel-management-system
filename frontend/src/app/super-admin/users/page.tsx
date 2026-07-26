"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/types/api";
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
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", roleFilter, activeFilter, page],
    queryFn: () =>
      adminApi.listUsers({
        role: roleFilter === "all" ? undefined : roleFilter,
        is_active: activeFilter === "all" ? undefined : activeFilter === "active",
        page,
        page_size: 10,
      }),
  });

  async function handleToggleActive(userId: number, nextActive: boolean) {
    setActionError(null);
    setBusyUserId(userId);
    try {
      await adminApi.setUserActive(userId, nextActive);
      toast.success(nextActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Quản lý người dùng</h2>
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v as UserRole | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
              <SelectValue>
                {(current) => ROLE_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
          {error instanceof ApiError ? error.message : "Không thể tải danh sách người dùng"}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{user.full_name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                  <Badge variant={user.is_active ? "secondary" : "destructive"}>
                    {user.is_active ? "Đang hoạt động" : "Đã khóa"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {user.email} {user.is_verified ? "" : "- chưa xác thực"}
              </span>
              <Button
                size="sm"
                variant={user.is_active ? "destructive" : "default"}
                onClick={() => handleToggleActive(user.id, !user.is_active)}
                disabled={busyUserId === user.id}
              >
                {user.is_active ? "Khóa" : "Mở khóa"}
              </Button>
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
