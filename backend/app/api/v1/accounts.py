"""
MT Account management endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.account import MTAccount
from app.models.symbol_mapping import SymbolMapping
from app.models.user import User
from app.schemas.account import (
    MTAccountCreate,
    MTAccountResponse,
    MTAccountUpdate,
    MTAccountWithKey,
    MTAccountListResponse,
)
from app.schemas.symbol_mapping import (
    SymbolMappingCreate,
    SymbolMappingResponse,
    SymbolMappingUpdate,
    SymbolMappingListResponse,
)
from app.utils.security import generate_api_key


router = APIRouter(prefix="/accounts", tags=["Accounts"])


async def get_user_account(
    account_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> MTAccount:
    """Get an account belonging to a user."""
    result = await db.execute(
        select(MTAccount).where(
            and_(
                MTAccount.id == account_id,
                MTAccount.user_id == user_id,
            )
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    return account


@router.get("", response_model=MTAccountListResponse)
async def list_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MTAccountListResponse:
    """
    List all MT accounts for the current user.
    """
    result = await db.execute(
        select(MTAccount).where(MTAccount.user_id == current_user.id)
    )
    accounts = list(result.scalars().all())

    return MTAccountListResponse(
        accounts=[MTAccountResponse.model_validate(a) for a in accounts],
        total=len(accounts),
    )


@router.post("", response_model=MTAccountWithKey, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: MTAccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MTAccount:
    """
    Create a new MT account.
    Returns the account with API key (only time key is shown).
    """
    # Validate platform
    if account_data.platform not in ["mt4", "mt5"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform must be 'mt4' or 'mt5'",
        )

    account = MTAccount(
        user_id=current_user.id,
        name=account_data.name,
        broker=account_data.broker,
        account_number=account_data.account_number,
        platform=account_data.platform,
        api_key=generate_api_key(),
        settings=account_data.settings or {},
    )

    db.add(account)
    await db.flush()
    await db.refresh(account)

    return account


@router.get("/{account_id}", response_model=MTAccountResponse)
async def get_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MTAccount:
    """
    Get a specific MT account.
    """
    return await get_user_account(account_id, current_user.id, db)


@router.put("/{account_id}", response_model=MTAccountResponse)
async def update_account(
    account_id: UUID,
    account_data: MTAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MTAccount:
    """
    Update an MT account.
    """
    account = await get_user_account(account_id, current_user.id, db)

    if account_data.name is not None:
        account.name = account_data.name
    if account_data.broker is not None:
        account.broker = account_data.broker
    if account_data.account_number is not None:
        account.account_number = account_data.account_number
    if account_data.is_active is not None:
        account.is_active = account_data.is_active
    if account_data.settings is not None:
        account.settings = account_data.settings

    await db.flush()
    await db.refresh(account)

    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete an MT account.
    """
    account = await get_user_account(account_id, current_user.id, db)
    await db.delete(account)


@router.post("/{account_id}/regenerate-key", response_model=MTAccountWithKey)
async def regenerate_api_key(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MTAccount:
    """
    Regenerate API key for an MT account.
    Returns the account with new API key.
    """
    account = await get_user_account(account_id, current_user.id, db)
    account.api_key = generate_api_key()

    await db.flush()
    await db.refresh(account)

    return account


# Symbol Mapping Endpoints

@router.get("/{account_id}/symbols", response_model=SymbolMappingListResponse)
async def list_symbol_mappings(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SymbolMappingListResponse:
    """
    List all symbol mappings for an account.
    """
    # Verify account ownership
    await get_user_account(account_id, current_user.id, db)

    result = await db.execute(
        select(SymbolMapping).where(SymbolMapping.account_id == account_id)
    )
    mappings = list(result.scalars().all())

    return SymbolMappingListResponse(
        mappings=[SymbolMappingResponse.model_validate(m) for m in mappings],
        total=len(mappings),
    )


@router.post("/{account_id}/symbols", response_model=SymbolMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_symbol_mapping(
    account_id: UUID,
    mapping_data: SymbolMappingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SymbolMapping:
    """
    Create a new symbol mapping for an account.
    """
    # Verify account ownership
    await get_user_account(account_id, current_user.id, db)

    # Check for existing mapping
    result = await db.execute(
        select(SymbolMapping).where(
            and_(
                SymbolMapping.account_id == account_id,
                SymbolMapping.tradingview_symbol == mapping_data.tradingview_symbol,
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mapping for '{mapping_data.tradingview_symbol}' already exists",
        )

    mapping = SymbolMapping(
        account_id=account_id,
        tradingview_symbol=mapping_data.tradingview_symbol,
        mt_symbol=mapping_data.mt_symbol,
        lot_multiplier=mapping_data.lot_multiplier,
    )

    db.add(mapping)
    await db.flush()
    await db.refresh(mapping)

    return mapping


@router.put("/{account_id}/symbols/{symbol_id}", response_model=SymbolMappingResponse)
async def update_symbol_mapping(
    account_id: UUID,
    symbol_id: UUID,
    mapping_data: SymbolMappingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SymbolMapping:
    """
    Update a symbol mapping.
    """
    # Verify account ownership
    await get_user_account(account_id, current_user.id, db)

    result = await db.execute(
        select(SymbolMapping).where(
            and_(
                SymbolMapping.id == symbol_id,
                SymbolMapping.account_id == account_id,
            )
        )
    )
    mapping = result.scalar_one_or_none()

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symbol mapping not found",
        )

    if mapping_data.tradingview_symbol is not None:
        mapping.tradingview_symbol = mapping_data.tradingview_symbol
    if mapping_data.mt_symbol is not None:
        mapping.mt_symbol = mapping_data.mt_symbol
    if mapping_data.lot_multiplier is not None:
        mapping.lot_multiplier = mapping_data.lot_multiplier

    await db.flush()
    await db.refresh(mapping)

    return mapping


@router.delete("/{account_id}/symbols/{symbol_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_symbol_mapping(
    account_id: UUID,
    symbol_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a symbol mapping.
    """
    # Verify account ownership
    await get_user_account(account_id, current_user.id, db)

    result = await db.execute(
        select(SymbolMapping).where(
            and_(
                SymbolMapping.id == symbol_id,
                SymbolMapping.account_id == account_id,
            )
        )
    )
    mapping = result.scalar_one_or_none()

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symbol mapping not found",
        )

    await db.delete(mapping)
