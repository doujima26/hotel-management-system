"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { favoritesApi } from "@/lib/api/favorites";
import { ApiError } from "@/types/api";

export default function WishlistPage() {
  return (
    <RequireAuth allow={["user"]}>
      <WishlistContent />
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Khách sạn yêu thích</h1>
      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Không thể tải danh sách yêu thích"}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {favorites?.map((favorite) => (
          <Card key={favorite.id}>
            <CardHeader>
              <CardTitle>{favorite.hotel_name}</CardTitle>
              <CardDescription>{favorite.city}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href={`/hotels/${favorite.hotel_id}`} className="text-sm text-primary hover:underline self-center">
                Xem chi tiết
              </Link>
              <Button size="sm" variant="destructive" onClick={() => handleRemove(favorite.hotel_id)}>
                Bỏ yêu thích
              </Button>
            </CardContent>
          </Card>
        ))}
        {favorites && favorites.length === 0 && (
          <p className="text-center text-muted-foreground">Chưa có khách sạn yêu thích nào.</p>
        )}
      </div>
    </div>
  );
}
