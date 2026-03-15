from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class UploadHistoryResponse(BaseModel):
    id: int
    user_id: int
    file_name: str
    file_type: str
    record_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadResultResponse(BaseModel):
    upload_id: int
    file_name: str
    status: str
    record_count: int
    message: str


class UploadHistoryListResponse(BaseModel):
    items: List[UploadHistoryResponse]
    total: int
