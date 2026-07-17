"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/types/api";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth";

type Step = "register" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [otpMock, setOtpMock] = useState("");
  const [otp, setOtp] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    try {
      const result = await authApi.register({ ...values, phone: values.phone || undefined });
      setEmail(values.email);
      setOtpMock(result.otp_mock);
      setOtp(result.otp_mock);
      setStep("verify");
      toast.success("Dang ky thanh cong. Vui long xac thuc OTP.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Dang ky that bai");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setVerifyLoading(true);
    try {
      await authApi.verifyAccount({ email, otp });
      toast.success("Xac thuc thanh cong. Vui long dang nhap.");
      router.push("/login");
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Xac thuc that bai");
    } finally {
      setVerifyLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Xac thuc tai khoan</CardTitle>
            <CardDescription>
              Nhap ma OTP da gui toi {email}. Moi truong demo: ma da duoc dien san tu response dang ky.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">Ma OTP</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
                {otpMock && <p className="text-xs text-muted-foreground">Ma demo: {otpMock}</p>}
              </div>
              {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
              <Button type="submit" disabled={verifyLoading}>
                {verifyLoading ? "Dang xac thuc..." : "Xac thuc"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Dang ky tai khoan</CardTitle>
          <CardDescription>Tao tai khoan de tim kiem va dat phong khach san.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Ho ten</Label>
              <Input id="full_name" {...register("full_name")} />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mat khau</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">So dien thoai (khong bat buoc)</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Dang xu ly..." : "Dang ky"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Da co tai khoan?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Dang nhap
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Ban muon dang ky kinh doanh?{" "}
            <Link href="/admin/register" className="text-primary underline-offset-4 hover:underline">
              Dang ky lam chu khach san
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
