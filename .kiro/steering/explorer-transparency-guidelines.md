# Explorer, Discovery & Transparency Guidelines

## Phase 11: Explorer, Discovery & Transparency Layer

### Public Registry Explorer Endpoints
- Comprehensive public access to all registry entities
- Unified discovery interface for land, buildings, and flats
- Advanced search and filtering capabilities
- Geographic and spatial discovery features
- Real-time registry statistics and analytics

### Public Explorer API Architecture
```python
# Public explorer endpoint structure
class PublicExplorerAPI:
    """
    Public registry explorer with comprehensive discovery capabilities
    No authentication required - fully transparent public access
    """
    
    # Core discovery endpoints
    GET /explorer/entities                    # List all public entities
    GET /explorer/entities/{entity_hash}      # Get entity details
    GET /explorer/search                      # Advanced search interface
    GET /explorer/statistics                  # Registry statistics
    
    # Hierarchy-aware discovery
    GET /explorer/land                        # Discover land parcels
    GET /explorer/buildings                   # Discover buildings
    GET /explorer/flats                       # Discover flats
    GET /explorer/hierarchy/{entity_hash}     # Explore entity hierarchy
    
    # Geographic discovery
    GET /explorer/geographic/bounds           # Entities within bounding box
    GET /explorer/geographic/nearby           # Nearby entities
    GET /explorer/geographic/intersects       # Spatial intersection queries
    
    # Agreement discovery
    GET /explorer/agreements                  # Public agreement visibility
    GET /explorer/agreements/active           # Active agreements only
    GET /explorer/agreements/by-type          # Agreements by type
    
    # Analytics and insights
    GET /explorer/analytics/summary           # Registry summary analytics
    GET /explorer/analytics/trends            # Temporal trends
    GET /explorer/analytics/geographic        # Geographic distribution
```

### Unified Subject Inspection Interface
- Single inspection interface for all property types
- Hierarchical context display for nested properties
- Comprehensive entity metadata and relationships
- Visual hierarchy navigation and exploration
- Consistent data presentation across all entity types

