import { apiFetch } from "./client";
import type { User } from "@/types/models";

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export const usersApi = {
  updateMe: (payload: UpdateProfilePayload) => apiFetch<User>("/users/me", { method: "PATCH", body: payload, auth: true }),
};
