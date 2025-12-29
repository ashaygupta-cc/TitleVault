"""add merkle snapshots

Revision ID: 1c0d68cb8da5
Revises: 3ffba7d1b486
Create Date: 2025-12-18 22:03:08.046848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c0d68cb8da5'
down_revision: Union[str, Sequence[str], None] = '3ffba7d1b486'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
    "merkle_snapshots",
    sa.Column("id", sa.UUID(), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
    sa.Column("root", sa.LargeBinary(32), nullable=False),
    sa.Column("tx_hash", sa.String(66), nullable=False, unique=True),
    sa.Column("block_number", sa.Numeric(), nullable=False),
    sa.Column("anchored_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
