import asyncio
from sqlalchemy.orm import Session
from web3 import Web3
from web3._utils.events import get_event_data

from web3_client import contract, w3
from models import SessionLocal
from indexer.registry_indexer import (
    handle_record_created,
    handle_record_transferred,
)

# Precompute event ABI + topics
created_event_abi = contract.events.RecordCreated._get_event_abi()
transferred_event_abi = contract.events.RecordTransferred._get_event_abi()

CREATED_TOPIC = Web3.keccak(
    text="RecordCreated(bytes32,address,string,uint256)"
).hex()

TRANSFERRED_TOPIC = Web3.keccak(
    text="RecordTransferred(bytes32,bytes32,address,uint256)"
).hex()


async def listen_registry_events():
    print("📡 Listening to Registry events (live)...")

    last_block = w3.eth.block_number

    while True:
        try:
            latest = w3.eth.block_number

            if latest > last_block:
                for block_number in range(last_block + 1, latest + 1):
                    logs = w3.eth.get_logs({
                        "fromBlock": block_number,
                        "toBlock": block_number,
                        "address": contract.address,
                        "topics": [[CREATED_TOPIC, TRANSFERRED_TOPIC]],
                    })

                    db: Session = SessionLocal()

                    for log in logs:
                        if log["topics"][0].hex() == CREATED_TOPIC:
                            event = get_event_data(
                                w3.codec, created_event_abi, log
                            )
                            handle_record_created(event, db)

                        elif log["topics"][0].hex() == TRANSFERRED_TOPIC:
                            event = get_event_data(
                                w3.codec, transferred_event_abi, log
                            )
                            handle_record_transferred(event, db)

                    db.commit()
                    db.close()

                last_block = latest

            await asyncio.sleep(2)

        except Exception as e:
            print("⚠️ Live listener error, retrying:", e)
            await asyncio.sleep(5)
