"""날씨 데이터 라우터

기상청 API Hub를 활용하여 날씨 데이터를 조회/동기화한다.
일반 조회(daily, range)는 인증 없이 접근 가능하고,
동기화(sync)는 인증이 필요하다.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.weather import WeatherResponse, WeatherSyncResponse
from app.services.weather import (
    fetch_daily_weather,
    fetch_weather_range,
    get_missing_dates,
    get_weather_data,
    save_weather_to_db,
)

router = APIRouter(prefix="/api/weather", tags=["날씨"])


@router.get("/daily", response_model=WeatherResponse | None)
def get_daily_weather(
    date: date = Query(..., description="조회 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """특정 날짜의 날씨 데이터를 반환한다.

    DB에 데이터가 있으면 DB에서 반환하고, 없으면 기상청 API를 호출하여
    저장 후 반환한다.
    """
    # DB 먼저 확인
    existing = get_weather_data(db, date, date)
    if existing:
        return existing[0]

    # DB에 없으면 API 호출
    weather = fetch_daily_weather(date)
    if weather is None:
        return None

    # DB에 저장
    save_weather_to_db(db, [weather])

    # 저장된 데이터 반환
    result = get_weather_data(db, date, date)
    if result:
        return result[0]
    return None


@router.get("/range", response_model=list[WeatherResponse])
def get_weather_range(
    start_date: date = Query(..., description="시작 날짜 (YYYY-MM-DD)"),
    end_date: date = Query(..., description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """기간 내 날씨 데이터를 반환한다.

    DB에 있는 데이터는 그대로 사용하고, 없는 날짜만 기상청 API를 호출하여
    보충한 뒤 전체 결과를 반환한다.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date는 end_date보다 이전이어야 합니다.",
        )

    max_range = timedelta(days=365)
    if (end_date - start_date) > max_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="최대 조회 기간은 365일입니다.",
        )

    # DB에 없는 날짜 확인
    missing = get_missing_dates(db, start_date, end_date)

    # 없는 날짜가 있으면 API 호출로 보충
    if missing:
        # 연속된 날짜를 범위로 묶어서 API 호출 횟수를 줄임
        fetched = fetch_weather_range(
            min(missing),
            max(missing),
        )
        if fetched:
            save_weather_to_db(db, fetched)

    # 전체 데이터 반환
    return get_weather_data(db, start_date, end_date)


@router.post("/sync", response_model=WeatherSyncResponse)
def sync_weather(
    start_date: date = Query(..., description="동기화 시작 날짜"),
    end_date: date = Query(..., description="동기화 종료 날짜"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """기간 내 날씨 데이터를 기상청 API에서 일괄 수집/갱신한다.

    인증된 사용자만 호출할 수 있다.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date는 end_date보다 이전이어야 합니다.",
        )

    max_range = timedelta(days=365)
    if (end_date - start_date) > max_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="최대 동기화 기간은 365일입니다.",
        )

    fetched = fetch_weather_range(start_date, end_date)
    if not fetched:
        return WeatherSyncResponse(
            synced_count=0,
            message="기상청 API에서 데이터를 가져오지 못했습니다. API 키를 확인해주세요.",
        )

    synced_count = save_weather_to_db(db, fetched)

    return WeatherSyncResponse(
        synced_count=synced_count,
        message=f"{start_date} ~ {end_date} 기간의 날씨 데이터 {synced_count}건을 동기화했습니다.",
    )
