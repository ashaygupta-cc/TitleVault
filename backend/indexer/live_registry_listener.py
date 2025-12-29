import asyncio
from sqlalchemy.orm import Session
from web3_ws import w3_ws
from web3_client import contract
from models import SessionLocal
from indexer.registry_indexer import (
    handle_record_created,
    handle_record_transferred,
)

async def listen_registry_events():
    print("📡 Listening to Registry events (live)...")

    while True:
        try:
            created_filter = contract.events.RecordCreated.create_filter(
                fromBlock="latest"
            )

            transferred_filter = contract.events.RecordTransferred.create_filter(
                fromBlock="latest"
            )

            while True:
                db: Session = SessionLocal()

                for event in created_filter.get_new_entries():
                    handle_record_created(event, db)

                for event in transferred_filter.get_new_entries():
                    handle_record_transferred(event, db)

                db.close()
                await asyncio.sleep(2)

        except Exception as e:
            print("⚠️ Live listener error, recreating filters:", e)
            await asyncio.sleep(5)
