#!/usr/bin/env python3
"""
ConveniSight 데모 시드 데이터 생성 스크립트
사용법: python backend/scripts/seed_data.py
       (프로젝트 루트 또는 backend 디렉토리에서 실행)
"""

import sys
import os
import random
from datetime import date, time, datetime, timedelta, timezone

# app 모듈을 import할 수 있도록 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.product import Product
from app.models.sales import SalesRecord
from app.models.event import Event

# ─────────────────────────────────────────────
# 상수 정의
# ─────────────────────────────────────────────

DEMO_EMAIL = "demo@conveni.com"
DEMO_PASSWORD = "demo1234"
DEMO_STORE_NAME = "CU 강남점"
DEMO_STORE_ADDRESS = "서울시 강남구 테헤란로 123"

SEED_DAYS = 90  # 오늘 기준 최근 90일

# 상품 목록: (이름, 카테고리, 판매가, 바코드)
PRODUCTS = [
    # 식품
    ("삼각김밥(참치마요)", "식품", 1500, "88000001"),
    ("삼각김밥(불고기)",   "식품", 1500, "88000002"),
    ("도시락(제육볶음)",   "식품", 3500, "88000003"),
    ("컵라면(신라면)",     "식품", 1300, "88000004"),
    ("컵라면(불닭볶음면)", "식품", 1500, "88000005"),
    # 음료
    ("아메리카노(원두커피)",  "음료", 1500, "88000006"),
    ("녹차라떼",              "음료", 2000, "88000007"),
    ("에너지드링크(레드불)",  "음료", 2500, "88000008"),
    ("생수(제주삼다수)",       "음료",  900, "88000009"),
    ("스무디킹(딸기)",        "음료", 3000, "88000010"),
    # 과자/빵
    ("허니버터칩",  "과자/빵", 1700, "88000011"),
    ("새우깡",      "과자/빵",  900, "88000012"),
    ("초코파이",    "과자/빵", 1200, "88000013"),
    ("소보로빵",    "과자/빵", 1200, "88000014"),
    ("크림빵",      "과자/빵", 1300, "88000015"),
    # 유제품
    ("바나나우유",      "유제품", 1800, "88000016"),
    ("초코우유",        "유제품", 1800, "88000017"),
    ("요거트(딸기)",    "유제품", 2000, "88000018"),
    ("슬라이스치즈",    "유제품", 2500, "88000019"),
    ("아이스크림(메로나)", "유제품", 1000, "88000020"),
]

# 상품별 인기도 가중치 (index 기준, PRODUCTS 순서와 일치)
# 값이 클수록 더 많이 팔림
POPULARITY_WEIGHTS = [
    # 식품
    10, 9, 6, 8, 7,
    # 음료
    10, 6, 5, 9, 4,
    # 과자/빵
    7, 6, 5, 5, 5,
    # 유제품
    7, 6, 5, 4, 6,
]

# 시간대별 트래픽 가중치 (0~23시)
HOURLY_WEIGHTS = [
    1, 1, 0, 0, 0, 1,   # 0~5시
    2, 5, 5, 3, 2, 3,   # 6~11시  (7~9 출근 피크)
    6, 6, 3, 2, 2, 4,   # 12~17시 (12~13 점심 피크)
    6, 6, 4, 3, 2, 1,   # 18~23시 (18~20 퇴근 피크)
]

# 공휴일 이벤트 (최근 90일 범위 안에 드는 날 기준: 2025-12-18 ~ 2026-03-18)
HOLIDAY_EVENTS = [
    (date(2025, 12, 25), "holiday", "성탄절"),
    (date(2026,  1,  1), "holiday", "신정"),
    (date(2026,  1, 28), "holiday", "설날 연휴"),
    (date(2026,  1, 29), "holiday", "설날"),
    (date(2026,  1, 30), "holiday", "설날 연휴"),
    (date(2026,  3,  1), "holiday", "삼일절"),
]

# 랜덤 로컬 이벤트
LOCAL_EVENTS = [
    (date(2026,  1, 10), "local",  "인근 오피스 빌딩 대규모 입주"),
    (date(2026,  1, 20), "school", "강남구 겨울방학 시작"),
    (date(2026,  2,  5), "local",  "인근 공사 현장 착공 (이동 인구 증가)"),
    (date(2026,  2, 20), "other",  "강남구 마라톤 대회 개최"),
    (date(2026,  3, 10), "school", "새학기 시작 (유동인구 증가)"),
]


# ─────────────────────────────────────────────
# 헬퍼 함수
# ─────────────────────────────────────────────

def random_sale_time(hour: int) -> time:
    """주어진 시간대 내에서 랜덤 분/초를 생성한다."""
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return time(hour, minute, second)


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # 5=토, 6=일


def daily_transaction_count(d: date) -> int:
    """날짜에 따라 하루 거래 건수를 반환한다."""
    base = random.randint(50, 150)
    if is_weekend(d):
        base = int(base * 1.3)
    return base


def pick_hour() -> int:
    """시간대별 가중치로 판매 시간(시)을 선택한다."""
    return random.choices(range(24), weights=HOURLY_WEIGHTS, k=1)[0]


def pick_product_index() -> int:
    """인기도 가중치로 상품 인덱스를 선택한다."""
    return random.choices(range(len(PRODUCTS)), weights=POPULARITY_WEIGHTS, k=1)[0]


