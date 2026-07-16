import { useAuthStore } from "@/lib/auth/store";

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return {
    accessToken,
    user,
    isHydrated,
    isAuthenticated: Boolean(accessToken && user),
  };
}
