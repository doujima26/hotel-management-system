from pydantic import BaseModel


class APIResponse(BaseModel):
    success: bool
    data: dict | list | None = None
    error_code: str | None = None
    message: str


def ok(data: dict | list | None = None, message: str = 'OK') -> APIResponse:
    return APIResponse(success=True, data=data, error_code=None, message=message)


def fail(message: str, error_code: str = 'BAD_REQUEST') -> APIResponse:
    return APIResponse(success=False, data=None, error_code=error_code, message=message)
