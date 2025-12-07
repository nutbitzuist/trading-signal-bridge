"""
User model for authentication and account management.
"""
import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.account import MTAccount
    from app.models.signal import Signal


class UserTier(str, Enum):
    """User subscription tiers."""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    """User model representing registered users."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    webhook_secret: Mapped[str] = mapped_column(
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
    is_admin: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    # User tier/subscription
    tier: Mapped[str] = mapped_column(
        String(20),
        default=UserTier.FREE.value,
        nullable=False,
    )
    # Approval status for new users
    is_approved: Mapped[bool] = mapped_column(
        Boolean,
        default=True,  # Auto-approve by default, admin can change
        nullable=False,
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    # Admin notes
    admin_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    # Tier limits
    max_accounts: Mapped[int] = mapped_column(
        default=2,  # Free tier default
        nullable=False,
    )
    max_signals_per_day: Mapped[int] = mapped_column(
        default=50,  # Free tier default
        nullable=False,
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
    mt_accounts: Mapped[List["MTAccount"]] = relationship(
        "MTAccount",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    signals: Mapped[List["Signal"]] = relationship(
        "Signal",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_webhook_secret", "webhook_secret"),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
