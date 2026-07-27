from pydantic import BaseModel, field_validator, Field
from typing import Optional
from datetime import datetime


class UploadResponse(BaseModel):
    upload_id: int
    filename: str
    file_size: int
    status: str
    message: str


class UploadStatusResponse(BaseModel):
    upload_id: int = Field(validation_alias="id")
    filename: str
    status: str
    is_active: bool = False
    row_count: Optional[int] = None
    valid_rows: Optional[int] = None
    invalid_rows: Optional[int] = None
    error_message: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ValidationError(BaseModel):
    row: int
    column: str
    error: str
    value: Optional[str] = None
