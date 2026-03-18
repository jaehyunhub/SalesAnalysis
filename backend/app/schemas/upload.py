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


# ---------- OCR 관련 스키마 ----------

class OCRRow(BaseModel):
    """OCR로 추출된 개별 상품 행."""
    product_name: str
    quantity: int = 1
    amount: float = 0.0


class OCRResultResponse(BaseModel):
    """스크린샷 OCR 결과."""
    sale_date: Optional[str] = None
    sale_time: Optional[str] = None
    rows: List[OCRRow]
    raw_text: str
    confidence: float


class OCRConfirmRequest(BaseModel):
    """사용자가 검토/수정 후 확인하는 OCR 데이터."""
    sale_date: str
    sale_time: Optional[str] = None
    rows: List[OCRRow]


class OCRConfirmResponse(BaseModel):
    """OCR 확인 저장 결과."""
    upload_id: int
    record_count: int
    message: str
