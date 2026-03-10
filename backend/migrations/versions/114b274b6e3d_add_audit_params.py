"""
Add audit params.

Revision ID: 114b274b6e3d
Revises: 657aaca91df5
Create Date: 2026-03-08 19:47:16.833492
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '114b274b6e3d'
down_revision: Union[str, Sequence[str], None] = '657aaca91df5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """
    Upgrade schema.
    """
    op.add_column(
        'audits',
        sa.Column('params', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )

def downgrade() -> None:
    """
    Downgrade schema.
    """
    op.drop_column('audits', 'params')
