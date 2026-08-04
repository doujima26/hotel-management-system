"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AccountShell } from "@/components/shared/AccountShell";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { usersApi, type UpdateProfilePayload } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { ApiError } from "@/types/api";
import type { User } from "@/types/models";

export default function AccountPage() {
  return (
    <RequireAuth allow={["user", "admin", "staff", "super_admin"]}>
      <AccountShell>
        <ProfileContent />
      </AccountShell>
    </RequireAuth>
  );
}

function ProfileContent() {
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (!me) return null;
  return <ProfileSection me={me} />;
}

// Khoi "Thong tin ca nhan" dang hang, sua tung dong.
function ProfileSection({ me }: { me: User }) {
  const queryClient = useQueryClient();

  async function saveField(payload: UpdateProfilePayload) {
    const updated = await usersApi.updateMe(payload);
    useAuthStore.getState().setUser(updated);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    toast.success("Cập nhật thành công");
  }

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Thông tin cá nhân</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cập nhật thông tin của bạn dùng khi đặt phòng.</p>
        </div>
        <div className="size-16 shrink-0 overflow-hidden rounded-full border bg-muted">
          {me.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatar_url} alt={me.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
              {me.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 divide-y rounded-xl border">
        <EditableRow
          label="Họ tên"
          value={me.full_name}
          minLength={2}
          onSave={(value) => saveField({ full_name: value })}
        />
        <EmailRow email={me.email} verified={me.is_verified} />
        <EditableRow
          label="Số điện thoại"
          value={me.phone ?? ""}
          placeholder="Thêm số điện thoại của bạn"
          onSave={(value) => saveField({ phone: value })}
        />
        <EditableRow
          label="Ảnh đại diện"
          value={me.avatar_url ?? ""}
          placeholder="Tải ảnh lên hoặc dán đường dẫn ảnh"
          onSave={(value) => saveField({ avatar_url: value })}
          isImage
        />
      </div>
    </section>
  );
}

// Dong email chi doc, kem badge xac thuc.
function EmailRow({ email, verified }: { email: string; verified: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">Địa chỉ email</span>
      <span className="flex flex-1 flex-wrap items-center gap-2 text-sm">
        {email}
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <BadgeCheck className="size-3.5" /> Đã xác thực
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Chưa xác thực</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground sm:w-20 sm:text-right">Dùng để đăng nhập</span>
    </div>
  );
}

// Dong thong tin sua tai cho: xem -> bam "Chinh sua" -> nhap -> Luu/Huy.
function EditableRow({
  label,
  value,
  placeholder,
  minLength = 0,
  isImage = false,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  minLength?: number;
  isImage?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
      <span className="pt-1.5 text-sm text-muted-foreground sm:w-40 sm:shrink-0">{label}</span>

      {editing ? (
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`field-${label}`} className="sr-only">
            {label}
          </Label>
          {isImage && (
            <ImageUploadField
              label="Tải ảnh từ máy"
              disabled={saving}
              onUploaded={async (url) => {
                setDraft(url);
                await onSave(url);
                setEditing(false);
              }}
            />
          )}
          <Input
            id={`field-${label}`}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || draft.trim().length < minLength}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-1 items-center gap-3">
            {isImage && value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="size-9 rounded-full border object-cover" />
            )}
            <span className={`text-sm ${value ? "" : "text-muted-foreground"} ${isImage && value ? "break-all" : ""}`}>
              {value || placeholder || "Chưa cập nhật"}
            </span>
          </div>
          <button type="button" onClick={startEdit} className="text-sm font-medium text-primary hover:underline">
            Chỉnh sửa
          </button>
        </>
      )}
    </div>
  );
}
