import math
from datetime import date, timedelta
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.sales import SalesRecord
from app.models.product import Product
from app.schemas.analysis import (
    PredictionItem,
    PredictionResponse,
    WasteRiskItem,
    WasteRiskResponse,
    ReorderItem,
    ReorderResponse,
    SimilarProduct,
    StoreSuitabilityResponse,
)


def predict_demand(
    db: Session,
    user_id: int,
    product_id: int,
    days: int = 7,
) -> PredictionResponse:
    """상품별 수요 예측 — 7일/30일 이동 평균 기반."""
    today = date.today()

    # 상품 정보 조회
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError(f"상품을 찾을 수 없습니다: {product_id}")

    # 최근 30일 일별 판매량 집계
    start_30d = today - timedelta(days=30)
    rows = (
        db.query(
            SalesRecord.sale_date.label("date"),
            func.sum(SalesRecord.quantity).label("total_quantity"),
        )
        .filter(
            SalesRecord.user_id == user_id,
            SalesRecord.product_id == product_id,
            SalesRecord.sale_date >= start_30d,
            SalesRecord.sale_date <= today,
        )
        .group_by(SalesRecord.sale_date)
        .order_by(SalesRecord.sale_date)
        .all()
    )

    # 날짜별 판매량 딕셔너리 (판매 없는 날은 0)
    daily_qty = {}
    for row in rows:
        daily_qty[row.date] = int(row.total_quantity or 0)

    # 7일/30일 평균 계산
    def avg_for_period(period_days: int) -> float:
        total = 0
        start = today - timedelta(days=period_days)
        for i in range(period_days):
            d = start + timedelta(days=i + 1)
            total += daily_qty.get(d, 0)
        return round(total / max(period_days, 1), 2)

    avg_7day = avg_for_period(7)
    avg_30day = avg_for_period(30)

    # 가중 이동 평균으로 예측 (최근 7일 가중치 0.7, 30일 가중치 0.3)
    base_prediction = avg_7day * 0.7 + avg_30day * 0.3

    # 요일별 보정 계수 계산 (최근 30일 데이터 기반)
    weekday_totals: dict[int, list[int]] = {i: [] for i in range(7)}
    for i in range(30):
        d = today - timedelta(days=i)
        qty = daily_qty.get(d, 0)
        weekday_totals[d.weekday()].append(qty)

    weekday_avg = {}
    for wd, values in weekday_totals.items():
        weekday_avg[wd] = sum(values) / max(len(values), 1)

    overall_avg = sum(weekday_avg.values()) / 7 if any(weekday_avg.values()) else 1

    # 향후 N일 예측
    predictions: List[PredictionItem] = []
    for i in range(1, days + 1):
        future_date = today + timedelta(days=i)
        wd = future_date.weekday()

        # 요일 보정 계수 적용
        if overall_avg > 0 and weekday_avg.get(wd, 0) > 0:
            weekday_factor = weekday_avg[wd] / overall_avg
        else:
            weekday_factor = 1.0

        predicted = round(base_prediction * weekday_factor, 1)
        predictions.append(
            PredictionItem(
                date=future_date.isoformat(),
                predicted_quantity=max(predicted, 0),
            )
        )

    return PredictionResponse(
        product_id=product_id,
        product_name=product.name,
        predictions=predictions,
        avg_7day=avg_7day,
        avg_30day=avg_30day,
    )


