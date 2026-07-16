"use client";

import { useEffect } from "react";
import { bootstrapSession } from "@/lib/auth/bootstrap";

// Chay 1 lan khi app load de khoi phuc phien dang nhap tu refresh token (neu co).
export function AuthBootstrap() {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  return null;
}
