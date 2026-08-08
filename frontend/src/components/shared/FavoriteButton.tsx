"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { favoritesApi } from "@/lib/api/favorites";
import { getErrorMessage } from "@/types/api";

interface FavoriteButtonProps {
  hotelId: number;
  // "button": nut chu day du (mac dinh, dung canh ten khach san).
  // "icon": nut tron chi co icon, dung de de len goc anh trong the ket qua tim kiem.
  variant?: "button" | "icon";
}

export function FavoriteButton({ hotelId, variant = "button" }: FavoriteButtonProps) {
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

  async function handleToggle(e?: MouseEvent) {
    // The-icon thuong nam trong 1 Link bao ngoai (the ket qua tim kiem) - chan
    // khong cho bam icon lai dieu huong sang trang chi tiet.
    e?.preventDefault();
    e?.stopPropagation();
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
      toast.error(getErrorMessage(err, "Thao tác thất bại"));
    } finally {
      setSubmitting(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={submitting}
        aria-label={isFavorited ? "Bỏ yêu thích" : "Thêm yêu thích"}
        className="flex size-8 items-center justify-center rounded-full bg-background/90 shadow-md backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
      >
        <Heart className={cn("size-4", isFavorited ? "fill-destructive text-destructive" : "text-foreground")} />
      </button>
    );
  }

  return (
    <Button variant={isFavorited ? "secondary" : "outline"} size="sm" onClick={handleToggle} disabled={submitting}>
      {isFavorited ? "♥ Đã yêu thích" : "♡ Thêm yêu thích"}
    </Button>
  );
}
