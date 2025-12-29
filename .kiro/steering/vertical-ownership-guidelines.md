# Vertical Property Ownership Resolution Guidelines

## Phase 10: Flat & Building Ownership Resolution Layer

### Hierarchical Property Registration System
- Establish three-tier property hierarchy: Land → Building → Flat
- Enforce strict parent-child relationships in vertical ownership
- Support multiple buildings per land parcel
- Support multiple flats per building
- Maintain referential integrity across all hierarchy levels

### Property Hierarchy Data Model
```python
# Enhanced property hierarchy entities
class PropertyType(Enum):
    LAND = "LAND"
    BUILDING = "BUILDING" 
    FLAT = "FLAT"

class PropertyEntity:
    entity_hash: str             # Canonical hash identifier
    entity_type: PropertyType    # LAND, BUILDING, or FLAT
    parent_hash: str             # Parent entity hash (null for land)
    owner_address: str           # Current owner Ethereum address
    geometry: Dict               # Spatial geometry data
    metadata: Dict               # Entity-specific metadata
    created_at: datetime         # Creation timestamp
    updated_at: datetime         # Last modification timestamp
    blockchain_tx: str           # Blockchain transaction hash
    canonical_hash: str          # Canonical content hash
    ipfs_hash: str              # IPFS content hash

class LandParcel(PropertyEntity):
    entity_type = PropertyType.LAND
    parcel_id: str              # Unique parcel identifier
    legal_description: str      # Legal land description
    area_sqm: float            # Total land area
    zoning: str                # Zoning classification
    jurisdiction: str          # Legal jurisdiction

class Building(PropertyEntity):
    entity_type = PropertyType.BUILDING
    building_id: str           # Unique building identifier
    land_parcel_hash: str      # Parent land parcel hash
    building_type: str         # residential, commercial, mixed, etc.
    floors: int                # Number of floors
    total_units: int           # Total number of units/flats
    construction_year: int     # Year of construction
    building_area_sqm: float   # Total building footprint area

class Flat(PropertyEntity):
    entity_type = PropertyType.FLAT
    flat_id: str               # Unique flat identifier
    building_hash: str         # Parent building hash
    floor_number: int          # Floor number
    unit_number: str           # Unit/apartment number
    flat_area_sqm: float       # Flat area in square meters
    bedrooms: int              # Number of bedrooms
    bathrooms: int             # Number of bathrooms
    balcony_area_sqm: float    # Balcony area (if applicable)
```

### Building Registration Under Land Parcels
- Validate building registration authority and ownership
- Ensure building geometry falls within parent land parcel
- Support multiple buildings on single land parcel
- Maintain building-to-land spatial relationships
- Track building ownership inheritance from land

### Building Registration Implementation
```python
# Building registration under land parcels
def register_building_under_land(building_data, land_parcel_hash):
    """Register building under parent land parcel with validation"""
    
    # Validate parent land parcel exists and is accessible
    land_parcel = get_property_entity(land_parcel_hash)
    if not land_parcel or land_parcel.entity_type != PropertyType.LAND:
        raise ValueError(f"Invalid land parcel: {land_parcel_hash}")
    
    # Validate registration authority
    if not validate_building_registration_authority(building_data, land_parcel):
        raise ValueError("Insufficient authority to register building on land parcel")
    
    # Validate spatial containment
    if not validate_building_spatial_containment(building_data.geometry, land_parcel.geometry):
        raise ValueError("Building geometry must be contained within land parcel")
    
    # Create building entity
    building = Building(
        entity_hash=generate_entity_hash(building_data),
        land_parcel_hash=land_parcel_hash,
        parent_hash=land_parcel_hash,
        owner_address=building_data.owner_address or land_parcel.owner_address,
        geometry=building_data.geometry,
        building_id=building_data.building_id,
        building_type=building_data.building_type,
        floors=building_data.floors,
        total_units=building_data.total_units,
        construction_year=building_data.construction_year,
        building_area_sqm=calculate_area(building_data.geometry),
        created_at=datetime.utcnow()
    )
    
    # Validate no overlapping buildings
    overlapping_buildings = check_building_overlaps(building.geometry, land_parcel_hash)
    if overlapping_buildings:
        raise ValueError(f"Building overlaps with existing buildings: {overlapping_buildings}")
    
    # Register building and create audit trail
    registered_building = create_property_entity(building)
    create_hierarchy_audit_record('building_registration', building, land_parcel)
    
    return registered_building

def validate_building_spatial_containment(building_geometry, land_geometry):
    """Validate building is spatially contained within land parcel"""
    from shapely.geometry import shape
    
    building_shape = shape(building_geometry)
    land_shape = shape(land_geometry)
    
    # Check if building is completely within land parcel (with small tolerance)
    tolerance = 0.1  # 10cm tolerance for measurement errors
    buffered_land = land_shape.buffer(tolerance)
    
    return buffered_land.contains(building_shape)

def get_buildings_on_land(land_parcel_hash):
    """Get all buildings registered on a land parcel"""
    return get_child_entities(land_parcel_hash, PropertyType.BUILDING)
```

