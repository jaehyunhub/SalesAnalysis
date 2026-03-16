from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.sales import (
    DailySalesResponse,
    MonthlySalesResponse,
    CategorySalesResponse,
    ProductRankResponse,
)
from app.schemas.analysis import SummaryResponse
from app.services.analysis import (
    get_daily_sales,
    get_monthly_sales,
    get_category_sales,
    get_product_ranking,
    get_summary,
)

router = APIRouter(prefix="/api/analysis", tags=["분석"])


@router.get("/daily", response_model=List[DailySalesResponse])
def daily_sales(
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """일별 매출 합계를 조회한다."""
    return get_daily_sales(db, current_user.id, start_date, end_date)


@router.get("/monthly", response_model=List[MonthlySalesResponse])
def monthly_sales(
    year: Optional[int] = Query(None, description="연도 필터"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월별 매출 합계를 조회한다."""
    return get_monthly_sales(db, current_user.id, year)


@router.get("/category", response_model=List[CategorySalesResponse])
def category_sales(
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """카테고리별 매출 비율을 조회한다."""
    return get_category_sales(db, current_user.id, start_date, end_date)


@router.get("/summary", response_model=SummaryResponse)
def analysis_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """오늘/전일/이번달 매출 요약과 총 상품 수를 반환한다."""
    return get_summary(db, current_user.id)


@router.get("/products", response_model=List[ProductRankResponse])
def product_ranking(
    top_n: int = Query(10, ge=1, le=100, description="상위 N개 상품"),
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """상품별 매출 순위를 조회한다 (Top N)."""
    return get_product_ranking(db, current_user.id, top_n, start_date, end_date)
