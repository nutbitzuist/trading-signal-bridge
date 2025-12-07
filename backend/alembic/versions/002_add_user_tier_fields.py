"""Add user tier and approval fields

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add tier column
    op.add_column('users', sa.Column('tier', sa.String(20), nullable=False, server_default='free'))

    # Add approval columns
    op.add_column('users', sa.Column('is_approved', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('users', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('approved_by', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))

    # Add admin notes
    op.add_column('users', sa.Column('admin_notes', sa.Text(), nullable=True))

    # Add tier limits
    op.add_column('users', sa.Column('max_accounts', sa.Integer(), nullable=False, server_default='2'))
    op.add_column('users', sa.Column('max_signals_per_day', sa.Integer(), nullable=False, server_default='50'))


def downgrade() -> None:
    op.drop_column('users', 'max_signals_per_day')
    op.drop_column('users', 'max_accounts')
    op.drop_column('users', 'admin_notes')
    op.drop_column('users', 'approved_by')
    op.drop_column('users', 'approved_at')
    op.drop_column('users', 'is_approved')
    op.drop_column('users', 'tier')