### Flat Registration Under Buildings
- Validate flat registration authority and building ownership
- Ensure flat capacity doesn't exceed building limits
- Support multiple flats per floor
- Maintain flat-to-building hierarchical relationships
- Track flat ownership inheritance from building

### Flat Registration Implementation
```python
# Flat registration under buildings
def register_flat_under_building(flat_data, building_hash):
    """Register flat under parent building with validation"""
    
    # Validate parent building exists and is accessible
    building = get_property_entity(building_hash)
    if not building or building.entity_type != PropertyType.BUILDING:
        raise ValueError(f"Invalid building: {building_hash}")
    
    # Validate registration authority
    if not validate_flat_registration_authority(flat_data, building):
        raise ValueError("Insufficient authority to register flat in building")
    
    # Validate building capacity
    existing_flats = get_flats_in_building(building_hash)
    if len(existing_flats) >= building.total_units:
        raise ValueError(f"Building capacity exceeded: {len(existing_flats)}/{building.total_units}")
    
    # Validate floor number
    if flat_data.floor_number > building.floors or flat_data.floor_number < 1:
        raise ValueError(f"Invalid floor number: {flat_data.floor_number} (building has {building.floors} floors)")
    
    # Create flat entity
    flat = Flat(
        entity_hash=generate_entity_hash(flat_data),
        building_hash=building_hash,
        parent_hash=building_hash,
        owner_address=flat_data.owner_address or building.owner_address,
        geometry=generate_flat_geometry(flat_data, building),
        flat_id=flat_data.flat_id,
        floor_number=flat_data.floor_number,
        unit_number=flat_data.unit_number,
        flat_area_sqm=flat_data.flat_area_sqm,
        bedrooms=flat_data.bedrooms,
        bathrooms=flat_data.bathrooms,
        balcony_area_sqm=flat_data.balcony_area_sqm or 0.0,
        created_at=datetime.utcnow()
    )
    
    # Validate no duplicate unit numbers on same floor
    floor_flats = get_flats_on_floor(building_hash, flat_data.floor_number)
    duplicate_units = [f for f in floor_flats if f.unit_number == flat_data.unit_number]
    if duplicate_units:
        raise ValueError(f"Unit number {flat_data.unit_number} already exists on floor {flat_data.floor_number}")
    
    # Register flat and create audit trail
    registered_flat = create_property_entity(flat)
    create_hierarchy_audit_record('flat_registration', flat, building)
    
    return registered_flat

def generate_flat_geometry(flat_data, building):
    """Generate flat geometry within building bounds"""
    # For flats, geometry is typically a point or small polygon within building
    # This is a simplified implementation - real-world would use building floor plans
    
    building_centroid = calculate_centroid(building.geometry)
    
    # Generate flat geometry as point with metadata
    flat_geometry = {
        'type': 'Point',
        'coordinates': [building_centroid['lng'], building_centroid['lat']],
        'properties': {
            'floor_number': flat_data.floor_number,
            'unit_number': flat_data.unit_number,
            'area_sqm': flat_data.flat_area_sqm
        }
    }
    
    return flat_geometry

def get_flats_in_building(building_hash):
    """Get all flats registered in a building"""
    return get_child_entities(building_hash, PropertyType.FLAT)
```

