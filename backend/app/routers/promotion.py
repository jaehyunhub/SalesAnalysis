import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.promotion import Promotion
from app.models.user import User
from app.schemas.analysis import StoreSuitabilityResponse
from app.schemas.promotion import (
    PromotionCalculateRequest,
    PromotionCalculateResponse,
    PromotionCreate,
    PromotionHistoryResponse,
    PromotionResponse,
    PromotionUpdate,
    ComparisonResult,
)
from app.services.prediction import get_store_suitability

router = APIRouter(prefix="/api/promotion", tags=["행사 분석"])


def _calculate_comparison(
    cost_price: float,
    sale_price: float,
    expected_qty: int,
    waste_rate: float,
) -> tuple[ComparisonResult, ComparisonResult, int]:
    """행사 참여 vs 미참여 비교 계산을 수행한다."""

    # --- 행사 참여 ---
    joined_qty = expected_qty
    joined_revenue = sale_price * joined_qty
    joined_total_cost = cost_price * joined_qty
    joined_waste_qty = math.ceil(joined_qty * waste_rate / 100)
    joined_waste_cost = cost_price * joined_waste_qty
    joined_net_profit = joined_revenue - joined_total_cost - joined_waste_cost
    joined_profit_rate = (joined_net_profit / joined_revenue * 100) if joined_revenue > 0 else 0.0

    joined_result = ComparisonResult(
        label="행사 참여",
        expected_qty=joined_qty,
        total_revenue=round(joined_revenue, 0),
        total_cost=round(joined_total_cost, 0),
        waste_cost=round(joined_waste_cost, 0),
        net_profit=round(joined_net_profit, 0),
        profit_rate=round(joined_profit_rate, 1),
    )

    # --- 미참여 (예상 판매량의 70%) ---
    not_joined_qty = math.ceil(expected_qty * 0.7)
    not_joined_revenue = sale_price * not_joined_qty
    not_joined_total_cost = cost_price * not_joined_qty
    not_joined_waste_qty = math.ceil(not_joined_qty * waste_rate / 100)
    not_joined_waste_cost = cost_price * not_joined_waste_qty
    not_joined_net_profit = not_joined_revenue - not_joined_total_cost - not_joined_waste_cost
    not_joined_profit_rate = (
        (not_joined_net_profit / not_joined_revenue * 100) if not_joined_revenue > 0 else 0.0
    )

    not_joined_result = ComparisonResult(
        label="미참여",
        expected_qty=not_joined_qty,
        total_revenue=round(not_joined_revenue, 0),
        total_cost=round(not_joined_total_cost, 0),
        waste_cost=round(not_joined_waste_cost, 0),
        net_profit=round(not_joined_net_profit, 0),
        profit_rate=round(not_joined_profit_rate, 1),
    )

    # --- 손익분기점: 원가 회수에 필요한 최소 판매량 ---
    margin_per_unit = sale_price - cost_price
    if margin_per_unit > 0:
        total_cost_with_waste = cost_price * expected_qty
        break_even_qty = math.ceil(total_cost_with_waste / margin_per_unit)
    else:
        break_even_qty = expected_qty

    return joined_result, not_joined_result, break_even_qty


@router.get("/suitability", response_model=StoreSuitabilityResponse)
def store_suitability(
    product_name: str = Query(..., description="분석할 상품명"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """과거 유사 상품 매출 기반으로 점포 적합성을 분석한다."""
    try:
        return get_store_suitability(db, current_user.id, product_name)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate", response_model=PromotionCalculateResponse)
def calculate_promotion(
    req: PromotionCalculateRequest,
    current_user: User = Depends(get_current_user),
):
    """행사 참여 vs 미참여 이익율을 비교 계산한다."""
    joined, not_joined, break_even_qty = _calculate_comparison(
        cost_price=req.cost_price,
        sale_price=req.sale_price,
        expected_qty=req.expected_qty,
        waste_rate=req.waste_rate,
    )

    if joined.net_profit > not_joined.net_profit:
        recommendation = (
            f"행사 참여가 유리합니다. "
            f"참여 시 순이익 {joined.net_profit:,.0f}원 vs 미참여 {not_joined.net_profit:,.0f}원 "
            f"(차이: {joined.net_profit - not_joined.net_profit:,.0f}원)"
        )
    elif joined.net_profit < not_joined.net_profit:
        recommendation = (
            f"미참여가 유리합니다. "
            f"미참여 시 순이익 {not_joined.net_profit:,.0f}원 vs 참여 {joined.net_profit:,.0f}원 "
            f"(차이: {not_joined.net_profit - joined.net_profit:,.0f}원)"
        )
    else:
        recommendation = "행사 참여와 미참여의 순이익이 동일합니다."

    return PromotionCalculateResponse(
        joined=joined,
        not_joined=not_joined,
        recommendation=recommendation,
        break_even_qty=break_even_qty,
    )


@router.get("/history", response_model=PromotionHistoryResponse)
def get_promotion_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """현재 사용자의 행사 이력을 최신순으로 반환한다."""
    query = (
        db.query(Promotion)
        .filter(Promotion.user_id == current_user.id)
        .order_by(Promotion.created_at.desc())
    )
    total = query.count()
    items = query.all()
    return PromotionHistoryResponse(items=items, total=total)


@router.post("", response_model=PromotionResponse, status_code=201)
def create_promotion(
    data: PromotionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """행사 이력을 저장한다."""
    promotion = Promotion(
        user_id=current_user.id,
        product_name=data.product_name,
        promotion_name=data.promotion_name,
        start_date=data.start_date,
        end_date=data.end_date,
        cost_price=data.cost_price,
        sale_price=data.sale_price,
        expected_qty=data.expected_qty,
        waste_rate=data.waste_rate,
        joined=data.joined,
    )
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


@router.put("/{promotion_id}", response_model=PromotionResponse)
def update_promotion(
    promotion_id: int,
    data: PromotionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """행사 실적(실제 판매량, 실제 이익율)을 업데이트한다."""
    promotion = (
        db.query(Promotion)
        .filter(Promotion.id == promotion_id, Promotion.user_id == current_user.id)
        .first()
    )
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="행사 이력을 찾을 수 없습니다.",
        )

    if data.actual_qty is not None:
        promotion.actual_qty = data.actual_qty
    if data.actual_profit_rate is not None:
        promotion.actual_profit_rate = data.actual_profit_rate

    db.commit()
    db.refresh(promotion)
    return promotion


@router.delete("/{promotion_id}", status_code=204)
def delete_promotion(
    promotion_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """행사 이력을 삭제한다."""
    promotion = (
        db.query(Promotion)
        .filter(Promotion.id == promotion_id, Promotion.user_id == current_user.id)
        .first()
    )
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="행사 이력을 찾을 수 없습니다.",
        )
    db.delete(promotion)
    db.commit()
