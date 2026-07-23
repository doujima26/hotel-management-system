import { ApiError, type ApiResponse } from "@/types/api";

const API_PREFIX = "/api/v1";
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

type ServerParamValue = string | number | boolean | undefined | null | Array<string | number>;

interface ServerFetchOptions {
  params?: Record<string, ServerParamValue>;
}

function buildServerUrl(path: string, params?: ServerFetchOptions["params"]): string {
  const url = new URL(`${API_PREFIX}${path}`, BACKEND_ORIGIN);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      // Mang -> lap lai param (dung cho query kieu list cua FastAPI), scalar -> set 1 lan.
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(key, String(item));
          }
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// Goi thang backend tu Server Component - rewrites proxy trong next.config.ts chi ap
// dung cho request phat ra tu trinh duyet, Server Component phai tu goi bang URL tuyet doi.
export async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T> {
  const res = await fetch(buildServerUrl(path, options.params), { cache: "no-store" });
  const envelope: ApiResponse<T> = await res.json();

  if (!envelope.success) {
    throw new ApiError(envelope.message, res.status, envelope.error_code, envelope.errors);
  }

  return envelope.data as T;
}
