from typing import List

from pydantic import BaseModel


class DailySales(BaseModel):
    date: str
    total_amount: float
    total_quantity: int


class MonthlySales(BaseModel):
    year: int
    month: int
    total_amount: float
    total_quantity: int


class HourlySales(BaseModel):
    hour: int
    total_amount: float
    total_quantity: int


class CategorySales(BaseModel):
    category: str
    total_amount: float
    percentage: float


class TopProduct(BaseModel):
    name: str
    total_amount: float
    total_quantity: int


class SummaryResponse(BaseModel):
    today_amount: float
    yesterday_amount: float
    this_month_amount: float
    total_products: int


# ── 수요 예측 ──


class PredictionItem(BaseModel):
    date: str
    predicted_quantity: float


class PredictionResponse(BaseModel):
    product_id: int
    product_name: str
    predictions: List[PredictionItem]
    avg_7day: float
    avg_30day: float


# ── 폐기 위험 ──


class WasteRiskItem(BaseModel):
    product_id: int
    product_name: str
    category: str
    recent_7day_qty: int
    avg_30day_qty: float
    decline_rate: float  # 감소율 (%)
    risk_level: str  # "high", "medium", "low"


class WasteRiskResponse(BaseModel):
    items: List[WasteRiskItem]
    total: int


# ── 발주 추천 ──


class ReorderItem(BaseModel):
    product_id: int
    product_name: str
    category: str
    recent_7day_qty: int
    avg_daily_qty: float
    predicted_7day_qty: float
    recommended_order_qty: int  # ceil(predicted_7day_qty * 1.2)


class ReorderResponse(BaseModel):
    items: List[ReorderItem]
    total: int
    generated_at: str  # ISO 날짜


# ── 점포 적합성 분석 ──


class SimilarProduct(BaseModel):
    product_id: int
    product_name: str
    category: str
    avg_daily_qty: float
    total_30day_qty: int


class StoreSuitabilityResponse(BaseModel):
    product_name: str
    similar_products: List[SimilarProduct]
    estimated_daily_qty: float  # 유사상품 평균
    suitability_score: int  # 0~100
    recommendation: str  # 추천 문구
