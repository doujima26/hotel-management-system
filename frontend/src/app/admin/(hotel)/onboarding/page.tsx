"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CityAutocomplete } from "@/components/shared/CityAutocomplete";
import { hotelsApi } from "@/lib/api/hotels";
import { getErrorMessage } from "@/types/api";
import { phoneField } from "@/lib/validation/auth";

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(255),
  address: z.string().trim().min(5, "Địa chỉ tối thiểu 5 ký tự"),
  city: z.string().trim().min(2, "Thành phố tối thiểu 2 ký tự").max(100),
  district: z.string().trim().min(2, "Vui lòng nhập quận/huyện").max(100),
  phone: phoneField,
  email: z.email("Email không hợp lệ"),
  description: z.string().trim().min(10, "Mô tả tối thiểu 10 ký tự"),
});
type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function AdminOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({ resolver: zodResolver(onboardingSchema), defaultValues: { city: "" } });

  async function onSubmit(values: OnboardingFormValues) {
    setFormError(null);
    try {
      await hotelsApi.create({
        name: values.name,
        address: values.address,
        city: values.city,
        district: values.district,
        phone: values.phone,
        email: values.email,
        description: values.description,
      });
      toast.success("Đăng ký khách sạn thành công, đang chờ duyệt");
      await queryClient.invalidateQueries({ queryKey: ["my-hotel"] });
      router.push("/admin/dashboard");
    } catch (err) {
      setFormError(getErrorMessage(err, "Đăng ký khách sạn thất bại"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng ký khách sạn</CardTitle>
        <CardDescription>
          Điền thông tin cơ bản về khách sạn của bạn. Sau khi gửi, đơn sẽ chờ Super Admin duyệt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              {errors.district && <p className="text-sm text-destructive">{errors.district.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email khách sạn</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Mô tả</Label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang xử lý..." : "Đăng ký khách sạn"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
