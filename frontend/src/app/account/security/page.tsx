"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AccountShell } from "@/components/shared/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/types/api";

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePassword() {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">Cài đặt bảo mật</h1>
      <p className="mt-1 text-sm text-muted-foreground">Đổi mật khẩu đăng nhập của bạn.</p>
      <div className="mt-4 flex max-w-md flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
          <Input
            id="current_password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new_password">Mật khẩu mới</Label>
          <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
          <Input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleChangePassword}
          disabled={submitting || !currentPassword || newPassword.length < 8}
          className="self-start"
        >
          {submitting ? "Đang đổi..." : "Đổi mật khẩu"}
        </Button>
      </div>
    </section>
  );
}
