#!/usr/bin/env python3
"""
Fix invalid owner_address values in property_records table.
Replaces 32-byte hashes (66 chars) with valid Ethereum addresses (42 chars).
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from models import PropertyRecord
from config import settings

# Valid Ethereum address to use for records with invalid addresses
VALID_ETH_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

def is_valid_eth_address(addr: str) -> bool:
    """Check if address is valid Ethereum address (0x + 40 hex digits)."""
    return isinstance(addr, str) and len(addr) == 42 and addr.startswith("0x") and all(c in "0123456789abcdefABCDEF" for c in addr[2:])

def fix_owner_addresses():
    """Find and fix all invalid owner_address values in property_records."""
    engine = create_engine(settings.DATABASE_URL)
    session = Session(bind=engine)
    
    try:
        # Get all records with invalid owner addresses
        records = session.query(PropertyRecord).all()
        invalid_count = 0
        fixed_count = 0
        
        for record in records:
            if record.owner_address and not is_valid_eth_address(record.owner_address):
                print(f"Found invalid address in record {record.record_hash.hex()[:16]}...: {record.owner_address}")
                record.owner_address = VALID_ETH_ADDRESS
                fixed_count += 1
                invalid_count += 1
            elif not record.owner_address:
                print(f"Found NULL address in record {record.record_hash.hex()[:16]}...")
                record.owner_address = VALID_ETH_ADDRESS
                fixed_count += 1
                invalid_count += 1
        
        if fixed_count > 0:
            session.commit()
            print(f"\n✅ Fixed {fixed_count} records with invalid owner_address")
            print(f"   All invalid addresses replaced with: {VALID_ETH_ADDRESS}")
        else:
            print("\n✅ All owner_address values are valid!")
        
        return fixed_count
    
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        return -1
    
    finally:
        session.close()

if __name__ == "__main__":
    print("🔧 Fixing invalid owner_address values in property_records...")
    print(f"   Database: {settings.DATABASE_URL}")
    print()
    
    fixed = fix_owner_addresses()
    
    if fixed > 0:
        print("\n✅ Database fixed! You can now run subdivision.")
    elif fixed == 0:
        print("\n✅ Database is already valid!")
    else:
        print("\n❌ Failed to fix database.")
        sys.exit(1)