### Deterministic Vertical Ownership Resolution
- Implement deterministic ownership resolution algorithms
- Support ownership inheritance through hierarchy levels
- Handle ownership conflicts and resolution rules
- Provide ownership chain validation
- Enable ownership transfer propagation

### Vertical Ownership Resolution
```python
# Deterministic vertical ownership resolution
class VerticalOwnershipResolver:
    
    def resolve_ownership_chain(self, entity_hash):
        """Resolve complete ownership chain from entity to root land"""
        
        entity = get_property_entity(entity_hash)
        ownership_chain = []
        
        current_entity = entity
        while current_entity:
            ownership_chain.append({
                'entity_hash': current_entity.entity_hash,
                'entity_type': current_entity.entity_type.value,
                'owner_address': current_entity.owner_address,
                'ownership_percentage': self.calculate_ownership_percentage(current_entity),
                'ownership_source': self.determine_ownership_source(current_entity)
            })
            
            # Move to parent entity
            if current_entity.parent_hash:
                current_entity = get_property_entity(current_entity.parent_hash)
            else:
                break
        
        return ownership_chain
    
    def validate_ownership_consistency(self, entity_hash):
        """Validate ownership consistency through hierarchy"""
        
        ownership_chain = self.resolve_ownership_chain(entity_hash)
        inconsistencies = []
        
        for i in range(len(ownership_chain) - 1):
            child = ownership_chain[i]
            parent = ownership_chain[i + 1]
            
            # Check ownership inheritance rules
            if not self.validate_ownership_inheritance(child, parent):
                inconsistencies.append({
                    'child_entity': child['entity_hash'],
                    'parent_entity': parent['entity_hash'],
                    'issue': 'ownership_inheritance_violation',
                    'child_owner': child['owner_address'],
                    'parent_owner': parent['owner_address']
                })
        
        return {
            'consistent': len(inconsistencies) == 0,
            'inconsistencies': inconsistencies,
            'ownership_chain': ownership_chain
        }
    
    def calculate_ownership_percentage(self, entity):
        """Calculate ownership percentage for entity"""
        
        if entity.entity_type == PropertyType.LAND:
            return 100.0  # Land owners have 100% ownership
        
        elif entity.entity_type == PropertyType.BUILDING:
            # Building ownership percentage based on land ownership
            parent_land = get_property_entity(entity.parent_hash)
            if entity.owner_address == parent_land.owner_address:
                return 100.0
            else:
                # Check for ownership agreements
                ownership_agreements = get_active_ownership_agreements(entity.entity_hash)
                return sum(agreement.ownership_percentage for agreement in ownership_agreements)
        
        elif entity.entity_type == PropertyType.FLAT:
            # Flat ownership percentage based on building ownership
            parent_building = get_property_entity(entity.parent_hash)
            if entity.owner_address == parent_building.owner_address:
                return 100.0
            else:
                # Check for ownership agreements
                ownership_agreements = get_active_ownership_agreements(entity.entity_hash)
                return sum(agreement.ownership_percentage for agreement in ownership_agreements)
        
        return 0.0
    
    def determine_ownership_source(self, entity):
        """Determine source of ownership (inheritance, purchase, etc.)"""
        
        if entity.entity_type == PropertyType.LAND:
            return 'primary_ownership'
        
        parent = get_property_entity(entity.parent_hash)
        if entity.owner_address == parent.owner_address:
            return 'inherited_ownership'
        
        # Check for ownership transfer agreements
        ownership_agreements = get_active_ownership_agreements(entity.entity_hash)
        if ownership_agreements:
            return 'agreement_based_ownership'
        
        return 'unknown_ownership_source'
```

