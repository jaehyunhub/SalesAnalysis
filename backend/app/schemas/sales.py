from datetime import datetime, date, time
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.product import ProductResponse


class SalesRecordCreate(BaseModel):
    product_id: int = Field(..., description="상품 ID")
    sale_date: date = Field(..., description="판매 날짜")
    sale_time: Optional[time] = Field(None, description="판매 시간")
    quantity: int = Field(1, ge=1, description="수량")
    total_amount: float = Field(..., ge=0, description="총 판매금액")


class SalesRecordResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    sale_date: date
    sale_time: Optional[time] = None
    quantity: int
    total_amount: float
    created_at: datetime
    product: Optional[ProductResponse] = None

    model_config = {"from_attributes": True}


class SalesListResponse(BaseModel):
    items: List[SalesRecordResponse]
    total: int
    page: int
    size: int


class DailySalesResponse(BaseModel):
    date: date
    total_amount: float
    total_quantity: int


class MonthlySalesResponse(BaseModel):
    year: int
    month: int
    total_amount: float
    total_quantity: int


class CategorySalesResponse(BaseModel):
    category: str
    total_amount: float
    total_quantity: int
    ratio: float = Field(..., description="매출 비율 (%)")


class ProductRankResponse(BaseModel):
    product_id: int
    product_name: str
    category: str
    total_amount: float
    total_quantity: int
    rank: int
