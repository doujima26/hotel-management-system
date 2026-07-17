"use client";

import { Suspense } from "react";
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
import { getRoleHomePath } from "@/lib/auth/roleHome";
import { ApiError } from "@/types/api";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await authApi.login(values);
      applyLoginResult(result);
      toast.success("Dang nhap thanh cong");
      router.push(next || getRoleHomePath(result.user.role));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Dang nhap that bai");
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Dang nhap</CardTitle>
          <CardDescription>Dang nhap de dat phong va quan ly booking cua ban.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Dang xu ly..." : "Dang nhap"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Chua co tai khoan?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Dang ky
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
