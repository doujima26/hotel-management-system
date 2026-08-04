"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, MapPin } from "lucide-react";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AccountShell } from "@/components/shared/AccountShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { favoritesApi } from "@/lib/api/favorites";
import { ApiError } from "@/types/api";

export default function WishlistPage() {
  return (
    <RequireAuth allow={["user"]}>
      <AccountShell>
        <WishlistContent />
      </AccountShell>
    </RequireAuth>
  );
}

function WishlistContent() {
  const queryClient = useQueryClient();
  const { data: favorites, isLoading, error } = useQuery({
    queryKey: ["my-favorites"],
    queryFn: () => favoritesApi.list(),
  });

  async function handleRemove(hotelId: number) {
    try {
      await favoritesApi.remove(hotelId);
      toast.success("Đã bỏ yêu thích");
      await queryClient.invalidateQueries({ queryKey: ["my-favorites"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bỏ yêu thích thất bại");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Khách sạn yêu thích</h1>
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách yêu thích"}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {favorites?.map((favorite) => (
          <Card key={favorite.id} className="overflow-hidden p-0">
            <div className="flex flex-col sm:flex-row">
              <Link
                href={`/hotels/${favorite.hotel_id}`}
                className="relative h-40 w-full shrink-0 bg-muted sm:h-auto sm:w-56"
              >
                {favorite.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL anh tuy y (admin dan), khong khai bao truoc remotePatterns cho next/image
                  <img
                    src={favorite.primary_image_url}
                    alt={favorite.hotel_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Building2 className="size-8" />
                  </div>
                )}
                {favorite.deal_discount_percent && (
                  <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    -{favorite.deal_discount_percent}%
                  </span>
                )}
              </Link>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/hotels/${favorite.hotel_id}`} className="text-lg font-semibold hover:underline">
                    {favorite.hotel_name}
                  </Link>
                  {favorite.star_rating && (
                    <span className="text-sm text-muted-foreground">{favorite.star_rating}★</span>
                  )}
                  {!favorite.is_bookable && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      Tạm ngừng nhận đặt phòng
                    </span>
                  )}
                </div>

                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  {[favorite.address, favorite.district, favorite.city].filter(Boolean).join(", ")}
                </p>

                {favorite.total_reviews > 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                      {favorite.avg_rating.toFixed(1)}
                    </span>
                    ({favorite.total_reviews} đánh giá)
                  </p>
                )}

                {favorite.deal_label && (
                  <p className="text-sm font-medium text-primary">
                    {favorite.deal_label}
                    {favorite.deal_starts_on
                      ? ` · từ ${formatDate(favorite.deal_starts_on)}`
                      : " · đang áp dụng"}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
                  <div>
                    {favorite.from_price != null && (
                      <p className="text-sm text-muted-foreground">
                        Từ <span className="font-semibold text-foreground">{formatMoney(favorite.from_price)}</span> /
                        đêm
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Đã lưu ngày {formatDate(favorite.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/hotels/${favorite.hotel_id}`}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                    >
                      Xem chi tiết
                    </Link>
                    <Button size="sm" variant="destructive" onClick={() => handleRemove(favorite.hotel_id)}>
                      Bỏ yêu thích
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {favorites && favorites.length === 0 && (
          <EmptyState
            title="Chưa có khách sạn yêu thích nào"
            hint="Bấm biểu tượng trái tim ở trang khách sạn để lưu lại những nơi bạn quan tâm."
          />
        )}
      </div>
    </div>
  );
}
