import { apiFetch } from "./client";
import type {
  ChangePasswordResult,
  ForgotPasswordResult,
  LoginResult,
  RegisterResult,
  ResetPasswordResult,
  SendVerifyOtpResult,
  User,
} from "@/types/models";

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

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}

export interface SendVerifyOtpPayload {
  email: string;
}

export const authApi = {
  // role luon la "user" - form dang ky khach hang cong khai khong duoc chon role.
  register: (payload: RegisterPayload) =>
    apiFetch<RegisterResult>("/auth/register", { method: "POST", body: { ...payload, role: "user" } }),
  // role luon la "admin" - chi goi tu /admin/register (dang ky chu khach san), khong dung chung form khach hang.
  registerAdmin: (payload: RegisterPayload) =>
    apiFetch<RegisterResult>("/auth/register", { method: "POST", body: { ...payload, role: "admin" } }),
  login: (payload: LoginPayload) => apiFetch<LoginResult>("/auth/login", { method: "POST", body: payload }),
  me: () => apiFetch<User>("/auth/me", { auth: true }),
  verifyAccount: (payload: VerifyAccountPayload) =>
    apiFetch<{ user_id: number; is_verified: boolean }>("/auth/verify-account", { method: "POST", body: payload }),
  sendVerifyOtp: (payload: SendVerifyOtpPayload) =>
    apiFetch<SendVerifyOtpResult>("/auth/send-verify-otp", { method: "POST", body: payload }),
  changePassword: (payload: ChangePasswordPayload) =>
    apiFetch<ChangePasswordResult>("/auth/change-password", { method: "POST", body: payload, auth: true }),
  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiFetch<ForgotPasswordResult>("/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload: ResetPasswordPayload) =>
    apiFetch<ResetPasswordResult>("/auth/reset-password", { method: "POST", body: payload }),
};
