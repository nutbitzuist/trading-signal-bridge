"""
Signal processing service for handling trading signals.
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.account import MTAccount
from app.models.signal import Signal
from app.models.symbol_mapping import SymbolMapping
from app.models.user import User
from app.schemas.signal import SignalResult
from app.schemas.webhook import WebhookPayload


class SignalProcessor:
    """Service for processing and managing trading signals."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_signal_from_webhook(
        self,
        user: User,
        payload: WebhookPayload,
    ) -> List[Signal]:
        """
        Create signals from a webhook payload.
        If account_id is specified, create one signal.
        Otherwise, create signals for all active accounts.
        """
        signals = []

        if payload.account_id:
            # Create signal for specific account
            account = await self._get_user_account(user.id, payload.account_id)
            if account and account.is_active:
                signal = await self._create_signal(user, account, payload)
                signals.append(signal)
        else:
            # Create signals for all active accounts
            accounts = await self._get_active_accounts(user.id)
            for account in accounts:
                signal = await self._create_signal(user, account, payload)
                signals.append(signal)

        await self.db.flush()

        # Refresh all signals to get their IDs
        for signal in signals:
            await self.db.refresh(signal)

        return signals

    async def _create_signal(
        self,
        user: User,
        account: MTAccount,
        payload: WebhookPayload,
    ) -> Signal:
        """Create a single signal for an account."""
        # Get symbol mapping if exists
        mapping = await self._get_symbol_mapping(account.id, payload.symbol)

        # Calculate quantity with multiplier
        quantity = payload.quantity
        if quantity and mapping:
            quantity = quantity * mapping.lot_multiplier

        # Use mapped symbol or original
        symbol = mapping.mt_symbol if mapping else payload.symbol

        signal = Signal(
            user_id=user.id,
            account_id=account.id,
            symbol=symbol,
            action=payload.action,
            order_type=payload.order_type,
            quantity=quantity,
            price=payload.price,
            take_profit=payload.take_profit,
            stop_loss=payload.stop_loss,
            comment=payload.comment,
            status="pending",
            source="tradingview",
            raw_payload=payload.model_dump(mode="json"),
            expires_at=datetime.utcnow() + timedelta(seconds=settings.SIGNAL_EXPIRY_SECONDS),
        )

        self.db.add(signal)
        return signal

    async def _get_user_account(
        self,
        user_id: UUID,
        account_id: UUID,
    ) -> Optional[MTAccount]:
        """Get a specific account owned by user."""
        result = await self.db.execute(
            select(MTAccount).where(
                and_(
                    MTAccount.id == account_id,
                    MTAccount.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_active_accounts(self, user_id: UUID) -> List[MTAccount]:
        """Get all active accounts for a user."""
        result = await self.db.execute(
            select(MTAccount).where(
                and_(
                    MTAccount.user_id == user_id,
                    MTAccount.is_active == True,
                )
            )
        )
        return list(result.scalars().all())

    async def _get_symbol_mapping(
        self,
        account_id: UUID,
        tradingview_symbol: str,
    ) -> Optional[SymbolMapping]:
        """Get symbol mapping for an account."""
        result = await self.db.execute(
            select(SymbolMapping).where(
                and_(
                    SymbolMapping.account_id == account_id,
                    SymbolMapping.tradingview_symbol == tradingview_symbol,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_pending_signals(self, account_id: UUID) -> List[Signal]:
        """Get pending signals for an account that haven't expired."""
        now = datetime.utcnow()

        result = await self.db.execute(
            select(Signal).where(
                and_(
                    Signal.account_id == account_id,
                    Signal.status == "pending",
                    Signal.expires_at > now,
                )
            ).order_by(Signal.created_at.asc())
        )

        return list(result.scalars().all())

    async def mark_signal_sent(self, signal_id: UUID) -> Optional[Signal]:
        """Mark a signal as sent to the EA."""
        result = await self.db.execute(
            select(Signal).where(Signal.id == signal_id)
        )
        signal = result.scalar_one_or_none()

        if signal and signal.status == "pending":
            signal.status = "sent"
            signal.sent_at = datetime.utcnow()
            await self.db.flush()

        return signal

    async def update_signal_result(
        self,
        signal_id: UUID,
        result: SignalResult,
    ) -> Optional[Signal]:
        """Update signal with execution result."""
        query_result = await self.db.execute(
            select(Signal).where(Signal.id == signal_id)
        )
        signal = query_result.scalar_one_or_none()

        if not signal:
            return None

        signal.execution_result = result.model_dump(mode="json")

        if result.success:
            signal.status = "executed"
            signal.executed_at = datetime.utcnow()
        else:
            signal.status = "failed"
            signal.error_message = result.error_message

        await self.db.flush()
        return signal

    async def cancel_signal(self, signal_id: UUID, user_id: UUID) -> bool:
        """Cancel a pending signal."""
        result = await self.db.execute(
            select(Signal).where(
                and_(
                    Signal.id == signal_id,
                    Signal.user_id == user_id,
                    Signal.status == "pending",
                )
            )
        )
        signal = result.scalar_one_or_none()

        if not signal:
            return False

        signal.status = "cancelled"
        await self.db.flush()
        return True

    async def expire_old_signals(self) -> int:
        """Expire signals that have passed their expiry time."""
        now = datetime.utcnow()

        result = await self.db.execute(
            update(Signal)
            .where(
                and_(
                    Signal.status == "pending",
                    Signal.expires_at <= now,
                )
            )
            .values(status="expired")
        )

        return result.rowcount

    async def get_signal_by_id(
        self,
        signal_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> Optional[Signal]:
        """Get a signal by ID, optionally filtering by user."""
        query = select(Signal).where(Signal.id == signal_id)

        if user_id:
            query = query.where(Signal.user_id == user_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_signals(
        self,
        user_id: UUID,
        account_id: Optional[UUID] = None,
        status: Optional[str] = None,
        symbol: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[List[Signal], int]:
        """Get paginated signals with filters."""
        query = select(Signal).where(Signal.user_id == user_id)

        if account_id:
            query = query.where(Signal.account_id == account_id)
        if status:
            query = query.where(Signal.status == status)
        if symbol:
            query = query.where(Signal.symbol == symbol)
        if from_date:
            query = query.where(Signal.created_at >= from_date)
        if to_date:
            query = query.where(Signal.created_at <= to_date)

        # Get total count
        from sqlalchemy import func
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.order_by(Signal.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)

        result = await self.db.execute(query)
        signals = list(result.scalars().all())

        return signals, total
