"""기상청 API Hub 연동 서비스

기상청 ASOS(지상관측) 일자료 API를 활용하여 날씨 데이터를 수집하고 DB에 저장한다.
"""
import logging
from datetime import date, timedelta
from typing import Optional, List

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.weather import WeatherData

logger = logging.getLogger(__name__)

# 기상청 API Hub 엔드포인트
ASOS_DAILY_URL = "https://apihub.kma.go.kr/api/typ01/url/kma_sfcdd.php"
ASOS_RANGE_URL = "https://apihub.kma.go.kr/api/typ01/url/kma_sfcdd3.php"

# HTTP 요청 타임아웃 (초)
REQUEST_TIMEOUT = 30.0


def _determine_condition(avg_temp: Optional[float], precipitation: Optional[float]) -> str:
    """강수량과 기온을 기반으로 날씨 상태를 결정한다.

    Args:
        avg_temp: 평균 기온 (°C)
        precipitation: 일강수량 (mm)

    Returns:
        날씨 상태 문자열 (sunny/rainy/snowy)
    """
    if precipitation is not None and precipitation > 0:
        if avg_temp is not None and avg_temp <= 2:
            return "snowy"
        return "rainy"
    return "sunny"


def _parse_float(value: str) -> Optional[float]:
    """문자열을 float으로 변환한다. 빈 값이나 파싱 실패 시 None을 반환한다."""
    value = value.strip()
    if not value or value == "-" or value == "None":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _parse_asos_response(text: str) -> List[dict]:
    """ASOS 일자료 API 텍스트 응답을 파싱한다.

    응답 형식:
    - '#'으로 시작하는 줄은 헤더/주석
    - 마지막 주석 줄에 컬럼명이 포함됨
    - 데이터 행은 공백으로 구분된 컬럼 값들

    주요 컬럼: TM(날짜), STN(지점), TA(평균기온), RN_DAY(일강수량)
    """
    lines = text.strip().split("\n")
    results = []
    header_columns = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 주석 줄에서 컬럼 헤더 추출
        if line.startswith("#"):
            # 마지막 주석 줄이 컬럼 헤더일 가능성이 높음
            cleaned = line.lstrip("#").strip()
            if cleaned:
                header_columns = cleaned.split()
            continue

        # 데이터 행 파싱
        values = line.split()
        if len(values) < 3:
            continue

        # 헤더가 없으면 위치 기반으로 파싱 시도
        if header_columns:
            data = dict(zip(header_columns, values))
            tm = data.get("TM", "").replace("-", "")
            avg_temp = _parse_float(data.get("TA", ""))
            precipitation = _parse_float(data.get("RN_DAY", ""))
        else:
            # 헤더 없이 위치 기반 파싱 (TM은 첫 번째, STN은 두 번째)
            tm = values[0].replace("-", "")
            avg_temp = None
            precipitation = None
            logger.warning("ASOS 응답에서 헤더를 찾을 수 없어 기본 파싱을 사용합니다.")

        # 날짜 파싱
        try:
            if len(tm) == 8:
                weather_date = date(int(tm[:4]), int(tm[4:6]), int(tm[6:8]))
            elif "-" in values[0]:
                parts = values[0].split("-")
                weather_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
            else:
                continue
        except (ValueError, IndexError):
            logger.warning(f"날짜 파싱 실패: {values[0]}")
            continue

        condition = _determine_condition(avg_temp, precipitation)

        results.append({
            "date": weather_date,
            "avg_temp": avg_temp,
            "condition": condition,
            "precipitation": precipitation,
        })

    return results


