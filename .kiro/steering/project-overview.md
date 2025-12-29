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

### Phase 7: Registry Transparency, Public Verifiability & Institutional Readiness
- Public record inspection APIs
- Canonical geometry exposure & bounding box computation
- Subdivision transparency & child aggregation
- Registry history & lineage inspection
- Affidavit generation & legal-grade PDF rendering
- QR-based offline verification payloads
- Merkle proof & anchoring verification endpoints
- Separation of affidavit routes & schemas
- Institutional-readiness & audit transparency hardening

**Status**: This phase establishes complete public transparency and institutional-grade verification capabilities.

### Phase 8: Spatial Closure, Subdivision Finalization & Evidence Completion
- GIS appendix & parcel audit enforcement APIs
- Spatial conservation verification (≥99% area rule)
- Subdivision validity & Merkle closure verification routes
- Map-ready parcel geometry & bounding box endpoints
- Subdivision-aware Merkle inspection utilities
- Affidavit schema finalization (schema version + chain ID)
- Court-grade PDF affidavit updates with GIS audit section
- Offline-verifiable QR payload standardization
- Registry list safety & summary hardening
- Verification pipeline fixes & null-safe enforcement

**Status**: This phase completes spatial integrity enforcement and evidence finalization for production readiness.

### Phase 9: Agreement System & Subject Binding Layer
- Introduce agreements as first-class legal instruments
- Bind agreements to registry subjects (land/building/flat)
- Enforce agreement lifecycle (ACTIVE / COMPLETED / TERMINATED)
- Canonical agreement hashing & Merkle anchoring
- Agreement-specific affidavits, PDFs & QR payloads

**Status**: This phase establishes comprehensive legal agreement management with blockchain-backed integrity.

### Phase 10: Flat & Building Ownership Resolution Layer
- Register buildings under land parcels
- Register flats under buildings
- Deterministic vertical ownership resolution
- Flat-level agreement linkage
- Conditional affidavit & PDF generation (ACTIVE agreements only)
- Legal enforcement of vertical property hierarchy

**Status**: This phase completes vertical property ownership resolution with hierarchical legal enforcement.

### Phase 11: Explorer, Discovery & Transparency Layer
- Public registry explorer endpoints
- Unified subject inspection (land / building / flat)
- Agreement visibility with filters
- Transparency without privileged access

**Status**: This phase establishes complete public transparency and discovery capabilities for all registry entities.

### Phase 12: Verification, Fraud Detection & Audit Defense Layer
- Court-safe verification endpoints
- Canonical hash & Merkle inclusion verification
- Fraud detection primitives
- Explicit failure reasons for audits
- Removal of legacy Merkle routes & schemas

**Status**: This phase establishes comprehensive fraud detection and court-safe verification capabilities.

### Phase 13: GIS, Spatial Enforcement & Heatmap Analytics Layer
- GIS appendix & parcel audit endpoints
- Spatial conservation enforcement
- Area consistency & drift detection
- Ownership, subdivision & agreement heatmaps
- Court-auditable GIS outputs

**Status**: This phase completes advanced GIS analytics and spatial enforcement for comprehensive geographic intelligence.

### Phase 14: Court Bundles, Evidence Packaging & Judicial Verification
- Subject-level court evidence bundle APIs
- Canonical JSON, affidavits & PDF aggregation
- Integrated Merkle proofs and GIS appendices
- Court-safe verification endpoints
- Judge-verifiable, registry-independent evidence outputs

**Status**: This phase establishes comprehensive court evidence packaging with judicial verification capabilities.

## Architecture Components

- **Smart Contracts**: Solidity contracts for on-chain registry
- **Backend API**: Python Flask application with database models
- **IPFS Integration**: Content addressing and storage
- **Web3 Integration**: Blockchain interaction layer
- **Database**: PostgreSQL with Alembic migrations
