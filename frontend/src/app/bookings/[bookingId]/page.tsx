"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { bookingsApi } from "@/lib/api/bookings";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
import { BOOKING_STATUS_LABELS } from "@/types/enums";
import type { Review } from "@/types/models";

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
  const [rating, setRating] = useState("5");
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href="/bookings" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Danh sách booking
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Booking {booking.booking_code}</CardTitle>
            <Badge variant="secondary">{BOOKING_STATUS_LABELS[booking.status]}</Badge>
          </div>
          <CardDescription>
            {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)} - {booking.num_guests} khách
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {booking.rooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between text-sm">
                <span>
                  Loại phòng #{room.room_type_id} x{room.quantity} ({room.num_nights} đêm)
                </span>
                <span>{formatMoney(room.subtotal)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tiền phòng</span>
              <span>{formatMoney(booking.total_room_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tiền dịch vụ</span>
              <span>{formatMoney(booking.total_service_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giảm giá</span>
              <span>-{formatMoney(booking.discount_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Tổng cộng</span>
              <span>{formatMoney(booking.total_amount)}</span>
            </div>
          </div>
          {booking.special_requests && (
            <p className="text-sm text-muted-foreground">Yêu cầu: {booking.special_requests}</p>
          )}
          {booking.cancellation_reason && (
            <p className="text-sm text-destructive">Lý do hủy: {booking.cancellation_reason}</p>
          )}
        </CardContent>
      </Card>

      {invoiceQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Hóa đơn {invoiceQuery.data.invoice_number}</CardTitle>
            <CardDescription>Xuất ngày {formatDate(invoiceQuery.data.issued_at)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Tổng tiền đã thanh toán: {formatMoney(invoiceQuery.data.total_amount)}</p>
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rating">Số sao</Label>
              <Select value={rating} onValueChange={(v) => v && setRating(v)}>
                <SelectTrigger id="rating" className="w-32">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho (so, thieu chu "sao"). */}
                  <SelectValue>{(current) => (current ? `${current} sao` : "")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} sao
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <CardDescription>{myReview.rating} sao</CardDescription>
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
