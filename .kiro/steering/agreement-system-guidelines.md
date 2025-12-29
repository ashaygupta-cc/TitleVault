# Agreement System & Subject Binding Guidelines

## Phase 9: Agreement System & Subject Binding Layer

### Agreements as First-Class Legal Instruments
- Treat agreements as primary legal entities with full blockchain backing
- Support multiple agreement types (lease, sale, mortgage, easement, etc.)
- Implement comprehensive agreement metadata and content management
- Provide legal template system for standardized agreement creation
- Enable custom agreement terms and conditions with validation

### Agreement Data Model
```python
# Core agreement entity structure
class Agreement:
    agreement_hash: str          # Canonical hash identifier
    agreement_type: str          # lease, sale, mortgage, easement, etc.
    status: AgreementStatus      # ACTIVE, COMPLETED, TERMINATED
    subject_hash: str            # Registry subject (land/building/flat)
    parties: List[Party]         # All agreement parties
    terms: Dict                  # Agreement terms and conditions
    effective_date: datetime     # When agreement becomes active
    expiration_date: datetime    # When agreement expires (if applicable)
    created_at: datetime         # Creation timestamp
    updated_at: datetime         # Last modification timestamp
    parent_agreement: str        # Parent agreement hash (if applicable)
    canonical_content: str       # Canonical agreement content
    ipfs_hash: str              # IPFS content hash
    blockchain_tx: str          # Blockchain transaction hash

class AgreementStatus(Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"

class Party:
    party_id: str               # Unique party identifier
    party_type: str             # individual, corporation, government, etc.
    role: str                   # lessor, lessee, buyer, seller, etc.
    address: str                # Ethereum address
    legal_name: str             # Legal entity name
    contact_info: Dict          # Contact information
```

### Subject Binding to Registry Entities
- Bind agreements to specific registry subjects (land parcels, buildings, flats)
- Support hierarchical binding (agreement on parent applies to children)
- Validate subject ownership and authority for agreement creation
- Track agreement history and lineage for each subject
- Enable subject-based agreement queries and reporting

### Subject Binding Implementation
```python
# Subject binding and validation
def bind_agreement_to_subject(agreement_hash, subject_hash, binding_type="direct"):
    """Bind agreement to registry subject with validation"""
    
    # Validate subject exists and is accessible
    subject = get_registry_subject(subject_hash)
    if not subject:
        raise ValueError(f"Subject {subject_hash} not found")
    
    # Validate binding authority
    agreement = get_agreement(agreement_hash)
    if not validate_binding_authority(agreement, subject):
        raise ValueError("Insufficient authority to bind agreement to subject")
    
    # Create binding record
    binding = SubjectBinding(
        agreement_hash=agreement_hash,
        subject_hash=subject_hash,
        binding_type=binding_type,
        created_at=datetime.utcnow(),
        created_by=get_current_user()
    )
    
    # Validate no conflicting agreements
    conflicts = check_agreement_conflicts(subject_hash, agreement)
    if conflicts:
        raise ValueError(f"Agreement conflicts detected: {conflicts}")
    
    return create_subject_binding(binding)

def get_subject_agreements(subject_hash, status_filter=None):
    """Get all agreements bound to a subject"""
    bindings = get_subject_bindings(subject_hash)
    agreements = []
    
    for binding in bindings:
        agreement = get_agreement(binding.agreement_hash)
        if status_filter is None or agreement.status == status_filter:
            agreements.append({
                'agreement': agreement,
                'binding': binding,
                'binding_type': binding.binding_type
            })
    
    return agreements
```

### Agreement Lifecycle Management
- Implement comprehensive state machine for agreement lifecycle
- Support automatic state transitions based on dates and conditions
- Enable manual state changes with proper authorization
- Track all state changes with audit trails
- Provide lifecycle event notifications and webhooks

