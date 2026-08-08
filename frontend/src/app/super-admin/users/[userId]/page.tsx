"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Calendar, ChevronLeft, Lock, Mail, Phone, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { getErrorMessage } from "@/types/api";
import type { UserRole } from "@/types/enums";

interface PageProps {
  params: Promise<{ userId: string }>;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Nhân viên",
  user: "Khách hàng",
};

const ACTION_LABELS: Record<string, string> = {
  user_locked: "Khóa tài khoản",
  user_unlocked: "Mở khóa tài khoản",
};

export default function SuperAdminUserDetailPage({ params }: PageProps) {
  const { userId } = use(params);
  const id = Number(userId);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () => adminApi.getUserDetail(id),
  });

  async function handleToggleActive(nextActive: boolean) {
    setActionError(null);
    setBusy(true);
    try {
      await adminApi.setUserActive(id, nextActive);
      toast.success(nextActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      setActionError(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getErrorMessage(error, "Không thể tải hồ sơ người dùng")}
      </p>
    );
  }
  if (!user) return null;

  const isCustomer = user.role === "user";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/super-admin/users"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{user.full_name}</h2>
            <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
            <Badge variant={user.is_active ? "secondary" : "destructive"}>
              {user.is_active ? "Đang hoạt động" : "Đã khóa"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Tham gia {formatDate(user.created_at)}</p>
        </div>
        {/* Tai khoan Super Admin khong khoa duoc: khoa het la mat quyen quan tri
            nen tang va khong khoi phuc duoc tu trong ung dung. */}
        {user.role === "super_admin" ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            Tài khoản Super Admin không thể bị khóa
          </span>
        ) : (
          <Button
            variant={user.is_active ? "destructive" : "default"}
            onClick={() => handleToggleActive(!user.is_active)}
            disabled={busy}
          >
            {user.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          </Button>
        )}
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {user.role === "admin" ? "Khách sạn sở hữu" : user.role === "staff" ? "Nơi làm việc" : "Vai trò"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {user.hotel ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <Link
                      href={`/super-admin/hotels/${user.hotel.hotel_id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {user.hotel.hotel_name}
                    </Link>
                    <HotelStatusBadge status={user.hotel.hotel_status} />
                  </div>
                  <span className="text-muted-foreground">{user.hotel.city}</span>
                  {user.hotel.position && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      <span>Chức vụ: {user.hotel.position}</span>
                      {user.hotel.hired_at && <span>Vào làm {formatDate(user.hotel.hired_at)}</span>}
                      <span className={cn(user.hotel.is_working === false && "text-warning-strong")}>
                        {user.hotel.is_working === false ? "Đã nghỉ việc" : "Đang làm việc"}
                      </span>
                    </div>
                  )}
                </>
              ) : user.role === "admin" ? (
                <p className="text-warning-strong">Tài khoản chủ khách sạn nhưng chưa đăng ký khách sạn nào.</p>
              ) : user.role === "staff" ? (
                <p className="text-warning-strong">Tài khoản nhân viên nhưng chưa gắn với khách sạn nào.</p>
              ) : (
                <p className="text-muted-foreground">
                  {isCustomer ? "Tài khoản khách hàng, không thuộc khách sạn nào." : "Tài khoản quản trị nền tảng."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Chi khach hang moi co lich su dat phong de danh gia tai khoan. */}
          {isCustomer && (
            <Card>
              <CardHeader>
                <CardTitle>Hoạt động đặt phòng</CardTitle>
                <CardDescription>Tính trên toàn bộ lịch sử của tài khoản.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tổng đơn</p>
                  <p className="text-lg font-semibold">{user.activity.total_bookings}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Đơn đã hủy</p>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      user.activity.cancelled_bookings > 0 && "text-warning-strong",
                    )}
                  >
                    {user.activity.cancelled_bookings}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Đã thanh toán</p>
                  <p className="text-lg font-semibold">{formatMoney(user.activity.total_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Đánh giá đã viết</p>
                  <p className="text-lg font-semibold">{user.activity.total_reviews}</p>
                </div>
                {user.activity.last_check_in_date && (
                  <div className="col-span-2 sm:col-span-4">
                    <p className="text-xs text-muted-foreground">Lần nhận phòng gần nhất</p>
                    <p className="font-medium">{formatDate(user.activity.last_check_in_date)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lịch sử khóa / mở tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-0 p-0">
              {user.action_logs.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="Chưa có thao tác nào"
                    hint="Tài khoản này chưa từng bị khóa hoặc mở khóa."
                  />
                </div>
              ) : (
                <div className="flex flex-col divide-y">
                  {user.action_logs.map((log) => (
                    <div key={log.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 text-sm">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          log.action === "user_locked"
                            ? "bg-danger-subtle text-danger-strong"
                            : "bg-success-subtle text-success-strong",
                        )}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-muted-foreground">
                        {log.actor_name} ({log.actor_email})
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Thông tin liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="break-all">{user.email}</span>
            </span>
            <span className="flex items-center gap-2">
              {user.is_verified ? (
                <ShieldCheck className="size-3.5 shrink-0 text-success-strong" />
              ) : (
                <ShieldOff className="size-3.5 shrink-0 text-warning-strong" />
              )}
              <span className={cn(!user.is_verified && "text-warning-strong")}>
                {user.is_verified ? "Email đã xác thực" : "Email chưa xác thực"}
              </span>
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              {user.phone ?? "Chưa có số điện thoại"}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              Cập nhật {formatDateTime(user.updated_at)}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
