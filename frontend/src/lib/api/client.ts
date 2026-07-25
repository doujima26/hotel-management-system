import { ApiError, type ApiResponse } from "@/types/api";
import { getAccessToken, logout, refreshAccessToken } from "@/lib/auth/session";

// Tat ca request di qua "/api/v1" - Next.js rewrites proxy sang backend that (xem next.config.ts),
// nen trinh duyet chi thay 1 origin duy nhat, khong dinh loi CORS.
const API_PREFIX = "/api/v1";

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  // Da tu goi refresh 1 lan cho request nay chua, tranh vong lap refresh vo han.
  _retried?: boolean;
}

function buildUrl(path: string, params?: ApiFetchOptions["params"]): string {
  const url = new URL(`${API_PREFIX}${path}`, "http://placeholder.local");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, params, auth = false, _retried = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 khi co auth: thu refresh access token 1 lan roi goi lai request goc.
  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    // Refresh that bai (token het han hoac da bi thu hoi do doi mat khau tren
    // thiet bi khac) -> xoa phien cuc bo de RequireAuth dua ve trang dang nhap.
    logout();
  }

  const envelope: ApiResponse<T> = await res.json();

  if (!envelope.success) {
    throw new ApiError(envelope.message, res.status, envelope.error_code, envelope.errors);
  }

  return envelope.data as T;
}
