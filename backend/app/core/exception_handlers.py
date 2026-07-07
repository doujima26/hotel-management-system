from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.response import fail

# Map ma loi HTTP sang error_code chuan cho response.
_STATUS_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
}


def _error_code_from_status(status_code: int) -> str:
    return _STATUS_ERROR_CODES.get(status_code, "INTERNAL_ERROR")


# Chuan hoa response khi co HTTPException duoc raise tu endpoint/service.
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    body = fail(str(exc.detail), error_code=_error_code_from_status(exc.status_code))
    return JSONResponse(status_code=exc.status_code, content=jsonable_encoder(body))


# Chuan hoa response khi du lieu dau vao khong hop le (Pydantic validation).
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    body = fail("Du lieu dau vao khong hop le", error_code="VALIDATION_ERROR")
    content = jsonable_encoder(body)
    content["errors"] = jsonable_encoder(exc.errors())
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=content)


# Dang ky cac exception handler chuan hoa vao ung dung FastAPI.
def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
