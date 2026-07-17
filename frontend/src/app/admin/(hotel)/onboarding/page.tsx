"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hotelsApi } from "@/lib/api/hotels";
import { ApiError } from "@/types/api";

const onboardingSchema = z.object({
  name: z.string().min(2, "Ten toi thieu 2 ky tu").max(255),
  address: z.string().min(5, "Dia chi toi thieu 5 ky tu"),
  city: z.string().min(2, "Thanh pho toi thieu 2 ky tu").max(100),
  district: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.email("Email khong hop le").optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});
type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function AdminOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({ resolver: zodResolver(onboardingSchema) });

  async function onSubmit(values: OnboardingFormValues) {
    setFormError(null);
    try {
      await hotelsApi.create({
        name: values.name,
        address: values.address,
        city: values.city,
        district: values.district || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        description: values.description || undefined,
      });
      toast.success("Dang ky khach san thanh cong, dang cho duyet");
      await queryClient.invalidateQueries({ queryKey: ["my-hotel"] });
      router.push("/admin/hotel-profile");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Dang ky khach san that bai");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dang ky khach san</CardTitle>
        <CardDescription>
          Dien thong tin co ban ve khach san cua ban. Sau khi gui, don se cho Super Admin duyet.
        </CardDescription>
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
              <Label htmlFor="district">Quan/Huyen (khong bat buoc)</Label>
              <Input id="district" {...register("district")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">So dien thoai (khong bat buoc)</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email khach san (khong bat buoc)</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Mo ta (khong bat buoc)</Label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Dang xu ly..." : "Dang ky khach san"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
