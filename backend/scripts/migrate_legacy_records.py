import json
from sqlalchemy.orm import Session
from models import SessionLocal, PropertyRecord
from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes
from utils.bytes32 import to_bytes32
from ipfs_client import fetch_raw_from_ipfs

def migrate_legacy():
    db: Session = SessionLocal()

    legacy_records = db.query(PropertyRecord).filter(
        PropertyRecord.format != "CANONICAL"
    ).all()

    print(f"🔁 Found {len(legacy_records)} legacy records")

    for r in legacy_records:
        try:
            raw = fetch_raw_from_ipfs(r.cid)
            data = json.loads(raw)

            canonical_bytes = canonicalize_to_bytes(data)
            canonical_hash_hex = compute_keccak256_from_bytes(canonical_bytes)
            canonical_hash_bytes = to_bytes32(canonical_hash_hex)

            r.canonical_json = canonical_bytes.decode("utf-8")
            r.canonical_hash = canonical_hash_bytes
            r.format = "CANONICAL"

            print(f"✅ Migrated {canonical_hash_hex}")

        except Exception as e:
            print(f"❌ Failed {r.cid}: {e}")

    db.commit()
    db.close()
    print("🏁 Migration complete")

if __name__ == "__main__":
    migrate_legacy()
