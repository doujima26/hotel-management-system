import { create } from "zustand";
import type { User } from "@/types/models";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isHydrated: boolean;
  setSession: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  setHydrated: () => void;
  clear: () => void;
}

// Access token chi luu trong memory (khong persist) de giam rui ro XSS.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isHydrated: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrated: () => set({ isHydrated: true }),
  clear: () => set({ accessToken: null, user: null }),
}));
