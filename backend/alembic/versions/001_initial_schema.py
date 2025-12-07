"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('webhook_secret', sa.String(64), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_index('idx_users_webhook_secret', 'users', ['webhook_secret'], unique=True)

    # Create mt_accounts table
    op.create_table(
        'mt_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('broker', sa.String(255), nullable=True),
        sa.Column('account_number', sa.String(50), nullable=True),
        sa.Column('platform', sa.String(10), nullable=False),
        sa.Column('api_key', sa.String(64), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_connected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("platform IN ('mt4', 'mt5')", name='check_platform')
    )
    op.create_index('idx_mt_accounts_user_id', 'mt_accounts', ['user_id'])
    op.create_index('idx_mt_accounts_api_key', 'mt_accounts', ['api_key'], unique=True)

    # Create symbol_mappings table
    op.create_table(
        'symbol_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tradingview_symbol', sa.String(50), nullable=False),
        sa.Column('mt_symbol', sa.String(50), nullable=False),
        sa.Column('lot_multiplier', sa.Numeric(10, 4), nullable=False, server_default=sa.text('1.0')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['account_id'], ['mt_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id', 'tradingview_symbol', name='uq_account_tv_symbol')
    )
    op.create_index('idx_symbol_mappings_account', 'symbol_mappings', ['account_id'])

    # Create signals table
    op.create_table(
        'signals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('symbol', sa.String(50), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('order_type', sa.String(20), nullable=False, server_default='market'),
        sa.Column('quantity', sa.Numeric(10, 4), nullable=True),
        sa.Column('price', sa.Numeric(20, 8), nullable=True),
        sa.Column('take_profit', sa.Numeric(20, 8), nullable=True),
        sa.Column('stop_loss', sa.Numeric(20, 8), nullable=True),
        sa.Column('comment', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('source', sa.String(50), nullable=False, server_default='tradingview'),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('execution_result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now() + interval '60 seconds'")),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['mt_accounts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "action IN ('buy', 'sell', 'buy_limit', 'buy_stop', 'sell_limit', 'sell_stop', 'close', 'close_partial', 'modify')",
            name='check_action'
        ),
        sa.CheckConstraint(
            "order_type IN ('market', 'limit', 'stop')",
            name='check_order_type'
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'sent', 'executed', 'partial', 'failed', 'expired', 'cancelled')",
            name='check_status'
        )
    )
    op.create_index('idx_signals_user_id', 'signals', ['user_id'])
    op.create_index('idx_signals_account_id', 'signals', ['account_id'])
    op.create_index('idx_signals_status', 'signals', ['status'])
    op.create_index('idx_signals_created_at', 'signals', ['created_at'])


def downgrade() -> None:
    op.drop_table('signals')
    op.drop_table('symbol_mappings')
    op.drop_table('mt_accounts')
    op.drop_table('users')
