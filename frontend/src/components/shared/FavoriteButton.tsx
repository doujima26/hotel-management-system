"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { favoritesApi } from "@/lib/api/favorites";
import { ApiError } from "@/types/api";

export function FavoriteButton({ hotelId }: { hotelId: number }) {
  const { user, isHydrated, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const isCustomer = isAuthenticated && user?.role === "user";

  const { data: favorites } = useQuery({
    queryKey: ["my-favorites"],
    queryFn: () => favoritesApi.list(),
    enabled: isCustomer,
  });

  if (!isHydrated || !isCustomer) {
    return null;
  }

  const isFavorited = favorites?.some((favorite) => favorite.hotel_id === hotelId) ?? false;

  async function handleToggle() {
    setSubmitting(true);
    try {
      if (isFavorited) {
        await favoritesApi.remove(hotelId);
        toast.success("Đã bỏ yêu thích");
      } else {
        await favoritesApi.add(hotelId);
        toast.success("Đã thêm vào yêu thích");
      }
      await queryClient.invalidateQueries({ queryKey: ["my-favorites"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button variant={isFavorited ? "secondary" : "outline"} size="sm" onClick={handleToggle} disabled={submitting}>
      {isFavorited ? "♥ Đã yêu thích" : "♡ Thêm yêu thích"}
    </Button>
  );
}
