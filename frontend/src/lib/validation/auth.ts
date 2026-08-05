import { z } from "zod";

// Bo dau cach, dau cham, gach noi va ngoac roi yeu cau 9-11 chu so, cho phep
// tien to +84. Giu dung quy tac voi backend (app/core/validators.py).
export const phoneField = z
  .string()
  .min(1, "Vui lòng nhập số điện thoại")
  .transform((value) => value.replace(/[\s.\-()]/g, ""))
  .refine((value) => /^\+?\d{9,11}$/.test(value), "Số điện thoại không hợp lệ, cần 9 đến 11 chữ số");

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(255),
    email: z.email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
    confirm_password: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    phone: phoneField,
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirm_password"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
