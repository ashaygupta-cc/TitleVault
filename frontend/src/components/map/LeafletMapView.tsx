import type { Parcel } from '@/types/registry';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';

interface LeafletMapViewProps {
  parcels: Parcel[];
  onParcelClick: (parcelId: string) => void;
  selectedParcelId?: string;
  focusCoords?: { lat: number; lng: number };
  zoom?: number;
}

const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  parcels,
  onParcelClick,
  selectedParcelId,
  focusCoords,
  zoom = 15,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<string, L.Polygon>>(new Map());
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const getStatusColor = (status: Parcel['verificationStatus']): string => {
    switch (status) {
      case 'verified': return '#4a7c59';
      case 'pending': return '#b8860b';
      case 'failed': return '#8b4049';
      default: return '#6b7280';
    }
  };

  // Initialize map ONCE
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [12.9716, 77.5946],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add mouse move listener for coordinate tracking
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      setCoordinates({
        lat: Math.round(e.latlng.lat * 100000) / 100000,
        lng: Math.round(e.latlng.lng * 100000) / 100000,
      });
    };

    const handleMouseOut = () => {
      setCoordinates(null);
    };

    map.current.on('mousemove', handleMouseMove);
    map.current.on('mouseout', handleMouseOut);

    return () => {
      map.current?.off('mousemove', handleMouseMove);
      map.current?.off('mouseout', handleMouseOut);
      map.current?.remove();
      map.current = null;
      layersRef.current.clear();
    };
  }, []);

  // Render / update parcels SAFELY
  useEffect(() => {
    if (!map.current) return;

    // 🔥 CLEAR OLD LAYERS (CRITICAL)
    layersRef.current.forEach(layer => layer.remove());
    layersRef.current.clear();

    parcels.forEach(parcel => {
      // 🛡️ HARD GUARDS - Handle GeoJSON Polygon format
      if (!parcel?.polygon) {
        console.warn('Parcel has no polygon:', parcel?.id);
        return;
      }

      // GeoJSON Polygon: { type: 'Polygon', coordinates: [ [ [lng, lat], ... ] ] }
      const coords = parcel.polygon.coordinates;
      
      // For Polygon, coordinates[0] is the exterior ring
      let ring: any[] = coords;
      if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
        // If coords[0] is also an array, it's a Polygon with rings
        ring = coords[0];
      }

      if (!Array.isArray(ring) || ring.length < 3) {
        console.warn('Invalid polygon ring for parcel:', parcel.id, ring);
        return;
      }

      // Convert coordinates to [lat, lng] format
      // Support both GeoJSON [lng, lat] arrays and {lat, lng} objects
      const latLngs: [number, number][] = ring
        .map((c: any) => {
          // Handle [lng, lat] array format (GeoJSON)
          if (Array.isArray(c) && c.length >= 2) {
            return [c[1], c[0]] as [number, number]; // Swap to [lat, lng]
          }
          // Handle {lat, lng} object format
          if (typeof c?.lat === 'number' && typeof c?.lng === 'number') {
            return [c.lat, c.lng] as [number, number];
          }
          return null;
        })
        .filter((c): c is [number, number] => c !== null && !isNaN(c[0]) && !isNaN(c[1]));

      if (latLngs.length < 3) {
        console.warn('Parcel has insufficient valid points:', parcel.id);
        return;
      }

      const isSelected = selectedParcelId === parcel.id;
      const color = getStatusColor(parcel.verificationStatus);
      
      // If land is subdivided, show two patches with different colors
      const isSubdivided = parcel.subdivisionStatus === 'complete';
      
      // Create polygon(s)
      const polygon = L.polygon(latLngs, {
        color,
        fillColor: color,
        fillOpacity: isSubdivided ? (isSelected ? 0.5 : 0.25) : (isSelected ? 0.6 : 0.3),
        weight: isSelected ? 3 : 2,
        dashArray: isSubdivided ? '5, 5' : undefined, // Dashed line for subdivided
      }).addTo(map.current);

      polygon.on('click', () => onParcelClick(parcel.id));
      
      // If subdivided, add a second patch with different color to show subdivision
      if (isSubdivided && latLngs.length > 3) {
        // Split polygon into two patches for visual separation
        const midpoint = Math.floor(latLngs.length / 2);
        const patch1 = latLngs.slice(0, midpoint + 1);
        const patch2 = latLngs.slice(midpoint);
        
        // Add second patch with lighter, distinct color
        const secondaryColor = color === '#4a7c59' ? '#6da877' : color === '#b8860b' ? '#d4a017' : '#a5636f';
        const polygon2 = L.polygon(patch2, {
          color: secondaryColor,
          fillColor: secondaryColor,
          fillOpacity: isSelected ? 0.4 : 0.2,
          weight: isSelected ? 3 : 2,
          dashArray: '5, 5',
        }).addTo(map.current);
        
        polygon2.on('click', () => onParcelClick(parcel.id));
        layersRef.current.set(`${parcel.id}-sub`, polygon2);
      }

      layersRef.current.set(parcel.id, polygon);
    });
  }, [parcels, selectedParcelId, onParcelClick]);

  // Focus map on specific coordinates when provided
  useEffect(() => {
    if (!map.current) {
      console.warn('[LeafletMapView] Map not initialized yet');
      return;
    }
    
    if (!focusCoords) {
      console.warn('[LeafletMapView] No focus coordinates provided');
      return;
    }

    console.log(`[LeafletMapView] Focusing map on coordinates:`, focusCoords, `zoom: ${zoom}`);
    
    // Validate coordinates
    const lat = focusCoords.lat;
    const lng = focusCoords.lng;
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error('[LeafletMapView] Invalid coordinates:', { lat, lng });
      return;
    }

    // Use setView with validated coordinates
    try {
      map.current.setView([lat, lng], zoom, {
        animate: true,
        duration: 1,
      });
      console.log('[LeafletMapView] Map view updated successfully');
    } catch (err) {
      console.error('[LeafletMapView] Error setting map view:', err);
    }
  }, [focusCoords, zoom]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg z-0" />
      
      {/* Coordinate Tracker */}
      {coordinates && (
        <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-sm border border-border rounded-md p-3 shadow-lg">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coordinates</div>
            <div className="text-sm font-mono text-foreground">
              <div>Lat: <span className="text-primary font-semibold">{coordinates.lat}</span></div>
              <div>Lng: <span className="text-primary font-semibold">{coordinates.lng}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletMapView;
