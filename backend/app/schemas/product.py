from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    barcode: Optional[str] = Field(None, max_length=50)
    name: str = Field(..., max_length=200, description="상품명")
    category: str = Field("기타", description="음료/식품/생활용품/담배/기타")
    cost_price: Optional[float] = Field(None, ge=0, description="입고가")
    selling_price: Optional[float] = Field(None, ge=0, description="판매가")


class ProductResponse(BaseModel):
    id: int
    barcode: Optional[str] = None
    name: str
    category: str
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}
