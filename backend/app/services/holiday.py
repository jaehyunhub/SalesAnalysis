"""공공데이터포털 특일정보 API 연동 서비스"""

from datetime import date
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.event import Event

HOLIDAY_API_URL = (
    "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
)


def fetch_holidays(year: int, month: Optional[int] = None) -> list[dict]:
    """특정 연도(월)의 공휴일 목록을 API에서 가져온다.

    반환: [{"date": date(2024,1,1), "name": "신정", "is_holiday": True}, ...]
    """
    if not settings.HOLIDAY_API_KEY:
        return []

    params = {
        "solYear": str(year),
        "ServiceKey": settings.HOLIDAY_API_KEY,
        "_type": "json",
        "numOfRows": "100",
    }
    if month:
        params["solMonth"] = f"{month:02d}"

    response = httpx.get(HOLIDAY_API_URL, params=params, timeout=10.0)
    response.raise_for_status()
    data = response.json()

    # 응답 구조 파싱
    try:
        body = data["response"]["body"]
    except (KeyError, TypeError):
        return []

    total_count = body.get("totalCount", 0)
    if total_count == 0:
        return []

    items = body.get("items", {})
    if not items:
        return []

    item_list = items.get("item", [])
    # item이 1건이면 dict로 올 수 있음 → 리스트로 통일
    if isinstance(item_list, dict):
        item_list = [item_list]

    holidays = []
    for item in item_list:
        if item.get("isHoliday") != "Y":
            continue

        locdate = item.get("locdate")
        if not locdate:
            continue

        # locdate는 정수형 (20190301) → date 변환
        locdate_str = str(locdate)
        holiday_date = date(
            int(locdate_str[:4]),
            int(locdate_str[4:6]),
            int(locdate_str[6:8]),
        )

        holidays.append(
            {
                "date": holiday_date,
                "name": item.get("dateName", ""),
                "is_holiday": True,
            }
        )

    return holidays


def sync_holidays_to_events(db: Session, user_id: int, year: int) -> int:
    """특정 연도의 공휴일을 Event 테이블에 저장한다.

    - event_type = "holiday"
    - 이미 존재하는 공휴일(같은 user_id + event_date + event_type=holiday)은 건너뜀
    - 반환: 새로 추가된 건수
    """
    holidays = fetch_holidays(year)
    if not holidays:
        return 0

    # 해당 유저의 기존 공휴일 이벤트 날짜 조회
    existing_dates = set(
        row[0]
        for row in db.query(Event.event_date)
        .filter(
            Event.user_id == user_id,
            Event.event_type == "holiday",
        )
        .all()
    )

    new_count = 0
    for holiday in holidays:
        if holiday["date"] in existing_dates:
            continue

        event = Event(
            user_id=user_id,
            event_date=holiday["date"],
            event_type="holiday",
            description=holiday["name"],
        )
        db.add(event)
        new_count += 1

    if new_count > 0:
        db.commit()

    return new_count


def get_holidays_from_db(db: Session, user_id: int, year: int) -> list[Event]:
    """DB에서 해당 연도의 공휴일 이벤트를 조회한다."""
    start = date(year, 1, 1)
    end = date(year, 12, 31)

    return (
        db.query(Event)
        .filter(
            Event.user_id == user_id,
            Event.event_type == "holiday",
            Event.event_date >= start,
            Event.event_date <= end,
        )
        .order_by(Event.event_date)
        .all()
    )
