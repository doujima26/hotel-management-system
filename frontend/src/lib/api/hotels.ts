import { serverFetch } from "./server";
import { apiFetch } from "./client";
import type {
  AdminHotel,
  DeleteHotelImageResult,
  DeleteHotelServiceResult,
  DeletePromotionResult,
  HotelDetail,
  HotelHighlight,
  HotelImage,
  HotelSearchResult,
  HotelServiceItem,
  Promotion,
} from "@/types/models";
import type { DiscountType } from "@/types/enums";

export interface SearchHotelsParams {
  city?: string;
  check_in?: string;
  check_out?: string;
  num_guests?: number;
  sort?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateHotelPayload {
  name: string;
  description?: string;
  address: string;
  city: string;
  district?: string;
  phone?: string;
  email?: string;
  star_rating?: number;
}

export type UpdateHotelPayload = Partial<CreateHotelPayload>;

export interface CreateHotelServicePayload {
  name: string;
  description?: string;
  price: number;
  unit?: string;
}

export interface UpdateHotelServicePayload {
  name?: string;
  description?: string;
  price?: number;
  unit?: string;
  is_active?: boolean;
}

export interface CreatePromotionPayload {
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_booking_amount?: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
}

export interface UpdatePromotionPayload extends Partial<CreatePromotionPayload> {
  is_active?: boolean;
}

export interface CreateHotelImagePayload {
  image_url: string;
  is_primary?: boolean;
}

export const hotelsApi = {
  // Endpoint cong khai, chi goi tu Server Component (xem lib/api/server.ts).
  search: (params: SearchHotelsParams) => serverFetch<HotelSearchResult>("/hotels/search", { params }),
  getDetail: (hotelId: number) => serverFetch<HotelDetail>(`/hotels/${hotelId}`),
  listTrendingDeals: (limit?: number) =>
    serverFetch<HotelHighlight[]>("/hotels/highlights/deals", { params: { limit } }),
  listTopRatedHotels: (limit?: number) =>
    serverFetch<HotelHighlight[]>("/hotels/highlights/top-rated", { params: { limit } }),

  // Cac ham ben duoi danh cho Admin (Client Component, can auth), goi qua rewrites proxy.
  getMine: () => apiFetch<AdminHotel>("/hotels/me", { auth: true }),
  create: (payload: CreateHotelPayload) => apiFetch<AdminHotel>("/hotels", { method: "POST", body: payload, auth: true }),
  update: (payload: UpdateHotelPayload) => apiFetch<AdminHotel>("/hotels", { method: "PATCH", body: payload, auth: true }),

  createService: (payload: CreateHotelServicePayload) =>
    apiFetch<HotelServiceItem>("/hotels/services", { method: "POST", body: payload, auth: true }),
  listServices: () => apiFetch<HotelServiceItem[]>("/hotels/services", { auth: true }),
  updateService: (serviceId: number, payload: UpdateHotelServicePayload) =>
    apiFetch<HotelServiceItem>(`/hotels/services/${serviceId}`, { method: "PATCH", body: payload, auth: true }),
  deleteService: (serviceId: number) =>
    apiFetch<DeleteHotelServiceResult>(`/hotels/services/${serviceId}`, { method: "DELETE", auth: true }),

  createPromotion: (payload: CreatePromotionPayload) =>
    apiFetch<Promotion>("/hotels/promotions", { method: "POST", body: payload, auth: true }),
  listPromotions: () => apiFetch<Promotion[]>("/hotels/promotions", { auth: true }),
  updatePromotion: (promotionId: number, payload: UpdatePromotionPayload) =>
    apiFetch<Promotion>(`/hotels/promotions/${promotionId}`, { method: "PATCH", body: payload, auth: true }),
  deletePromotion: (promotionId: number) =>
    apiFetch<DeletePromotionResult>(`/hotels/promotions/${promotionId}`, { method: "DELETE", auth: true }),

  createImage: (payload: CreateHotelImagePayload) =>
    apiFetch<HotelImage>("/hotels/images", { method: "POST", body: payload, auth: true }),
  listImages: () => apiFetch<HotelImage[]>("/hotels/images", { auth: true }),
  deleteImage: (imageId: number) =>
    apiFetch<DeleteHotelImageResult>(`/hotels/images/${imageId}`, { method: "DELETE", auth: true }),
  setPrimaryImage: (imageId: number) =>
    apiFetch<HotelImage>(`/hotels/images/${imageId}/primary`, { method: "PATCH", auth: true }),
};
