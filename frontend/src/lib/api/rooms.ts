import { serverFetch } from "./server";
import { apiFetch } from "./client";
import type {
  Amenity,
  DeleteAmenityResult,
  DeleteRoomTypeImageResult,
  RoomAvailability,
  RoomItem,
  RoomListResult,
  RoomStatusItem,
  RoomType,
  RoomTypeAmenityLinkResult,
  RoomTypeImage,
} from "@/types/models";

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

export interface UpdateRoomTypePayload {
  name?: string;
  description?: string;
  base_price?: number;
  max_guests?: number;
  area_sqm?: number;
  bed_type?: string;
  total_rooms?: number;
  is_active?: boolean;
}

export interface CreateRoomPayload {
  room_type_id: number;
  room_number: string;
  floor?: number;
}

export interface UpdateRoomPayload {
  room_number?: string;
  floor?: number;
  is_active?: boolean;
}

export interface CreateAmenityPayload {
  name: string;
  icon?: string;
  category?: string;
}

export interface UpdateAmenityPayload {
  name?: string;
  icon?: string;
  category?: string;
}

export interface CreateRoomTypeImagePayload {
  image_url: string;
  is_primary?: boolean;
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

  createRoom: (payload: CreateRoomPayload) => apiFetch<RoomItem>("/rooms", { method: "POST", body: payload, auth: true }),
  listRooms: (roomTypeId: number) =>
    apiFetch<RoomListResult>("/rooms/list", { params: { room_type_id: roomTypeId }, auth: true }),
  updateRoom: (roomId: number, payload: UpdateRoomPayload) =>
    apiFetch<RoomItem>(`/rooms/${roomId}`, { method: "PATCH", body: payload, auth: true }),

  createAmenity: (payload: CreateAmenityPayload) =>
    apiFetch<Amenity>("/rooms/amenities", { method: "POST", body: payload, auth: true }),
  listAmenities: () => apiFetch<Amenity[]>("/rooms/amenities", { auth: true }),
  updateAmenity: (amenityId: number, payload: UpdateAmenityPayload) =>
    apiFetch<Amenity>(`/rooms/amenities/${amenityId}`, { method: "PATCH", body: payload, auth: true }),
  deleteAmenity: (amenityId: number) =>
    apiFetch<DeleteAmenityResult>(`/rooms/amenities/${amenityId}`, { method: "DELETE", auth: true }),
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
};
