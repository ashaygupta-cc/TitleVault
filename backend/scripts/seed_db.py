


import json
from sqlalchemy.orm import Session
from models import PropertyRecord, get_db
from utils.bytes32 import parse_bytes32
from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes
from config import settings
from sqlalchemy import create_engine

# Example polygon (closed)
polygon = [
    [80.20584, 26.89312],
    [80.20642, 26.89314],
    [80.20638, 26.89264],
    [80.2058, 26.89262],
    [80.20584, 26.89312]
]

metadata = {
    "village": "",
    "taluk": "",
    "district": "",
    "state": "Karnataka"
}

payload = {
    "polygon": polygon,
    "metadata": metadata,
    "area_m2": 1234.56,
    "parent": None,
    "type": "PRIMARY",
}


canonical = canonicalize_to_bytes(payload)
record_hash_hex = compute_keccak256_from_bytes(canonical)

print(f"record_hash_hex (raw): {record_hash_hex}")
print(f"Length of record_hash_hex (raw): {len(record_hash_hex)}")
# Remove all 0x prefixes
while record_hash_hex.startswith('0x'):
    record_hash_hex = record_hash_hex[2:]
print(f"Sanitized record_hash_hex: {record_hash_hex} (length: {len(record_hash_hex)})")

# Patch: Catch HTTPException from parse_bytes32
try:
    record_hash_bytes = parse_bytes32(record_hash_hex)
except Exception as e:
    print(f"Error parsing record hash: {e}")
    exit(1)

engine = create_engine(settings.DATABASE_URL)
session = Session(bind=engine)

# Insert only if not exists
exists = session.query(PropertyRecord).filter(PropertyRecord.record_hash == record_hash_bytes).first()
if not exists:
    rec = PropertyRecord(
        record_hash=record_hash_bytes,
        canonical_hash=record_hash_bytes,
        format="CANONICAL",
        owner_address="0x1234567890abcdef",
        cid="QmTest",
        canonical_json=canonical.decode("utf-8"),
        geom=f"SRID=4326;POLYGON(({', '.join([f'{x[0]} {x[1]}' for x in polygon])}))",
        area_m2=1234.56,
        parent_record=None,
        is_transferable=True,
    )
    session.add(rec)
    session.commit()
    print(f"Inserted test property record: {record_hash_hex}")
else:
    print(f"Test property record already exists: {record_hash_hex}")
session.close()
