"""
Symbol Mapping-related Pydantic schemas.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SymbolMappingBase(BaseModel):
    """Base symbol mapping schema."""

    tradingview_symbol: str = Field(..., min_length=1, max_length=50)
    mt_symbol: str = Field(..., min_length=1, max_length=50)
    lot_multiplier: Decimal = Field(default=Decimal("1.0"), ge=0)


class SymbolMappingCreate(SymbolMappingBase):
    """Schema for creating a symbol mapping."""

    pass


class SymbolMappingUpdate(BaseModel):
    """Schema for updating a symbol mapping."""

    tradingview_symbol: Optional[str] = Field(None, min_length=1, max_length=50)
    mt_symbol: Optional[str] = Field(None, min_length=1, max_length=50)
    lot_multiplier: Optional[Decimal] = Field(None, ge=0)


class SymbolMappingResponse(SymbolMappingBase):
    """Schema for symbol mapping response."""

    id: UUID
    account_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class SymbolMappingListResponse(BaseModel):
    """Schema for list of symbol mappings."""

    mappings: List[SymbolMappingResponse]
    total: int