def fetch_daily_weather(target_date: date, stn: str = "108") -> Optional[dict]:
    """특정 날짜의 날씨 데이터를 기상청 ASOS API에서 조회한다.

    Args:
        target_date: 조회 날짜
        stn: 관측 지점 번호 (기본값: 108, 서울)

    Returns:
        날씨 데이터 딕셔너리 또는 None (실패 시)
    """
    if not settings.WEATHER_API_KEY:
        logger.warning("WEATHER_API_KEY가 설정되지 않아 날씨 데이터를 조회할 수 없습니다.")
        return None

    tm = target_date.strftime("%Y%m%d")
    params = {
        "tm": tm,
        "stn": stn,
        "authKey": settings.WEATHER_API_KEY,
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            response = client.get(ASOS_DAILY_URL, params=params)
            response.raise_for_status()

        results = _parse_asos_response(response.text)
        if results:
            return results[0]

        logger.warning(f"날씨 데이터 파싱 결과가 비어있습니다: {target_date}")
        return None

    except httpx.HTTPStatusError as e:
        logger.error(f"기상청 API HTTP 에러: {e.response.status_code} - {target_date}")
        return None
    except httpx.RequestError as e:
        logger.error(f"기상청 API 요청 실패: {e} - {target_date}")
        return None
    except Exception as e:
        logger.error(f"날씨 데이터 조회 중 예기치 못한 에러: {e}")
        return None


def fetch_weather_range(
    start_date: date,
    end_date: date,
    stn: str = "108",
) -> List[dict]:
    """기간 내 날씨 데이터를 기상청 ASOS 기간조회 API에서 조회한다.

    최대 31일 단위로 조회하며, 초과 시 여러 번 나눠서 호출한다.

    Args:
        start_date: 조회 시작 날짜
        end_date: 조회 종료 날짜
        stn: 관측 지점 번호 (기본값: 108, 서울)

    Returns:
        날씨 데이터 딕셔너리 리스트
    """
    if not settings.WEATHER_API_KEY:
        logger.warning("WEATHER_API_KEY가 설정되지 않아 날씨 데이터를 조회할 수 없습니다.")
        return []

    all_results = []
    current_start = start_date
    max_days = timedelta(days=31)

    while current_start <= end_date:
        current_end = min(current_start + max_days - timedelta(days=1), end_date)

        params = {
            "tm1": current_start.strftime("%Y%m%d"),
            "tm2": current_end.strftime("%Y%m%d"),
            "stn": stn,
            "authKey": settings.WEATHER_API_KEY,
        }

        try:
            with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
                response = client.get(ASOS_RANGE_URL, params=params)
                response.raise_for_status()

            results = _parse_asos_response(response.text)
            all_results.extend(results)

        except httpx.HTTPStatusError as e:
            logger.error(
                f"기상청 기간조회 API HTTP 에러: {e.response.status_code} "
                f"- {current_start} ~ {current_end}"
            )
        except httpx.RequestError as e:
            logger.error(
                f"기상청 기간조회 API 요청 실패: {e} "
                f"- {current_start} ~ {current_end}"
            )
        except Exception as e:
            logger.error(f"기간 날씨 데이터 조회 중 예기치 못한 에러: {e}")

        current_start = current_end + timedelta(days=1)

    return all_results


def save_weather_to_db(db: Session, weather_data_list: List[dict]) -> int:
    """날씨 데이터를 DB에 upsert한다.

    date 컬럼의 UNIQUE 제약을 활용하여, 이미 존재하는 날짜는 업데이트하고
    없는 날짜는 새로 삽입한다.

    Args:
        db: SQLAlchemy 세션
        weather_data_list: 날씨 데이터 딕셔너리 리스트

    Returns:
        저장/업데이트된 레코드 수
    """
    saved_count = 0

    for data in weather_data_list:
        existing = (
            db.query(WeatherData)
            .filter(WeatherData.date == data["date"])
            .first()
        )

        if existing:
            existing.avg_temp = data.get("avg_temp")
            existing.condition = data.get("condition")
            existing.precipitation = data.get("precipitation")
        else:
            weather = WeatherData(
                date=data["date"],
                avg_temp=data.get("avg_temp"),
                condition=data.get("condition"),
                precipitation=data.get("precipitation"),
            )
            db.add(weather)

        saved_count += 1

    db.commit()
    return saved_count


def get_weather_data(
    db: Session,
    start_date: date,
    end_date: date,
) -> List[WeatherData]:
    """DB에서 기간 내 날씨 데이터를 조회한다.

    Args:
        db: SQLAlchemy 세션
        start_date: 조회 시작 날짜
        end_date: 조회 종료 날짜

    Returns:
        WeatherData 모델 리스트
    """
    return (
        db.query(WeatherData)
        .filter(
            WeatherData.date >= start_date,
            WeatherData.date <= end_date,
        )
        .order_by(WeatherData.date)
        .all()
    )


def get_missing_dates(
    db: Session,
    start_date: date,
    end_date: date,
) -> List[date]:
    """DB에 날씨 데이터가 없는 날짜 목록을 반환한다.

    Args:
        db: SQLAlchemy 세션
        start_date: 시작 날짜
        end_date: 종료 날짜

    Returns:
        DB에 데이터가 없는 날짜 리스트
    """
    existing_dates = {
        row.date
        for row in db.query(WeatherData.date)
        .filter(
            WeatherData.date >= start_date,
            WeatherData.date <= end_date,
        )
        .all()
    }

    all_dates = []
    current = start_date
    while current <= end_date:
        if current not in existing_dates:
            all_dates.append(current)
        current += timedelta(days=1)

    return all_dates
