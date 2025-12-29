# Development Guidelines

## Code Organization

### Backend Structure
- **Models**: Database models in `backend/models.py`
- **Routes**: API endpoints organized in `backend/routes/`
- **Schemas**: Pydantic schemas in `backend/schemas/`
- **Utils**: Helper functions in `backend/utils/`
- **Migrations**: Alembic database migrations in `backend/migrations/`

### Smart Contract Structure
- **Contracts**: Solidity files in `hardhat/contracts/`
- **Tests**: Contract tests in `hardhat/test/`
- **Scripts**: Deployment scripts in `hardhat/scripts/`

## Development Principles

### Immutability & Lineage
- Records are never mutated, only new versions created
- Parent-child relationships maintain historical lineage
- All changes create new records with `parent_record` references

### Canonical Hashing
- Use deterministic JSON canonicalization for consistent hashing
- Implement canonical record structure across all components
- Ensure hash consistency between on-chain, database, and IPFS

### API Design
- RESTful endpoints following `/registry/{action}` pattern
- Consistent error handling and response formats
- Proper HTTP status codes and error messages

### Blockchain Integration
- Use Web3.py for Ethereum interactions
- Implement proper gas estimation and transaction handling
- Maintain consistency between on-chain and off-chain data
- Event-driven synchronization with blockchain state
- Deterministic database recovery from blockchain logs

### Data Recovery & Synchronization
- Blockchain as single source of truth
- Idempotent event replay for database reconstruction
- WebSocket-based real-time event monitoring
- Restart-safe synchronization mechanisms

## Testing Strategy
- Unit tests for individual components
- Integration tests for API endpoints
- Contract tests using Hardhat framework
- End-to-end tests for complete workflows

## Security Considerations
- Validate all inputs at API boundaries
- Implement proper authentication and authorization
- Secure private key management
- Rate limiting and DOS protection