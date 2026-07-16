import { serverFetch } from "./server";
import type { HotelDetail, HotelSearchResult } from "@/types/models";

export interface SearchHotelsParams {
  city?: string;
  check_in?: string;
  check_out?: string;
  num_guests?: number;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

// Endpoint cong khai, chi goi tu Server Component (xem lib/api/server.ts).
export const hotelsApi = {
  search: (params: SearchHotelsParams) => serverFetch<HotelSearchResult>("/hotels/search", { params }),
  getDetail: (hotelId: number) => serverFetch<HotelDetail>(`/hotels/${hotelId}`),
};
