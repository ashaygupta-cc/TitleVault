"""phase 9: agreements, flats & building registry

Revision ID: 82f686df93b0
Revises: 38bd54f1adf1
Create Date: 2025-12-21 02:39:56.733304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82f686df93b0'
down_revision: Union[str, Sequence[str], None] = '38bd54f1adf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "agreements",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("record_hash", sa.LargeBinary(), nullable=True),
        sa.Column("flat_id", sa.UUID(), nullable=True),
        sa.Column("buyer_address", sa.String(), nullable=False),
        sa.Column("seller_address", sa.String(), nullable=False),
        sa.Column("total_amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("advance_amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("start_date", sa.DateTime(timezone=True)),
        sa.Column("completion_deadline", sa.DateTime(timezone=True)),
        sa.Column("canonical_hash", sa.LargeBinary()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "agreement_installments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("agreement_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_paid", sa.Boolean(), default=False),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "buildings",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("land_record_hash", sa.LargeBinary(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("total_floors", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "flat_units",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("building_id", sa.UUID(), nullable=False),
        sa.Column("flat_number", sa.String(), nullable=False),
        sa.Column("floor_number", sa.Integer(), nullable=False),
        sa.Column("area_m2", sa.Numeric(), nullable=False),
        sa.Column("current_owner", sa.String()),
        sa.Column("is_under_agreement", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