### Unified Inspection Implementation
```python
# Unified subject inspection system
class UnifiedSubjectInspector:
    """
    Unified inspection interface for all registry subjects
    Provides consistent access to land, buildings, and flats
    """
    
    def inspect_subject(self, entity_hash, include_hierarchy=True, include_agreements=True):
        """Unified subject inspection with comprehensive context"""
        
        # Get base entity information
        entity = get_property_entity(entity_hash)
        if not entity:
            raise ValueError(f"Entity not found: {entity_hash}")
        
        # Build unified inspection response
        inspection_data = {
            'entity_hash': entity_hash,
            'entity_type': entity.entity_type.value,
            'basic_info': self.extract_basic_info(entity),
            'spatial_data': self.extract_spatial_data(entity),
            'ownership_info': self.extract_ownership_info(entity),
            'metadata': entity.metadata,
            'created_at': entity.created_at.isoformat(),
            'updated_at': entity.updated_at.isoformat()
        }
        
        # Add hierarchy context if requested
        if include_hierarchy:
            inspection_data['hierarchy'] = self.build_hierarchy_context(entity)
        
        # Add agreement information if requested
        if include_agreements:
            inspection_data['agreements'] = self.get_public_agreements(entity_hash)
        
        # Add entity-specific information
        if entity.entity_type == PropertyType.LAND:
            inspection_data['land_details'] = self.extract_land_details(entity)
        elif entity.entity_type == PropertyType.BUILDING:
            inspection_data['building_details'] = self.extract_building_details(entity)
        elif entity.entity_type == PropertyType.FLAT:
            inspection_data['flat_details'] = self.extract_flat_details(entity)
        
        return inspection_data
    
    def extract_basic_info(self, entity):
        """Extract basic information common to all entity types"""
        return {
            'canonical_hash': entity.canonical_hash,
            'owner_address': entity.owner_address,
            'blockchain_tx': entity.blockchain_tx,
            'ipfs_hash': entity.ipfs_hash
        }
    
    def extract_spatial_data(self, entity):
        """Extract spatial information for entity"""
        if not entity.geometry:
            return None
        
        return {
            'geometry': entity.geometry,
            'bounding_box': calculate_bounding_box(entity.geometry),
            'centroid': calculate_centroid(entity.geometry),
            'area_sqm': calculate_area(entity.geometry) if entity.entity_type != PropertyType.FLAT else getattr(entity, 'flat_area_sqm', None)
        }
    
    def build_hierarchy_context(self, entity):
        """Build complete hierarchy context for entity"""
        
        hierarchy = {
            'current_level': entity.entity_type.value,
            'parent': None,
            'children': [],
            'root_land': None
        }
        
        # Get parent information
        if entity.parent_hash:
            parent = get_property_entity(entity.parent_hash)
            if parent:
                hierarchy['parent'] = {
                    'entity_hash': parent.entity_hash,
                    'entity_type': parent.entity_type.value,
                    'owner_address': parent.owner_address
                }
        
        # Get children information
        children = get_child_entities(entity.entity_hash)
        hierarchy['children'] = [
            {
                'entity_hash': child.entity_hash,
                'entity_type': child.entity_type.value,
                'owner_address': child.owner_address
            }
            for child in children
        ]
        
        # Get root land parcel
        root_land = self.find_root_land(entity)
        if root_land:
            hierarchy['root_land'] = {
                'entity_hash': root_land.entity_hash,
                'parcel_id': getattr(root_land, 'parcel_id', None),
                'legal_description': getattr(root_land, 'legal_description', None)
            }
        
        return hierarchy
    
    def get_public_agreements(self, entity_hash):
        """Get publicly visible agreement information"""
        
        agreements = get_subject_agreements(entity_hash)
        public_agreements = []
        
        for agreement_data in agreements:
            agreement = agreement_data['agreement']
            
            # Only include basic public information
            public_info = {
                'agreement_hash': agreement.agreement_hash,
                'agreement_type': agreement.agreement_type,
                'status': agreement.status,
                'effective_date': agreement.effective_date.isoformat(),
                'expiration_date': agreement.expiration_date.isoformat() if agreement.expiration_date else None,
                'party_count': len(agreement.parties),
                'created_at': agreement.created_at.isoformat()
            }
            
            public_agreements.append(public_info)
        
        return public_agreements
```

### Agreement Visibility with Filters
- Public visibility of agreement metadata without sensitive details
- Advanced filtering by agreement type, status, and date ranges
- Agreement analytics and trend analysis
- Transparent agreement lifecycle tracking
- Public agreement verification capabilities

