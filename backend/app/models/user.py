from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    store_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="점포명")
    store_address: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="점포 주소")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # relationships
    sales_records = relationship("SalesRecord", back_populates="user", lazy="dynamic")
    upload_histories = relationship("UploadHistory", back_populates="user", lazy="dynamic")
    events = relationship("Event", back_populates="user", lazy="dynamic")
    promotions = relationship("Promotion", back_populates="user", lazy="dynamic")
