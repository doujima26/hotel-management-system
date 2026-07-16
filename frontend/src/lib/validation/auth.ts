import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().min(2, "Ho ten toi thieu 2 ky tu").max(255),
  email: z.email("Email khong hop le"),
  password: z.string().min(8, "Mat khau toi thieu 8 ky tu").max(128),
  phone: z.string().max(20).optional().or(z.literal("")),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Email khong hop le"),
  password: z.string().min(1, "Vui long nhap mat khau"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
