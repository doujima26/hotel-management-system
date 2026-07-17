"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/types/api";
import { HOTEL_STATUS_LABELS, type HotelStatus } from "@/types/enums";

const FILTER_OPTIONS: { value: HotelStatus | "all"; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "suspended", label: "Tạm dừng" },
  { value: "all", label: "Tất cả" },
];

export default function SuperAdminHotelsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<HotelStatus | "all">("pending");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyHotelId, setBusyHotelId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-hotels", statusFilter, page],
    queryFn: () =>
      adminApi.listHotels({
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        page_size: 10,
      }),
  });

  async function handleReview(hotelId: number, action: "approved" | "rejected" | "suspended", reason?: string) {
    setActionError(null);
    setBusyHotelId(hotelId);
    try {
      await adminApi.reviewHotel(hotelId, { action, rejection_reason: reason });
      toast.success("Cập nhật trạng thái khách sạn thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setBusyHotelId(null);
    }
  }

  function openRejectDialog(hotelId: number) {
    setRejectReason("");
    setRejectTarget(hotelId);
  }

  async function confirmReject() {
    if (rejectTarget === null) return;
    await handleReview(rejectTarget, "rejected", rejectReason || undefined);
    setRejectTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Duyệt khách sạn</h2>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as HotelStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách khách sạn"}
        </p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((hotel) => (
          <Card key={hotel.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{hotel.name}</CardTitle>
                <Badge variant="secondary">{HOTEL_STATUS_LABELS[hotel.status]}</Badge>
              </div>
              <CardDescription>
                {hotel.address}, {hotel.district ? `${hotel.district}, ` : ""}
                {hotel.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Chủ sở hữu: user #{hotel.owner_id}
                {hotel.phone ? ` - ${hotel.phone}` : ""}
                {hotel.email ? ` - ${hotel.email}` : ""}
              </p>
              {hotel.rejection_reason && (
                <p className="text-sm text-destructive">Lý do từ chối: {hotel.rejection_reason}</p>
              )}
              <div className="flex gap-2">
                {hotel.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleReview(hotel.id, "approved")}
                      disabled={busyHotelId === hotel.id}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openRejectDialog(hotel.id)}
                      disabled={busyHotelId === hotel.id}
                    >
                      Từ chối
                    </Button>
                  </>
                )}
                {hotel.status === "approved" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReview(hotel.id, "suspended")}
                    disabled={busyHotelId === hotel.id}
                  >
                    Tạm dừng
                  </Button>
                )}
                {(hotel.status === "rejected" || hotel.status === "suspended") && (
                  <Button
                    size="sm"
                    onClick={() => handleReview(hotel.id, "approved")}
                    disabled={busyHotelId === hotel.id}
                  >
                    Duyệt lại
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data && data.items.length === 0 && (
          <p className="text-center text-muted-foreground">Không có khách sạn nào ở trạng thái này.</p>
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

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối khách sạn</DialogTitle>
            <DialogDescription>Nhập lý do từ chối (sẽ hiển thị cho chủ khách sạn).</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject_reason">Lý do</Label>
            <textarea
              id="reject_reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={busyHotelId === rejectTarget}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
