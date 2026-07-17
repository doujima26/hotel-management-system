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
  staff: "Nhan vien",
  user: "Khach hang",
};

const ROLE_OPTIONS: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "Tat ca vai tro" },
  { value: "user", label: "Khach hang" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Nhan vien" },
  { value: "super_admin", label: "Super Admin" },
];

const ACTIVE_OPTIONS: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "Tat ca trang thai" },
  { value: "active", label: "Dang hoat dong" },
  { value: "inactive", label: "Da khoa" },
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
      toast.success(nextActive ? "Da mo khoa tai khoan" : "Da khoa tai khoan");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cap nhat that bai");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Quan ly nguoi dung</h2>
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v as UserRole | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
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
              <SelectValue />
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

      {isLoading && <p className="text-muted-foreground">Dang tai...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Khong the tai danh sach nguoi dung"}
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
                    {user.is_active ? "Dang hoat dong" : "Da khoa"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {user.email} {user.is_verified ? "" : "- chua xac thuc"}
              </span>
              <Button
                size="sm"
                variant={user.is_active ? "destructive" : "default"}
                onClick={() => handleToggleActive(user.id, !user.is_active)}
                disabled={busyUserId === user.id}
              >
                {user.is_active ? "Khoa" : "Mo khoa"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {data && data.items.length === 0 && (
          <p className="text-center text-muted-foreground">Khong co nguoi dung nao phu hop.</p>
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
            Truoc
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
