"""
Webhook-related Pydantic schemas.
"""
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WebhookPayload(BaseModel):
    """Schema for TradingView webhook payload."""

    secret: str = Field(..., min_length=1, description="User's webhook secret")
    account_id: Optional[UUID] = Field(
        None,
        description="Optional specific MT account to route signal to"
    )
    symbol: str = Field(..., min_length=1, max_length=50)
    action: Literal[
        "buy", "sell", "buy_limit", "buy_stop",
        "sell_limit", "sell_stop", "close", "close_partial", "modify"
    ]
    order_type: Literal["market", "limit", "stop"] = "market"
    quantity: Optional[Decimal] = Field(None, ge=0, description="Lot size")
    price: Optional[Decimal] = Field(None, ge=0, description="Entry price for limit/stop orders")
    take_profit: Optional[Decimal] = Field(None, ge=0)
    stop_loss: Optional[Decimal] = Field(None, ge=0)
    comment: Optional[str] = Field(None, max_length=255)


class WebhookResponse(BaseModel):
    """Schema for webhook response."""

    success: bool
    signal_id: Optional[UUID] = None
    message: str
    signals_created: Optional[int] = None
