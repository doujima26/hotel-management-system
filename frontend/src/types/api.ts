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
