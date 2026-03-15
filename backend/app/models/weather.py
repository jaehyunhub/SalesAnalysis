from datetime import datetime, date, timezone
from sqlalchemy import Integer, String, Date, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WeatherData(Base):
    __tablename__ = "weather_data"

    __table_args__ = (UniqueConstraint("date", name="uq_weather_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    avg_temp: Mapped[float | None] = mapped_column(Float, nullable=True, comment="평균 기온(°C)")
    condition: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="sunny/cloudy/rainy/snowy"
    )
    precipitation: Mapped[float | None] = mapped_column(Float, nullable=True, comment="강수량(mm)")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
