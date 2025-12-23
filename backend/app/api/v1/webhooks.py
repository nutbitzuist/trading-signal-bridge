"""
Webhook endpoints for receiving trading signals from TradingView.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
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
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WebhookResponse:
    """
    Receive webhook signals from TradingView.

    The webhook secret is used to identify the user.
    Signals are created for all active MT accounts if no account_id is specified.
    
    Note: TradingView sends webhooks as text/plain, not application/json,
    so we need to parse the raw body manually.
    """
    # Get raw body and parse JSON (TradingView sends as text/plain)
    try:
        body = await request.body()
        body_str = body.decode('utf-8').strip()
        logger.info(f"Received webhook body: {body_str[:200]}...")  # Log first 200 chars
        
        # Parse JSON from body
        try:
            payload_data = json.loads(body_str)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in webhook body: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON: {str(e)}",
            )
        
        # Validate with Pydantic schema
        try:
            payload = WebhookPayload(**payload_data)
        except Exception as e:
            logger.error(f"Payload validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payload: {str(e)}",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading webhook body: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error reading request body",
        )

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