def get_waste_risk_products(
    db: Session,
    user_id: int,
) -> WasteRiskResponse:
    """폐기 위험 상품 목록 — 최근 7일 판매 추이가 30일 평균 대비 50% 이하로 감소한 상품."""
    today = date.today()
    start_7d = today - timedelta(days=7)
    start_30d = today - timedelta(days=30)

    # 최근 7일 상품별 판매량
    recent_7d = (
        db.query(
            SalesRecord.product_id,
            func.sum(SalesRecord.quantity).label("qty_7d"),
        )
        .filter(
            SalesRecord.user_id == user_id,
            SalesRecord.sale_date > start_7d,
            SalesRecord.sale_date <= today,
        )
        .group_by(SalesRecord.product_id)
        .subquery()
    )

    # 최근 30일 상품별 판매량
    recent_30d = (
        db.query(
            SalesRecord.product_id,
            func.sum(SalesRecord.quantity).label("qty_30d"),
        )
        .filter(
            SalesRecord.user_id == user_id,
            SalesRecord.sale_date > start_30d,
            SalesRecord.sale_date <= today,
        )
        .group_by(SalesRecord.product_id)
        .subquery()
    )

    # 조인하여 비교
    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            Product.category.label("category"),
            recent_7d.c.qty_7d,
            recent_30d.c.qty_30d,
        )
        .join(recent_30d, Product.id == recent_30d.c.product_id)
        .outerjoin(recent_7d, Product.id == recent_7d.c.product_id)
        .filter(recent_30d.c.qty_30d > 0)
        .all()
    )

    items: List[WasteRiskItem] = []
    for row in rows:
        qty_7d = int(row.qty_7d or 0)
        qty_30d = float(row.qty_30d or 0)

        # 30일 판매량을 7일 단위로 환산하여 비교
        avg_7d_from_30d = round(qty_30d / 30 * 7, 2)

        if avg_7d_from_30d <= 0:
            continue

        # 감소율: (30일 평균 기준 7일 환산 - 실제 최근 7일) / 30일 평균 기준 7일 환산 * 100
        decline_rate = round((1 - qty_7d / avg_7d_from_30d) * 100, 1)

        # 위험 수준 분류
        if decline_rate >= 70:
            risk_level = "high"
        elif decline_rate >= 50:
            risk_level = "medium"
        else:
            # 50% 미만 감소는 위험 상품에 포함하지 않음
            continue

        items.append(
            WasteRiskItem(
                product_id=row.product_id,
                product_name=row.product_name,
                category=row.category,
                recent_7day_qty=qty_7d,
                avg_30day_qty=avg_7d_from_30d,
                decline_rate=decline_rate,
                risk_level=risk_level,
            )
        )

    # 감소율 높은 순으로 정렬
    items.sort(key=lambda x: x.decline_rate, reverse=True)

    return WasteRiskResponse(items=items, total=len(items))


def get_reorder_recommendations(
    db: Session,
    user_id: int,
) -> ReorderResponse:
    """발주 추천 — 상품별 7일 예측 판매량 기반 권장 발주량 산출."""
    today = date.today()
    start_30d = today - timedelta(days=30)
    start_7d = today - timedelta(days=7)

    # 최근 30일 판매 이력이 있는 상품의 일별 판매량 집계
    rows_30d = (
        db.query(
            SalesRecord.product_id,
            SalesRecord.sale_date,
            func.sum(SalesRecord.quantity).label("daily_qty"),
        )
        .filter(
            SalesRecord.user_id == user_id,
            SalesRecord.sale_date >= start_30d,
            SalesRecord.sale_date <= today,
        )
        .group_by(SalesRecord.product_id, SalesRecord.sale_date)
        .all()
    )

    # 상품별 날짜별 판매량 딕셔너리 구성
    product_daily: dict[int, dict] = {}
    for row in rows_30d:
        pid = row.product_id
        if pid not in product_daily:
            product_daily[pid] = {}
        product_daily[pid][row.sale_date] = int(row.daily_qty or 0)

    # 최근 7일 판매량이 0인 상품 제외
    eligible_product_ids = []
    for pid, daily in product_daily.items():
        qty_7d = sum(daily.get(today - timedelta(days=i), 0) for i in range(7))
        if qty_7d > 0:
            eligible_product_ids.append(pid)

    if not eligible_product_ids:
        return ReorderResponse(items=[], total=0, generated_at=today.isoformat())

    # 대상 상품 정보 조회
    products = (
        db.query(Product)
        .filter(Product.id.in_(eligible_product_ids))
        .all()
    )
    product_map = {p.id: p for p in products}

    items: List[ReorderItem] = []
    for pid in eligible_product_ids:
        product = product_map.get(pid)
        if not product:
            continue

        daily = product_daily[pid]

        # 최근 7일 판매량 합계
        recent_7day_qty = sum(daily.get(today - timedelta(days=i), 0) for i in range(7))

        # 30일 일평균 판매량
        total_30d = sum(daily.values())
        avg_daily_qty = round(total_30d / 30, 2)

        # 가중 이동 평균 기반 7일 예측
        avg_7day = round(recent_7day_qty / 7, 2)
        avg_30day = avg_daily_qty
        base_prediction = avg_7day * 0.7 + avg_30day * 0.3

        # 예측 7일 총 판매량
        predicted_7day_qty = round(base_prediction * 7, 1)

        # 권장 발주량 = 예측 7일 판매량 × 1.2 (안전재고 20% 여유)
        recommended_order_qty = math.ceil(predicted_7day_qty * 1.2)

        items.append(
            ReorderItem(
                product_id=pid,
                product_name=product.name,
                category=product.category or "",
                recent_7day_qty=recent_7day_qty,
                avg_daily_qty=avg_daily_qty,
                predicted_7day_qty=predicted_7day_qty,
                recommended_order_qty=recommended_order_qty,
            )
        )

    # 권장 발주량 높은 순으로 정렬
    items.sort(key=lambda x: x.recommended_order_qty, reverse=True)

    return ReorderResponse(items=items, total=len(items), generated_at=today.isoformat())


