"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BedDouble, Check, ChevronLeft, Mail, Maximize2, Phone, User, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatBedConfig, formatMoney } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/types/api";
import { PAYMENT_METHOD_LABELS } from "@/types/enums";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";
import type { AdminHotelDetail } from "@/types/models";

interface PageProps {
  params: Promise<{ hotelId: string }>;
}

// Cac muc tu kiem tra truoc khi duyet. Chi kiem tra SU CO MAT cua du lieu, khong
// dat nguong chat luong - de Super Admin tu quyet dinh, phan mem chi chi ra cho
// nao con trong thay vi bat ho tu do lai tung muc.
function buildChecklist(hotel: AdminHotelDetail) {
  const totalDeclaredRooms = hotel.room_types.reduce((sum, item) => sum + item.total_rooms, 0);
  const totalCreatedRooms = hotel.room_types.reduce((sum, item) => sum + item.created_rooms, 0);
  const roomTypeImages = hotel.room_types.reduce((sum, item) => sum + item.image_count, 0);

  return [
    { label: "Mô tả khách sạn", ok: Boolean(hotel.description?.trim()), detail: hotel.description ? "" : "chưa nhập" },
    { label: "Ảnh khách sạn", ok: hotel.images.length > 0, detail: `${hotel.images.length} ảnh` },
    { label: "Tiện nghi khách sạn", ok: hotel.amenities.length > 0, detail: `${hotel.amenities.length} mục` },
    { label: "Loại phòng", ok: hotel.room_types.length > 0, detail: `${hotel.room_types.length} loại` },
    {
      label: "Phòng vật lý đã tạo",
      ok: totalCreatedRooms > 0 && totalCreatedRooms >= totalDeclaredRooms,
      detail: `${totalCreatedRooms}/${totalDeclaredRooms} phòng`,
    },
    { label: "Ảnh loại phòng", ok: roomTypeImages > 0, detail: `${roomTypeImages} ảnh` },
    { label: "Liên hệ (điện thoại/email)", ok: Boolean(hotel.phone || hotel.email), detail: "" },
  ];
}

