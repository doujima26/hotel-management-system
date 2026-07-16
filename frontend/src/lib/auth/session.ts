import { useAuthStore } from "./store";
import type { LoginResult, RefreshResult } from "@/types/models";
import type { ApiResponse } from "@/types/api";

const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setRefreshToken(token: string) {
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Ap dung ket qua dang nhap: luu refresh token vao localStorage, access token + user vao memory.
export function applyLoginResult(result: LoginResult) {
  setRefreshToken(result.refresh_token);
  useAuthStore.getState().setSession(result.access_token, {
    id: result.user.id,
    email: result.user.email,
    full_name: result.user.full_name,
    role: result.user.role,
    is_active: true,
    is_verified: true,
  });
}

export function logout() {
  clearRefreshToken();
  useAuthStore.getState().clear();
}

let refreshPromise: Promise<boolean> | null = null;

// Goi POST /auth/refresh bang fetch tho (khong qua apiFetch) de tranh vong lap import.
// Dung chung 1 promise neu nhieu request 401 cung luc kich hoat refresh.
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const envelope: ApiResponse<RefreshResult> = await res.json();
    if (!envelope.success || !envelope.data) return false;

    useAuthStore.getState().setAccessToken(envelope.data.access_token);
    return true;
  } catch {
    return false;
  }
}
