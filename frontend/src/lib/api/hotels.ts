import { serverFetch } from "./server";
import { apiFetch } from "./client";
import type {
  AdminHotel,
  Amenity,
  DeleteHotelImageResult,
  DeleteHotelServiceResult,
  DeletePromotionResult,
  HotelAmenityLinkResult,
  HotelDetail,
  HotelHighlight,
  HotelImage,
  HotelSearchFilters,
  HotelSearchResult,
  HotelServiceItem,
  Promotion,
} from "@/types/models";
import type { DiscountType, PaymentMethod } from "@/types/enums";

export interface SearchHotelsParams {
  city?: string;
  check_in?: string;
  check_out?: string;
  num_guests?: number;
  sort?: string;
  min_price?: number;
  max_price?: number;
  stars?: number[];
  min_rating?: number;
  districts?: string[];
  amenities?: string[];
  room_amenities?: string[];
  services?: string[];
  has_promotion?: boolean;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | string[] | number[] | undefined;
}

export interface SearchFiltersParams {
  city?: string;
  check_in?: string;
  check_out?: string;
  num_guests?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateHotelPayload {
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  star_rating?: number;
}

export interface UpdateHotelPayload extends Partial<CreateHotelPayload> {
  check_in_time?: string;
  check_out_time?: string;
  cancellation_policy?: string;
  children_policy?: string;
  pets_allowed?: boolean;
  payment_methods?: PaymentMethod[];
}

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
  getSearchFilters: (params: SearchFiltersParams) =>
    serverFetch<HotelSearchFilters>("/hotels/search/filters", { params }),
  getDetail: (hotelId: number) => serverFetch<HotelDetail>(`/hotels/${hotelId}`),
  listTrendingDeals: (limit?: number) =>
    serverFetch<HotelHighlight[]>("/hotels/highlights/deals", { params: { limit } }),
  listSeasonalDeals: (limit?: number) =>
    serverFetch<HotelHighlight[]>("/hotels/highlights/seasonal-deals", { params: { limit } }),
  // Can dang nhap nen goi tu Client Component qua apiFetch, khong dung serverFetch.
  listRecentlyBookedHotels: (limit?: number) =>
    apiFetch<HotelHighlight[]>("/hotels/highlights/recently-booked", { params: { limit }, auth: true }),
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

  assignAmenity: (amenityId: number) =>
    apiFetch<HotelAmenityLinkResult>(`/hotels/amenities/${amenityId}`, { method: "POST", auth: true }),
  unassignAmenity: (amenityId: number) =>
    apiFetch<HotelAmenityLinkResult>(`/hotels/amenities/${amenityId}`, { method: "DELETE", auth: true }),
  listAmenities: () => apiFetch<Amenity[]>("/hotels/amenities", { auth: true }),
};