export default function SuperAdminHotelDetailPage({ params }: PageProps) {
  const { hotelId } = use(params);
  const id = Number(hotelId);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: hotel, isLoading, error } = useQuery({
    queryKey: ["admin-hotel-detail", id],
    queryFn: () => adminApi.getHotelDetail(id),
  });

  async function handleReview(action: "approved" | "rejected" | "suspended", reason?: string) {
    setActionError(null);
    setBusy(true);
    try {
      await adminApi.reviewHotel(id, { action, rejection_reason: reason });
      toast.success("Cập nhật trạng thái khách sạn thành công");
      await queryClient.invalidateQueries({ queryKey: ["admin-hotel-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Không thể tải hồ sơ khách sạn"}
      </p>
    );
  }
  if (!hotel) return null;

  const checklist = buildChecklist(hotel);
  const missing = checklist.filter((item) => !item.ok);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/super-admin/hotels" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{hotel.name}</h2>
            <HotelStatusBadge status={hotel.status} />
            {hotel.star_rating && <span className="text-sm text-muted-foreground">{hotel.star_rating}★</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            {hotel.address}
            {hotel.district ? `, ${hotel.district}` : ""}, {hotel.city}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hotel.status !== "approved" && (
            <Button onClick={() => handleReview("approved")} disabled={busy}>
              Duyệt
            </Button>
          )}
          {hotel.status !== "rejected" && (
            <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={busy}>
              Từ chối
            </Button>
          )}
          {hotel.status === "approved" && (
            <Button variant="outline" onClick={() => handleReview("suspended")} disabled={busy}>
              Tạm dừng
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      {hotel.rejection_reason && (
        <p className="text-sm text-destructive">Lý do từ chối hiện tại: {hotel.rejection_reason}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Loại phòng ({hotel.room_types.length})</CardTitle>
              <CardDescription>Nội dung khách sạn sẽ bán khi được duyệt.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {hotel.room_types.length === 0 ? (
                <p className="text-sm text-muted-foreground">Khách sạn chưa tạo loại phòng nào.</p>
              ) : (
                hotel.room_types.map((roomType) => (
                  <div key={roomType.id} className="flex flex-col gap-2 rounded-xl border p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {roomType.name}
                        {!roomType.is_active && <span className="ml-2 text-xs text-muted-foreground">(đã tắt)</span>}
                      </span>
                      <span className="font-semibold">{formatMoney(roomType.base_price)}/đêm</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Tối đa {roomType.max_guests} khách</span>
                      {formatBedConfig(roomType.bed_type, roomType.bed_count) && (
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="size-3.5" />
                          {formatBedConfig(roomType.bed_type, roomType.bed_count)}
                        </span>
                      )}
                      {roomType.area_sqm != null && (
                        <span className="flex items-center gap-1.5">
                          <Maximize2 className="size-3.5" />
                          {roomType.area_sqm} m²
                        </span>
                      )}
                      {/* Khai bao va thuc te lech nhau = chua nhap lieu xong. */}
                      <span className={cn(roomType.created_rooms < roomType.total_rooms && "text-warning-strong")}>
                        {roomType.created_rooms}/{roomType.total_rooms} phòng đã tạo
                      </span>
                      <span className={cn(roomType.image_count === 0 && "text-warning-strong")}>
                        {roomType.image_count} ảnh
                      </span>
                    </div>
                    {roomType.amenities.length > 0 ? (
                      <p className="text-xs text-muted-foreground">{roomType.amenities.join(" · ")}</p>
                    ) : (
                      <p className="text-xs text-warning-strong">Chưa gán tiện nghi phòng nào</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin khách sạn</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className={cn(!hotel.description && "italic text-muted-foreground")}>
                {hotel.description || "Chưa có mô tả."}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                <span>Nhận phòng {hotel.check_in_time.slice(0, 5)}</span>
                <span>Trả phòng {hotel.check_out_time.slice(0, 5)}</span>
                <span>{hotel.pets_allowed ? "Cho mang thú cưng" : "Không cho thú cưng"}</span>
              </div>
              <div>
                <p className="font-medium">Tiện nghi khách sạn</p>
                {hotel.amenities.length > 0 ? (
                  <p className="text-muted-foreground">{hotel.amenities.join(" · ")}</p>
                ) : (
                  <p className="text-warning-strong">Chưa gán tiện nghi nào</p>
                )}
              </div>
              <div>
                <p className="font-medium">Dịch vụ</p>
                {hotel.services.length > 0 ? (
                  <p className="text-muted-foreground">{hotel.services.join(" · ")}</p>
                ) : (
                  <p className="text-muted-foreground">Chưa có dịch vụ nào</p>
                )}
              </div>
              <div>
                <p className="font-medium">Phương thức thanh toán</p>
                <p className="text-muted-foreground">
                  {hotel.payment_methods.length > 0
                    ? hotel.payment_methods.map((method) => PAYMENT_METHOD_LABELS[method]).join(" · ")
                    : "Chưa chọn"}
                </p>
              </div>
              {hotel.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {hotel.images.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element -- URL anh tuy y (admin dan), khong khai bao truoc duoc remotePatterns
                    <img key={url} src={url} alt={hotel.name} className="h-24 w-36 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Chủ sở hữu</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <User className="size-3.5 text-muted-foreground" />
                {hotel.owner.full_name}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" />
                {hotel.owner.email}
              </span>
              {hotel.owner.phone && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {hotel.owner.phone}
                </span>
              )}
              {!hotel.owner.is_active && <span className="text-destructive">Tài khoản chủ sở hữu đang bị khóa</span>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mức độ hoàn thiện</CardTitle>
              <CardDescription>
                {missing.length === 0 ? "Đã đủ nội dung để bán." : `Còn ${missing.length} mục chưa có dữ liệu.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.ok ? (
                    <Check className="size-4 shrink-0 text-success-strong" />
                  ) : (
                    <X className="size-4 shrink-0 text-warning-strong" />
                  )}
                  <span className={cn(!item.ok && "text-warning-strong")}>{item.label}</span>
                  {item.detail && <span className="ml-auto text-xs text-muted-foreground">{item.detail}</span>}
                </div>
              ))}
            </CardContent>
          </Card>

          {hotel.total_reviews > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Đánh giá của khách</CardTitle>
              </CardHeader>
              <CardContent className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{hotel.avg_rating}</span>
                <span className="text-sm text-muted-foreground">/10 · {hotel.total_reviews} đánh giá</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối khách sạn</DialogTitle>
            <DialogDescription>Lý do sẽ hiển thị cho chủ khách sạn để họ biết cần bổ sung gì.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject_reason">Lý do từ chối</Label>
            <textarea
              id="reject_reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleReview("rejected", rejectReason || undefined);
                setRejectOpen(false);
              }}
              disabled={busy}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
