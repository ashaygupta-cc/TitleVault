# Recovery & Synchronization Guidelines

## Phase 4A: Cold Database Recovery

### Blockchain as Source of Truth
- The blockchain is the authoritative source for all registry data
- Database serves as a performance cache, not primary storage
- All database state must be recoverable from blockchain events

### Deterministic Recovery Process
1. **Event Log Scanning**: Scan all contract events from genesis block
2. **Canonical Reconstruction**: Rebuild records using deterministic JSON canonicalization
3. **IPFS Content Retrieval**: Fetch and validate content from IPFS hashes
4. **Idempotent Replay**: Ensure replay produces identical results regardless of execution count

### Recovery Implementation
- Use Web3.py event filters to scan historical logs
- Process events in chronological order (block number, transaction index, log index)
- Validate each record's canonical hash matches on-chain data
- Handle network failures gracefully with resumable recovery

### Data Integrity Checks
- Verify IPFS content matches expected hashes
- Validate parent-child lineage consistency
- Ensure ownership transfer chains are complete
- Cross-reference on-chain hashes with reconstructed canonical data

## Phase 4B: Live WebSocket Synchronization

### Event-Driven Architecture
- Use WebSocket connections for real-time blockchain monitoring
- Subscribe to contract events for immediate database updates
- No polling - purely event-driven synchronization

### Restart-Safe Synchronization
- Track last processed block number in database
- Resume from last known state on restart
- Handle connection drops and reconnection gracefully
- Prevent duplicate event processing

### Real-Time Update Flow
1. **Event Reception**: Receive contract event via WebSocket
2. **Validation**: Verify event authenticity and structure
3. **IPFS Retrieval**: Fetch content if new IPFS hash detected
4. **Database Update**: Apply changes to local database
5. **Consistency Check**: Verify database state matches blockchain

### Error Handling & Resilience
- Implement exponential backoff for failed connections
- Queue events during temporary disconnections
- Validate event ordering and handle reorgs
- Fallback to recovery mode if synchronization fails

## Implementation Patterns

### Event Processing
```python
# Pseudocode for event handling
async def handle_registry_event(event):
    # Validate event structure
    if not validate_event(event):
        log_error("Invalid event received")
        return
    
    # Fetch IPFS content if needed
    if event.ipfs_hash:
        content = await fetch_ipfs_content(event.ipfs_hash)
        validate_content_hash(content, event.canonical_hash)
    
    # Update database atomically
    with database.transaction():
        update_registry_record(event)
        update_last_processed_block(event.block_number)
```

### Recovery Process
```python
# Pseudocode for database recovery
def recover_database_from_blockchain():
    last_block = get_last_processed_block() or 0
    latest_block = web3.eth.block_number
    
    for block_num in range(last_block + 1, latest_block + 1):
        events = get_contract_events(block_num)
        for event in sorted(events, key=lambda e: (e.tx_index, e.log_index)):
            process_event_for_recovery(event)
        
        update_last_processed_block(block_num)
```

## Monitoring & Observability
- Log all synchronization events with timestamps
- Monitor WebSocket connection health
- Track recovery progress and performance metrics
- Alert on synchronization failures or inconsistencies