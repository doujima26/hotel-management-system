"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadsApi } from "@/lib/api/uploads";
import { ApiError } from "@/types/api";

interface ImageUploadFieldProps {
  // Duoc goi kem duong dan anh sau khi tai len xong.
  onUploaded: (url: string) => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}

// Nut chon anh tu may va tai len, dung chung cho anh dai dien, anh khach san
// va anh loai phong. Chi lo phan tai len roi tra duong dan ra ngoai; viec luu
// duong dan do vao dau la cua noi goi.
export function ImageUploadField({ onUploaded, label = "Tải ảnh lên", disabled }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadsApi.uploadImage(file);
      await onUploaded(result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải ảnh lên thất bại");
    } finally {
      setUploading(false);
      // Xoa gia tri de chon lai dung file vua roi van kich hoat onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => handleSelect(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {uploading ? "Đang tải..." : label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