### Agreement Visibility Implementation
```python
# Public agreement visibility system
class PublicAgreementExplorer:
    """
    Public agreement exploration with privacy-aware filtering
    Provides transparency while protecting sensitive information
    """
    
    def explore_agreements(self, filters=None, pagination=None):
        """Explore agreements with public visibility filters"""
        
        # Validate and sanitize filters
        safe_filters = self.validate_agreement_filters(filters or {})
        safe_pagination = validate_pagination(pagination or {})
        
        # Query agreements with filters
        agreements = self.query_public_agreements(safe_filters, safe_pagination)
        
        # Build public response
        return {
            'agreements': [self.format_public_agreement(ag) for ag in agreements],
            'filters_applied': safe_filters,
            'pagination': safe_pagination,
            'total_count': self.count_public_agreements(safe_filters),
            'summary_statistics': self.generate_agreement_statistics(safe_filters)
        }
    
    def validate_agreement_filters(self, filters):
        """Validate and sanitize agreement filters"""
        safe_filters = {}
        
        # Agreement type filter
        if 'agreement_type' in filters:
            agreement_type = filters['agreement_type']
            if agreement_type in ['lease', 'sale', 'mortgage', 'easement', 'license']:
                safe_filters['agreement_type'] = agreement_type
        
        # Status filter
        if 'status' in filters:
            status = filters['status']
            if status in ['ACTIVE', 'COMPLETED', 'TERMINATED', 'PENDING', 'SUSPENDED']:
                safe_filters['status'] = status
        
        # Date range filters
        if 'effective_after' in filters:
            try:
                safe_filters['effective_after'] = parse_iso_date(filters['effective_after'])
            except ValueError:
                pass
        
        if 'effective_before' in filters:
            try:
                safe_filters['effective_before'] = parse_iso_date(filters['effective_before'])
            except ValueError:
                pass
        
        # Subject type filter
        if 'subject_type' in filters:
            subject_type = filters['subject_type']
            if subject_type in ['LAND', 'BUILDING', 'FLAT']:
                safe_filters['subject_type'] = subject_type
        
        # Geographic bounds filter
        if 'bounds' in filters:
            bounds = filters['bounds']
            if validate_bounding_box(bounds):
                safe_filters['bounds'] = bounds
        
        return safe_filters
    
    def format_public_agreement(self, agreement):
        """Format agreement for public visibility"""
        
        # Get subject information
        subject = get_property_entity(agreement.subject_hash)
        
        return {
            'agreement_hash': agreement.agreement_hash,
            'agreement_type': agreement.agreement_type,
            'status': agreement.status,
            'subject_info': {
                'subject_hash': agreement.subject_hash,
                'subject_type': subject.entity_type.value if subject else 'UNKNOWN',
                'owner_address': subject.owner_address if subject else None
            },
            'effective_date': agreement.effective_date.isoformat(),
            'expiration_date': agreement.expiration_date.isoformat() if agreement.expiration_date else None,
            'party_count': len(agreement.parties),
            'created_at': agreement.created_at.isoformat(),
            'updated_at': agreement.updated_at.isoformat(),
            'verification_url': f"/explorer/agreements/{agreement.agreement_hash}/verify"
        }
    
    def generate_agreement_statistics(self, filters):
        """Generate public agreement statistics"""
        
        # Get agreements matching filters
        agreements = self.query_public_agreements(filters)
        
        # Calculate statistics
        stats = {
            'total_agreements': len(agreements),
            'by_status': {},
            'by_type': {},
            'by_subject_type': {},
            'temporal_distribution': self.calculate_temporal_distribution(agreements)
        }
        
        # Count by status
        for agreement in agreements:
            status = agreement.status
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
        
        # Count by type
        for agreement in agreements:
            agreement_type = agreement.agreement_type
            stats['by_type'][agreement_type] = stats['by_type'].get(agreement_type, 0) + 1
        
        # Count by subject type
        for agreement in agreements:
            subject = get_property_entity(agreement.subject_hash)
            if subject:
                subject_type = subject.entity_type.value
                stats['by_subject_type'][subject_type] = stats['by_subject_type'].get(subject_type, 0) + 1
        
        return stats
```

### Transparency Without Privileged Access
- Complete public access without authentication requirements
- Privacy-aware data exposure protecting sensitive information
- Rate limiting for fair access without blocking legitimate use
- Comprehensive audit logging of all public access
- Open data standards and API documentation

