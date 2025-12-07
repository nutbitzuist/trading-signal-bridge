"""
MT Account-related Pydantic schemas.
"""
from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MTAccountBase(BaseModel):
    """Base MT account schema."""

    name: str = Field(..., min_length=1, max_length=255)
    broker: Optional[str] = Field(None, max_length=255)
    account_number: Optional[str] = Field(None, max_length=50)
    platform: Literal["mt4", "mt5"]
    settings: Optional[dict] = Field(default_factory=dict)


class MTAccountCreate(MTAccountBase):
    """Schema for creating an MT account."""

    pass


class MTAccountUpdate(BaseModel):
    """Schema for updating an MT account."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    broker: Optional[str] = Field(None, max_length=255)
    account_number: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    settings: Optional[dict] = None


class MTAccountResponse(MTAccountBase):
    """Schema for MT account response (without API key)."""

    id: UUID
    user_id: UUID
    is_active: bool
    last_connected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MTAccountWithKey(MTAccountResponse):
    """Schema for MT account response with API key (only returned on creation/regeneration)."""

    api_key: str


class MTAccountListResponse(BaseModel):
    """Schema for list of MT accounts."""

    accounts: List[MTAccountResponse]
    total: int
