from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field


EventType = Literal["holiday", "school", "local", "other"]


class EventCreate(BaseModel):
    event_date: date = Field(..., description="이벤트 날짜")
    event_type: EventType = Field(..., description="이벤트 유형")
    description: str = Field(..., max_length=200, description="이벤트 설명")


class EventResponse(BaseModel):
    id: int
    user_id: int
    event_date: date
    event_type: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}
