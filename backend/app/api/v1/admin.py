"""
Admin API endpoints for user management.
"""
from datetime import datetime, timedelta
from math import ceil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_active_admin
from app.models.user import User, UserTier
from app.models.signal import Signal
from app.schemas.user import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    UserListResponse,
    TierUpdateRequest,
    ApprovalRequest,
    UserStatsResponse,
)
from app.utils.security import hash_password, generate_webhook_secret


router = APIRouter(prefix="/admin", tags=["Admin"])


# Tier limits configuration
TIER_LIMITS = {
    UserTier.FREE.value: {"max_accounts": 2, "max_signals_per_day": 50},
    UserTier.BASIC.value: {"max_accounts": 5, "max_signals_per_day": 200},
    UserTier.PRO.value: {"max_accounts": 15, "max_signals_per_day": 1000},
    UserTier.ENTERPRISE.value: {"max_accounts": 100, "max_signals_per_day": 10000},
}


@router.get("/stats", response_model=UserStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserStatsResponse:
    """Get admin dashboard statistics."""
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Total users
    total_result = await db.execute(select(func.count(User.id)))
    total_users = total_result.scalar() or 0

    # Active users
    active_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_result.scalar() or 0

    # Pending approval
    pending_result = await db.execute(
        select(func.count(User.id)).where(User.is_approved == False)
    )
    pending_approval = pending_result.scalar() or 0

    # Users by tier
    tier_result = await db.execute(
        select(User.tier, func.count(User.id)).group_by(User.tier)
    )
    users_by_tier = {row[0]: row[1] for row in tier_result.all()}

    # New users today
    today_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today)
    )
    new_users_today = today_result.scalar() or 0

    # New users this week
    week_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    new_users_this_week = week_result.scalar() or 0

    # New users this month
    month_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_ago)
    )
    new_users_this_month = month_result.scalar() or 0

    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        pending_approval=pending_approval,
        users_by_tier=users_by_tier,
        new_users_today=new_users_today,
        new_users_this_week=new_users_this_week,
        new_users_this_month=new_users_this_month,
    )


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tier: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_approved: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> UserListResponse:
    """List all users with pagination and filters."""
    # Build query
    query = select(User)
    count_query = select(func.count(User.id))

    # Apply filters
    if search:
        search_filter = User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if tier:
        query = query.where(User.tier == tier)
        count_query = count_query.where(User.tier == tier)

    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    if is_approved is not None:
        query = query.where(User.is_approved == is_approved)
        count_query = count_query.where(User.is_approved == is_approved)

    if is_admin is not None:
        query = query.where(User.is_admin == is_admin)
        count_query = count_query.where(User.is_admin == is_admin)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * per_page
    query = query.order_by(User.created_at.desc()).offset(offset).limit(per_page)

    # Execute
    result = await db.execute(query)
    users = result.scalars().all()

    # Build response with stats
    user_responses = []
    for user in users:
        user_response = AdminUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            webhook_secret=user.webhook_secret,
            is_active=user.is_active,
            is_admin=user.is_admin,
            tier=user.tier,
            is_approved=user.is_approved,
            approved_at=user.approved_at,
            approved_by=user.approved_by,
            admin_notes=user.admin_notes,
            max_accounts=user.max_accounts,
            max_signals_per_day=user.max_signals_per_day,
            settings=user.settings,
            created_at=user.created_at,
            updated_at=user.updated_at,
            accounts_count=len(user.mt_accounts) if user.mt_accounts else 0,
            signals_count=len(user.signals) if user.signals else 0,
        )
        user_responses.append(user_response)

    return UserListResponse(
        users=user_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=ceil(total / per_page) if total > 0 else 1,
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> AdminUserResponse:
    """Get detailed user information."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        webhook_secret=user.webhook_secret,
        is_active=user.is_active,
        is_admin=user.is_admin,
        tier=user.tier,
        is_approved=user.is_approved,
        approved_at=user.approved_at,
        approved_by=user.approved_by,
        admin_notes=user.admin_notes,
        max_accounts=user.max_accounts,
        max_signals_per_day=user.max_signals_per_day,
        settings=user.settings,
        created_at=user.created_at,
        updated_at=user.updated_at,
        accounts_count=len(user.mt_accounts) if user.mt_accounts else 0,
        signals_count=len(user.signals) if user.signals else 0,
    )


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> AdminUserResponse:
    """Create a new user (admin only)."""
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Get tier limits
    tier_limits = TIER_LIMITS.get(user_data.tier.value, TIER_LIMITS[UserTier.FREE.value])

    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        webhook_secret=generate_webhook_secret(),
        is_admin=user_data.is_admin,
        is_active=user_data.is_active,
        tier=user_data.tier.value,
        is_approved=user_data.is_approved,
        approved_at=datetime.utcnow() if user_data.is_approved else None,
        approved_by=current_admin.id if user_data.is_approved else None,
        admin_notes=user_data.admin_notes,
        max_accounts=user_data.max_accounts or tier_limits["max_accounts"],
        max_signals_per_day=user_data.max_signals_per_day or tier_limits["max_signals_per_day"],
    )

    db.add(user)
    await db.flush()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        webhook_secret=user.webhook_secret,
        is_active=user.is_active,
        is_admin=user.is_admin,
        tier=user.tier,
        is_approved=user.is_approved,
        approved_at=user.approved_at,
        approved_by=user.approved_by,
        admin_notes=user.admin_notes,
        max_accounts=user.max_accounts,
        max_signals_per_day=user.max_signals_per_day,
        settings=user.settings,
        created_at=user.created_at,
        updated_at=user.updated_at,
        accounts_count=0,
        signals_count=0,
    )


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: UUID,
    user_data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> AdminUserResponse:
    """Update a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from demoting themselves
    if user.id == current_admin.id and user_data.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin status",
        )

    # Update fields
    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.email is not None:
        # Check if new email exists
        existing = await db.execute(
            select(User).where(User.email == user_data.email, User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        user.email = user_data.email

    if user_data.password is not None:
        user.password_hash = hash_password(user_data.password)

    if user_data.is_admin is not None:
        user.is_admin = user_data.is_admin

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    if user_data.tier is not None:
        user.tier = user_data.tier.value
        # Update limits based on new tier if not custom
        if user_data.max_accounts is None and user_data.max_signals_per_day is None:
            tier_limits = TIER_LIMITS.get(user_data.tier.value, TIER_LIMITS[UserTier.FREE.value])
            user.max_accounts = tier_limits["max_accounts"]
            user.max_signals_per_day = tier_limits["max_signals_per_day"]

    if user_data.is_approved is not None:
        if user_data.is_approved and not user.is_approved:
            user.approved_at = datetime.utcnow()
            user.approved_by = current_admin.id
        user.is_approved = user_data.is_approved

    if user_data.max_accounts is not None:
        user.max_accounts = user_data.max_accounts

    if user_data.max_signals_per_day is not None:
        user.max_signals_per_day = user_data.max_signals_per_day

    if user_data.admin_notes is not None:
        user.admin_notes = user_data.admin_notes

    await db.flush()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        webhook_secret=user.webhook_secret,
        is_active=user.is_active,
        is_admin=user.is_admin,
        tier=user.tier,
        is_approved=user.is_approved,
        approved_at=user.approved_at,
        approved_by=user.approved_by,
        admin_notes=user.admin_notes,
        max_accounts=user.max_accounts,
        max_signals_per_day=user.max_signals_per_day,
        settings=user.settings,
        created_at=user.created_at,
        updated_at=user.updated_at,
        accounts_count=len(user.mt_accounts) if user.mt_accounts else 0,
        signals_count=len(user.signals) if user.signals else 0,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> None:
    """Delete a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from deleting themselves
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    await db.delete(user)
    await db.flush()


@router.post("/users/{user_id}/approve", response_model=AdminUserResponse)
async def approve_user(
    user_id: UUID,
    approval_data: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> AdminUserResponse:
    """Approve or reject a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_approved = approval_data.is_approved
    if approval_data.is_approved:
        user.approved_at = datetime.utcnow()
        user.approved_by = current_admin.id

    if approval_data.admin_notes:
        user.admin_notes = approval_data.admin_notes

    await db.flush()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        webhook_secret=user.webhook_secret,
        is_active=user.is_active,
        is_admin=user.is_admin,
        tier=user.tier,
        is_approved=user.is_approved,
        approved_at=user.approved_at,
        approved_by=user.approved_by,
        admin_notes=user.admin_notes,
        max_accounts=user.max_accounts,
        max_signals_per_day=user.max_signals_per_day,
        settings=user.settings,
        created_at=user.created_at,
        updated_at=user.updated_at,
        accounts_count=len(user.mt_accounts) if user.mt_accounts else 0,
        signals_count=len(user.signals) if user.signals else 0,
    )


@router.post("/users/{user_id}/upgrade-tier", response_model=AdminUserResponse)
async def upgrade_user_tier(
    user_id: UUID,
    tier_data: TierUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> AdminUserResponse:
    """Upgrade or change a user's tier (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update tier
    user.tier = tier_data.tier.value

    # Update limits based on tier
    tier_limits = TIER_LIMITS.get(tier_data.tier.value, TIER_LIMITS[UserTier.FREE.value])
    user.max_accounts = tier_limits["max_accounts"]
    user.max_signals_per_day = tier_limits["max_signals_per_day"]

    if tier_data.admin_notes:
        user.admin_notes = tier_data.admin_notes

    await db.flush()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        webhook_secret=user.webhook_secret,
        is_active=user.is_active,
        is_admin=user.is_admin,
        tier=user.tier,
        is_approved=user.is_approved,
        approved_at=user.approved_at,
        approved_by=user.approved_by,
        admin_notes=user.admin_notes,
        max_accounts=user.max_accounts,
        max_signals_per_day=user.max_signals_per_day,
        settings=user.settings,
        created_at=user.created_at,
        updated_at=user.updated_at,
        accounts_count=len(user.mt_accounts) if user.mt_accounts else 0,
        signals_count=len(user.signals) if user.signals else 0,
    )


@router.post("/users/{user_id}/toggle-admin", response_model=AdminUserResponse)
async def toggle_admin_status(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_admin),
) -> AdminUserResponse:
    """Toggle a user's admin status (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from demoting themselves
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own admin status",
        )

    user.is_admin = not user.is_admin

    await db.flush()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        webhook_secret=user.webhook_secret,
        is_active=user.is_active,
        is_admin=user.is_admin,
        tier=user.tier,
        is_approved=user.is_approved,
        approved_at=user.approved_at,
        approved_by=user.approved_by,
        admin_notes=user.admin_notes,
        max_accounts=user.max_accounts,
        max_signals_per_day=user.max_signals_per_day,
        settings=user.settings,
        created_at=user.created_at,
        updated_at=user.updated_at,
        accounts_count=len(user.mt_accounts) if user.mt_accounts else 0,
        signals_count=len(user.signals) if user.signals else 0,
    )
