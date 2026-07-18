import { apiFetch } from "./client";
import type { Favorite } from "@/types/models";

export const favoritesApi = {
  list: () => apiFetch<Favorite[]>("/favorites", { auth: true }),
  add: (hotelId: number) => apiFetch<Favorite>(`/favorites/${hotelId}`, { method: "POST", auth: true }),
  remove: (hotelId: number) => apiFetch<{ hotel_id: number }>(`/favorites/${hotelId}`, { method: "DELETE", auth: true }),
};