### Transparent Access Implementation
```python
# Transparent public access system
class TransparentAccessManager:
    """
    Manage transparent public access without privileged requirements
    Ensures fair access while protecting system integrity
    """
    
    def __init__(self):
        self.rate_limiter = PublicRateLimiter()
        self.privacy_filter = PrivacyAwareFilter()
        self.audit_logger = PublicAccessAuditLogger()
    
    def handle_public_request(self, request_type, request_data, client_info):
        """Handle public request with transparency and rate limiting"""
        
        # Apply rate limiting
        if not self.rate_limiter.allow_request(client_info):
            raise RateLimitExceeded("Public API rate limit exceeded")
        
        # Log public access
        self.audit_logger.log_access(request_type, request_data, client_info)
        
        # Process request based on type
        if request_type == 'entity_inspection':
            return self.handle_entity_inspection(request_data)
        elif request_type == 'agreement_exploration':
            return self.handle_agreement_exploration(request_data)
        elif request_type == 'geographic_discovery':
            return self.handle_geographic_discovery(request_data)
        elif request_type == 'analytics_query':
            return self.handle_analytics_query(request_data)
        else:
            raise ValueError(f"Unknown request type: {request_type}")
    
    def handle_entity_inspection(self, request_data):
        """Handle public entity inspection request"""
        
        entity_hash = request_data.get('entity_hash')
        if not entity_hash:
            raise ValueError("Entity hash required")
        
        # Get entity with privacy filtering
        inspector = UnifiedSubjectInspector()
        raw_data = inspector.inspect_subject(
            entity_hash,
            include_hierarchy=request_data.get('include_hierarchy', True),
            include_agreements=request_data.get('include_agreements', True)
        )
        
        # Apply privacy filtering
        filtered_data = self.privacy_filter.filter_entity_data(raw_data)
        
        return filtered_data
    
    def handle_geographic_discovery(self, request_data):
        """Handle geographic discovery request"""
        
        discovery_type = request_data.get('discovery_type')
        
        if discovery_type == 'bounds':
            return self.discover_entities_in_bounds(request_data.get('bounds'))
        elif discovery_type == 'nearby':
            return self.discover_nearby_entities(
                request_data.get('center'),
                request_data.get('radius', 1000)  # Default 1km radius
            )
        elif discovery_type == 'intersects':
            return self.discover_intersecting_entities(request_data.get('geometry'))
        else:
            raise ValueError(f"Unknown discovery type: {discovery_type}")
    
    def discover_entities_in_bounds(self, bounds):
        """Discover entities within geographic bounds"""
        
        if not validate_bounding_box(bounds):
            raise ValueError("Invalid bounding box")
        
        # Query entities within bounds
        entities = query_entities_in_bounds(bounds)
        
        # Format for public response
        return {
            'bounds': bounds,
            'entity_count': len(entities),
            'entities': [
                {
                    'entity_hash': entity.entity_hash,
                    'entity_type': entity.entity_type.value,
                    'owner_address': entity.owner_address,
                    'centroid': calculate_centroid(entity.geometry),
                    'area_sqm': calculate_area(entity.geometry) if entity.entity_type != PropertyType.FLAT else getattr(entity, 'flat_area_sqm', None)
                }
                for entity in entities
            ]
        }

class PrivacyAwareFilter:
    """Filter sensitive information from public responses"""
    
    def filter_entity_data(self, entity_data):
        """Filter entity data for public consumption"""
        
        # Remove sensitive fields
        filtered_data = entity_data.copy()
        
        # Remove detailed party information from agreements
        if 'agreements' in filtered_data:
            for agreement in filtered_data['agreements']:
                # Keep only basic agreement info, remove party details
                agreement.pop('parties', None)
                agreement.pop('terms', None)
        
        # Remove sensitive metadata
        if 'metadata' in filtered_data:
            metadata = filtered_data['metadata']
            # Remove any fields marked as sensitive
            filtered_metadata = {
                k: v for k, v in metadata.items()
                if not k.startswith('_private') and k not in ['ssn', 'tax_id', 'personal_info']
            }
            filtered_data['metadata'] = filtered_metadata
        
        return filtered_data

class PublicRateLimiter:
    """Rate limiting for public API access"""
    
    def __init__(self):
        self.redis_client = redis.Redis()
        self.default_limits = {
            'requests_per_minute': 60,
            'requests_per_hour': 1000,
            'requests_per_day': 10000
        }
    
    def allow_request(self, client_info):
        """Check if request is allowed under rate limits"""
        
        client_id = self.get_client_id(client_info)
        current_time = int(time.time())
        
        # Check minute limit
        minute_key = f"rate_limit:{client_id}:minute:{current_time // 60}"
        minute_count = self.redis_client.incr(minute_key)
        self.redis_client.expire(minute_key, 60)
        
        if minute_count > self.default_limits['requests_per_minute']:
            return False
        
        # Check hour limit
        hour_key = f"rate_limit:{client_id}:hour:{current_time // 3600}"
        hour_count = self.redis_client.incr(hour_key)
        self.redis_client.expire(hour_key, 3600)
        
        if hour_count > self.default_limits['requests_per_hour']:
            return False
        
        # Check day limit
        day_key = f"rate_limit:{client_id}:day:{current_time // 86400}"
        day_count = self.redis_client.incr(day_key)
        self.redis_client.expire(day_key, 86400)
        
        if day_count > self.default_limits['requests_per_day']:
            return False
        
        return True
    
    def get_client_id(self, client_info):
        """Generate client ID for rate limiting"""
        # Use IP address as primary identifier
        return client_info.get('ip_address', 'unknown')
```

