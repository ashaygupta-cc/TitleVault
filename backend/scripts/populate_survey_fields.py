#!/usr/bin/env python
"""
Populate survey_number and owner_name fields from canonical_json metadata
for all PropertyRecords that have them empty.
"""
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import PropertyRecord
from config import settings

# Create DB connection
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Query all records where survey_number or owner_name is NULL
records = session.query(PropertyRecord).filter(
    (PropertyRecord.survey_number.is_(None)) | (PropertyRecord.owner_name.is_(None))
).all()

print(f"Found {len(records)} records to update")

updated_count = 0

for record in records:
    try:
        # Parse canonical_json
        if record.canonical_json:
            data = json.loads(record.canonical_json)
            metadata = data.get("metadata", {})
            
            # Extract survey_number if not set
            if not record.survey_number and metadata:
                survey_number = metadata.get("surveyNo") or metadata.get("survey_no")
                if survey_number:
                    record.survey_number = survey_number
                    print(f"✓ Set survey_number='{survey_number}' for {record.record_hash.hex()[:16]}...")
            
            # Extract owner_name if not set
            if not record.owner_name and metadata:
                owner_name = metadata.get("ownerName") or metadata.get("owner_name")
                if owner_name:
                    record.owner_name = owner_name
                    print(f"✓ Set owner_name='{owner_name}' for {record.record_hash.hex()[:16]}...")
            
            updated_count += 1
    except Exception as e:
        print(f"✗ Error processing record {record.record_hash.hex()[:16]}...: {e}")

# Commit all changes
session.commit()
print(f"\n✅ Updated {updated_count} records")
session.close()
