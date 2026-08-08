// Khop voi app/core/response.py: APIResponse{success, data, error_code, message}
// Loi 422 kem them mang errors[] (raw Pydantic error list).

export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error_code: string | null;
  message: string;
  errors?: ValidationErrorItem[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export class ApiError extends Error {
  errorCode: string | null;
  status: number;
  fieldErrors?: ValidationErrorItem[];

  constructor(message: string, status: number, errorCode: string | null, fieldErrors?: ValidationErrorItem[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.fieldErrors = fieldErrors;
  }
}

// fetch() nem TypeError khi khong ket noi duoc toi server (mat mang, server sap,
// CORS...) - khac voi ApiError la loi nghiep vu co phan hoi that tu backend.
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

// Chuan hoa thong bao loi hien cho nguoi dung tu 1 catch (err) bat ky:
// - ApiError (co phan hoi tu backend): dung nguyen message nghiep vu, backend da
//   viet san tieng Viet co dau.
// - Mat ket noi mang (fetch that bai truoc khi co phan hoi): thong bao rieng,
//   khong nham voi loi nghiep vu.
// - Con lai (loi khong luong truoc): dung fallback tuy ngu canh goi.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
  return fallback;
}
