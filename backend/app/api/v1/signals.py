"""
Signal endpoints for EA polling and signal management.
"""
import csv
import io
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user, get_account_by_api_key
from app.models.account import MTAccount
from app.models.user import User
from app.schemas.signal import (
    PendingSignal,
    PendingSignalsResponse,
    SignalListResponse,
    SignalResponse,
    SignalResult,
)
from app.services.signal_processor import SignalProcessor


router = APIRouter(prefix="/signals", tags=["Signals"])
logger = logging.getLogger(__name__)


@router.get("/pending", response_model=PendingSignalsResponse)
async def get_pending_signals(
    account: MTAccount = Depends(get_account_by_api_key),
    db: AsyncSession = Depends(get_db),
) -> PendingSignalsResponse:
    """
    Get pending signals for an MT account (EA polling endpoint).

    This endpoint is called by the Expert Advisor to fetch new signals.
    Signals are marked as 'sent' after being retrieved.
    """
    processor = SignalProcessor(db)

    # Get pending signals
    signals = await processor.get_pending_signals(account.id)

    # Convert to response format and mark as sent
    pending_signals = []
    for signal in signals:
        pending_signals.append(
            PendingSignal(
                id=signal.id,
                symbol=signal.symbol,
                action=signal.action,
                order_type=signal.order_type,
                quantity=signal.quantity,
                price=signal.price,
                take_profit=signal.take_profit,
                stop_loss=signal.stop_loss,
                comment=signal.comment,
            )
        )
        # Mark as sent
        await processor.mark_signal_sent(signal.id)

    return PendingSignalsResponse(
        signals=pending_signals,
        server_time=datetime.utcnow(),
    )


@router.post("/{signal_id}/result", response_model=SignalResponse)
async def report_signal_result(
    signal_id: UUID,
    result: SignalResult,
    account: MTAccount = Depends(get_account_by_api_key),
    db: AsyncSession = Depends(get_db),
) -> SignalResponse:
    """
    Report execution result for a signal (from EA).

    The EA calls this endpoint after attempting to execute a trade.
    """
    processor = SignalProcessor(db)

    # Verify signal belongs to account
    signal = await processor.get_signal_by_id(signal_id)

    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found",
        )

    if signal.account_id != account.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Signal does not belong to this account",
        )

    # Update signal with result
    updated_signal = await processor.update_signal_result(signal_id, result)

    if result.success:
        logger.info(
            f"Signal {signal_id} executed successfully: "
            f"ticket={result.ticket}, price={result.executed_price}"
        )
    else:
        logger.warning(
            f"Signal {signal_id} failed: {result.error_message}"
        )

    return updated_signal


@router.get("", response_model=SignalListResponse)
async def list_signals(
    account_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SignalListResponse:
    """
    List signals for the current user with filters.
    """
    processor = SignalProcessor(db)

    signals, total = await processor.get_signals(
        user_id=current_user.id,
        account_id=account_id,
        status=status,
        symbol=symbol,
        from_date=from_date,
        to_date=to_date,
        page=page,
        per_page=per_page,
    )

    return SignalListResponse(
        signals=[SignalResponse.model_validate(s) for s in signals],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/export")
async def export_signals(
    account_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Export signals to CSV.
    """
    processor = SignalProcessor(db)

    # Get all signals (no pagination for export)
    signals, _ = await processor.get_signals(
        user_id=current_user.id,
        account_id=account_id,
        status=status,
        symbol=symbol,
        from_date=from_date,
        to_date=to_date,
        page=1,
        per_page=10000,  # Max for export
    )

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Symbol", "Action", "Order Type", "Quantity",
        "Price", "Take Profit", "Stop Loss", "Status",
        "Comment", "Created At", "Executed At", "Error Message"
    ])

    # Data rows
    for signal in signals:
        writer.writerow([
            str(signal.id),
            signal.symbol,
            signal.action,
            signal.order_type,
            str(signal.quantity) if signal.quantity else "",
            str(signal.price) if signal.price else "",
            str(signal.take_profit) if signal.take_profit else "",
            str(signal.stop_loss) if signal.stop_loss else "",
            signal.status,
            signal.comment or "",
            signal.created_at.isoformat() if signal.created_at else "",
            signal.executed_at.isoformat() if signal.executed_at else "",
            signal.error_message or "",
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=signals_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SignalResponse:
    """
    Get a specific signal by ID.
    """
    processor = SignalProcessor(db)

    signal = await processor.get_signal_by_id(signal_id, current_user.id)

    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found",
        )

    return signal


@router.delete("/{signal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_signal(
    signal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Cancel a pending signal.
    """
    processor = SignalProcessor(db)

    success = await processor.cancel_signal(signal_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found or cannot be cancelled",
        )
