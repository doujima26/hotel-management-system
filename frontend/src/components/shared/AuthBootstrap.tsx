"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bootstrapSession } from "@/lib/auth/bootstrap";
import { useAuthStore } from "@/lib/auth/store";

// Chay 1 lan khi app load de khoi phuc phien dang nhap tu refresh token (neu co).
export function AuthBootstrap() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const prevUserId = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  // Khi danh tinh nguoi dung thay doi (dang nhap / dang xuat / doi tai khoan),
  // xoa toan bo cache React Query de khong lan du lieu (["me"], ["my-hotel"]...)
  // giua cac user - tranh dang nhap tai khoan khac van thay du lieu nguoi truoc.
  useEffect(() => {
    if (prevUserId.current !== undefined && prevUserId.current !== userId) {
      queryClient.clear();
    }
    prevUserId.current = userId;
  }, [userId, queryClient]);

  return null;
}
