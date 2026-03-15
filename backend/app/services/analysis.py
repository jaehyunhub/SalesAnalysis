from datetime import date
from typing import Optional, List

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.sales import SalesRecord
from app.models.product import Product
from app.schemas.sales import (
    DailySalesResponse,
    MonthlySalesResponse,
    CategorySalesResponse,
    ProductRankResponse,
)


def get_daily_sales(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[DailySalesResponse]:
    """일별 매출 합계를 조회한다."""
    query = (
        db.query(
            SalesRecord.sale_date.label("date"),
            func.sum(SalesRecord.total_amount).label("total_amount"),
            func.sum(SalesRecord.quantity).label("total_quantity"),
        )
        .filter(SalesRecord.user_id == user_id)
        .group_by(SalesRecord.sale_date)
        .order_by(SalesRecord.sale_date)
    )

    if start_date:
        query = query.filter(SalesRecord.sale_date >= start_date)
    if end_date:
        query = query.filter(SalesRecord.sale_date <= end_date)

    rows = query.all()
    return [
        DailySalesResponse(
            date=row.date,
            total_amount=float(row.total_amount or 0),
            total_quantity=int(row.total_quantity or 0),
        )
        for row in rows
    ]


def get_monthly_sales(
    db: Session,
    user_id: int,
    year: Optional[int] = None,
) -> List[MonthlySalesResponse]:
    """월별 매출 합계를 조회한다."""
    query = (
        db.query(
            extract("year", SalesRecord.sale_date).label("year"),
            extract("month", SalesRecord.sale_date).label("month"),
            func.sum(SalesRecord.total_amount).label("total_amount"),
            func.sum(SalesRecord.quantity).label("total_quantity"),
        )
        .filter(SalesRecord.user_id == user_id)
        .group_by(
            extract("year", SalesRecord.sale_date),
            extract("month", SalesRecord.sale_date),
        )
        .order_by(
            extract("year", SalesRecord.sale_date),
            extract("month", SalesRecord.sale_date),
        )
    )

    if year:
        query = query.filter(extract("year", SalesRecord.sale_date) == year)

    rows = query.all()
    return [
        MonthlySalesResponse(
            year=int(row.year),
            month=int(row.month),
            total_amount=float(row.total_amount or 0),
            total_quantity=int(row.total_quantity or 0),
        )
        for row in rows
    ]


def get_category_sales(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[CategorySalesResponse]:
    """카테고리별 매출 비율을 조회한다."""
    query = (
        db.query(
            Product.category.label("category"),
            func.sum(SalesRecord.total_amount).label("total_amount"),
            func.sum(SalesRecord.quantity).label("total_quantity"),
        )
        .join(Product, SalesRecord.product_id == Product.id)
        .filter(SalesRecord.user_id == user_id)
        .group_by(Product.category)
        .order_by(func.sum(SalesRecord.total_amount).desc())
    )

    if start_date:
        query = query.filter(SalesRecord.sale_date >= start_date)
    if end_date:
        query = query.filter(SalesRecord.sale_date <= end_date)

    rows = query.all()

    # 전체 매출 합계로 비율 계산
    grand_total = sum(float(row.total_amount or 0) for row in rows)

    return [
        CategorySalesResponse(
            category=row.category,
            total_amount=float(row.total_amount or 0),
            total_quantity=int(row.total_quantity or 0),
            ratio=round(float(row.total_amount or 0) / grand_total * 100, 2) if grand_total > 0 else 0,
        )
        for row in rows
    ]


def get_product_ranking(
    db: Session,
    user_id: int,
    top_n: int = 10,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[ProductRankResponse]:
    """상품별 매출 순위를 조회한다 (Top N)."""
    query = (
        db.query(
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            Product.category.label("category"),
            func.sum(SalesRecord.total_amount).label("total_amount"),
            func.sum(SalesRecord.quantity).label("total_quantity"),
        )
        .join(Product, SalesRecord.product_id == Product.id)
        .filter(SalesRecord.user_id == user_id)
        .group_by(Product.id, Product.name, Product.category)
        .order_by(func.sum(SalesRecord.total_amount).desc())
        .limit(top_n)
    )

    if start_date:
        query = query.filter(SalesRecord.sale_date >= start_date)
    if end_date:
        query = query.filter(SalesRecord.sale_date <= end_date)

    rows = query.all()
    return [
        ProductRankResponse(
            product_id=row.product_id,
            product_name=row.product_name,
            category=row.category,
            total_amount=float(row.total_amount or 0),
            total_quantity=int(row.total_quantity or 0),
            rank=idx + 1,
        )
        for idx, row in enumerate(rows)
    ]
