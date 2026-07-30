"use client";

import { useQuery } from "@tanstack/react-query";
import { BedDouble, CalendarDays, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, getRatingLabel } from "@/lib/utils/format";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

// Tinh so dem luu tru tu 2 moc ngay (chuoi YYYY-MM-DD) de hien kem khoang ngay.
function countNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function AdminReviewsPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";

  const { data, isLoading, error } = useQuery({
    queryKey: ["hotel-reviews"],
    queryFn: () => reviewsApi.listForOwnHotel(),
    enabled: approved,
  });

  if (!approved) {
    return <p className="text-muted-foreground">Khách sạn cần được duyệt trước khi xem đánh giá.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Đánh giá</h2>
        <p className="text-sm text-muted-foreground">Toàn bộ đánh giá của khách đã lưu trú tại khách sạn.</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách đánh giá"}
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState title="Chưa có đánh giá nào" hint="Đánh giá sẽ xuất hiện ở đây sau khi khách trả phòng và đánh giá." />
      )}

      {data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{review.reviewer_name}</CardTitle>
                    <CardDescription>Đánh giá ngày {formatDate(review.created_at)}</CardDescription>
                  </div>
                  {/* Diem thang 10 kem nhan chu - cung mot cach hien nhu trang
                      cong khai, khong dung ngoi sao (ngoi sao la hang sao khach san). */}
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">
                      {review.rating}
                    </span>
                    <span className="text-sm font-medium">{getRatingLabel(review.rating)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {/* Thong tin lan luu tru bi danh gia - de Admin biet danh gia noi
                    ve don nao, loai phong nao ma khong phai tra cuu sang trang booking. */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Receipt className="size-3.5 text-muted-foreground" />
                    {review.booking_code}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDate(review.check_in_date)} - {formatDate(review.check_out_date)} ·{" "}
                    {countNights(review.check_in_date, review.check_out_date)} đêm
                  </span>
                  {review.room_type_names.length > 0 && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <BedDouble className="size-3.5" />
                      {review.room_type_names.join(", ")}
                    </span>
                  )}
                </div>

                {review.comment ? (
                  <p className="rounded-lg border bg-muted/40 p-2.5 text-sm">{review.comment}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Khách không để lại nhận xét.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
