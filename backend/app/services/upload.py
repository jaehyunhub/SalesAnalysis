import io
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sales import SalesRecord
from app.models.upload import UploadHistory

# 한글 컬럼명 매핑: 다양한 표기를 표준 키로 변환
COLUMN_MAPPING = {
    # 날짜
    "날짜": "date",
    "판매날짜": "date",
    "판매일": "date",
    "판매일자": "date",
    "일자": "date",
    "date": "date",
    "sale_date": "date",
    # 상품명
    "상품명": "product_name",
    "상품": "product_name",
    "품명": "product_name",
    "product": "product_name",
    "product_name": "product_name",
    "이름": "product_name",
    # 수량
    "수량": "quantity",
    "판매수량": "quantity",
    "qty": "quantity",
    "quantity": "quantity",
    # 금액
    "금액": "amount",
    "판매금액": "amount",
    "총금액": "amount",
    "매출액": "amount",
    "매출": "amount",
    "total": "amount",
    "amount": "amount",
    "total_amount": "amount",
    # 카테고리
    "카테고리": "category",
    "분류": "category",
    "category": "category",
    # 바코드
    "바코드": "barcode",
    "barcode": "barcode",
    # 시간
    "시간": "time",
    "판매시간": "time",
    "time": "time",
}


def _detect_file_type(filename: str) -> str:
    """파일 확장자로 파일 타입을 판별한다."""
    lower = filename.lower()
    if lower.endswith(".csv"):
        return "csv"
    elif lower.endswith((".xlsx", ".xls")):
        return "excel"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일만 업로드할 수 있습니다.",
        )


def _read_file_to_df(file_content: bytes, file_type: str) -> pd.DataFrame:
    """파일 내용을 pandas DataFrame으로 읽는다."""
    if file_type == "csv":
        # 여러 인코딩 시도
        for encoding in ["utf-8", "cp949", "euc-kr"]:
            try:
                return pd.read_csv(io.BytesIO(file_content), encoding=encoding)
            except UnicodeDecodeError:
                continue
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 인코딩을 인식할 수 없습니다.",
        )
    else:
        return pd.read_excel(io.BytesIO(file_content))


def _map_columns(df: pd.DataFrame) -> dict[str, str]:
    """DataFrame 컬럼을 표준 키로 매핑한다."""
    mapping = {}
    for col in df.columns:
        col_lower = str(col).strip().lower()
        if col_lower in COLUMN_MAPPING:
            mapping[str(col)] = COLUMN_MAPPING[col_lower]
    return mapping


def _get_or_create_product(
    db: Session,
    name: str,
    category: str = "기타",
    barcode: Optional[str] = None,
) -> Product:
    """상품을 조회하고, 없으면 새로 생성한다."""
    query = db.query(Product).filter(Product.name == name)
    product = query.first()
    if product:
        return product

    product = Product(name=name, category=category, barcode=barcode)
    db.add(product)
    db.flush()  # ID를 얻기 위해 flush
    return product


def process_upload(
    db: Session,
    file: UploadFile,
    user_id: int,
) -> UploadHistory:
    """업로드된 파일을 파싱하여 매출 데이터를 DB에 저장한다."""
    file_type = _detect_file_type(file.filename)

    # 업로드 기록 생성
    upload = UploadHistory(
        user_id=user_id,
        file_name=file.filename,
        file_type=file_type,
        record_count=0,
        status="processing",
    )
    db.add(upload)
    db.flush()

    try:
        content = file.file.read()
        df = _read_file_to_df(content, file_type)

        if df.empty:
            upload.status = "failed"
            upload.error_message = "파일에 데이터가 없습니다."
            db.commit()
            return upload

        # 컬럼 매핑
        col_mapping = _map_columns(df)
        if "date" not in col_mapping.values() or "product_name" not in col_mapping.values():
            upload.status = "failed"
            upload.error_message = (
                "필수 컬럼(날짜, 상품명)을 찾을 수 없습니다. "
                "컬럼명을 확인해주세요."
            )
            db.commit()
            return upload

        # 역매핑: 표준키 -> 원래 컬럼명
        reverse_map = {v: k for k, v in col_mapping.items()}

        record_count = 0
        skipped = 0

        for _, row in df.iterrows():
            try:
                # 날짜 파싱
                raw_date = row[reverse_map["date"]]
                sale_date = pd.to_datetime(raw_date).date()

                # 상품명
                product_name = str(row[reverse_map["product_name"]]).strip()
                if not product_name or product_name == "nan":
                    continue

                # 카테고리 (있으면)
                category = "기타"
                if "category" in reverse_map:
                    cat_val = str(row[reverse_map["category"]]).strip()
                    if cat_val and cat_val != "nan":
                        category = cat_val

                # 바코드 (있으면)
                barcode = None
                if "barcode" in reverse_map:
                    bc_val = str(row[reverse_map["barcode"]]).strip()
                    if bc_val and bc_val != "nan":
                        barcode = bc_val

                # 수량
                quantity = 1
                if "quantity" in reverse_map:
                    try:
                        quantity = int(float(row[reverse_map["quantity"]]))
                    except (ValueError, TypeError):
                        quantity = 1

                # 금액
                amount = 0.0
                if "amount" in reverse_map:
                    try:
                        amount = float(row[reverse_map["amount"]])
                    except (ValueError, TypeError):
                        amount = 0.0

                # 시간
                sale_time = None
                if "time" in reverse_map:
                    try:
                        raw_time = row[reverse_map["time"]]
                        if pd.notna(raw_time):
                            sale_time = pd.to_datetime(str(raw_time)).time()
                    except (ValueError, TypeError):
                        sale_time = None

                # 상품 조회/생성
                product = _get_or_create_product(db, product_name, category, barcode)

                # 중복 체크: 같은 날짜 + 같은 상품 + 같은 사용자
                existing = (
                    db.query(SalesRecord)
                    .filter(
                        SalesRecord.user_id == user_id,
                        SalesRecord.product_id == product.id,
                        SalesRecord.sale_date == sale_date,
                        SalesRecord.quantity == quantity,
                        SalesRecord.total_amount == amount,
                    )
                    .first()
                )
                if existing:
                    skipped += 1
                    continue

                record = SalesRecord(
                    product_id=product.id,
                    user_id=user_id,
                    sale_date=sale_date,
                    sale_time=sale_time,
                    quantity=quantity,
                    total_amount=amount,
                )
                db.add(record)
                record_count += 1

            except Exception:
                # 개별 행 에러는 건너뜀
                continue

        upload.record_count = record_count
        upload.status = "completed"
        if skipped > 0:
            upload.error_message = f"{skipped}건의 중복 데이터를 건너뛰었습니다."
        db.commit()
        return upload

    except HTTPException:
        raise
    except Exception as e:
        upload.status = "failed"
        upload.error_message = str(e)[:500]
        db.commit()
        return upload
