from sqlalchemy import (
    Column, String, DateTime, Numeric, LargeBinary, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from geoalchemy2 import Geometry

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
# USER MODEL (For login + roles)
# ------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True),
                primary_key=True,
                server_default=text("uuid_generate_v4()"))

    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    roles = Column(JSONB, server_default="'[]'::jsonb", nullable=False)


# ------------------------------------------
# PROPERTY RECORD MODEL
# ------------------------------------------
class PropertyRecord(Base):
    __tablename__ = "property_records"

    id = Column(UUID(as_uuid=True),
                primary_key=True,
                server_default=text("uuid_generate_v4()"))

    record_hash = Column(LargeBinary, unique=True, nullable=False)
    cid = Column(Text, nullable=False)
    owner_address = Column(String)
    parent_record = Column(LargeBinary, nullable=True)

    canonical_json = Column(Text, nullable=False)

    # PostGIS polygon
    geom = Column(Geometry(geometry_type="POLYGON", srid=4326))

    area_m2 = Column(Numeric)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
