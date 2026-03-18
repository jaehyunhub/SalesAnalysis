from datetime import date as date_type, datetime
from typing import Optional

from pydantic import BaseModel, Field


class WeatherResponse(BaseModel):
    id: int
    date: date_type
    avg_temp: Optional[float] = None
    condition: Optional[str] = None
    precipitation: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WeatherSyncRequest(BaseModel):
    start_date: date_type = Field(..., description="동기화 시작 날짜")
    end_date: date_type = Field(..., description="동기화 종료 날짜")


class WeatherSyncResponse(BaseModel):
    synced_count: int = Field(..., description="동기화된 날씨 데이터 수")
    message: str