## Public Explorer API Endpoints

### Core Discovery Endpoints
```python
# Public explorer API endpoints
GET /explorer/entities                        # List all public entities
GET /explorer/entities/{entity_hash}          # Unified entity inspection
GET /explorer/search                          # Advanced search interface
GET /explorer/statistics                      # Registry statistics

# Hierarchy-specific discovery
GET /explorer/land                            # Land parcel discovery
GET /explorer/land/{land_hash}/buildings      # Buildings on land parcel
GET /explorer/buildings                       # Building discovery
GET /explorer/buildings/{building_hash}/flats # Flats in building
GET /explorer/flats                           # Flat discovery
GET /explorer/hierarchy/{entity_hash}         # Complete hierarchy exploration

# Geographic discovery
GET /explorer/geographic/bounds               # Entities within bounding box
GET /explorer/geographic/nearby               # Nearby entities
GET /explorer/geographic/intersects           # Spatial intersection queries
GET /explorer/geographic/statistics           # Geographic distribution stats

# Agreement exploration
GET /explorer/agreements                      # Public agreement visibility
GET /explorer/agreements/active               # Active agreements only
GET /explorer/agreements/by-type/{type}       # Agreements by type
GET /explorer/agreements/{agreement_hash}     # Agreement details
GET /explorer/agreements/statistics           # Agreement analytics

# Analytics and insights
GET /explorer/analytics/summary               # Registry summary analytics
GET /explorer/analytics/trends                # Temporal trends
GET /explorer/analytics/geographic            # Geographic distribution
GET /explorer/analytics/agreements            # Agreement analytics
```

### Search and Filter Parameters
```python
# Advanced search parameters
search_params = {
    # Entity filters
    'entity_type': ['LAND', 'BUILDING', 'FLAT'],
    'owner_address': 'ethereum_address',
    'created_after': 'iso_date',
    'created_before': 'iso_date',
    
    # Geographic filters
    'bounds': {
        'min_lat': float,
        'min_lng': float,
        'max_lat': float,
        'max_lng': float
    },
    'center': {'lat': float, 'lng': float},
    'radius': int,  # meters
    
    # Agreement filters
    'agreement_type': ['lease', 'sale', 'mortgage', 'easement'],
    'agreement_status': ['ACTIVE', 'COMPLETED', 'TERMINATED'],
    'effective_after': 'iso_date',
    'effective_before': 'iso_date',
    
    # Pagination
    'page': int,
    'per_page': int,
    'sort_by': ['created_at', 'updated_at', 'area_sqm'],
    'sort_order': ['asc', 'desc']
}
```

## Implementation Guidelines

### Public Access & Transparency
- Ensure complete public access without authentication barriers
- Implement comprehensive rate limiting for fair access
- Provide detailed API documentation and examples
- Support multiple response formats (JSON, GeoJSON, CSV)
- Enable bulk data access for research and analysis

### Privacy & Security
- Filter sensitive information from public responses
- Protect personal and financial details in agreements
- Implement comprehensive audit logging
- Monitor for abuse and suspicious access patterns
- Ensure GDPR and privacy law compliance

### Performance & Scalability
- Optimize public endpoints for high traffic
- Implement efficient caching strategies
- Use database indexing for fast queries
- Support geographic spatial indexing
- Provide CDN support for static content

### User Experience & Discovery
- Provide intuitive search and discovery interfaces
- Support progressive disclosure of information
- Enable visual hierarchy navigation
- Provide comprehensive analytics and insights
- Support mobile and responsive access patterns