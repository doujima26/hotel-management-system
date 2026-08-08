"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { logout } from "@/lib/auth/session";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AccountShell } from "@/components/shared/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage } from "@/types/api";
import { changePasswordSchema, type ChangePasswordFormValues } from "@/lib/validation/auth";

export default function AccountSecurityPage() {
  return (
    <RequireAuth allow={["user", "admin", "staff", "super_admin"]}>
      <AccountShell>
        <SecuritySection />
      </AccountShell>
    </RequireAuth>
  );
}

// Khoi "Cai dat bao mat" - doi mat khau.
function SecuritySection() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  async function handleChangePassword(values: ChangePasswordFormValues) {
    setError(null);
    try {
      await authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      // Doi mat khau thu hoi phien tren MOI thiet bi (backend tang token_version),
      // ke ca thiet bi nay -> xoa phien cuc bo va bat dang nhap lai.
      logout();
      toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên tất cả thiết bị.");
      router.replace("/login");
      return;
    } catch (err) {
      setError(getErrorMessage(err, "Đổi mật khẩu thất bại"));
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">Cài đặt bảo mật</h1>
      <p className="mt-1 text-sm text-muted-foreground">Đổi mật khẩu đăng nhập của bạn.</p>
      <form
        onSubmit={handleSubmit(handleChangePassword)}
        className="mt-4 flex max-w-md flex-col gap-4 rounded-xl border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
          <Input id="current_password" type="password" {...register("current_password")} />
          {errors.current_password && (
            <p className="text-sm text-destructive">{errors.current_password.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new_password">Mật khẩu mới</Label>
          <Input id="new_password" type="password" {...register("new_password")} />
          {errors.new_password && <p className="text-sm text-destructive">{errors.new_password.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
          <Input id="confirm_password" type="password" {...register("confirm_password")} />
          {errors.confirm_password && (
            <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </Button>
      </form>
    </section>
  );
}
