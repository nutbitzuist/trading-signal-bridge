"""
Symbol Mapping model for mapping TradingView symbols to MT symbols.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.account import MTAccount


class SymbolMapping(Base):
    """Symbol mapping model for translating symbols between platforms."""

    __tablename__ = "symbol_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mt_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tradingview_symbol: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    mt_symbol: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    lot_multiplier: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        default=Decimal("1.0"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    account: Mapped["MTAccount"] = relationship(
        "MTAccount",
        back_populates="symbol_mappings",
    )

    __table_args__ = (
        UniqueConstraint("account_id", "tradingview_symbol", name="uq_account_tv_symbol"),
        Index("idx_symbol_mappings_account", "account_id"),
    )

    def __repr__(self) -> str:
        return f"<SymbolMapping(tv={self.tradingview_symbol}, mt={self.mt_symbol})>"
