import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(255),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
