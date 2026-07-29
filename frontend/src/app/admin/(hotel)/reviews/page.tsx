"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

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
              <CardContent className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{review.reviewer_name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("size-4", i < review.rating ? "fill-primary text-primary" : "text-muted-foreground")} />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
