import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/models";
import { useAuthStore } from "./store";
import { clearRefreshToken, getRefreshToken, refreshAccessToken } from "./session";

// Chay 1 lan luc app load: neu co refresh token trong localStorage nhung chua co
// access token trong memory (vd sau khi F5 trang), thu refresh roi lay lai thong
// tin user qua GET /auth/me de khoi phuc phien dang nhap.
export async function bootstrapSession(): Promise<void> {
  const store = useAuthStore.getState();

  if (store.accessToken) {
    store.setHydrated();
    return;
  }

  if (!getRefreshToken()) {
    store.setHydrated();
    return;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    clearRefreshToken();
    store.setHydrated();
    return;
  }

  try {
    const me = await apiFetch<User>("/auth/me", { auth: true });
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      useAuthStore.getState().setSession(accessToken, me);
    }
  } catch {
    clearRefreshToken();
    useAuthStore.getState().clear();
  } finally {
    useAuthStore.getState().setHydrated();
  }
}
