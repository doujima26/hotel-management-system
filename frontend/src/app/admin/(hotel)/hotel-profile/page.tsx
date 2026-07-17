"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

const profileSchema = z.object({
  name: z.string().min(2, "Ten toi thieu 2 ky tu").max(255),
  address: z.string().min(5, "Dia chi toi thieu 5 ky tu"),
  city: z.string().min(2, "Thanh pho toi thieu 2 ky tu").max(100),
  district: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.email("Email khong hop le").optional().or(z.literal("")),
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
      toast.success("Cap nhat thong tin khach san thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["my-hotel"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Cap nhat that bai");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Thong tin khach san</CardTitle>
          <CardDescription>Co the sua ngay ca khi dang cho duyet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Ten khach san</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Dia chi</Label>
              <Input id="address" {...register("address")} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Thanh pho</Label>
                <Input id="city" {...register("city")} />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="district">Quan/Huyen</Label>
                <Input id="district" {...register("district")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">So dien thoai</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email khach san</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="star_rating">Hang sao (1-5, khong bat buoc)</Label>
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
              <Label htmlFor="description">Mo ta</Label>
              <textarea
                id="description"
                {...register("description")}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? "Dang luu..." : "Luu thay doi"}
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
      toast.success("Them anh thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["hotel-images"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Them anh that bai");
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
      setActionError(err instanceof ApiError ? err.message : "Cap nhat that bai");
    }
  }

  async function handleDelete(imageId: number) {
    setActionError(null);
    try {
      await hotelsApi.deleteImage(imageId);
      toast.success("Xoa anh thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["hotel-images"] });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Xoa anh that bai");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anh khach san</CardTitle>
        <CardDescription>
          {approved ? "Dan URL anh (chua ho tro upload file truc tiep)." : "Chi quan ly duoc anh sau khi khach san duoc duyet."}
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
              Them anh
            </Button>
          </div>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Dang tai...</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images?.map((image) => (
              <div key={image.id} className="flex flex-col gap-1.5 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.image_url} alt="" className="h-28 w-full object-cover" />
                <div className="flex items-center justify-between gap-1 px-2 pb-2">
                  {image.is_primary ? (
                    <span className="text-xs font-medium text-muted-foreground">Anh dai dien</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Dat dai dien
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Xoa
                  </button>
                </div>
              </div>
            ))}
            {images && images.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">Chua co anh nao.</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
