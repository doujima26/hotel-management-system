"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CityAutocomplete } from "@/components/shared/CityAutocomplete";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

const profileSchema = z.object({
  name: z.string().min(2, "Tên tối thiểu 2 ký tự").max(255),
  address: z.string().min(5, "Địa chỉ tối thiểu 5 ký tự"),
  city: z.string().min(2, "Thành phố tối thiểu 2 ký tự").max(100),
  district: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.email("Email không hợp lệ").optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function AdminHotelProfilePage() {
  const hotel = useAdminHotel();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [starRating, setStarRating] = useState(hotel.star_rating ? String(hotel.star_rating) : "");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: hotel.name,
      address: hotel.address,
      city: hotel.city,
      district: hotel.district ?? "",
      phone: hotel.phone ?? "",
      email: hotel.email ?? "",
      description: hotel.description ?? "",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    setFormError(null);
    try {
      await hotelsApi.update({
        name: values.name,
        address: values.address,
        city: values.city,
        district: values.district || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        description: values.description || undefined,
        star_rating: starRating ? Number(starRating) : undefined,
      });
      toast.success("Cập nhật thông tin khách sạn thành công");
      await queryClient.invalidateQueries({ queryKey: ["my-hotel"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách sạn</CardTitle>
          <CardDescription>Có thể sửa ngay cả khi đang chờ duyệt.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Tên khách sạn</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" {...register("address")} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Thành phố</Label>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <CityAutocomplete id="city" value={field.value} onValueChange={field.onChange} />
                  )}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="district">Quận/Huyện</Label>
                <Input id="district" {...register("district")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email khách sạn</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="star_rating">Hạng sao (1-5, không bắt buộc)</Label>
              <Input
                id="star_rating"
                type="number"
                min={1}
                max={5}
                value={starRating}
                onChange={(e) => setStarRating(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Mô tả</Label>
              <textarea
                id="description"
                {...register("description")}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <HotelImagesSection approved={hotel.status === "approved"} />
    </div>
  );
}

function HotelImagesSection({ approved }: { approved: boolean }) {
  const queryClient = useQueryClient();
  const [newImageUrl, setNewImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ["hotel-images"],
    queryFn: () => hotelsApi.listImages(),
    enabled: approved,
  });

  async function handleAdd() {
    if (!newImageUrl.trim()) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await hotelsApi.createImage({ image_url: newImageUrl.trim(), is_primary: !images || images.length === 0 });
      setNewImageUrl("");
      toast.success("Thêm ảnh thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-images"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Thêm ảnh thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPrimary(imageId: number) {
    setActionError(null);
    try {
      await hotelsApi.setPrimaryImage(imageId);
      await queryClient.invalidateQueries({ queryKey: ["hotel-images"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  async function handleDelete(imageId: number) {
    setActionError(null);
    try {
      await hotelsApi.deleteImage(imageId);
      toast.success("Xóa ảnh thành công");
      await queryClient.invalidateQueries({ queryKey: ["hotel-images"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Xóa ảnh thất bại");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ảnh khách sạn</CardTitle>
        <CardDescription>
          {approved
            ? "Dán URL ảnh (chưa hỗ trợ upload file trực tiếp)."
            : "Chỉ quản lý được ảnh sau khi khách sạn được duyệt."}
        </CardDescription>
      </CardHeader>
      {approved && (
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
            <Button onClick={handleAdd} disabled={submitting || !newImageUrl.trim()}>
              Thêm ảnh
            </Button>
          </div>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images?.map((image) => (
              <div key={image.id} className="flex flex-col gap-1.5 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.image_url} alt="" className="h-28 w-full object-cover" />
                <div className="flex items-center justify-between gap-1 px-2 pb-2">
                  {image.is_primary ? (
                    <span className="text-xs font-medium text-muted-foreground">Ảnh đại diện</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Đặt đại diện
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
            {images && images.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">Chưa có ảnh nào.</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
