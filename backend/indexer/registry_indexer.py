from web3._utils.events import get_event_data
from web3 import Web3
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import time

from shapely.geometry import Polygon
from shapely.ops import transform
import pyproj

from models import PropertyRecord, SessionLocal
from config import settings
from web3_client import contract, w3
from ipfs_client import fetch_raw_from_ipfs


# --------------------------------------------------
# 🔹 HELPER: Compute area in square meters
# --------------------------------------------------
def compute_area_m2(coords):
    """
    Compute polygon area in square meters
    using EPSG:3857 projection
    """
    poly = Polygon(coords)

    projector = pyproj.Transformer.from_crs(
        "EPSG:4326", "EPSG:3857", always_xy=True
    ).transform

    return transform(projector, poly).area


# --------------------------------------------------
# 🔹 HANDLE RecordCreated EVENT
# --------------------------------------------------
def handle_record_created(event, db: Session):
    args = event["args"]

    record_hash: bytes = args["recordHash"]
    owner: str = args["owner"]
    cid: str = args["cid"]
    timestamp: int = args["timestamp"]

    # -----------------------------
    # Idempotency check
    # -----------------------------
    exists = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == record_hash
    ).first()

    if exists:
        return

    # -----------------------------
    # 🔑 Reconstruct from IPFS
    # -----------------------------
    raw = fetch_raw_from_ipfs(cid)
    data = json.loads(raw)

    coords = data["polygon"]

    geom_wkt = Polygon(coords).wkt
    area_m2 = compute_area_m2(coords)

    # -----------------------------
    # Persist reconstructed record
    # -----------------------------
    db.add(PropertyRecord(
        record_hash=record_hash,
        canonical_hash=record_hash,     
        format="CANONICAL",              
        owner_address=owner,
        cid=cid,
        canonical_json=raw,
        geom=f"SRID=4326;{geom_wkt}",
        area_m2=area_m2,
        created_at=datetime.fromtimestamp(timestamp, tz=timezone.utc),
    ))

    db.commit()


# --------------------------------------------------
# 🔹 HANDLE RecordTransferred EVENT
# --------------------------------------------------
def handle_record_transferred(event, db: Session):
    args = event["args"]

    old_hash: bytes = args["oldRecordHash"]
    new_hash: bytes = args["newRecordHash"]
    new_owner: str = args["newOwner"]
    timestamp: int = args["timestamp"]

    old = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == old_hash
    ).first()

    if not old:
        # Chain truth exists, DB missing — ignore in Phase 4C
        return

    exists = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == new_hash
    ).first()

    if exists:
        return

    # -----------------------------
    # Geometry + area are inherited
    # -----------------------------
    db.add(PropertyRecord(
        record_hash=new_hash,
        canonical_hash=new_hash,        
        format="CANONICAL",             
        owner_address=new_owner,
        cid=old.cid,
        canonical_json=old.canonical_json,
        geom=old.geom,
        area_m2=old.area_m2,
        parent_record=old_hash,
        created_at=datetime.fromtimestamp(timestamp, tz=timezone.utc),
    ))

    db.commit()


# --------------------------------------------------
# 🔄 FULL SYNC FROM CHAIN (PHASE 4C)
# --------------------------------------------------
START_BLOCK = settings.DEPLOYMENT_BLOCK
STEP = 1
MAX_BLOCKS = 2000

def sync_from_chain():
    print("🔄 Syncing Registry from blockchain...")

    if contract is None:
        print("❌ Contract not initialized")
        return

    chain_latest = w3.eth.block_number
    latest = min(chain_latest, START_BLOCK + MAX_BLOCKS - 1)

    print(f"🔍 Sync range: {START_BLOCK} → {latest}")

    # Event ABIs
    created_event_abi = contract.events.RecordCreated._get_event_abi()
    transferred_event_abi = contract.events.RecordTransferred._get_event_abi()

    created_topic = Web3.keccak(
    text="RecordCreated(bytes32,address,string,uint256,address)"
    ).hex()

    transferred_topic = Web3.keccak(
    text="RecordTransferred(bytes32,bytes32,address,address,uint256,address)"
    ).hex()

    db: Session = SessionLocal()

    try:
        for block_number in range(START_BLOCK, latest + 1):
            print(f"📦 Fetching block {block_number}")

            try:
                logs = w3.eth.get_logs({
                    "fromBlock": block_number,
                    "toBlock": block_number,
                    "address": contract.address,
                    "topics": [[created_topic, transferred_topic]],
                })

                for log in logs:
                    if log["topics"][0].hex() == created_topic:
                        event = get_event_data(w3.codec, created_event_abi, log)
                        handle_record_created(event, db)

                    elif log["topics"][0].hex() == transferred_topic:
                        event = get_event_data(w3.codec, transferred_event_abi, log)
                        handle_record_transferred(event, db)

                db.commit()

            except Exception as e:
                db.rollback()
                print(f"⚠️ Block {block_number} failed, retrying... {e}")
                time.sleep(1)

    finally:
        db.close()

    print("✅ Registry sync complete (limited range)")
