import { serverFetch } from "./server";
import { apiFetch } from "./client";
import type {
  Amenity,
  AmenityCategory,
  DeleteAmenityResult,
  DeleteRoomBlockResult,
  DeleteRoomResult,
  DeleteRoomTypeImageResult,
  DeleteRoomTypeResult,
  RoomAvailability,
  RoomBlock,
  RoomCalendar,
  RoomItem,
  RoomListResult,
  RoomStatusItem,
  RoomType,
  RoomTypeAmenityLinkResult,
  RoomTypeImage,
  RoomTypeRateCalendar,
  RoomTypeRateDay,
} from "@/types/models";
import type { AmenityScope, DiscountType } from "@/types/enums";

export interface RoomAvailabilityParams {
  hotel_id: number;
  check_in: string;
  check_out: string;
  num_guests?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateRoomTypePayload {
  hotel_id: number;
  name: string;
  description?: string;
  base_price: number;
  max_guests: number;
  area_sqm?: number;
  bed_type?: string;
  total_rooms: number;
}

// area_sqm/bed_type nhan null de xoa gia tri da nhap - backend dung
// exclude_unset nen null la "dat ve rong", con khong gui field thi giu nguyen.
export interface UpdateRoomTypePayload {
  name?: string;
  description?: string;
  base_price?: number;
  max_guests?: number;
  area_sqm?: number | null;
  bed_type?: string | null;
  total_rooms?: number;
  is_active?: boolean;
}

export interface CreateRoomPayload {
  room_type_id: number;
  room_number: string;
  floor: number;
}

export interface UpdateRoomPayload {
  room_number?: string;
  floor?: number;
  is_active?: boolean;
}

export interface CreateAmenityPayload {
  name: string;
  scope: AmenityScope;
  category_id?: number;
}

export interface UpdateAmenityPayload {
  name?: string;
  category_id?: number;
}

export interface CreateRoomTypeImagePayload {
  image_url: string;
  is_primary?: boolean;
}

export interface SeasonalRatePayload {
  from_date: string;
  to_date: string;
  adjustment_type: DiscountType;
  adjustment_value: number;
}

export interface CreateRoomBlockPayload {
  room_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}

export const roomsApi = {
  // Endpoint cong khai, chi goi tu Server Component (xem lib/api/server.ts).
  availability: (params: RoomAvailabilityParams) =>
    serverFetch<RoomAvailability>("/rooms/availability", { params }),

  // Cac ham ben duoi danh cho Admin (Client Component, can auth), goi qua rewrites proxy.
  createRoomType: (payload: CreateRoomTypePayload) =>
    apiFetch<RoomType>("/rooms/room-types", { method: "POST", body: payload, auth: true }),
  listRoomTypes: (hotelId: number) =>
    apiFetch<RoomType[]>("/rooms/room-types", { params: { hotel_id: hotelId }, auth: true }),
  updateRoomType: (roomTypeId: number, payload: UpdateRoomTypePayload) =>
    apiFetch<RoomType>(`/rooms/room-types/${roomTypeId}`, { method: "PATCH", body: payload, auth: true }),
  deleteRoomType: (roomTypeId: number) =>
    apiFetch<DeleteRoomTypeResult>(`/rooms/room-types/${roomTypeId}`, { method: "DELETE", auth: true }),

  createRoom: (payload: CreateRoomPayload) => apiFetch<RoomItem>("/rooms", { method: "POST", body: payload, auth: true }),
  listRooms: (roomTypeId: number) =>
    apiFetch<RoomListResult>("/rooms/list", { params: { room_type_id: roomTypeId }, auth: true }),
  updateRoom: (roomId: number, payload: UpdateRoomPayload) =>
    apiFetch<RoomItem>(`/rooms/${roomId}`, { method: "PATCH", body: payload, auth: true }),
  deleteRoom: (roomId: number) => apiFetch<DeleteRoomResult>(`/rooms/${roomId}`, { method: "DELETE", auth: true }),

  markRoomCleaned: (roomId: number) => apiFetch<RoomItem>(`/rooms/${roomId}/cleaned`, { method: "PATCH", auth: true }),
  setRoomMaintenance: (roomId: number, reason: string) =>
    apiFetch<RoomItem>(`/rooms/${roomId}/maintenance`, { method: "POST", body: { reason }, auth: true }),
  clearRoomMaintenance: (roomId: number) =>
    apiFetch<RoomItem>(`/rooms/${roomId}/maintenance`, { method: "DELETE", auth: true }),

  createAmenity: (payload: CreateAmenityPayload) =>
    apiFetch<Amenity>("/rooms/amenities", { method: "POST", body: payload, auth: true }),
  listAmenities: (scope: AmenityScope) =>
    apiFetch<Amenity[]>("/rooms/amenities", { params: { scope }, auth: true }),
  updateAmenity: (amenityId: number, payload: UpdateAmenityPayload) =>
    apiFetch<Amenity>(`/rooms/amenities/${amenityId}`, { method: "PATCH", body: payload, auth: true }),
  deleteAmenity: (amenityId: number) =>
    apiFetch<DeleteAmenityResult>(`/rooms/amenities/${amenityId}`, { method: "DELETE", auth: true }),

  listAmenityCategories: () => apiFetch<AmenityCategory[]>("/rooms/amenity-categories", { auth: true }),
  createAmenityCategory: (name: string, icon?: string) =>
    apiFetch<AmenityCategory>("/rooms/amenity-categories", { method: "POST", body: { name, icon }, auth: true }),
  updateAmenityCategory: (categoryId: number, name: string, icon?: string) =>
    apiFetch<AmenityCategory>(`/rooms/amenity-categories/${categoryId}`, {
      method: "PATCH",
      body: { name, icon },
      auth: true,
    }),
  deleteAmenityCategory: (categoryId: number) =>
    apiFetch<{ id: number }>(`/rooms/amenity-categories/${categoryId}`, { method: "DELETE", auth: true }),
  assignAmenityToRoomType: (roomTypeId: number, amenityId: number) =>
    apiFetch<RoomTypeAmenityLinkResult>(`/rooms/room-types/${roomTypeId}/amenities/${amenityId}`, {
      method: "POST",
      auth: true,
    }),
  unassignAmenityFromRoomType: (roomTypeId: number, amenityId: number) =>
    apiFetch<RoomTypeAmenityLinkResult>(`/rooms/room-types/${roomTypeId}/amenities/${amenityId}`, {
      method: "DELETE",
      auth: true,
    }),
  listRoomTypeAmenities: (roomTypeId: number) =>
    apiFetch<Amenity[]>(`/rooms/room-types/${roomTypeId}/amenities`, { auth: true }),

  createRoomTypeImage: (roomTypeId: number, payload: CreateRoomTypeImagePayload) =>
    apiFetch<RoomTypeImage>(`/rooms/room-types/${roomTypeId}/images`, { method: "POST", body: payload, auth: true }),
  listRoomTypeImages: (roomTypeId: number) =>
    apiFetch<RoomTypeImage[]>(`/rooms/room-types/${roomTypeId}/images`, { auth: true }),
  deleteRoomTypeImage: (roomTypeId: number, imageId: number) =>
    apiFetch<DeleteRoomTypeImageResult>(`/rooms/room-types/${roomTypeId}/images/${imageId}`, {
      method: "DELETE",
      auth: true,
    }),
  setPrimaryRoomTypeImage: (roomTypeId: number, imageId: number) =>
    apiFetch<RoomTypeImage>(`/rooms/room-types/${roomTypeId}/images/${imageId}/primary`, {
      method: "PATCH",
      auth: true,
    }),

  statusBoard: () => apiFetch<RoomStatusItem[]>("/rooms/status", { auth: true }),
  calendar: (params: { from_date: string; to_date: string }) =>
    apiFetch<RoomCalendar>("/rooms/calendar", { params, auth: true }),

  getRateCalendar: (roomTypeId: number, params: { from_date: string; to_date: string }) =>
    apiFetch<RoomTypeRateCalendar>(`/rooms/room-types/${roomTypeId}/rates`, { params, auth: true }),
  setRate: (roomTypeId: number, rateDate: string, price: number) =>
    apiFetch<RoomTypeRateDay>(`/rooms/room-types/${roomTypeId}/rates/${rateDate}`, {
      method: "PUT",
      body: { price },
      auth: true,
    }),
  clearRate: (roomTypeId: number, rateDate: string) =>
    apiFetch<RoomTypeRateDay>(`/rooms/room-types/${roomTypeId}/rates/${rateDate}`, {
      method: "DELETE",
      auth: true,
    }),
  applySeasonalRate: (roomTypeId: number, payload: SeasonalRatePayload) =>
    apiFetch<RoomTypeRateCalendar>(`/rooms/room-types/${roomTypeId}/rates/seasonal`, {
      method: "POST",
      body: payload,
      auth: true,
    }),

  createRoomBlock: (payload: CreateRoomBlockPayload) =>
    apiFetch<RoomBlock>("/rooms/blocks", { method: "POST", body: payload, auth: true }),
  listRoomBlocks: (params: { from_date: string; to_date: string }) =>
    apiFetch<RoomBlock[]>("/rooms/blocks", { params, auth: true }),
  deleteRoomBlock: (blockId: number) =>
    apiFetch<DeleteRoomBlockResult>(`/rooms/blocks/${blockId}`, { method: "DELETE", auth: true }),
};
