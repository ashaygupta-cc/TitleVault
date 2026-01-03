#!/usr/bin/env python
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import PropertyRecord
from config import settings

# Create DB connection
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Get the first PropertyRecord
record = session.query(PropertyRecord).first()

if record:
    print(f"Record Hash: {record.record_hash.hex()}")
    print(f"Owner: {record.owner_address}")
    print(f"Format: {record.format}")
    print(f"Canonical JSON type: {type(record.canonical_json)}")
    print(f"Canonical JSON: {json.dumps(record.canonical_json, indent=2, default=str)}")
else:
    print("No records found")

session.close()