### Agreement Lifecycle State Machine
```python
# Agreement lifecycle management
class AgreementLifecycle:
    
    VALID_TRANSITIONS = {
        'PENDING': ['ACTIVE', 'TERMINATED'],
        'ACTIVE': ['COMPLETED', 'TERMINATED', 'SUSPENDED'],
        'SUSPENDED': ['ACTIVE', 'TERMINATED'],
        'COMPLETED': [],  # Terminal state
        'TERMINATED': []  # Terminal state
    }
    
    def transition_agreement_status(self, agreement_hash, new_status, reason=None):
        """Transition agreement to new status with validation"""
        
        agreement = get_agreement(agreement_hash)
        current_status = agreement.status
        
        # Validate transition is allowed
        if new_status not in self.VALID_TRANSITIONS.get(current_status, []):
            raise ValueError(f"Invalid transition from {current_status} to {new_status}")
        
        # Validate authorization
        if not self.validate_transition_authority(agreement, new_status):
            raise ValueError("Insufficient authority for status transition")
        
        # Perform transition
        old_status = agreement.status
        agreement.status = new_status
        agreement.updated_at = datetime.utcnow()
        
        # Create audit record
        audit_record = AgreementAudit(
            agreement_hash=agreement_hash,
            action='status_change',
            old_value=old_status,
            new_value=new_status,
            reason=reason,
            timestamp=datetime.utcnow(),
            user=get_current_user()
        )
        
        # Update agreement and create audit trail
        update_agreement(agreement)
        create_audit_record(audit_record)
        
        # Trigger lifecycle events
        self.trigger_lifecycle_event(agreement, old_status, new_status)
        
        return agreement
    
    def check_automatic_transitions(self):
        """Check for agreements that should automatically transition"""
        current_time = datetime.utcnow()
        
        # Check for agreements that should become active
        pending_agreements = get_agreements_by_status('PENDING')
        for agreement in pending_agreements:
            if agreement.effective_date <= current_time:
                self.transition_agreement_status(
                    agreement.agreement_hash, 
                    'ACTIVE', 
                    'Automatic activation on effective date'
                )
        
        # Check for agreements that should expire
        active_agreements = get_agreements_by_status('ACTIVE')
        for agreement in active_agreements:
            if agreement.expiration_date and agreement.expiration_date <= current_time:
                self.transition_agreement_status(
                    agreement.agreement_hash, 
                    'COMPLETED', 
                    'Automatic completion on expiration date'
                )
```

### Canonical Agreement Hashing & Merkle Anchoring
- Implement deterministic canonical hashing for agreements
- Include agreement content, parties, terms, and metadata in hash
- Integrate agreements into existing Merkle tree infrastructure
- Support agreement-specific Merkle proofs and verification
- Enable historical agreement state reconstruction

### Canonical Agreement Hashing
```python
# Canonical agreement hashing
def generate_canonical_agreement_hash(agreement):
    """Generate deterministic canonical hash for agreement"""
    
    # Create canonical representation
    canonical_data = {
        'agreement_type': agreement.agreement_type,
        'subject_hash': agreement.subject_hash,
        'parties': sorted([
            {
                'party_id': party.party_id,
                'role': party.role,
                'address': party.address.lower(),
                'legal_name': party.legal_name
            }
            for party in agreement.parties
        ], key=lambda x: x['party_id']),
        'terms': canonicalize_terms(agreement.terms),
        'effective_date': agreement.effective_date.isoformat(),
        'expiration_date': agreement.expiration_date.isoformat() if agreement.expiration_date else None,
        'content_hash': agreement.ipfs_hash
    }
    
    # Generate canonical JSON
    canonical_json = json.dumps(canonical_data, sort_keys=True, separators=(',', ':'))
    
    # Generate keccak256 hash
    canonical_hash = Web3.keccak(text=canonical_json).hex()
    
    return canonical_hash

def canonicalize_terms(terms):
    """Canonicalize agreement terms for consistent hashing"""
    if isinstance(terms, dict):
        return {k: canonicalize_terms(v) for k, v in sorted(terms.items())}
    elif isinstance(terms, list):
        return [canonicalize_terms(item) for item in terms]
    elif isinstance(terms, (int, float, str, bool, type(None))):
        return terms
    else:
        return str(terms)

def integrate_agreement_into_merkle_tree(agreement_hash):
    """Integrate agreement into Merkle tree infrastructure"""
    
    # Get current Merkle tree state
    current_tree = get_current_merkle_tree()
    
    # Add agreement hash as new leaf
    updated_tree = current_tree.add_leaf(agreement_hash)
    
    # Generate new root hash
    new_root = updated_tree.get_root()
    
    # Create Merkle snapshot
    snapshot = MerkleSnapshot(
        root_hash=new_root,
        leaf_hashes=updated_tree.get_leaves(),
        agreement_hashes=[agreement_hash],
        created_at=datetime.utcnow()
    )
    
    return snapshot
```

