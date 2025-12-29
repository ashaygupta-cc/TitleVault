"""phase9_agreements_and_buildings_phase10_flat_registry

Revision ID: 74ed8f772527
Revises: 82f686df93b0
Create Date: 2025-12-21 06:08:48.654518

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "74ed8f772527"
down_revision: Union[str, Sequence[str], None] = "82f686df93b0"
branch_labels = None
depends_on = None


# --------------------------------------------------
# ENUM DEFINITIONS
# --------------------------------------------------

agreement_status_enum = sa.Enum(
    "DRAFT",
    "ACTIVE",
    "COMPLETED",
    "DEFAULTED",
    "CANCELLED",
    name="agreementstatus",
)


# --------------------------------------------------
# UPGRADE
# --------------------------------------------------

def upgrade() -> None:
    bind = op.get_bind()

    # --------------------------------------------------
    # AGREEMENT STATUS ENUM (SAFE CREATE)
    # --------------------------------------------------
    agreement_status_enum.create(bind, checkfirst=True)

    # --------------------------------------------------
    # AGREEMENTS — CANONICAL MODEL (PHASE 9)
    # --------------------------------------------------
    op.add_column("agreements", sa.Column("subject_type", sa.String(), nullable=False))
    op.add_column("agreements", sa.Column("subject_id", sa.String(), nullable=False))
    op.add_column(
        "agreements",
        sa.Column("canonical_json", postgresql.JSONB(), nullable=False),
    )
    op.add_column(
        "agreements",
        sa.Column("agreement_hash", sa.LargeBinary(32), nullable=False),
    )
    op.add_column("agreements", sa.Column("tx_hash", sa.String(66), nullable=True))
    op.add_column("agreements", sa.Column("closed_tx", sa.String(66), nullable=True))
    op.add_column(
        "agreements", sa.Column("flat_hash", sa.LargeBinary(32), nullable=True)
    )

    op.execute("""
    UPDATE agreements
    SET status = 'DRAFT'
    WHERE status IS NULL
   """)

    op.execute("""
    ALTER TABLE agreements
    ALTER COLUMN status
    TYPE agreementstatus
    USING status::agreementstatus
    """)


    # remove legacy columns
    op.drop_column("agreements", "buyer_address")
    op.drop_column("agreements", "seller_address")
    op.drop_column("agreements", "total_amount")
    op.drop_column("agreements", "advance_amount")
    op.drop_column("agreements", "canonical_hash")
    op.drop_column("agreements", "start_date")
    op.drop_column("agreements", "completion_deadline")

    # --------------------------------------------------
    # AGREEMENT INSTALLMENTS FK (FIXED)
    # --------------------------------------------------
    op.create_foreign_key(
        "fk_agreement_installments_agreement_id",
        "agreement_installments",
        "agreements",
        ["agreement_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # --------------------------------------------------
    # FLAT REGISTRY NORMALIZATION (PHASE 10)
    # --------------------------------------------------
    op.add_column(
        "flat_units", sa.Column("land_record_hash", sa.String(), nullable=False)
    )
    op.add_column(
        "flat_units", sa.Column("owner_address", sa.String(), nullable=False)
    )
    op.add_column(
        "flat_units", sa.Column("is_transferable", sa.Boolean(), nullable=True)
    )
    op.add_column("flat_units", sa.Column("is_locked", sa.Boolean(), nullable=True))

    op.alter_column(
        "flat_units",
        "floor_number",
        existing_type=sa.INTEGER(),
        type_=sa.String(),
        nullable=True,
    )

    op.create_foreign_key(
        "fk_flat_units_building_id",
        "flat_units",
        "buildings",
        ["building_id"],
        ["id"],
    )

    op.drop_column("flat_units", "current_owner")
    op.drop_column("flat_units", "is_under_agreement")

    # --------------------------------------------------
    # MERKLE SNAPSHOT OPTIMIZATION (PHASE 11)
    # --------------------------------------------------
    op.create_index(
        "ix_merkle_snapshots_root", "merkle_snapshots", ["root"], unique=False
    )

    # --------------------------------------------------
    # PROPERTY RECORD NORMALIZATION
    # --------------------------------------------------
    op.alter_column(
        "property_records",
        "parcel_type",
        existing_type=sa.TEXT(),
        type_=sa.String(),
        nullable=False,
        existing_server_default=sa.text("'PRIMARY'"),
    )

    op.alter_column(
        "property_records",
        "is_transferable",
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text("true"),
    )

    op.alter_column(
        "property_records",
        "created_at",
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=False,
        existing_server_default=sa.text("now()"),
    )


# --------------------------------------------------
# DOWNGRADE (SAFE & REVERSIBLE)
# --------------------------------------------------

def downgrade() -> None:
    bind = op.get_bind()

    # agreements
    op.add_column(
        "agreements",
        sa.Column("buyer_address", sa.String(), nullable=False),
    )
    op.add_column(
        "agreements",
        sa.Column("seller_address", sa.String(), nullable=False),
    )
    op.add_column(
        "agreements",
        sa.Column("total_amount", sa.Numeric(20, 2), nullable=False),
    )
    op.add_column(
        "agreements",
        sa.Column("advance_amount", sa.Numeric(20, 2), nullable=False),
    )
    op.add_column(
        "agreements",
        sa.Column("canonical_hash", sa.LargeBinary(32), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("start_date", postgresql.TIMESTAMP(timezone=True)),
    )
    op.add_column(
        "agreements",
        sa.Column("completion_deadline", postgresql.TIMESTAMP(timezone=True)),
    )

    op.alter_column(
        "agreements",
        "status",
        type_=sa.VARCHAR(),
        existing_nullable=False,
    )

    op.drop_column("agreements", "flat_hash")
    op.drop_column("agreements", "closed_tx")
    op.drop_column("agreements", "tx_hash")
    op.drop_column("agreements", "agreement_hash")
    op.drop_column("agreements", "canonical_json")
    op.drop_column("agreements", "subject_id")
    op.drop_column("agreements", "subject_type")

    # flats
    op.add_column(
        "flat_units", sa.Column("current_owner", sa.String(), nullable=True)
    )
    op.add_column(
        "flat_units", sa.Column("is_under_agreement", sa.Boolean(), nullable=True)
    )

    op.drop_constraint("fk_flat_units_building_id", "flat_units", type_="foreignkey")

    op.alter_column(
        "flat_units",
        "floor_number",
        existing_type=sa.String(),
        type_=sa.INTEGER(),
        nullable=False,
    )

    op.drop_column("flat_units", "is_locked")
    op.drop_column("flat_units", "is_transferable")
    op.drop_column("flat_units", "owner_address")
    op.drop_column("flat_units", "land_record_hash")

    # fk + index cleanup
    op.drop_constraint(
        "fk_agreement_installments_agreement_id",
        "agreement_installments",
        type_="foreignkey",
    )

    op.drop_index("ix_merkle_snapshots_root", table_name="merkle_snapshots")

    # enum cleanup
    agreement_status_enum.drop(bind, checkfirst=True)