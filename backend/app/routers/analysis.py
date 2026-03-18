from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis_client import cache_get, cache_set
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.sales import (
    DailySalesResponse,
    MonthlySalesResponse,
    CategorySalesResponse,
    ProductRankResponse,
)
from app.schemas.analysis import (
    SummaryResponse,
    HourlySales,
    PredictionResponse,
    WasteRiskResponse,
    ReorderResponse,
)
from app.services.analysis import (
    get_daily_sales,
    get_monthly_sales,
    get_category_sales,
    get_product_ranking,
    get_summary,
    get_hourly_sales,
    get_hourly_avg_sales,
)
from app.services.prediction import predict_demand, get_waste_risk_products, get_reorder_recommendations

router = APIRouter(prefix="/api/analysis", tags=["분석"])


@router.get("/daily", response_model=List[DailySalesResponse])
def daily_sales(
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일별 매출 합계를 조회한다."""
    cache_key = f"analysis:{current_user.id}:daily:{start_date}:{end_date}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_daily_sales(db, current_user.id, start_date, end_date)
    cache_set(cache_key, [r.model_dump() for r in result], ttl=300)
    return result


@router.get("/monthly", response_model=List[MonthlySalesResponse])
def monthly_sales(
    year: Optional[int] = Query(None, description="연도 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 매출 합계를 조회한다."""
    cache_key = f"analysis:{current_user.id}:monthly:{year}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_monthly_sales(db, current_user.id, year)
    cache_set(cache_key, [r.model_dump() for r in result], ttl=300)
    return result


@router.get("/category", response_model=List[CategorySalesResponse])
def category_sales(
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """카테고리별 매출 비율을 조회한다."""
    cache_key = f"analysis:{current_user.id}:category:{start_date}:{end_date}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_category_sales(db, current_user.id, start_date, end_date)
    cache_set(cache_key, [r.model_dump() for r in result], ttl=300)
    return result


@router.get("/summary", response_model=SummaryResponse)
def analysis_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """오늘/전일/이번달 매출 요약과 총 상품 수를 반환한다."""
    cache_key = f"analysis:{current_user.id}:summary"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_summary(db, current_user.id)
    cache_set(cache_key, result.model_dump(), ttl=300)
    return result


@router.get("/products", response_model=List[ProductRankResponse])
def product_ranking(
    top_n: int = Query(10, ge=1, le=100, description="상위 N개 상품"),
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """상품별 매출 순위를 조회한다 (Top N)."""
    cache_key = f"analysis:{current_user.id}:products:{start_date}:{end_date}:{top_n}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_product_ranking(db, current_user.id, top_n, start_date, end_date)
    cache_set(cache_key, [r.model_dump() for r in result], ttl=300)
    return result


@router.get("/hourly", response_model=List[HourlySales])
def hourly_sales(
    date: date = Query(..., description="조회 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 날짜의 시간대별 매출을 조회한다."""
    cache_key = f"analysis:{current_user.id}:hourly:{date}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_hourly_sales(db, current_user.id, date)
    cache_set(cache_key, [r.model_dump() for r in result], ttl=300)
    return result


@router.get("/hourly-avg", response_model=List[HourlySales])
def hourly_avg_sales(
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """기간 내 시간대별 평균 매출을 조회한다."""
    cache_key = f"analysis:{current_user.id}:hourly-avg:{start_date}:{end_date}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    result = get_hourly_avg_sales(db, current_user.id, start_date, end_date)
    cache_set(cache_key, [r.model_dump() for r in result], ttl=300)
    return result


@router.get("/predict", response_model=PredictionResponse)
def demand_prediction(
    product_id: int = Query(..., description="상품 ID"),
    days: int = Query(7, ge=1, le=30, description="예측 일수"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """상품별 수요 예측 (이동 평균 기반)."""
    try:
        return predict_demand(db, current_user.id, product_id, days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/waste-risk", response_model=WasteRiskResponse)
def waste_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """폐기 위험 상품 목록을 조회한다."""
    return get_waste_risk_products(db, current_user.id)


@router.get("/reorder-recommendation", response_model=ReorderResponse)
def reorder_recommendation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """상품별 7일 예측 판매량 기반 권장 발주량을 반환한다."""
    return get_reorder_recommendations(db, current_user.id)
