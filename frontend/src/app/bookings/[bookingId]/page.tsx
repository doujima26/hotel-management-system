"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, MessageSquareText, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatMoney, getRatingLabel } from "@/lib/utils/format";
import { bookingsApi } from "@/lib/api/bookings";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
import { PAYMENT_METHOD_LABELS } from "@/types/enums";
import type { Review } from "@/types/models";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";

const RATING_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface BookingDetailPageProps {
  params: Promise<{ bookingId: string }>;
}

export default function BookingDetailPage(props: BookingDetailPageProps) {
  return (
    <RequireAuth allow={["user"]}>
      <BookingDetailContent {...props} />
    </RequireAuth>
  );
}

function BookingDetailContent({ params }: BookingDetailPageProps) {
  const { bookingId } = use(params);
  const id = Number(bookingId);
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [rating, setRating] = useState("10");
  const [comment, setComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ["booking-detail", id],
    queryFn: () => bookingsApi.getDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const booking = bookingQuery.data;

  const reviewsQuery = useQuery({
    queryKey: ["hotel-reviews", booking?.hotel_id],
    queryFn: () => reviewsApi.listForHotelClient(booking!.hotel_id),
    enabled: Boolean(booking && booking.status === "checked_out"),
  });
  const myReview = reviewsQuery.data?.find((review) => review.booking_id === id);

  const invoiceQuery = useQuery({
    queryKey: ["booking-invoice", id],
    queryFn: () => bookingsApi.getInvoice(id),
    enabled: Boolean(booking && booking.status !== "pending"),
    retry: false,
  });

  const cancellable = booking && (booking.status === "pending" || booking.status === "confirmed");

  async function handleCancel() {
    if (!booking) return;
    setCancelError(null);
    setCancelling(true);
    try {
      await bookingsApi.cancel(booking.id, {});
      toast.success("Hủy booking thành công");
      queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Hủy booking thất bại");
    } finally {
      setCancelling(false);
    }
  }

  async function handleSubmitReview() {
    if (!booking) return;
    setReviewError(null);
    setReviewSubmitting(true);
    try {
      await reviewsApi.create({ booking_id: booking.id, rating: Number(rating), comment: comment || undefined });
      toast.success("Đánh giá thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-reviews", booking.hotel_id] });
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : "Đánh giá thất bại");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleUpdateReview() {
    if (!booking || !myReview) return;
    setReviewError(null);
    setReviewSubmitting(true);
    try {
      await reviewsApi.update(myReview.id, { rating: Number(rating), comment: comment || undefined });
      toast.success("Cập nhật đánh giá thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-reviews", booking.hotel_id] });
      setEditingReview(false);
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleDeleteReview() {
    if (!booking || !myReview) return;
    setReviewError(null);
    setReviewSubmitting(true);
    try {
      await reviewsApi.remove(myReview.id);
      toast.success("Đã xóa đánh giá");
      await queryClient.invalidateQueries({ queryKey: ["hotel-reviews", booking.hotel_id] });
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : "Xóa thất bại");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function startEditingReview(review: Review) {
    setRating(String(review.rating));
    setComment(review.comment ?? "");
    setEditingReview(true);
    setReviewError(null);
  }

  if (bookingQuery.isLoading) {
    return <p className="px-4 py-12 text-center text-muted-foreground">Đang tải...</p>;
  }
  if (bookingQuery.error || !booking) {
    return (
      <p className="px-4 py-12 text-center text-destructive">
        {bookingQuery.error instanceof ApiError ? bookingQuery.error.message : "Không tìm thấy booking"}
      </p>
    );
  }

  const nights = booking.rooms[0]?.num_nights ?? 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href="/bookings" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách booking
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{booking.hotel_name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <BookingStatusBadge status={booking.status} />
              {booking.payment_status && <PaymentStatusBadge status={booking.payment_status} />}
            </div>
          </div>
          <CardDescription>Mã đơn {booking.booking_code}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Dia chi va so dien thoai khach san de khach con den va lien lac duoc. */}
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              {booking.hotel_address}, {booking.hotel_city}
            </span>
            {booking.hotel_phone && (
              <span className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                <a href={`tel:${booking.hotel_phone}`} className="text-primary hover:underline">
                  {booking.hotel_phone}
                </a>
              </span>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Nhận phòng</p>
              <p className="font-medium">{formatDate(booking.check_in_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trả phòng</p>
              <p className="font-medium">{formatDate(booking.check_out_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số đêm</p>
              <p className="font-medium">{nights}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số khách</p>
              <p className="font-medium">{booking.num_guests}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 text-sm">
            {booking.rooms.map((room) => (
              <div key={room.id} className="flex items-start justify-between gap-2">
                <span>
                  {room.room_type_name} x{room.quantity}
                  <span className="block text-xs text-muted-foreground">
                    {formatMoney(room.price_per_night)}/đêm · {room.num_nights} đêm
                  </span>
                </span>
                <span className="font-medium">{formatMoney(room.subtotal)}</span>
              </div>
            ))}
            {booking.services.map((service) => (
              <div key={service.service_id} className="flex items-start justify-between gap-2">
                <span>
                  {service.name} x{service.quantity}
                  <span className="block text-xs text-muted-foreground">{formatMoney(service.unit_price)}/lần</span>
                </span>
                <span className="font-medium">{formatMoney(service.subtotal)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tiền phòng</span>
              <span>{formatMoney(booking.total_room_price)}</span>
            </div>
            {/* Chi hien cac dong thuc su phat sinh, khong bay ra dong 0 d. */}
            {booking.total_service_price > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền dịch vụ</span>
                <span>{formatMoney(booking.total_service_price)}</span>
              </div>
            )}
            {booking.discount_amount > 0 && (
              <div className="flex justify-between text-success-strong">
                <span>Giảm giá</span>
                <span>-{formatMoney(booking.discount_amount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
              <span>Tổng cộng</span>
              <span>{formatMoney(booking.total_amount)}</span>
            </div>
            {booking.payment_method && (
              <p className="text-xs text-muted-foreground">
                Thanh toán qua {PAYMENT_METHOD_LABELS[booking.payment_method]}
              </p>
            )}
          </div>

          {booking.special_requests && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
              Yêu cầu của bạn: {booking.special_requests}
            </p>
          )}
          {booking.cancellation_reason && (
            <p className="text-sm text-destructive">
              Lý do hủy: {booking.cancellation_reason}
              {booking.cancelled_at ? ` (${formatDate(booking.cancelled_at)})` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {invoiceQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Hóa đơn {invoiceQuery.data.invoice_number}</CardTitle>
            <CardDescription>Xuất ngày {formatDateTime(invoiceQuery.data.issued_at)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-muted-foreground">Người mua</p>
                <p className="font-medium">{invoiceQuery.data.buyer_name}</p>
                <p className="text-muted-foreground">{invoiceQuery.data.buyer_email}</p>
                {invoiceQuery.data.buyer_phone && (
                  <p className="text-muted-foreground">{invoiceQuery.data.buyer_phone}</p>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-muted-foreground">Đơn vị cung cấp</p>
                <p className="font-medium">{invoiceQuery.data.seller_name}</p>
                <p className="text-muted-foreground">{invoiceQuery.data.seller_address}</p>
                {invoiceQuery.data.seller_phone && (
                  <p className="text-muted-foreground">{invoiceQuery.data.seller_phone}</p>
                )}
                {invoiceQuery.data.seller_email && (
                  <p className="text-muted-foreground">{invoiceQuery.data.seller_email}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Lap lai day du cac dong tien tren hoa don, khong chi mot con so tong. */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền phòng</span>
                <span>{formatMoney(invoiceQuery.data.total_room_price)}</span>
              </div>
              {invoiceQuery.data.total_service_price > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền dịch vụ</span>
                  <span>{formatMoney(invoiceQuery.data.total_service_price)}</span>
                </div>
              )}
              {invoiceQuery.data.discount_amount > 0 && (
                <div className="flex justify-between text-success-strong">
                  <span>Giảm giá</span>
                  <span>-{formatMoney(invoiceQuery.data.discount_amount)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                <span>Tổng tiền đã thanh toán</span>
                <span>{formatMoney(invoiceQuery.data.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}

      {cancellable && (
        <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
          {cancelling ? "Đang hủy..." : "Hủy booking"}
        </Button>
      )}

      {booking.status === "checked_out" && (!myReview || editingReview) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingReview ? "Sửa đánh giá" : "Viết đánh giá"}</CardTitle>
            <CardDescription>Chia sẻ trải nghiệm của bạn về kỳ nghỉ này.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Hang nut 1-10 thay cho dropdown: thang diem 10 co 10 muc, chon
                bang 1 lan bam va thay het cac muc cung luc de de uoc luong. */}
            <div className="flex flex-col gap-1.5">
              <Label>Điểm đánh giá (thang 10)</Label>
              <div className="flex flex-wrap gap-1.5">
                {RATING_SCALE.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(String(value))}
                    aria-pressed={Number(rating) === value}
                    className={cn(
                      "size-9 rounded-lg border text-sm font-semibold transition-colors",
                      Number(rating) === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary hover:text-primary",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{getRatingLabel(Number(rating))}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comment">Nhận xét (không bắt buộc)</Label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
            <div className="flex gap-2">
              <Button
                onClick={editingReview ? handleUpdateReview : handleSubmitReview}
                disabled={reviewSubmitting}
                className="self-start"
              >
                {reviewSubmitting ? "Đang lưu..." : editingReview ? "Lưu thay đổi" : "Gửi đánh giá"}
              </Button>
              {editingReview && (
                <Button variant="outline" onClick={() => setEditingReview(false)} disabled={reviewSubmitting}>
                  Hủy
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {booking.status === "checked_out" && myReview && !editingReview && (
        <Card>
          <CardHeader>
            <CardTitle>Đánh giá của bạn</CardTitle>
            <CardDescription>
              {myReview.rating}/10 - {getRatingLabel(myReview.rating)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {myReview.comment && <p className="text-sm">{myReview.comment}</p>}
            {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => startEditingReview(myReview)}>
                Sửa
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteReview} disabled={reviewSubmitting}>
                Xóa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
