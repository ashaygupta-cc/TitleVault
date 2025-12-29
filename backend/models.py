from sqlalchemy import (
    Column,
    String,
    DateTime,
    Numeric,
    LargeBinary,
    Text,
    Enum,
    Integer,
    ForeignKey,
    Boolean,
)

import enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import create_engine
from geoalchemy2 import Geometry
import uuid
from sqlalchemy.dialects.postgresql import UUID

from config import settings

Base = declarative_base()

# ------------------------------------------
# Database Engine + Session
# ------------------------------------------
engine = create_engine(settings.DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """FastAPI dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------
# USER MODEL
# ------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

    roles = Column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )


# ------------------------------------------
# REFRESH TOKEN MODEL
# ------------------------------------------
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    token = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


# ------------------------------------------
# PROPERTY RECORD MODEL
# ------------------------------------------
class PropertyRecord(Base):
    __tablename__ = "property_records"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    record_hash = Column(LargeBinary(32), unique=True, nullable=False)
    canonical_hash = Column(LargeBinary(32), nullable=True)

    subdivision_locked = Column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    format = Column(
        String,
        nullable=False,
        server_default=text("'LEGACY'"),
    )

    cid = Column(Text, nullable=False)
    owner_address = Column(String, nullable=True)
    parent_record = Column(LargeBinary(32), nullable=True)

    canonical_json = Column(JSONB, nullable=False)

    geom = Column(
        Geometry(geometry_type="POLYGON", srid=4326),
        nullable=True,
    )

    area_m2 = Column(Numeric, nullable=True)

    parcel_type = Column(
        String,
        nullable=False,
        server_default=text("'PRIMARY'"),
    )

    is_transferable = Column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# ------------------------------------------
# MERKLE SNAPSHOT MODEL
# ------------------------------------------
class MerkleSnapshot(Base):
    __tablename__ = "merkle_snapshots"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    root = Column(LargeBinary(32), nullable=False, index=True)
    tx_hash = Column(String(66), nullable=False, unique=True)
    block_number = Column(Numeric, nullable=False)

    anchored_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# ------------------------------------------
# AUDIT LOG MODEL
# ------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    action = Column(String, nullable=False)
    record_hash = Column(LargeBinary(32), nullable=True)

    metadata_json = Column(JSONB, nullable=True)

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =========================================================
# AGREEMENT MODELS — PHASE 9
# =========================================================

class AgreementStatus(enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DEFAULTED = "DEFAULTED"
    CANCELLED = "CANCELLED"


class Agreement(Base):
    __tablename__ = "agreements"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,                # ✅ ADD THIS
        server_default=func.gen_random_uuid(),
        nullable=False,
    )

    # 🔗 SUBJECT LINKAGE
    subject_type = Column(String, nullable=False)   # LAND | FLAT
    subject_id = Column(String, nullable=False)     # hex id

    canonical_json = Column(JSONB, nullable=False)

    agreement_hash = Column(LargeBinary(32), nullable=False)

    tx_hash = Column(String(66), nullable=True)
    closed_tx = Column(String(66), nullable=True)

    record_hash = Column(LargeBinary(32), nullable=True)
    flat_id = Column(UUID(as_uuid=True), nullable=True)

    flat_hash = Column(LargeBinary(32), nullable=True)

    status = Column(
        Enum(AgreementStatus),
        nullable=False,
        default=AgreementStatus.DRAFT,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    installments = relationship(
        "AgreementInstallment",
        back_populates="agreement",
        cascade="all, delete-orphan",
    )


class AgreementInstallment(Base):
    __tablename__ = "agreement_installments"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,                
        server_default=func.gen_random_uuid(),
        nullable=False,
    )

    agreement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("agreements.id"),
        nullable=False,
    )

    amount = Column(Numeric(20, 2), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)

    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True))

    agreement = relationship("Agreement", back_populates="installments")



# =========================================================
# BUILDING & FLAT REGISTRY
# =========================================================

class Building(Base):
    __tablename__ = "buildings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,               
        server_default=func.gen_random_uuid(),
        nullable=False,
    )

    land_record_hash = Column(LargeBinary(32), nullable=False)

    name = Column(String, nullable=False)
    total_floors = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    flats = relationship("FlatUnit", backref="building")



class FlatUnit(Base):
    __tablename__ = "flat_units"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    flat_hash = Column(LargeBinary(32), nullable=True, unique=True)

    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=False)

    land_record_hash = Column(String, nullable=False)

    flat_number = Column(String, nullable=False)
    floor_number = Column(String)
    owner_address = Column(String, nullable=False)
    area_m2 = Column(Numeric, nullable=False)

    is_transferable = Column(Boolean, default=True)

    # NOTE:
    # This is a cached hint only.
    # Canonical lock enforcement is via AgreementLedger (on-chain).
    is_locked = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
