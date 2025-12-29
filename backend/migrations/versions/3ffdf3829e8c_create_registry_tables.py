"""create registry tables

Revision ID: 3ffdf3829e8c
Revises: 
Create Date: 2025-12-13 02:02:57.108046
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = '3ffdf3829e8c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    """Upgrade schema – create only our app tables."""

    # Create property records table
    op.create_table(
        'property_records',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('record_hash', sa.LargeBinary(), nullable=False),
        sa.Column('cid', sa.Text(), nullable=False),
        sa.Column('owner_address', sa.String(), nullable=True),
        sa.Column('parent_record', sa.LargeBinary(), nullable=True),
        sa.Column('canonical_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            'geom',
            geoalchemy2.types.Geometry(
                geometry_type='POLYGON',
                srid=4326,
                from_text='ST_GeomFromEWKT'
            ),
            nullable=True
        ),
        sa.Column('area_m2', sa.Numeric(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('record_hash')
    )

    # Optional GIST index (safe & required for spatial queries)
    # op.create_index(
    #     'idx_property_records_geom',
    #     'property_records',
    #     ['geom'],
    #     unique=False,
    #     postgresql_using='gist'
    # )


def downgrade() -> None:
    """Downgrade – drop only our tables."""

    op.drop_index('idx_property_records_geom', table_name='property_records')
    op.drop_table('property_records')
