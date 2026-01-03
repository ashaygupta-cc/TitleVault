"""merge survey/owner fields with owner profiles

Revision ID: 23cac3f1189f
Revises: 316982cef90a, add_survey_owner_fields
Create Date: 2025-12-31 06:12:47.509324

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23cac3f1189f'
down_revision: Union[str, Sequence[str], None] = ('316982cef90a', 'add_survey_owner_fields')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
