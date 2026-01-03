"""
Add survey_number and owner_name to PropertyRecord

Revision ID: add_survey_owner_fields
Revises: 
Create Date: 2025-12-31
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_survey_owner_fields'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('property_records', sa.Column('survey_number', sa.String(), nullable=True))
    op.add_column('property_records', sa.Column('owner_name', sa.String(), nullable=True))

def downgrade():
    op.drop_column('property_records', 'survey_number')
    op.drop_column('property_records', 'owner_name')
