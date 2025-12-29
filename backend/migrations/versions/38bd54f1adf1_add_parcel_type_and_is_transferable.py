"""add parcel_type and is_transferable

Revision ID: 38bd54f1adf1
Revises: 2fd95afc00bb
Create Date: 2025-12-20 08:00:42.451053

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38bd54f1adf1'
down_revision: Union[str, Sequence[str], None] = '2fd95afc00bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "property_records",
        sa.Column("parcel_type", sa.String(), server_default="PRIMARY")
    )
    op.add_column(
        "property_records",
        sa.Column("is_transferable", sa.Boolean(), server_default=sa.true())
    )

def downgrade():
    op.drop_column("property_records", "is_transferable")
    op.drop_column("property_records", "parcel_type")
