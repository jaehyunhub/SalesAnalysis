from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventResponse

router = APIRouter(prefix="/api/events", tags=["이벤트"])


@router.get("", response_model=list[EventResponse])
def get_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """현재 사용자의 이벤트 목록을 반환한다."""
    events = (
        db.query(Event)
        .filter(Event.user_id == current_user.id)
        .order_by(Event.event_date.desc())
        .all()
    )
    return events


@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """새 이벤트를 등록한다."""
    event = Event(
        user_id=current_user.id,
        event_date=event_data.event_date,
        event_type=event_data.event_type,
        description=event_data.description,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """이벤트를 삭제한다."""
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이벤트를 찾을 수 없습니다.")
    db.delete(event)
    db.commit()
