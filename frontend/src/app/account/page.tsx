"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { ApiError } from "@/types/api";
import type { User } from "@/types/models";

export default function AccountPage() {
  return (
    <RequireAuth allow={["user", "admin", "staff", "super_admin"]}>
      <AccountContent />
    </RequireAuth>
  );
}

function AccountContent() {
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me() });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleChangePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu mới không khớp");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Tài khoản của tôi</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {me && <ProfileCard me={me} />}

      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          <Button
            onClick={handleChangePassword}
            disabled={passwordSubmitting || !currentPassword || newPassword.length < 8}
            className="self-start"
          >
            {passwordSubmitting ? "Đang đổi..." : "Đổi mật khẩu"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileCard({ me }: { me: User }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(me.full_name);
  const [phone, setPhone] = useState(me.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await usersApi.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });
      useAuthStore.getState().setUser(updated);
      toast.success("Cập nhật hồ sơ thành công");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hồ sơ cá nhân</CardTitle>
        <CardDescription>{me.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">Họ tên</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="avatar_url">Ảnh đại diện (URL)</Label>
          <Input id="avatar_url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleSave} disabled={submitting || !fullName.trim()} className="self-start">
          {submitting ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </CardContent>
    </Card>
  );
}
