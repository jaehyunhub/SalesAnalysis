from datetime import datetime, date, time, timezone
from sqlalchemy import Integer, Float, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SalesRecord(Base):
    __tablename__ = "sales_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sale_time: Mapped[time | None] = mapped_column(Time, nullable=True, comment="판매 시간")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, comment="총 판매금액")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # relationships
    product = relationship("Product", back_populates="sales_records")
    user = relationship("User", back_populates="sales_records")
