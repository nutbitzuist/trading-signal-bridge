"""
Notification service for sending alerts (placeholder for future extensions).
"""
import logging
from typing import Optional

from app.models.signal import Signal


logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending notifications (Telegram, Email, etc.)."""

    def __init__(self):
        # Placeholder for notification clients
        self.telegram_enabled = False
        self.email_enabled = False

    async def notify_signal_created(self, signal: Signal) -> None:
        """Notify about a new signal."""
        logger.info(
            f"Signal created: {signal.id} - {signal.symbol} {signal.action}"
        )
        # Future: Send Telegram/Email notification

    async def notify_signal_executed(self, signal: Signal) -> None:
        """Notify about signal execution."""
        logger.info(
            f"Signal executed: {signal.id} - {signal.symbol} {signal.action}"
        )
        # Future: Send Telegram/Email notification

    async def notify_signal_failed(
        self,
        signal: Signal,
        error: Optional[str] = None,
    ) -> None:
        """Notify about signal failure."""
        logger.warning(
            f"Signal failed: {signal.id} - {signal.symbol} {signal.action} - {error}"
        )
        # Future: Send Telegram/Email notification

    async def notify_kill_switch_activated(self, user_id: str) -> None:
        """Notify about kill switch activation."""
        logger.warning(f"Kill switch activated by user: {user_id}")
        # Future: Send urgent notification
