import math
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class PromotionCalculateRequest(BaseModel):
    product_name: str = Field(..., description="상품명")
    promotion_name: str = Field(default="", description="행사명")
    cost_price: float = Field(..., gt=0, description="원가")
    sale_price: float = Field(..., gt=0, description="판매가")
    expected_qty: int = Field(..., gt=0, description="예상 판매량")
    waste_rate: float = Field(default=5.0, ge=0, le=100, description="폐기율 (%)")


class ComparisonResult(BaseModel):
    label: str = Field(..., description="'행사 참여' 또는 '미참여'")
    expected_qty: int
    total_revenue: float
    total_cost: float
    waste_cost: float
    net_profit: float
    profit_rate: float


class PromotionCalculateResponse(BaseModel):
    joined: ComparisonResult
    not_joined: ComparisonResult
    recommendation: str = Field(..., description="추천 메시지")
    break_even_qty: int = Field(..., description="손익분기점 판매량")


class PromotionCreate(BaseModel):
    product_name: str = Field(..., description="상품명")
    promotion_name: str = Field(default="", description="행사명")
    start_date: date = Field(..., description="행사 시작일")
    end_date: date = Field(..., description="행사 종료일")
    cost_price: float = Field(..., gt=0, description="원가")
    sale_price: float = Field(..., gt=0, description="판매가")
    expected_qty: int = Field(..., gt=0, description="예상 판매량")
    waste_rate: float = Field(default=5.0, ge=0, le=100, description="폐기율 (%)")
    joined: bool = Field(default=True, description="행사 참여 여부")


class PromotionUpdate(BaseModel):
    actual_qty: Optional[int] = Field(None, ge=0, description="실제 판매량")
    actual_profit_rate: Optional[float] = Field(None, description="실제 이익율 (%)")


class PromotionResponse(BaseModel):
    id: int
    user_id: int
    product_name: str
    promotion_name: str
    start_date: date
    end_date: date
    cost_price: float
    sale_price: float
    expected_qty: int
    waste_rate: float
    joined: bool
    actual_qty: Optional[int] = None
    actual_profit_rate: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PromotionHistoryResponse(BaseModel):
    items: list[PromotionResponse]
    total: int
