"""
Dashboard and statistics endpoints.
"""
from datetime import datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user, get_current_active_admin
from app.models.account import MTAccount
from app.models.signal import Signal
from app.models.user import User


router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/stats", response_model=Dict[str, Any])
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get dashboard statistics for the current user.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # Get account counts
    accounts_result = await db.execute(
        select(func.count(MTAccount.id)).where(
            MTAccount.user_id == current_user.id
        )
    )
    total_accounts = accounts_result.scalar()

    active_accounts_result = await db.execute(
        select(func.count(MTAccount.id)).where(
            and_(
                MTAccount.user_id == current_user.id,
                MTAccount.is_active == True,
            )
        )
    )
    active_accounts = active_accounts_result.scalar()

    # Get signal statistics
    signals_today_result = await db.execute(
        select(func.count(Signal.id)).where(
            and_(
                Signal.user_id == current_user.id,
                Signal.created_at >= today_start,
            )
        )
    )
    signals_today = signals_today_result.scalar()

    signals_week_result = await db.execute(
        select(func.count(Signal.id)).where(
            and_(
                Signal.user_id == current_user.id,
                Signal.created_at >= week_start,
            )
        )
    )
    signals_week = signals_week_result.scalar()

    signals_month_result = await db.execute(
        select(func.count(Signal.id)).where(
            and_(
                Signal.user_id == current_user.id,
                Signal.created_at >= month_start,
            )
        )
    )
    signals_month = signals_month_result.scalar()

    # Get signal status breakdown (last 30 days)
    status_breakdown = {}
    for status_value in ["pending", "sent", "executed", "failed", "expired", "cancelled"]:
        count_result = await db.execute(
            select(func.count(Signal.id)).where(
                and_(
                    Signal.user_id == current_user.id,
                    Signal.status == status_value,
                    Signal.created_at >= month_start,
                )
            )
        )
        status_breakdown[status_value] = count_result.scalar()

    # Get top symbols
    top_symbols_result = await db.execute(
        select(Signal.symbol, func.count(Signal.id).label("count"))
        .where(
            and_(
                Signal.user_id == current_user.id,
                Signal.created_at >= month_start,
            )
        )
        .group_by(Signal.symbol)
        .order_by(func.count(Signal.id).desc())
        .limit(5)
    )
    top_symbols = [
        {"symbol": row.symbol, "count": row.count}
        for row in top_symbols_result.all()
    ]

    # Calculate success rate
    total_completed = status_breakdown.get("executed", 0) + status_breakdown.get("failed", 0)
    success_rate = (
        round(status_breakdown.get("executed", 0) / total_completed * 100, 1)
        if total_completed > 0
        else 0
    )

    # Get recent signals
    recent_signals_result = await db.execute(
        select(Signal)
        .where(Signal.user_id == current_user.id)
        .order_by(Signal.created_at.desc())
        .limit(10)
    )
    recent_signals = [
        {
            "id": str(s.id),
            "symbol": s.symbol,
            "action": s.action,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
        }
        for s in recent_signals_result.scalars().all()
    ]

    return {
        "accounts": {
            "total": total_accounts,
            "active": active_accounts,
        },
        "signals": {
            "today": signals_today,
            "week": signals_week,
            "month": signals_month,
            "status_breakdown": status_breakdown,
            "success_rate": success_rate,
        },
        "top_symbols": top_symbols,
        "recent_signals": recent_signals,
    }


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/system/kill-switch", status_code=status.HTTP_200_OK)
async def activate_kill_switch(
    current_user: User = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Emergency kill switch - cancels all pending signals (admin only).
    """
    from sqlalchemy import update

    # Cancel all pending signals
    result = await db.execute(
        update(Signal)
        .where(Signal.status == "pending")
        .values(status="cancelled")
    )

    cancelled_count = result.rowcount

    return {
        "success": True,
        "message": f"Kill switch activated. {cancelled_count} pending signals cancelled.",
        "cancelled_count": cancelled_count,
    }
