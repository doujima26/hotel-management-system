import { apiFetch } from "./client";
import type { PayBookingResult } from "@/types/models";
import type { PaymentMethod } from "@/types/enums";

export interface PayBookingPayload {
  booking_id: number;
  payment_method: PaymentMethod;
}

export const paymentsApi = {
  pay: (payload: PayBookingPayload) =>
    apiFetch<PayBookingResult>("/payments", { method: "POST", body: payload, auth: true }),
};
