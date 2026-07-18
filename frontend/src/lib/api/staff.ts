import { apiFetch } from "./client";
import type { CreateStaffResult, DeleteScheduleResult, StaffMember, StaffSchedule } from "@/types/models";
import type { ShiftType } from "@/types/enums";

export interface CreateStaffPayload {
  email: string;
  full_name: string;
  phone?: string;
  position: string;
  hired_at?: string;
}

export interface UpdateStaffPayload {
  position?: string;
  is_active?: boolean;
  hired_at?: string;
}

export interface CreateSchedulePayload {
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface UpdateSchedulePayload {
  shift_date?: string;
  shift_type?: ShiftType;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

export const staffApi = {
  create: (payload: CreateStaffPayload) => apiFetch<CreateStaffResult>("/staff", { method: "POST", body: payload, auth: true }),
  list: () => apiFetch<StaffMember[]>("/staff", { auth: true }),
  update: (staffId: number, payload: UpdateStaffPayload) =>
    apiFetch<StaffMember>(`/staff/${staffId}`, { method: "PATCH", body: payload, auth: true }),

  createSchedule: (staffId: number, payload: CreateSchedulePayload) =>
    apiFetch<StaffSchedule>(`/staff/${staffId}/schedules`, { method: "POST", body: payload, auth: true }),
  listSchedulesForAdmin: (staffId: number) =>
    apiFetch<StaffSchedule[]>(`/staff/${staffId}/schedules`, { auth: true }),
  listMySchedules: () => apiFetch<StaffSchedule[]>("/staff/schedules/me", { auth: true }),
  updateSchedule: (scheduleId: number, payload: UpdateSchedulePayload) =>
    apiFetch<StaffSchedule>(`/staff/schedules/${scheduleId}`, { method: "PATCH", body: payload, auth: true }),
  deleteSchedule: (scheduleId: number) =>
    apiFetch<DeleteScheduleResult>(`/staff/schedules/${scheduleId}`, { method: "DELETE", auth: true }),
};
