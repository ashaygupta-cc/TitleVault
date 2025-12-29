from shapely.geometry import mapping
from shapely.wkb import loads
from sqlalchemy.orm import Session
from sqlalchemy import text
from decimal import Decimal
import re


def _to_float(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    return float(v)


def _clean_hex(hex_str: str) -> bytes | None:
    """
    Cleans ANY garbage and returns raw bytes.
    Returns None if invalid.
    """
    if not hex_str:
        return None

    s = str(hex_str).strip().lower()

    # remove quotes
    s = s.replace('"', "").replace("'", "")

    # remove 0x
    if s.startswith("0x"):
        s = s[2:]

    # strict hex validation
    if not re.fullmatch(r"[0-9a-f]{64}", s):
        return None

    return bytes.fromhex(s)


def resolve_agreement_geometry(agreement, db: Session):
    """
    Resolve geometry for an agreement:
    - LAND → parcel polygon
    - FLAT → parent land centroid
    """

    # ======================================================
    # LAND AGREEMENT → PARCEL GEOMETRY
    # ======================================================
    if agreement.subject_type == "LAND":
        land_bytes = _clean_hex(agreement.subject_id)
        if not land_bytes:
            return None

        result = db.execute(
            text("""
                SELECT geom
                FROM property_records
                WHERE record_hash = :record_hash
                LIMIT 1
            """),
            {
                "record_hash": land_bytes
            }
        ).fetchone()

        if result and result[0]:
            return loads(bytes(result[0].data))

    # ======================================================
    # FLAT AGREEMENT → PARENT LAND CENTROID
    # ======================================================
    if agreement.subject_type == "FLAT":
        # Fetch land_record_hash FIRST
        row = db.execute(
            text("""
                SELECT land_record_hash
                FROM flat_units
                WHERE id = :flat_id
                LIMIT 1
            """),
            {
                "flat_id": agreement.subject_id
            }
        ).fetchone()

        if not row or not row[0]:
            return None

        land_bytes = _clean_hex(row[0])
        if not land_bytes:
            return None

        result = db.execute(
            text("""
                SELECT geom
                FROM property_records
                WHERE record_hash = :record_hash
                LIMIT 1
            """),
            {
                "record_hash": land_bytes
            }
        ).fetchone()

        if result and result[0]:
            return loads(bytes(result[0].data)).centroid

    return None


def build_heatmap_feature(
    agreement,
    geom,
    value,
    metric,
):
    return {
        "type": "Feature",
        "geometry": mapping(geom),
        "properties": {
            "agreement_id": str(agreement.id),
            "subject_type": agreement.subject_type,
            "subject_id": agreement.subject_id,
            "metric": metric,
            "value": _to_float(value),
            "status": agreement.status.value,
        },
    }
