import { apiFetch } from "./client";
import type { LoginResult, RegisterResult, User } from "@/types/models";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyAccountPayload {
  email: string;
  otp: string;
}

export const authApi = {
  // role luon la "user" o Milestone 1 - form dang ky khach hang khong duoc chon role.
  register: (payload: RegisterPayload) =>
    apiFetch<RegisterResult>("/auth/register", { method: "POST", body: { ...payload, role: "user" } }),
  login: (payload: LoginPayload) => apiFetch<LoginResult>("/auth/login", { method: "POST", body: payload }),
  me: () => apiFetch<User>("/auth/me", { auth: true }),
  verifyAccount: (payload: VerifyAccountPayload) =>
    apiFetch<{ user_id: number; is_verified: boolean }>("/auth/verify-account", { method: "POST", body: payload }),
};
