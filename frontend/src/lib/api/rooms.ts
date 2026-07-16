import { serverFetch } from "./server";
import type { RoomAvailability } from "@/types/models";

export interface RoomAvailabilityParams {
  hotel_id: number;
  check_in: string;
  check_out: string;
  num_guests?: number;
  [key: string]: string | number | boolean | undefined;
}

// Endpoint cong khai, chi goi tu Server Component (xem lib/api/server.ts).
export const roomsApi = {
  availability: (params: RoomAvailabilityParams) =>
    serverFetch<RoomAvailability>("/rooms/availability", { params }),
};
