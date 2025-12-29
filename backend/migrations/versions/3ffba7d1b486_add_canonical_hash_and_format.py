"""add canonical hash and format

Revision ID: 3ffba7d1b486
Revises: 3ffdf3829e8c
Create Date: 2025-12-18 03:30:40.884046
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "3ffba7d1b486"
down_revision: Union[str, Sequence[str], None] = "3ffdf3829e8c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # -----------------------------
    # USERS TABLE
    # -----------------------------
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("username", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "roles",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    # -----------------------------
    # PROPERTY RECORD UPDATES
    # -----------------------------
    op.add_column(
        "property_records",
        sa.Column("canonical_hash", sa.LargeBinary(), nullable=True),
    )

    op.add_column(
        "property_records",
        sa.Column(
            "format",
            sa.String(),
            nullable=False,
            server_default=sa.text("'LEGACY'"),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    # -----------------------------
    # REVERT PROPERTY RECORD UPDATES
    # -----------------------------
    op.drop_column("property_records", "format")
    op.drop_column("property_records", "canonical_hash")

    # -----------------------------
    # DROP USERS TABLE
    # -----------------------------
    op.drop_table("users")
