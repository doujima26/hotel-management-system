"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BedDouble, Check, ChevronLeft, Lock, Mail, Maximize2, Phone, User, X } from "lucide-react";
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
import { formatBedConfig, formatDate, formatMoney, formatPercent } from "@/lib/utils/format";
import { adminApi } from "@/lib/api/admin";
import { getErrorMessage } from "@/types/api";
import { PAYMENT_METHOD_LABELS } from "@/types/enums";
import { HotelStatusBadge } from "@/components/shared/StatusBadge";
import type { AdminHotelDetail } from "@/types/models";

interface PageProps {
  params: Promise<{ hotelId: string }>;
}

// Dung danh sach kiem tra muc do hoan thien du lieu cua khach san truoc khi duyet.
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
  // Hop thoai nhap ly do, dung chung cho tu choi va tam dung.
  const [reasonAction, setReasonAction] = useState<"rejected" | "suspended" | null>(null);
  const [reason, setReason] = useState("");

  const { data: hotel, isLoading, error } = useQuery({
    queryKey: ["admin-hotel-detail", id],
    queryFn: () => adminApi.getHotelDetail(id),
  });

  async function handleReview(action: "approved" | "rejected" | "suspended", reason?: string) {
    setActionError(null);
    setBusy(true);
    try {
      await adminApi.reviewHotel(id, { action, reason });
      toast.success("Cập nhật trạng thái khách sạn thành công");
      await queryClient.invalidateQueries({ queryKey: ["admin-hotel-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    } catch (err) {
      setActionError(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setBusy(false);
    }
  }

  function openReasonDialog(action: "rejected" | "suspended") {
    setReason("");
    setReasonAction(action);
  }

  if (isLoading) return <p className="text-muted-foreground">Đang tải...</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getErrorMessage(error, "Không thể tải hồ sơ khách sạn")}
      </p>
    );
  }
  if (!hotel) return null;

  const checklist = buildChecklist(hotel);
  const missing = checklist.filter((item) => !item.ok);
  // Sap xep nhan vien dang lam viec len truoc, nguoi da nghi xuong cuoi.
  const activeStaff = hotel.staff.filter((item) => item.is_active);
  const staffOrdered = [...activeStaff, ...hotel.staff.filter((item) => !item.is_active)];
  const lockedStaffCount = hotel.staff.filter((item) => !item.account_active).length;

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
        {/* Cac nut thao tac hien theo trang thai khach san. */}
        <div className="flex flex-wrap gap-2">
          {hotel.status === "pending" && (
            <>
              <Button onClick={() => handleReview("approved")} disabled={busy}>
                Duyệt
              </Button>
              <Button variant="destructive" onClick={() => openReasonDialog("rejected")} disabled={busy}>
                Từ chối
              </Button>
            </>
          )}
          {hotel.status === "approved" && (
            <Button variant="destructive" onClick={() => openReasonDialog("suspended")} disabled={busy}>
              Tạm dừng
            </Button>
          )}
          {(hotel.status === "rejected" || hotel.status === "suspended") && (
            <Button onClick={() => handleReview("approved")} disabled={busy}>
              Duyệt lại
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      {hotel.rejection_reason && (
        <p className="text-sm text-destructive">
          {hotel.status === "suspended" ? "Lý do tạm dừng" : "Lý do từ chối"}: {hotel.rejection_reason}
        </p>
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
                      {/* So phong da tao so voi so phong khai bao. */}
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
              <CardTitle>Tài khoản nhân viên ({hotel.staff.length})</CardTitle>
              <CardDescription>
                {hotel.staff.length === 0
                  ? "Khách sạn chưa tạo tài khoản nhân viên nào."
                  : `${activeStaff.length} đang làm việc${
                      lockedStaffCount > 0 ? ` · ${lockedStaffCount} tài khoản đang bị khóa` : ""
                    }`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {hotel.staff.length === 0 ? (
                // Khach san da duyet ma chua co nhan vien thi bao mau canh bao.
                <p className={cn("text-sm", hotel.status === "approved" ? "text-warning-strong" : "text-muted-foreground")}>
                  {hotel.status === "approved"
                    ? "Khách sạn đang bán nhưng chưa có nhân viên vận hành nào."
                    : "Chủ khách sạn sẽ tạo tài khoản nhân viên sau khi được duyệt."}
                </p>
              ) : (
                staffOrdered.map((staff) => (
                  <div
                    key={staff.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border p-3 text-sm",
                      !staff.is_active && "opacity-60",
                    )}
                  >
                    <span className="font-medium">{staff.full_name}</span>
                    <span className="text-muted-foreground">{staff.position}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5" />
                      {staff.email}
                    </span>
                    {staff.phone && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3.5" />
                        {staff.phone}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      {staff.hired_at && (
                        <span className="text-xs text-muted-foreground">Vào làm {formatDate(staff.hired_at)}</span>
                      )}
                      {/* Nhan trang thai tai khoan dang nhap. */}
                      {!staff.account_active && (
                        <span className="flex items-center gap-1 rounded-md bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger-strong">
                          <Lock className="size-3" />
                          Tài khoản bị khóa
                        </span>
                      )}
                      {!staff.is_active && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Đã nghỉ
                        </span>
                      )}
                    </span>
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
              <CardTitle>Hoạt động</CardTitle>
              <CardDescription>Cùng số liệu hiển thị ở danh sách khách sạn.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {/* So don chua tra phong tinh tai thoi diem hien tai. */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Đơn chưa trả phòng</span>
                <span className={cn("font-medium", hotel.outstanding_bookings > 0 && "text-warning-strong")}>
                  {hotel.outstanding_bookings}
                </span>
              </div>
              <p className="pt-1 text-xs font-medium text-muted-foreground">30 ngày gần nhất</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Đơn đặt phòng</span>
                <span className={cn("font-medium", hotel.bookings_30d === 0 && "text-warning-strong")}>
                  {hotel.bookings_30d}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Doanh thu</span>
                <span className="font-medium">{formatMoney(hotel.revenue_30d)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tỷ lệ hủy</span>
                {/* Khong co don nao thi hien dau gach, khong phai 0%. */}
                <span
                  className={cn(
                    "font-medium",
                    hotel.cancel_rate_30d != null && hotel.cancel_rate_30d >= 0.3 && "text-danger-strong",
                  )}
                >
                  {hotel.cancel_rate_30d != null ? formatPercent(hotel.cancel_rate_30d) : "—"}
                </span>
              </div>
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

      <Dialog open={reasonAction !== null} onOpenChange={(open) => !open && setReasonAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonAction === "suspended" ? "Tạm dừng khách sạn" : "Từ chối khách sạn"}</DialogTitle>
            <DialogDescription>
              {reasonAction === "suspended"
                ? "Khách sạn sẽ bị gỡ khỏi kết quả tìm kiếm và không nhận đơn mới. Đơn đã đặt vẫn được phục vụ bình thường."
                : "Lý do sẽ hiển thị cho chủ khách sạn để họ biết cần bổ sung gì."}
            </DialogDescription>
          </DialogHeader>

          {/* Canh bao so don chua tra phong khi tam dung. */}
          {reasonAction === "suspended" && hotel.outstanding_bookings > 0 && (
            <p className="rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning-strong">
              Khách sạn còn <strong>{hotel.outstanding_bookings} đơn chưa trả phòng</strong>. Khách đã đặt vẫn đến nhận
              phòng theo lịch, khách sạn vẫn phải phục vụ họ.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review_reason">
              {reasonAction === "suspended" ? "Lý do tạm dừng" : "Lý do từ chối"}
            </Label>
            <textarea
              id="review_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonAction(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!reasonAction) return;
                await handleReview(reasonAction, reason.trim() || undefined);
                setReasonAction(null);
              }}
              // Tam dung bat buoc phai co ly do.
              disabled={busy || (reasonAction === "suspended" && !reason.trim())}
            >
              {reasonAction === "suspended" ? "Tạm dừng" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
