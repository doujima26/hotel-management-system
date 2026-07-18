"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/types/api";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMock, setOtpMock] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await authApi.forgotPassword({ email });
      setOtpMock(result.otp_mock ?? "");
      setOtp(result.otp_mock ?? "");
      setStep("reset");
      toast.success("Nếu email tồn tại, mã OTP đã được gửi");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({ email, otp, new_password: newPassword });
      toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      router.push("/login");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Đặt lại mật khẩu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "reset") {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Đặt lại mật khẩu</CardTitle>
            <CardDescription>
              Nhập mã OTP đã gửi tới {email} và mật khẩu mới. Môi trường demo: mã đã được điền sẵn nếu email tồn
              tại.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">Mã OTP</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
                {otpMock && <p className="text-xs text-muted-foreground">Mã demo: {otpMock}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new_password">Mật khẩu mới</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" disabled={submitting || !otp || newPassword.length < 8} className="rounded-full">
                {submitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
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
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={submitting || !email} className="rounded-full">
              {submitting ? "Đang gửi..." : "Gửi mã OTP"}
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
