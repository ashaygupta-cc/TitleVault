#!/usr/bin/env python3
"""
Temporary script to migrate/fix existing registries and add them to the map.
Adds proper coordinate data to registries that are missing location info.
"""

import sys
import json
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from models import Registry, Building, Flat

# Database connection
DATABASE_URL = "sqlite:///db.sqlite3"
engine = create_engine(DATABASE_URL, echo=False)

# Sample coordinates for different test locations
SAMPLE_LOCATIONS = {
    "bangalore": {
        "coords": [
            [77.5900, 12.9716],  # Bangalore center
            [77.6100, 12.9716],
            [77.6100, 12.9900],
            [77.5900, 12.9900],
            [77.5900, 12.9716],
        ],
        "metadata": {
            "village": "Bangalore",
            "taluk": "Bangalore",
            "district": "Bangalore Urban",
            "state": "Karnataka"
        }
    },
    "cubbon_park": {
        "coords": [
            [77.5855, 12.9352],  # Cubbon Park area
            [77.5955, 12.9352],
            [77.5955, 12.9452],
            [77.5855, 12.9452],
            [77.5855, 12.9352],
        ],
        "metadata": {
            "village": "Cubbon Park",
            "taluk": "Bangalore",
            "district": "Bangalore Urban",
            "state": "Karnataka"
        }
    },
    "richmond": {
        "coords": [
            [77.6000, 12.9700],  # Richmond area
            [77.6100, 12.9700],
            [77.6100, 12.9800],
            [77.6000, 12.9800],
            [77.6000, 12.9700],
        ],
        "metadata": {
            "village": "Richmond",
            "taluk": "Bangalore",
            "district": "Bangalore Urban",
            "state": "Karnataka"
        }
    }
}

def migrate_registries():
    """Fetch and fix all existing registries"""
    with Session(engine) as session:
        # Get all registries
        registries = session.query(Registry).all()
        
        if not registries:
            print("❌ No registries found in database")
            return
        
        print(f"📍 Found {len(registries)} registries")
        print("-" * 60)
        
        location_idx = 0
        locations = list(SAMPLE_LOCATIONS.values())
        
        for idx, reg in enumerate(registries):
            # Use sample location data
            loc_data = locations[location_idx % len(locations)]
            location_idx += 1
            
            # Update polygon if missing
            if not reg.polygon_data:
                reg.polygon_data = json.dumps({
                    "type": "Polygon",
                    "coordinates": [loc_data["coords"]]
                })
                print(f"✅ Registry {idx+1}: {reg.plot_id or f'ID-{reg.id}'}")
                print(f"   Location: {loc_data['metadata']['village']}")
                print(f"   Coordinates added: {len(loc_data['coords'])} points")
            else:
                print(f"✓ Registry {idx+1}: {reg.plot_id or f'ID-{reg.id}'} (already has coordinates)")
            
            # Update metadata
            if not reg.metadata:
                reg.metadata = json.dumps(loc_data['metadata'])
            
            session.add(reg)
        
        # Commit all changes
        session.commit()
        print("-" * 60)
        print(f"✅ Migration complete! {len(registries)} registries processed")
        print("\n📌 Instructions:")
        print("1. Refresh your browser (Ctrl+F5)")
        print("2. New registries should appear on the map")
        print("3. You can now create buildings and flats for these registries")

def show_registry_stats():
    """Show current registry statistics"""
    with Session(engine) as session:
        registries = session.query(Registry).all()
        buildings = session.query(Building).all()
        flats = session.query(Flat).all()
        
        print("\n📊 Current Database Stats:")
        print(f"   Registries: {len(registries)}")
        print(f"   Buildings: {len(buildings)}")
        print(f"   Flats: {len(flats)}")
        
        # Check registries with coordinates
        with_coords = sum(1 for r in registries if r.polygon_data)
        print(f"\n   Registries with coordinates: {with_coords}/{len(registries)}")
        
        if len(registries) > 0:
            print("\n📋 Registry Details:")
            for idx, r in enumerate(registries[:5], 1):  # Show first 5
                status = "✅" if r.polygon_data else "❌"
                print(f"   {status} {idx}. {r.plot_id or f'ID-{r.id}'} (Owner: {r.owner_address[:10]}...)")
            
            if len(registries) > 5:
                print(f"   ... and {len(registries) - 5} more")

def main():
    print("\n🔧 Registry Migration Tool")
    print("=" * 60)
    
    # Show current stats
    show_registry_stats()
    
    # Ask for confirmation
    print("\n" + "=" * 60)
    response = input("\n⚠️  Add coordinates to registries without them? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        migrate_registries()
    else:
        print("❌ Migration cancelled")
        sys.exit(0)

if __name__ == '__main__':
    main()
