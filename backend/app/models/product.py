from datetime import datetime, timezone
from sqlalchemy import Integer, String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    barcode: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="기타",
        comment="음료/식품/생활용품/담배/기타",
    )
    cost_price: Mapped[float | None] = mapped_column(Float, nullable=True, comment="입고가")
    selling_price: Mapped[float | None] = mapped_column(Float, nullable=True, comment="판매가")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # relationships
    sales_records = relationship("SalesRecord", back_populates="product", lazy="dynamic")
