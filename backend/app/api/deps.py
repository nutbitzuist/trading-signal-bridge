"""
API Dependencies for authentication and database session management.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.account import MTAccount
from app.models.user import User
from app.utils.security import verify_token


# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    token = credentials.credentials
    payload = verify_token(token, token_type="access")

    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current admin user.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def get_account_by_api_key(
    api_key: str = Query(..., description="MT Account API key"),
    db: AsyncSession = Depends(get_db),
) -> MTAccount:
    """
    Dependency to get MT account by API key (for EA polling).
    """
    result = await db.execute(
        select(MTAccount).where(
            and_(
                MTAccount.api_key == api_key,
                MTAccount.is_active == True,
            )
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Update last connected time
    account.last_connected_at = datetime.utcnow()

    return account


async def get_optional_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[User]:
    """
    Dependency to optionally get the current user (doesn't raise if not authenticated).
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = verify_token(token, token_type="access")

    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    return result.scalar_one_or_none()
