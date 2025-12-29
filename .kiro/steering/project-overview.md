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

**Status**: Complete blockchain-backed registry foundation established.

### Phase 4A–4B: Blockchain-First Recovery & Live Synchronization

#### Phase 4A — Cold Database Recovery from Blockchain

- Deterministic DB rebuild from on-chain logs
- IPFS-backed canonical reconstruction
- Idempotent event replay
- Chain as sole source of truth

#### Phase 4B — Live WebSocket Synchronization

- Event-driven updates (no polling)
- Restart-safe synchronization
- Immediate DB propagation from on-chain events

**Status**: This phase guarantees recoverability, determinism, and real-time correctness.

### Phase 4C: Canonicalization & Legacy Record Migration Hardening

- Deterministic canonical JSON enforcement
- Canonical keccak256 hash backfilling
- Legacy record upgrade without chain mutation
- Merkle compatibility guarantees
- Audit-safe historical continuity
- Rate limiting infrastructure prepared but not enforced

**Status**: Phase 4C implemented to harden canonicalization and legacy migration.

### Phase 5–6: Merkle Anchoring, Affidavits & Cryptographic Verification

#### Phase 5 — Merkle Rooting & On-Chain Anchoring
- Deterministic Merkle tree construction
- Snapshot anchoring on Ethereum
- Inclusion proof generation

#### Phase 6 — Affidavit & Verification Infrastructure
- Court-grade affidavit generation
- PDF rendering with QR verification
- End-to-end cryptographic verification pipeline

**Status**: This phase establishes cryptographic proof infrastructure for legal and audit compliance.

## Architecture Components

- **Smart Contracts**: Solidity contracts for on-chain registry
- **Backend API**: Python Flask application with database models
- **IPFS Integration**: Content addressing and storage
- **Web3 Integration**: Blockchain interaction layer
- **Database**: PostgreSQL with Alembic migrations