# ─────────────────────────────────────────────
# 메인 로직
# ─────────────────────────────────────────────

def main():
    db = SessionLocal()
    try:
        print("=" * 55)
        print("  ConveniSight 데모 시드 데이터 생성 시작")
        print("=" * 55)

        # ── 1. 기존 데모 계정 데이터 삭제 ──────────────────
        existing_user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing_user:
            print(f"\n[1/5] 기존 데모 계정 데이터 삭제 중... (user_id={existing_user.id})")
            deleted_sales = (
                db.query(SalesRecord)
                .filter(SalesRecord.user_id == existing_user.id)
                .delete()
            )
            deleted_events = (
                db.query(Event)
                .filter(Event.user_id == existing_user.id)
                .delete()
            )
            db.delete(existing_user)
            db.commit()
            print(f"     매출 레코드 {deleted_sales}건, 이벤트 {deleted_events}건 삭제 완료")
        else:
            print("\n[1/5] 기존 데모 계정 없음 — 신규 생성합니다.")

        # ── 2. 데모 유저 생성 ──────────────────────────────
        print(f"\n[2/5] 데모 유저 생성 중...")
        user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            store_name=DEMO_STORE_NAME,
            store_address=DEMO_STORE_ADDRESS,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"     유저 생성 완료: {DEMO_EMAIL} (id={user.id})")

        # ── 3. 상품 upsert ─────────────────────────────────
        print(f"\n[3/5] 상품 데이터 upsert 중... ({len(PRODUCTS)}개)")
        product_records = []
        for name, category, selling_price, barcode in PRODUCTS:
            cost_price = round(selling_price * 0.6)
            prod = db.query(Product).filter(Product.barcode == barcode).first()
            if prod:
                # 이미 존재하면 가격 정보만 업데이트
                prod.name = name
                prod.category = category
                prod.selling_price = float(selling_price)
                prod.cost_price = float(cost_price)
            else:
                prod = Product(
                    barcode=barcode,
                    name=name,
                    category=category,
                    selling_price=float(selling_price),
                    cost_price=float(cost_price),
                )
                db.add(prod)
            product_records.append((prod, selling_price))

        db.commit()
        # refresh하여 id 확보
        for i, (prod, _) in enumerate(product_records):
            db.refresh(prod)
        print(f"     상품 upsert 완료")

        # ── 4. 매출 데이터 생성 ────────────────────────────
        today = date.today()
        start_date = today - timedelta(days=SEED_DAYS - 1)

        print(f"\n[4/5] 매출 데이터 생성 중...")
        print(f"     기간: {start_date} ~ {today} ({SEED_DAYS}일)")

        total_sales_count = 0
        total_revenue = 0.0
        batch_size = 500
        batch = []

        current_date = start_date
        while current_date <= today:
            tx_count = daily_transaction_count(current_date)

            for _ in range(tx_count):
                prod, selling_price = product_records[pick_product_index()]
                hour = pick_hour()
                quantity = random.choices([1, 2, 3], weights=[70, 20, 10], k=1)[0]
                total_amount = float(selling_price * quantity)

                record = SalesRecord(
                    product_id=prod.id,
                    user_id=user.id,
                    sale_date=current_date,
                    sale_time=random_sale_time(hour),
                    quantity=quantity,
                    total_amount=total_amount,
                )
                batch.append(record)
                total_sales_count += 1
                total_revenue += total_amount

                if len(batch) >= batch_size:
                    db.bulk_save_objects(batch)
                    db.commit()
                    batch = []
                    print(f"     ...{total_sales_count}건 저장됨", end="\r")

            current_date += timedelta(days=1)

        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        print(f"     매출 레코드 생성 완료: 총 {total_sales_count:,}건")

        # ── 5. 이벤트 데이터 생성 ─────────────────────────
        print(f"\n[5/5] 이벤트 데이터 생성 중...")
        event_list = []

        all_events = HOLIDAY_EVENTS + LOCAL_EVENTS
        inserted_event_count = 0
        for event_date, event_type, description in all_events:
            if start_date <= event_date <= today:
                event_list.append(Event(
                    user_id=user.id,
                    event_date=event_date,
                    event_type=event_type,
                    description=description,
                ))
                inserted_event_count += 1

        db.add_all(event_list)
        db.commit()
        print(f"     이벤트 {inserted_event_count}건 삽입 완료")

        # ── 완료 요약 ─────────────────────────────────────
        print()
        print("=" * 55)
        print("  시드 데이터 생성 완료")
        print("=" * 55)
        print(f"  데모 계정    : {DEMO_EMAIL} / {DEMO_PASSWORD}")
        print(f"  점포명       : {DEMO_STORE_NAME}")
        print(f"  상품 수      : {len(PRODUCTS)}개")
        print(f"  매출 레코드  : {total_sales_count:,}건")
        print(f"  총 매출액    : {total_revenue:,.0f}원")
        print(f"  평균 일 매출 : {total_revenue / SEED_DAYS:,.0f}원")
        print(f"  이벤트       : {inserted_event_count}건")
        print(f"  기간         : {start_date} ~ {today}")
        print("=" * 55)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] 오류 발생, 롤백 처리: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
