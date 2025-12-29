"""add subdivision_locked to property_records

Revision ID: 2fd95afc00bb
Revises: 1c0d68cb8da5
Create Date: 2025-12-20 05:15:19.872747

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fd95afc00bb'
down_revision: Union[str, Sequence[str], None] = '1c0d68cb8da5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "property_records",
        sa.Column(
            "subdivision_locked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false()
        )
    )


def downgrade():
    op.drop_column("property_records", "subdivision_locked")