### Flat-Level Agreement Linkage
- Link agreements directly to flat entities
- Support flat-specific agreement types (lease, sale, mortgage)
- Validate agreement authority through ownership chain
- Enable flat-level agreement queries and reporting
- Maintain agreement hierarchy consistency

### Flat Agreement Linkage Implementation
```python
# Flat-level agreement linkage
def create_flat_agreement(flat_hash, agreement_data):
    """Create agreement specifically for flat with hierarchy validation"""
    
    # Validate flat exists
    flat = get_property_entity(flat_hash)
    if not flat or flat.entity_type != PropertyType.FLAT:
        raise ValueError(f"Invalid flat: {flat_hash}")
    
    # Resolve ownership chain for authority validation
    ownership_resolver = VerticalOwnershipResolver()
    ownership_chain = ownership_resolver.resolve_ownership_chain(flat_hash)
    
    # Validate agreement creation authority
    if not validate_flat_agreement_authority(agreement_data, ownership_chain):
        raise ValueError("Insufficient authority to create flat agreement")
    
    # Create agreement with flat binding
    agreement = Agreement(
        agreement_hash=generate_agreement_hash(agreement_data),
        agreement_type=agreement_data.agreement_type,
        status=AgreementStatus.PENDING,
        subject_hash=flat_hash,
        parties=agreement_data.parties,
        terms=agreement_data.terms,
        effective_date=agreement_data.effective_date,
        expiration_date=agreement_data.expiration_date,
        created_at=datetime.utcnow()
    )
    
    # Validate agreement doesn't conflict with hierarchy agreements
    hierarchy_conflicts = check_hierarchy_agreement_conflicts(flat_hash, agreement)
    if hierarchy_conflicts:
        raise ValueError(f"Agreement conflicts with hierarchy agreements: {hierarchy_conflicts}")
    
    # Create agreement and binding
    created_agreement = create_agreement(agreement)
    create_subject_binding(agreement.agreement_hash, flat_hash, 'flat_agreement')
    
    return created_agreement

def get_flat_agreements_with_hierarchy(flat_hash):
    """Get flat agreements including inherited hierarchy agreements"""
    
    # Get direct flat agreements
    direct_agreements = get_subject_agreements(flat_hash)
    
    # Get building agreements that apply to flat
    flat = get_property_entity(flat_hash)
    building_agreements = get_subject_agreements(flat.building_hash)
    
    # Get land agreements that apply to flat
    building = get_property_entity(flat.building_hash)
    land_agreements = get_subject_agreements(building.land_parcel_hash)
    
    return {
        'flat_agreements': direct_agreements,
        'building_agreements': building_agreements,
        'land_agreements': land_agreements,
        'hierarchy_summary': generate_hierarchy_agreement_summary(
            direct_agreements, building_agreements, land_agreements
        )
    }
```

### Conditional Affidavit & PDF Generation (ACTIVE Agreements Only)
- Generate affidavits only for ACTIVE agreements
- Include hierarchy context in flat affidavits
- Support conditional document generation based on agreement status
- Provide comprehensive flat ownership documentation
- Enable bulk affidavit generation for active agreements

