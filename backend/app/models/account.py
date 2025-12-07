"""
MT Account model for MetaTrader account management.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.signal import Signal
    from app.models.symbol_mapping import SymbolMapping
    from app.models.user import User


class MTAccount(Base):
    """MT Account model representing MT4/MT5 trading accounts."""

    __tablename__ = "mt_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    broker: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    account_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    platform: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )  # 'mt4' or 'mt5'
    api_key: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    last_connected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    settings: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="mt_accounts",
    )
    signals: Mapped[List["Signal"]] = relationship(
        "Signal",
        back_populates="account",
        lazy="selectin",
    )
    symbol_mappings: Mapped[List["SymbolMapping"]] = relationship(
        "SymbolMapping",
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("idx_mt_accounts_user_id", "user_id"),
        Index("idx_mt_accounts_api_key", "api_key"),
    )

    def __repr__(self) -> str:
        return f"<MTAccount(id={self.id}, name={self.name}, platform={self.platform})>"
