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
  const [resending, setResending] = useState(false);

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
      toast.success("Đăng ký thành công. Vui lòng xác thực OTP.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Đăng ký thất bại");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setVerifyLoading(true);
    try {
      await authApi.verifyAccount({ email, otp });
      toast.success("Xác thực thành công. Vui lòng đăng nhập.");
      router.push("/login");
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Xác thực thất bại");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    try {
      const result = await authApi.sendVerifyOtp({ email });
      if (result.otp_mock) {
        setOtpMock(result.otp_mock);
        setOtp(result.otp_mock);
        toast.success("Đã gửi lại mã OTP");
      } else {
        toast.success("Tài khoản đã được xác thực trước đó");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi lại mã OTP thất bại");
    } finally {
      setResending(false);
    }
  }

  if (step === "verify") {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Xác thực tài khoản</CardTitle>
            <CardDescription>
              Nhập mã OTP đã gửi tới {email}. Môi trường demo: mã đã được điền sẵn từ response đăng ký.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">Mã OTP</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
                {otpMock && <p className="text-xs text-muted-foreground">Mã demo: {otpMock}</p>}
              </div>
              {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
              <Button type="submit" disabled={verifyLoading}>
                {verifyLoading ? "Đang xác thực..." : "Xác thực"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleResendOtp} disabled={resending}>
                {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
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
          <CardTitle>Đăng ký tài khoản</CardTitle>
          <CardDescription>Tạo tài khoản để tìm kiếm và đặt phòng khách sạn.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Họ tên</Label>
              <Input id="full_name" {...register("full_name")} />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Số điện thoại (không bắt buộc)</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Đăng nhập
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Bạn muốn đăng ký kinh doanh?{" "}
            <Link href="/admin/register" className="text-primary underline-offset-4 hover:underline">
              Đăng ký làm chủ khách sạn
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
