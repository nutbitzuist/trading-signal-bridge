"""
Webhook endpoints for receiving trading signals from TradingView.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.webhook import WebhookPayload, WebhookResponse
from app.services.auth import AuthService
from app.services.signal_processor import SignalProcessor
from app.services.trade_validator import TradeValidator


router = APIRouter(prefix="/webhook", tags=["Webhooks"])
logger = logging.getLogger(__name__)


@router.post("/tradingview", response_model=WebhookResponse)
async def receive_tradingview_webhook(
    payload: WebhookPayload,
    db: AsyncSession = Depends(get_db),
) -> WebhookResponse:
    """
    Receive webhook signals from TradingView.

    The webhook secret is used to identify the user.
    Signals are created for all active MT accounts if no account_id is specified.
    """
    # Authenticate by webhook secret
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_webhook_secret(payload.secret)

    if not user:
        logger.warning(f"Invalid webhook secret attempted")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret",
        )

    if not user.is_active:
        logger.warning(f"Webhook received for inactive user: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    # Validate signal
    validator = TradeValidator()
    is_valid, error_message = validator.validate_signal(payload)

    if not is_valid:
        logger.warning(f"Invalid signal from user {user.id}: {error_message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    # Sanitize comment
    if payload.comment:
        payload.comment = validator.sanitize_comment(payload.comment)

    # Process signal
    processor = SignalProcessor(db)

    try:
        signals = await processor.create_signal_from_webhook(user, payload)

        if not signals:
            return WebhookResponse(
                success=False,
                message="No active accounts found to receive signal",
                signals_created=0,
            )

        logger.info(
            f"Created {len(signals)} signals for user {user.id}: "
            f"{payload.symbol} {payload.action}"
        )

        return WebhookResponse(
            success=True,
            signal_id=signals[0].id if len(signals) == 1 else None,
            message=f"Signal queued for {len(signals)} account(s)",
            signals_created=len(signals),
        )

    except Exception as e:
        logger.error(f"Error processing webhook for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing signal",
        )
