"""add owner profiles table

Revision ID: 316982cef90a
Revises: NEW_REV_ID
Create Date: 2025-12-27 05:17:22.344990

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '316982cef90a'
down_revision: Union[str, Sequence[str], None] = 'NEW_REV_ID'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "owner_profiles",
        sa.Column("address", sa.String(), primary_key=True),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )


def downgrade():
    op.drop_table("owner_profiles")