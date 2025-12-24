"""
Signal model for trading signals.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.account import MTAccount
    from app.models.user import User


class Signal(Base):
    """Signal model representing trading signals."""

    __tablename__ = "signals"

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
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mt_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Signal details
    symbol: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )  # buy, sell, buy_limit, buy_stop, sell_limit, sell_stop, close, close_partial, modify
    order_type: Mapped[str] = mapped_column(
        String(20),
        default="market",
        nullable=False,
    )  # market, limit, stop
    quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 4),
        nullable=True,
    )
    price: Mapped[Decimal | None] = mapped_column(
        Numeric(20, 8),
        nullable=True,
    )
    take_profit: Mapped[Decimal | None] = mapped_column(
        Numeric(20, 8),
        nullable=True,
    )
    stop_loss: Mapped[Decimal | None] = mapped_column(
        Numeric(20, 8),
        nullable=True,
    )
    comment: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )  # pending, sent, executed, partial, failed, expired, cancelled
    source: Mapped[str] = mapped_column(
        String(50),
        default="tradingview",
        nullable=False,
    )

    # Metadata
    raw_payload: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    execution_result: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(seconds=60),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="signals",
    )
    account: Mapped["MTAccount | None"] = relationship(
        "MTAccount",
        back_populates="signals",
    )

    __table_args__ = (
        Index("idx_signals_user_id", "user_id"),
        Index("idx_signals_account_id", "account_id"),
        Index("idx_signals_status", "status"),
        Index("idx_signals_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Signal(id={self.id}, symbol={self.symbol}, action={self.action}, status={self.status})>"

    @property
    def is_expired(self) -> bool:
        """Check if the signal has expired."""
        now = datetime.now(timezone.utc)
        expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return now > expires
