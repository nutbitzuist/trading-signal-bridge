"""
Signal-related Pydantic schemas.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


SignalAction = Literal[
    "buy", "sell", "buy_limit", "buy_stop",
    "sell_limit", "sell_stop", "close", "close_partial", "modify"
]

OrderType = Literal["market", "limit", "stop"]

SignalStatus = Literal[
    "pending", "sent", "executed", "partial", "failed", "expired", "cancelled"
]


class SignalBase(BaseModel):
    """Base signal schema."""

    symbol: str = Field(..., min_length=1, max_length=50)
    action: SignalAction
    order_type: OrderType = "market"
    quantity: Optional[Decimal] = Field(None, ge=0)
    price: Optional[Decimal] = Field(None, ge=0)
    take_profit: Optional[Decimal] = Field(None, ge=0)
    stop_loss: Optional[Decimal] = Field(None, ge=0)
    comment: Optional[str] = Field(None, max_length=255)


class SignalCreate(SignalBase):
    """Schema for creating a signal (internal)."""

    account_id: Optional[UUID] = None


class SignalResponse(SignalBase):
    """Schema for signal response."""

    id: UUID
    user_id: UUID
    account_id: Optional[UUID] = None
    status: SignalStatus
    source: str
    raw_payload: Optional[dict] = None
    execution_result: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    expires_at: datetime

    class Config:
        from_attributes = True


class PendingSignal(BaseModel):
    """Schema for pending signal (for EA polling)."""

    id: UUID
    symbol: str
    action: SignalAction
    order_type: OrderType
    quantity: Optional[Decimal] = None
    price: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    comment: Optional[str] = None


class PendingSignalsResponse(BaseModel):
    """Schema for pending signals response (for EA polling)."""

    signals: List[PendingSignal]
    server_time: datetime


class SignalResult(BaseModel):
    """Schema for signal execution result from EA."""

    success: bool
    ticket: Optional[int] = None
    executed_price: Optional[Decimal] = None
    executed_quantity: Optional[Decimal] = None
    execution_time_ms: Optional[int] = None
    error_code: Optional[int] = None
    error_message: Optional[str] = None


class SignalListResponse(BaseModel):
    """Schema for paginated list of signals."""

    signals: List[SignalResponse]
    total: int
    page: int
    per_page: int
    pages: int


class SignalFilter(BaseModel):
    """Schema for signal filtering."""

    account_id: Optional[UUID] = None
    status: Optional[SignalStatus] = None
    symbol: Optional[str] = None
    action: Optional[SignalAction] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