### Conditional Document Generation
```python
# Conditional affidavit generation for active agreements
def generate_flat_affidavit_conditional(flat_hash, agreement_hash=None):
    """Generate flat affidavit only for active agreements"""
    
    flat = get_property_entity(flat_hash)
    if not flat or flat.entity_type != PropertyType.FLAT:
        raise ValueError(f"Invalid flat: {flat_hash}")
    
    # Get active agreements for flat
    if agreement_hash:
        agreement = get_agreement(agreement_hash)
        if agreement.status != AgreementStatus.ACTIVE:
            raise ValueError(f"Agreement {agreement_hash} is not ACTIVE (status: {agreement.status})")
        active_agreements = [agreement]
    else:
        all_agreements = get_subject_agreements(flat_hash)
        active_agreements = [ag['agreement'] for ag in all_agreements 
                           if ag['agreement'].status == AgreementStatus.ACTIVE]
    
    if not active_agreements:
        raise ValueError(f"No active agreements found for flat {flat_hash}")
    
    # Generate affidavit for each active agreement
    affidavits = []
    for agreement in active_agreements:
        
        # Resolve complete ownership hierarchy
        ownership_resolver = VerticalOwnershipResolver()
        ownership_chain = ownership_resolver.resolve_ownership_chain(flat_hash)
        
        # Generate hierarchy context
        hierarchy_context = generate_flat_hierarchy_context(flat_hash)
        
        # Generate affidavit data
        affidavit_data = {
            'schema_version': '2.2',
            'document_type': 'flat_agreement_affidavit',
            'chain_id': get_chain_id(),
            'flat_data': {
                'flat_hash': flat_hash,
                'flat_id': flat.flat_id,
                'unit_number': flat.unit_number,
                'floor_number': flat.floor_number,
                'area_sqm': flat.flat_area_sqm,
                'owner_address': flat.owner_address
            },
            'hierarchy_context': hierarchy_context,
            'ownership_chain': ownership_chain,
            'agreement_data': {
                'agreement_hash': agreement.agreement_hash,
                'agreement_type': agreement.agreement_type,
                'status': agreement.status,
                'parties': [party.to_dict() for party in agreement.parties],
                'effective_date': agreement.effective_date.isoformat(),
                'expiration_date': agreement.expiration_date.isoformat() if agreement.expiration_date else None
            },
            'cryptographic_proofs': {
                'merkle_proof': generate_agreement_merkle_proof(agreement.agreement_hash),
                'blockchain_evidence': get_agreement_blockchain_evidence(agreement.agreement_hash)
            },
            'legal_declarations': generate_flat_legal_declarations(flat, agreement),
            'verification_data': {
                'qr_payload': generate_flat_agreement_qr_payload(flat_hash, agreement.agreement_hash),
                'verification_url': f"https://verify.titlevault.com/flat/{flat_hash}/agreement/{agreement.agreement_hash}"
            }
        }
        
        affidavits.append(affidavit_data)
    
    return affidavits

def generate_flat_hierarchy_context(flat_hash):
    """Generate complete hierarchy context for flat"""
    
    flat = get_property_entity(flat_hash)
    building = get_property_entity(flat.building_hash)
    land_parcel = get_property_entity(building.land_parcel_hash)
    
    return {
        'land_parcel': {
            'hash': land_parcel.entity_hash,
            'parcel_id': land_parcel.parcel_id,
            'legal_description': land_parcel.legal_description,
            'area_sqm': land_parcel.area_sqm,
            'owner': land_parcel.owner_address,
            'jurisdiction': land_parcel.jurisdiction
        },
        'building': {
            'hash': building.entity_hash,
            'building_id': building.building_id,
            'building_type': building.building_type,
            'floors': building.floors,
            'total_units': building.total_units,
            'construction_year': building.construction_year,
            'owner': building.owner_address
        },
        'flat': {
            'hash': flat.entity_hash,
            'flat_id': flat.flat_id,
            'unit_number': flat.unit_number,
            'floor_number': flat.floor_number,
            'area_sqm': flat.flat_area_sqm,
            'owner': flat.owner_address
        }
    }

def generate_conditional_pdf_batch(entity_hashes, agreement_status_filter='ACTIVE'):
    """Generate PDFs for multiple entities with status filtering"""
    
    generated_pdfs = []
    skipped_entities = []
    
    for entity_hash in entity_hashes:
        try:
            entity = get_property_entity(entity_hash)
            
            # Get agreements with status filter
            agreements = get_subject_agreements(entity_hash)
            filtered_agreements = [
                ag for ag in agreements 
                if ag['agreement'].status == agreement_status_filter
            ]
            
            if not filtered_agreements:
                skipped_entities.append({
                    'entity_hash': entity_hash,
                    'reason': f'No {agreement_status_filter} agreements found'
                })
                continue
            
            # Generate affidavit and PDF for each active agreement
            for agreement_data in filtered_agreements:
                if entity.entity_type == PropertyType.FLAT:
                    affidavit = generate_flat_affidavit_conditional(
                        entity_hash, 
                        agreement_data['agreement'].agreement_hash
                    )[0]
                else:
                    affidavit = generate_agreement_affidavit(
                        agreement_data['agreement'].agreement_hash
                    )
                
                pdf_document = generate_agreement_pdf_from_affidavit(affidavit)
                
                generated_pdfs.append({
                    'entity_hash': entity_hash,
                    'agreement_hash': agreement_data['agreement'].agreement_hash,
                    'pdf_document': pdf_document,
                    'affidavit_data': affidavit
                })
                
        except Exception as e:
            skipped_entities.append({
                'entity_hash': entity_hash,
                'reason': f'Error: {str(e)}'
            })
    
    return {
        'generated_pdfs': generated_pdfs,
        'skipped_entities': skipped_entities,
        'summary': {
            'total_requested': len(entity_hashes),
            'successfully_generated': len(generated_pdfs),
            'skipped': len(skipped_entities)
        }
    }
```

