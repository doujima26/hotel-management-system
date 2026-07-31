"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/types/api";

const TARGET_TABS: { value: "all" | "hotel" | "user"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "hotel", label: "Khách sạn" },
  { value: "user", label: "Tài khoản" },
];

// Nhan tieng Viet cho tung loai hanh dong, kem mau theo muc do tac dong: hanh
// dong CAT quyen (tu choi, tam dung, khoa) to do de ra soat cho nhanh.
const ACTION_LABELS: Record<string, { label: string; tone: "good" | "bad" }> = {
  hotel_approved: { label: "Duyệt khách sạn", tone: "good" },
  hotel_rejected: { label: "Từ chối khách sạn", tone: "bad" },
  hotel_suspended: { label: "Tạm dừng khách sạn", tone: "bad" },
  user_locked: { label: "Khóa tài khoản", tone: "bad" },
  user_unlocked: { label: "Mở khóa tài khoản", tone: "good" },
};

export default function SuperAdminActionLogsPage() {
  const [targetType, setTargetType] = useState<"all" | "hotel" | "user">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-action-logs", targetType, page],
    queryFn: () =>
      adminApi.listActionLogs({
        target_type: targetType === "all" ? undefined : targetType,
        page,
        page_size: 20,
      }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Nhật ký quản trị</h2>
        <p className="text-sm text-muted-foreground">
          Mọi thao tác duyệt, từ chối, tạm dừng khách sạn và khóa/mở tài khoản đều được ghi lại.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TARGET_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setTargetType(tab.value);
              setPage(1);
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm transition-colors",
              targetType === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-primary hover:text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải nhật ký"}
        </p>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title="Chưa có thao tác nào được ghi"
          hint="Nhật ký sẽ xuất hiện sau khi bạn duyệt khách sạn hoặc khóa/mở tài khoản."
        />
      )}

      {data && data.items.length > 0 && (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {data.items.map((log) => {
              const action = ACTION_LABELS[log.action] ?? { label: log.action, tone: "good" as const };
              const TargetIcon = log.target_type === "hotel" ? Building2 : User;
              return (
                <div key={log.id} className="flex flex-col gap-1 p-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        action.tone === "bad"
                          ? "bg-danger-subtle text-danger-strong"
                          : "bg-success-subtle text-success-strong",
                      )}
                    >
                      {action.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <TargetIcon className="size-3.5 text-muted-foreground" />
                      {/* Ten ghi lai TAI THOI DIEM thao tac, khong phai ten hien tai. */}
                      {log.target_label ?? `#${log.target_id}`}
                    </span>
                    {log.target_type === "hotel" && (
                      <Link
                        href={`/super-admin/hotels/${log.target_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Xem hồ sơ
                      </Link>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Người thực hiện: {log.actor_name} ({log.actor_email})
                  </p>
                  {log.reason && <p className="text-sm">Lý do: {log.reason}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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
              page >= data.total_pages && "pointer-events-none opacity-50",
            )}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
