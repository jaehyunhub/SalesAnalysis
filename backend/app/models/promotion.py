from datetime import datetime, date, timezone
from sqlalchemy import Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="상품명")
    promotion_name: Mapped[str] = mapped_column(String(200), nullable=False, default="", comment="행사명")
    start_date: Mapped[date] = mapped_column(Date, nullable=False, comment="행사 시작일")
    end_date: Mapped[date] = mapped_column(Date, nullable=False, comment="행사 종료일")
    cost_price: Mapped[float] = mapped_column(Float, nullable=False, comment="원가")
    sale_price: Mapped[float] = mapped_column(Float, nullable=False, comment="판매가")
    expected_qty: Mapped[int] = mapped_column(Integer, nullable=False, comment="예상 판매량")
    waste_rate: Mapped[float] = mapped_column(Float, nullable=False, default=5.0, comment="폐기율 (%)")
    joined: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="행사 참여 여부")
    actual_qty: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="실제 판매량")
    actual_profit_rate: Mapped[float | None] = mapped_column(Float, nullable=True, comment="실제 이익율 (%)")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # relationships
    user = relationship("User", back_populates="promotions")