### Legal Enforcement of Vertical Property Hierarchy
- Enforce legal hierarchy rules and constraints
- Validate ownership transfer authority through hierarchy
- Support hierarchy-aware legal document generation
- Implement conflict resolution for hierarchy disputes
- Provide legal compliance reporting for vertical properties

## Vertical Property API Endpoints

### Property Hierarchy Management
```python
# Property hierarchy endpoints
POST /properties/land                      # Register land parcel
POST /properties/building                  # Register building under land
POST /properties/flat                      # Register flat under building

GET /properties/{entity_hash}              # Get property entity details
GET /properties/{entity_hash}/hierarchy    # Get complete hierarchy chain
GET /properties/{entity_hash}/children     # Get child entities

# Hierarchy validation and resolution
GET /properties/{entity_hash}/ownership    # Resolve ownership chain
POST /properties/{entity_hash}/validate    # Validate hierarchy consistency
GET /properties/hierarchy/conflicts        # Get hierarchy conflicts

# Flat-specific endpoints
GET /flats/{flat_hash}/agreements          # Get flat agreements with hierarchy
GET /flats/{flat_hash}/affidavit           # Generate conditional flat affidavit
GET /flats/batch/affidavits               # Batch generate affidavits (ACTIVE only)

# Building management
GET /buildings/{building_hash}/flats       # Get all flats in building
GET /buildings/{building_hash}/occupancy   # Get building occupancy status
POST /buildings/{building_hash}/validate   # Validate building capacity

# Land parcel management  
GET /land/{land_hash}/buildings           # Get all buildings on land
GET /land/{land_hash}/hierarchy           # Get complete land hierarchy
```

## Implementation Guidelines

### Hierarchy Integrity & Validation
- Enforce strict parent-child relationships at all levels
- Validate spatial containment for all hierarchy levels
- Implement comprehensive ownership chain validation
- Support hierarchy conflict detection and resolution
- Maintain referential integrity across all operations

### Legal Compliance & Authority
- Implement jurisdiction-specific property law compliance
- Validate registration authority at each hierarchy level
- Support legal ownership transfer through hierarchy
- Provide comprehensive audit trails for all operations
- Enable legal dispute resolution workflows

### Performance & Scalability
- Optimize hierarchy queries with proper indexing
- Implement efficient ownership resolution algorithms
- Support bulk operations for large property portfolios
- Provide caching for frequently accessed hierarchy data
- Scale hierarchy storage and retrieval systems

### Security & Access Control
- Implement hierarchy-aware access control
- Protect sensitive ownership and agreement data
- Audit all hierarchy modifications and access
- Support multi-level authorization for complex operations
- Ensure secure ownership transfer workflows