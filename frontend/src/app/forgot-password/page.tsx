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
import { getErrorMessage } from "@/types/api";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from "@/lib/validation/auth";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpMock, setOtpMock] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: sendingOtp },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    setValue: setResetValue,
    formState: { errors: resetErrors, isSubmitting: resetting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function handleRequestOtp(values: ForgotPasswordFormValues) {
    setFormError(null);
    try {
      const result = await authApi.forgotPassword({ email: values.email });
      setEmail(values.email);
      setOtpMock(result.otp_mock ?? "");
      setResetValue("otp", result.otp_mock ?? "");
      setStep("reset");
      toast.success("Nếu email tồn tại, mã OTP đã được gửi");
    } catch (err) {
      setFormError(getErrorMessage(err, "Gửi yêu cầu thất bại"));
    }
  }

  async function handleReset(values: ResetPasswordFormValues) {
    setFormError(null);
    try {
      await authApi.resetPassword({ email, otp: values.otp, new_password: values.new_password });
      toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      router.push("/login");
    } catch (err) {
      setFormError(getErrorMessage(err, "Đặt lại mật khẩu thất bại"));
    }
  }

  if (step === "reset") {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Đặt lại mật khẩu</CardTitle>
            <CardDescription>
              Nhập mã OTP đã gửi tới {email} và mật khẩu mới.
              {otpMock
                ? " Máy chủ chưa cấu hình gửi email nên mã được điền sẵn giúp bạn."
                : " Mã có hiệu lực trong 10 phút, vui lòng kiểm tra cả mục thư rác."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReset(handleReset)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">Mã OTP (gồm 6 chữ số)</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Ví dụ: 123456"
                  {...registerReset("otp")}
                />
                {resetErrors.otp && <p className="text-sm text-destructive">{resetErrors.otp.message}</p>}
                {otpMock && <p className="text-xs text-muted-foreground">Mã demo: {otpMock}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new_password">Mật khẩu mới</Label>
                <Input id="new_password" type="password" {...registerReset("new_password")} />
                {resetErrors.new_password && (
                  <p className="text-sm text-destructive">{resetErrors.new_password.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm_new_password">Xác nhận mật khẩu mới</Label>
                <Input id="confirm_new_password" type="password" {...registerReset("confirm_password")} />
                {resetErrors.confirm_password && (
                  <p className="text-sm text-destructive">{resetErrors.confirm_password.message}</p>
                )}
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" disabled={resetting} className="rounded-full">
                {resetting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
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
          <CardTitle>Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email để nhận mã OTP đặt lại mật khẩu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={handleSubmitEmail(handleRequestOtp)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...registerEmail("email")} />
              {emailErrors.email && <p className="text-sm text-destructive">{emailErrors.email.message}</p>}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={sendingOtp} className="rounded-full">
              {sendingOtp ? "Đang gửi..." : "Gửi mã OTP"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Nhớ mật khẩu rồi?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