def get_store_suitability(
    db: Session,
    user_id: int,
    product_name: str,
) -> StoreSuitabilityResponse:
    """점포 적합성 분석 — 과거 유사 상품 매출 기반 예상 판매량 추정."""
    today = date.today()
    start_30d = today - timedelta(days=30)

    # 입력 상품명에서 검색 키워드 추출 (공백 기준 첫 번째 토큰 사용)
    keyword = product_name.strip().split()[0] if product_name.strip() else product_name

    try:
        # 유사 상품 검색: 이름 부분 매칭
        similar_products = (
            db.query(Product)
            .filter(Product.name.ilike(f"%{keyword}%"))
            .limit(20)
            .all()
        )

        if not similar_products:
            # 키워드로 못 찾으면 전체 이름으로 재시도
            similar_products = (
                db.query(Product)
                .filter(Product.name.ilike(f"%{product_name}%"))
                .limit(20)
                .all()
            )

        if not similar_products:
            return StoreSuitabilityResponse(
                product_name=product_name,
                similar_products=[],
                estimated_daily_qty=0.0,
                suitability_score=30,
                recommendation="유사 상품 판매 이력이 없습니다. 기본 적합성 점수 30점을 부여합니다.",
            )

        similar_product_ids = [p.id for p in similar_products]

        # 유사 상품들의 최근 30일 판매량 집계
        sales_rows = (
            db.query(
                SalesRecord.product_id,
                func.sum(SalesRecord.quantity).label("total_qty"),
            )
            .filter(
                SalesRecord.user_id == user_id,
                SalesRecord.product_id.in_(similar_product_ids),
                SalesRecord.sale_date >= start_30d,
                SalesRecord.sale_date <= today,
            )
            .group_by(SalesRecord.product_id)
            .all()
        )

        sales_map = {row.product_id: int(row.total_qty or 0) for row in sales_rows}

        # 판매 이력이 있는 유사 상품만 포함
        result_products: List[SimilarProduct] = []
        for p in similar_products:
            total_30d = sales_map.get(p.id, 0)
            if total_30d == 0:
                continue
            avg_daily = round(total_30d / 30, 2)
            result_products.append(
                SimilarProduct(
                    product_id=p.id,
                    product_name=p.name,
                    category=p.category or "",
                    avg_daily_qty=avg_daily,
                    total_30day_qty=total_30d,
                )
            )

        if not result_products:
            return StoreSuitabilityResponse(
                product_name=product_name,
                similar_products=[],
                estimated_daily_qty=0.0,
                suitability_score=30,
                recommendation="유사 상품이 있지만 최근 30일 판매 이력이 없습니다. 기본 적합성 점수 30점을 부여합니다.",
            )

        # 예상 일평균 판매량 = 유사 상품들의 일평균 판매량 평균
        estimated_daily_qty = round(
            sum(p.avg_daily_qty for p in result_products) / len(result_products), 2
        )

        # 적합성 점수 계산 (판매량 지수 기반, 0~100)
        # 일평균 판매량 5개 이상이면 100점에 가깝게, 0에 가까울수록 낮은 점수
        MAX_DAILY_THRESHOLD = 10.0  # 일평균 10개 이상이면 최고 점수
        raw_score = min(estimated_daily_qty / MAX_DAILY_THRESHOLD, 1.0) * 70
        # 유사 상품 수 보너스 (최대 30점)
        product_bonus = min(len(result_products) / 5, 1.0) * 30
        suitability_score = int(round(raw_score + product_bonus))
        suitability_score = max(0, min(100, suitability_score))

        # 추천 문구 생성
        if suitability_score >= 70:
            recommendation = (
                f"이 점포에서 '{product_name}'과 유사한 상품이 잘 팔리고 있습니다. "
                f"일평균 {estimated_daily_qty:.1f}개 판매가 예상됩니다. 적극 추천합니다."
            )
        elif suitability_score >= 40:
            recommendation = (
                f"이 점포에서 '{product_name}'과 유사한 상품의 판매 실적이 보통 수준입니다. "
                f"일평균 {estimated_daily_qty:.1f}개 판매가 예상됩니다. 소량 발주를 권장합니다."
            )
        else:
            recommendation = (
                f"이 점포에서 '{product_name}'과 유사한 상품의 판매량이 적습니다. "
                f"일평균 {estimated_daily_qty:.1f}개 판매가 예상됩니다. 신중한 발주를 권장합니다."
            )

        return StoreSuitabilityResponse(
            product_name=product_name,
            similar_products=result_products,
            estimated_daily_qty=estimated_daily_qty,
            suitability_score=suitability_score,
            recommendation=recommendation,
        )

    except Exception as e:
        raise ValueError(f"점포 적합성 분석 중 오류가 발생했습니다: {str(e)}")
