from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.upload import UploadHistory
from app.schemas.upload import UploadResultResponse, UploadHistoryResponse, UploadHistoryListResponse
from app.services.upload import process_upload

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

    return UploadResultResponse(
        upload_id=upload.id,
        file_name=upload.file_name,
        status=upload.status,
        record_count=upload.record_count,
        message=message,
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