### Agreement-Specific Affidavits, PDFs & QR Payloads
- Generate legal affidavits specifically for agreements
- Create comprehensive PDF documents with agreement details
- Include agreement verification in QR code payloads
- Support agreement-specific legal language and formatting
- Enable bulk agreement verification and reporting

### Agreement Affidavit Generation
```python
# Agreement-specific affidavit generation
def generate_agreement_affidavit(agreement_hash):
    """Generate legal affidavit for agreement"""
    
    agreement = get_agreement(agreement_hash)
    subject = get_registry_subject(agreement.subject_hash)
    
    # Generate Merkle proof for agreement
    merkle_proof = generate_agreement_merkle_proof(agreement_hash)
    
    # Collect blockchain evidence
    blockchain_evidence = get_agreement_blockchain_evidence(agreement_hash)
    
    # Generate affidavit data
    affidavit_data = {
        'schema_version': '2.1',
        'document_type': 'agreement_affidavit',
        'chain_id': get_chain_id(),
        'agreement_data': {
            'agreement_hash': agreement_hash,
            'canonical_hash': agreement.canonical_hash,
            'agreement_type': agreement.agreement_type,
            'status': agreement.status,
            'parties': [party.to_dict() for party in agreement.parties],
            'subject_hash': agreement.subject_hash,
            'effective_date': agreement.effective_date.isoformat(),
            'expiration_date': agreement.expiration_date.isoformat() if agreement.expiration_date else None
        },
        'subject_data': {
            'subject_hash': subject.hash,
            'subject_type': subject.type,
            'geometry': subject.geometry,
            'owner': subject.owner
        },
        'cryptographic_proofs': {
            'merkle_proof': merkle_proof,
            'blockchain_evidence': blockchain_evidence
        },
        'legal_declarations': generate_agreement_legal_declarations(agreement),
        'verification_data': {
            'qr_payload': generate_agreement_qr_payload(agreement_hash),
            'verification_url': f"https://verify.titlevault.com/agreement/{agreement_hash}"
        }
    }
    
    return affidavit_data

def generate_agreement_pdf(agreement_hash):
    """Generate comprehensive PDF for agreement"""
    
    affidavit_data = generate_agreement_affidavit(agreement_hash)
    
    pdf_sections = [
        # Page 1: Agreement Summary & Legal Header
        {
            'type': 'agreement_header',
            'content': generate_agreement_header(affidavit_data)
        },
        
        # Page 2: Agreement Details & Parties
        {
            'type': 'agreement_details',
            'content': generate_agreement_details(affidavit_data)
        },
        
        # Page 3: Subject Information & Spatial Data
        {
            'type': 'subject_information',
            'content': generate_subject_information(affidavit_data)
        },
        
        # Page 4: Cryptographic Evidence & Verification
        {
            'type': 'crypto_evidence',
            'content': generate_crypto_evidence(affidavit_data)
        },
        
        # Page 5: Legal Declarations & Signatures
        {
            'type': 'legal_declarations',
            'content': generate_legal_declarations(affidavit_data)
        }
    ]
    
    return render_multi_page_pdf(pdf_sections)

def generate_agreement_qr_payload(agreement_hash):
    """Generate QR payload for agreement verification"""
    
    agreement = get_agreement(agreement_hash)
    merkle_proof = generate_agreement_merkle_proof(agreement_hash)
    
    qr_payload = {
        'version': '2.1',
        'type': 'agreement',
        'chain_id': get_chain_id(),
        'agreement_hash': agreement_hash,
        'canonical_hash': agreement.canonical_hash,
        'agreement_type': agreement.agreement_type,
        'status': agreement.status,
        'subject_hash': agreement.subject_hash,
        'merkle_proof': {
            'root': merkle_proof['root'],
            'path': merkle_proof['path'],
            'leaf_index': merkle_proof['leaf_index']
        },
        'blockchain_anchor': {
            'tx_hash': agreement.blockchain_tx,
            'block_number': get_transaction_block_number(agreement.blockchain_tx)
        },
        'verification_urls': {
            'primary': f"https://verify.titlevault.com/agreement/{agreement_hash}",
            'backup': f"https://backup-verify.titlevault.com/agreement/{agreement_hash}"
        },
        'checksum': generate_payload_checksum(),
        'generated_at': int(datetime.utcnow().timestamp())
    }
    
    return encode_qr_payload(qr_payload)
```

