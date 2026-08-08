"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { applyLoginResult } from "@/lib/auth/session";
import { ApiError } from "@/types/api";
import { loginSchema, verifyOtpSchema, type LoginFormValues, type VerifyOtpFormValues } from "@/lib/validation/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [pendingLogin, setPendingLogin] = useState<LoginFormValues | null>(null);
  const [otpMock, setOtpMock] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    setValue: setVerifyValue,
    formState: { errors: verifyErrors, isSubmitting: verifyLoading },
  } = useForm<VerifyOtpFormValues>({ resolver: zodResolver(verifyOtpSchema) });

  // Dang nhap va dieu huong sau khi co phien. Moi vai tro deu ve trang chu; neu
  // bi day sang login tu 1 trang can quyen thi quay lai dung trang do (next).
  async function dangNhapVaDieuHuong(values: LoginFormValues) {
    applyLoginResult(await authApi.login(values));
    toast.success("Đăng nhập thành công");
    router.push(next || "/");
  }

  // Phan biet 403 do chua xac thuc voi 403 do bi khoa bang du lieu tra ve cua
  // send-verify-otp thay vi doc noi dung thong bao. Dung luon lan goi nay de gui
  // ma OTP moi cho tai khoan chua xac thuc.
  async function thuChuyenSangXacThuc(values: LoginFormValues): Promise<boolean> {
    try {
      const result = await authApi.sendVerifyOtp({ email: values.email });
      if (result.is_verified !== false) return false;
      setPendingLogin(values);
      setOtpMock(result.otp_mock ?? "");
      setVerifyValue("otp", result.otp_mock ?? "");
      return true;
    } catch {
      return false;
    }
  }

  // Tu viet lai thong bao theo tung ma loi thay vi hien nguyen van err.message
  // tu backend - cac chuoi detail phia backend theo quy uoc khong dau, hien
  // thang cho nguoi dung se mat dau.
  async function onSubmit(values: LoginFormValues) {
    try {
      await dangNhapVaDieuHuong(values);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && (await thuChuyenSangXacThuc(values))) {
        toast.info("Tài khoản chưa xác thực, mã OTP vừa được gửi tới email của bạn.");
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Email hoặc mật khẩu không đúng.");
      } else if (err instanceof ApiError && err.status === 403) {
        toast.error("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
      } else {
        toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    }
  }

  // Xac thuc xong thi dang nhap luon bang thong tin khach vua nhap, khong bat
  // khach go lai mat khau.
  async function onVerify(values: VerifyOtpFormValues) {
    if (!pendingLogin) return;
    setVerifyError(null);
    try {
      await authApi.verifyAccount({ email: pendingLogin.email, otp: values.otp });
      await dangNhapVaDieuHuong(pendingLogin);
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Xác thực thất bại");
    }
  }

  async function handleResendOtp() {
    if (!pendingLogin) return;
    setResending(true);
    try {
      const result = await authApi.sendVerifyOtp({ email: pendingLogin.email });
      setOtpMock(result.otp_mock ?? "");
      setVerifyValue("otp", result.otp_mock ?? "");
      toast.success("Đã gửi lại mã OTP");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi lại mã OTP thất bại");
    } finally {
      setResending(false);
    }
  }

  if (pendingLogin) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Xác thực tài khoản</CardTitle>
            <CardDescription>
              Tài khoản {pendingLogin.email} chưa xác thực. Nhập mã OTP để hoàn tất và đăng nhập.
              {otpMock
                ? " Máy chủ chưa cấu hình gửi email nên mã được điền sẵn giúp bạn."
                : " Mã có hiệu lực trong 10 phút, vui lòng kiểm tra cả mục thư rác."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitVerify(onVerify)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">Mã OTP (gồm 6 chữ số)</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Ví dụ: 123456"
                  {...registerVerify("otp")}
                />
                {verifyErrors.otp && <p className="text-sm text-destructive">{verifyErrors.otp.message}</p>}
                {otpMock && <p className="text-xs text-muted-foreground">Mã demo: {otpMock}</p>}
              </div>
              {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
              <Button type="submit" disabled={verifyLoading} className="rounded-full">
                {verifyLoading ? "Đang xác thực..." : "Xác thực và đăng nhập"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleResendOtp} disabled={resending}>
                {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPendingLogin(null)}>
                Quay lại đăng nhập
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
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>Đăng nhập để đặt phòng và quản lý booking của bạn.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="rounded-full">
              {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Đăng ký
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
