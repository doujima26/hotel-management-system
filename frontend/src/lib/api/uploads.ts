import { apiFetch } from "./client";

export interface UploadedImage {
  url: string;
}

export const uploadsApi = {
  // Tai 1 anh len may chu, tra ve duong dan de gan vao anh dai dien, anh khach
  // san hoac anh loai phong.
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<UploadedImage>("/uploads/images", { method: "POST", body: form, auth: true });
  },
};