## Agreement API Endpoints

### Core Agreement Management
```python
# Agreement management endpoints
POST /agreements                           # Create new agreement
GET /agreements/{agreement_hash}           # Get agreement details
PUT /agreements/{agreement_hash}           # Update agreement
DELETE /agreements/{agreement_hash}        # Terminate agreement

# Agreement lifecycle management
POST /agreements/{agreement_hash}/activate    # Activate pending agreement
POST /agreements/{agreement_hash}/complete    # Complete active agreement
POST /agreements/{agreement_hash}/terminate   # Terminate agreement
POST /agreements/{agreement_hash}/suspend     # Suspend active agreement

# Subject binding management
POST /agreements/{agreement_hash}/bind        # Bind agreement to subject
GET /subjects/{subject_hash}/agreements      # Get subject agreements
DELETE /agreements/{agreement_hash}/unbind    # Remove subject binding

# Agreement verification and affidavits
GET /agreements/{agreement_hash}/verify       # Verify agreement
GET /agreements/{agreement_hash}/affidavit    # Generate affidavit
GET /agreements/{agreement_hash}/pdf          # Generate PDF
GET /agreements/{agreement_hash}/qr           # Generate QR code
```

### Agreement Search and Reporting
```python
# Agreement search and reporting endpoints
GET /agreements                            # List agreements with filters
GET /agreements/search                     # Advanced agreement search
GET /agreements/by-party/{party_id}        # Agreements by party
GET /agreements/by-subject/{subject_hash}  # Agreements by subject
GET /agreements/by-type/{agreement_type}   # Agreements by type
GET /agreements/by-status/{status}         # Agreements by status

# Agreement analytics and reporting
GET /agreements/analytics/summary          # Agreement summary statistics
GET /agreements/analytics/by-type          # Analytics by agreement type
GET /agreements/analytics/lifecycle        # Lifecycle analytics
GET /agreements/reports/compliance         # Compliance reporting
```

## Implementation Guidelines

### Data Integrity & Consistency
- Ensure agreement data consistency across all operations
- Implement comprehensive validation for all agreement fields
- Maintain referential integrity between agreements and subjects
- Provide atomic operations for complex agreement transactions
- Support agreement versioning and historical tracking

### Legal Compliance & Standards
- Implement jurisdiction-specific legal requirements
- Support multiple legal template systems
- Ensure compliance with contract law principles
- Provide audit trails for all legal operations
- Enable legal review and approval workflows

### Performance & Scalability
- Optimize agreement queries with proper indexing
- Implement caching for frequently accessed agreements
- Support bulk agreement operations
- Provide efficient agreement search and filtering
- Scale agreement storage and retrieval systems

### Security & Authorization
- Implement role-based access control for agreements
- Ensure secure agreement creation and modification
- Protect sensitive agreement data and terms
- Audit all agreement access and modifications
- Support multi-signature agreement authorization

### Integration & Interoperability
- Provide comprehensive API for agreement management
- Support standard legal document formats
- Enable integration with external legal systems
- Provide webhook notifications for agreement events
- Support bulk import/export of agreement data