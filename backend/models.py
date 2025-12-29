from sqlalchemy import (
    Column,
    String,
    DateTime,
    Numeric,
    LargeBinary,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from geoalchemy2 import Geometry
import uuid
from datetime import datetime

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

    # Roles stored as JSONB array: ["admin", "user"]
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

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

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

    # Immutable canonical hash (bytes32)
    record_hash = Column(LargeBinary, unique=True, nullable=False)

    # Optional explicit canonical hash (future-proofing)
    canonical_hash = Column(LargeBinary, nullable=True)

    # LEGACY | CANONICAL
    format = Column(
        String,
        nullable=False,
        server_default=text("'LEGACY'"),
    )

    # IPFS CID
    cid = Column(Text, nullable=False)

    owner_address = Column(String, nullable=True)

    # Previous record hash (for transfers)
    parent_record = Column(LargeBinary, nullable=True)

    # Canonical JSON (sorted, stable)
    canonical_json = Column(JSONB, nullable=False)
    
    # PostGIS polygon
    geom = Column(
        Geometry(geometry_type="POLYGON", srid=4326),
        nullable=True,
    )

    area_m2 = Column(Numeric, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
