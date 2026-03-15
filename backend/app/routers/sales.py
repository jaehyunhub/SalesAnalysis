from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.sales import SalesRecord
from app.models.product import Product
from app.schemas.sales import SalesRecordCreate, SalesRecordResponse, SalesListResponse

router = APIRouter(prefix="/api/sales", tags=["매출"])


@router.get("", response_model=SalesListResponse)
def list_sales(
    start_date: Optional[date] = Query(None, description="시작일"),
    end_date: Optional[date] = Query(None, description="종료일"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매출 목록을 조회한다. 날짜 필터 및 페이지네이션을 지원한다."""
    query = (
        db.query(SalesRecord)
        .options(joinedload(SalesRecord.product))
        .filter(SalesRecord.user_id == current_user.id)
        .order_by(SalesRecord.sale_date.desc(), SalesRecord.id.desc())
    )

    if start_date:
        query = query.filter(SalesRecord.sale_date >= start_date)
    if end_date:
        query = query.filter(SalesRecord.sale_date <= end_date)

    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()

    return SalesListResponse(
        items=[SalesRecordResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{sales_id}", response_model=SalesRecordResponse)
def get_sale(
    sales_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매출 상세 정보를 조회한다."""
    record = (
        db.query(SalesRecord)
        .options(joinedload(SalesRecord.product))
        .filter(SalesRecord.id == sales_id, SalesRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="매출 데이터를 찾을 수 없습니다.",
        )
    return SalesRecordResponse.model_validate(record)


@router.post("", response_model=SalesRecordResponse, status_code=201)
def create_sale(
    sale_data: SalesRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """매출 데이터를 수동으로 등록한다."""
    # 상품 존재 여부 확인
    product = db.query(Product).filter(Product.id == sale_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상품을 찾을 수 없습니다.",
        )

    record = SalesRecord(
        product_id=sale_data.product_id,
        user_id=current_user.id,
        sale_date=sale_data.sale_date,
        sale_time=sale_data.sale_time,
        quantity=sale_data.quantity,
        total_amount=sale_data.total_amount,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # product relationship 로드
    record = (
        db.query(SalesRecord)
        .options(joinedload(SalesRecord.product))
        .filter(SalesRecord.id == record.id)
        .first()
    )
    return SalesRecordResponse.model_validate(record)
