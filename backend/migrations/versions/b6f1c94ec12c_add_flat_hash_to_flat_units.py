"""add flat_hash to flat_units

Revision ID: b6f1c94ec12c
Revises: 74ed8f772527
Create Date: 2025-12-21 11:22:12.694006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision = "NEW_REV_ID"
down_revision = "74ed8f772527"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "flat_units",
        sa.Column("flat_hash", sa.LargeBinary(32), nullable=True),
    )

    op.create_unique_constraint(
        "uq_flat_units_flat_hash",
        "flat_units",
        ["flat_hash"],
    )


def downgrade():
    op.drop_constraint(
        "uq_flat_units_flat_hash",
        "flat_units",
        type_="unique",
    )
    op.drop_column("flat_units", "flat_hash")
