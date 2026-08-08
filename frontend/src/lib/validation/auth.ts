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

// OTP backend luon sinh dung 6 chu so (xem secrets.randbelow(1_000_000):06d).
export const otpField = z
  .string()
  .min(1, "Vui lòng nhập mã OTP")
  .regex(/^\d{6}$/, "Mã OTP gồm đúng 6 chữ số");

export const verifyOtpSchema = z.object({
  otp: otpField,
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Email không hợp lệ"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    otp: otpField,
    new_password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
    confirm_password: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirm_password"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    new_password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
    confirm_password: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirm_password"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
