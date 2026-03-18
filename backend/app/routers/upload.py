from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from PIL import Image
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis_client import cache_delete_pattern
from app.core.security import get_current_user
from app.models.product import Product
from app.models.sales import SalesRecord
from app.models.user import User
from app.models.upload import UploadHistory
from app.schemas.upload import (
    UploadResultResponse,
    UploadHistoryResponse,
    UploadHistoryListResponse,
    OCRResultResponse,
    OCRConfirmRequest,
    OCRConfirmResponse,
)
from app.services.upload import process_upload
from app.services.ocr import process_screenshot

router = APIRouter(prefix="/api/upload", tags=["업로드"])


@router.post("/file", response_model=UploadResultResponse)
def upload_file(
    file: UploadFile = File(..., description="엑셀(.xlsx) 또는 CSV 파일"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """엑셀/CSV 파일을 업로드하여 매출 데이터를 파싱 후 DB에 저장한다."""
    upload = process_upload(db, file, current_user.id)

    message = "업로드가 완료되었습니다."
    if upload.status == "failed":
        message = f"업로드 실패: {upload.error_message}"
    elif upload.error_message:
        message = f"업로드 완료. {upload.error_message}"

    if upload.status == "completed":
        cache_delete_pattern(f"analysis:{current_user.id}:*")

    return UploadResultResponse(
        upload_id=upload.id,
        file_name=upload.file_name,
        status=upload.status,
        record_count=upload.record_count,
        message=message,
    )


@router.post("/screenshot", response_model=OCRResultResponse)
def upload_screenshot(
    file: UploadFile = File(..., description="POS 스크린샷 이미지 (jpg, png)"),
    current_user: User = Depends(get_current_user),
):
    """POS 스크린샷을 OCR 처리하여 추출 결과를 반환한다 (DB 저장 안 함)."""
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일만 업로드할 수 있습니다. (jpg, png, webp, bmp)",
        )

    try:
        image = Image.open(file.file)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일을 열 수 없습니다.",
        )

    try:
        result = process_screenshot(image)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return OCRResultResponse(**result)


@router.post("/screenshot/confirm", response_model=OCRConfirmResponse)
def confirm_screenshot(
    data: OCRConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """사용자가 검토/수정한 OCR 데이터를 매출로 저장한다."""
    if not data.rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="저장할 상품 데이터가 없습니다.",
        )

    try:
        sale_date = datetime.strptime(data.sale_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)",
        )

    sale_time = None
    if data.sale_time:
        try:
            sale_time = datetime.strptime(data.sale_time, "%H:%M").time()
        except ValueError:
            pass

    # 업로드 이력 생성
    upload = UploadHistory(
        user_id=current_user.id,
        file_name="스크린샷 OCR",
        file_type="screenshot",
        record_count=0,
        status="processing",
    )
    db.add(upload)
    db.flush()

    record_count = 0
    for row in data.rows:
        product_name = row.product_name.strip()
        if not product_name:
            continue

        # 상품 조회/생성
        product = db.query(Product).filter(Product.name == product_name).first()
        if not product:
            product = Product(name=product_name, category="기타")
            db.add(product)
            db.flush()

        record = SalesRecord(
            product_id=product.id,
            user_id=current_user.id,
            sale_date=sale_date,
            sale_time=sale_time,
            quantity=row.quantity,
            total_amount=row.amount,
        )
        db.add(record)
        record_count += 1

    upload.record_count = record_count
    upload.status = "completed"
    db.commit()

    cache_delete_pattern(f"analysis:{current_user.id}:*")

    return OCRConfirmResponse(
        upload_id=upload.id,
        record_count=record_count,
        message=f"{record_count}건의 매출 데이터가 저장되었습니다.",
    )


@router.get("/history", response_model=UploadHistoryListResponse)
def get_upload_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """업로드 이력을 조회한다."""
    query = (
        db.query(UploadHistory)
        .filter(UploadHistory.user_id == current_user.id)
        .order_by(UploadHistory.created_at.desc())
    )

    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()

    return UploadHistoryListResponse(
        items=[UploadHistoryResponse.model_validate(item) for item in items],
        total=total,
    )
