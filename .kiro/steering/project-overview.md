# Title Vault Project Overview

## Project Description
Title Vault is a blockchain-backed registry system for immutable record management with IPFS content addressing and ownership transfer capabilities.

## Current Development Phases

### Phase 1–3: Core Registry Foundation (Contract, APIs & Public Verification)

#### Phase 1 — Smart Contract & Canonical Schema
- RegistryResolver smart contract
- Immutable on-chain record primitives
- Canonical record structure & hashing
- Parent-child lineage support

#### Phase 2A — Record Creation & Registry Enumeration
- `/registry/create` endpoint
- `/registry/list` endpoint
- Deterministic canonical JSON generation
- IPFS-backed content addressing

#### Phase 2B — Ownership Transfer & Immutability Semantics
- `/registry/transfer` endpoint
- Ownership changes as new records (no mutation)
- Immutable historical lineage via parent_record

#### Phase 3 — Public Blockchain Deployment & Verification
- Deployment to Ethereum Sepolia (Hardhat → public chain)
- Registrar-based verification trust model
- `/registry/verify/{record_hash}` endpoint
- On-chain ↔ DB ↔ IPFS consistency checks

**Status**: This commit establishes the complete blockchain-backed registry foundation.

## Architecture Components
- **Smart Contracts**: Solidity contracts for on-chain registry
- **Backend API**: Python Flask application with database models
- **IPFS Integration**: Content addressing and storage
- **Web3 Integration**: Blockchain interaction layer
- **Database**: PostgreSQL with Alembic migrations