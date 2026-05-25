from pydantic import BaseModel


# Chuan hoa cau truc response tra ve tu API.
class APIResponse(BaseModel):
    success: bool
    data: dict | list | None = None
    error_code: str | None = None
    message: str


# Tao response thanh cong theo chuan chung.
def ok(data: dict | list | None = None, message: str = 'OK') -> APIResponse:
    return APIResponse(success=True, data=data, error_code=None, message=message)


# Tao response that bai theo chuan chung.
def fail(message: str, error_code: str = 'BAD_REQUEST') -> APIResponse:
    return APIResponse(success=False, data=None, error_code=error_code, message=message)
