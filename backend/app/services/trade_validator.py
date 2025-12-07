"""
Trade validation service for validating signals before execution.
"""
from decimal import Decimal
from typing import Optional, Tuple

from app.models.account import MTAccount
from app.schemas.webhook import WebhookPayload


class TradeValidator:
    """Service for validating trading signals."""

    # Default limits
    DEFAULT_MAX_LOT_SIZE = Decimal("10.0")
    DEFAULT_MIN_LOT_SIZE = Decimal("0.01")

    # Symbol-specific limits
    SYMBOL_LIMITS = {
        "XAUUSD": {"max_lot": Decimal("50.0"), "min_lot": Decimal("0.01")},
        "GOLD": {"max_lot": Decimal("50.0"), "min_lot": Decimal("0.01")},
        "USOIL": {"max_lot": Decimal("100.0"), "min_lot": Decimal("0.01")},
        "XTIUSD": {"max_lot": Decimal("100.0"), "min_lot": Decimal("0.01")},
    }

    def validate_signal(
        self,
        payload: WebhookPayload,
        account: Optional[MTAccount] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate a trading signal.

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Validate action
        valid_actions = [
            "buy", "sell", "buy_limit", "buy_stop",
            "sell_limit", "sell_stop", "close", "close_partial", "modify"
        ]
        if payload.action not in valid_actions:
            return False, f"Invalid action: {payload.action}"

        # Validate lot size
        if payload.quantity is not None:
            is_valid, error = self._validate_lot_size(
                payload.quantity,
                payload.symbol,
                account,
            )
            if not is_valid:
                return False, error

        # Validate price for limit/stop orders
        if payload.order_type in ["limit", "stop"]:
            if payload.price is None or payload.price <= 0:
                return False, f"Price is required for {payload.order_type} orders"

        # Validate TP/SL
        if payload.take_profit is not None and payload.take_profit <= 0:
            return False, "Take profit must be greater than 0"

        if payload.stop_loss is not None and payload.stop_loss <= 0:
            return False, "Stop loss must be greater than 0"

        # Validate TP/SL logic
        if payload.take_profit and payload.stop_loss:
            if payload.action in ["buy", "buy_limit", "buy_stop"]:
                if payload.take_profit <= payload.stop_loss:
                    return False, "Take profit must be greater than stop loss for buy orders"
            elif payload.action in ["sell", "sell_limit", "sell_stop"]:
                if payload.take_profit >= payload.stop_loss:
                    return False, "Take profit must be less than stop loss for sell orders"

        return True, None

    def _validate_lot_size(
        self,
        quantity: Decimal,
        symbol: str,
        account: Optional[MTAccount] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Validate lot size against limits."""
        # Get account-specific max lot if configured
        max_lot = self.DEFAULT_MAX_LOT_SIZE
        min_lot = self.DEFAULT_MIN_LOT_SIZE

        if account and account.settings:
            max_lot = Decimal(str(account.settings.get("max_lot_size", max_lot)))
            min_lot = Decimal(str(account.settings.get("min_lot_size", min_lot)))

        # Check symbol-specific limits
        symbol_upper = symbol.upper()
        if symbol_upper in self.SYMBOL_LIMITS:
            symbol_limits = self.SYMBOL_LIMITS[symbol_upper]
            max_lot = min(max_lot, symbol_limits["max_lot"])
            min_lot = max(min_lot, symbol_limits["min_lot"])

        if quantity < min_lot:
            return False, f"Lot size {quantity} is below minimum {min_lot}"

        if quantity > max_lot:
            return False, f"Lot size {quantity} exceeds maximum {max_lot}"

        return True, None

    def sanitize_comment(self, comment: Optional[str]) -> Optional[str]:
        """Sanitize comment to remove potentially dangerous characters."""
        if not comment:
            return None

        # Remove any characters that might cause issues in MT4/MT5
        sanitized = "".join(
            c for c in comment
            if c.isalnum() or c in " _-."
        )

        # Truncate to max length
        return sanitized[:31] if len(sanitized) > 31 else sanitized
