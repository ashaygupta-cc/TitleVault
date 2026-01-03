import React, { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Parcel } from '@/types/registry';

interface MapViewProps {
  token: string;
  parcels: Parcel[];
  onParcelClick: (parcelId: string) => void;
  selectedParcelId?: string;
  focusCoords?: { lat: number; lng: number };
  zoom?: number;
}

const MapView: React.FC<MapViewProps> = ({ token, parcels, onParcelClick, selectedParcelId, focusCoords, zoom = 15 }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  const getStatusColor = (status: Parcel['verificationStatus']): string => {
    switch (status) {
      case 'verified': return '#4a7c59'; // Muted green
      case 'pending': return '#b8860b'; // Muted amber
      case 'failed': return '#8b4049'; // Muted red
      default: return '#6b7280'; // Gray
    }
  };

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [77.5946, 12.9716],
      zoom: 15,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'registry-popup',
    });

    map.current.on('load', () => {
      // Add parcel sources and layers
      parcels.forEach((parcel) => {
        const sourceId = `parcel-${parcel.id}`;
        const layerId = `parcel-layer-${parcel.id}`;
        const outlineId = `parcel-outline-${parcel.id}`;

        // Convert coordinates to GeoJSON format
        const coordinates = parcel.polygon.coordinates.map(coord => [coord.lng, coord.lat]);

        map.current?.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              id: parcel.id,
              plotId: parcel.plotId,
              area: parcel.area,
              status: parcel.verificationStatus,
              subdivision: parcel.subdivisionStatus,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates],
            },
          },
        });

        // Fill layer
        map.current?.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': getStatusColor(parcel.verificationStatus),
            'fill-opacity': selectedParcelId === parcel.id ? 0.6 : 0.3,
          },
        });

        // Outline layer
        map.current?.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': getStatusColor(parcel.verificationStatus),
            'line-width': selectedParcelId === parcel.id ? 3 : 2,
          },
        });

        // Hover events
        map.current?.on('mouseenter', layerId, (e) => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
            
            const statusIcon = parcel.verificationStatus === 'verified' ? '✓' : 
                              parcel.verificationStatus === 'pending' ? '◐' : '✗';
            
            const popupContent = `
              <div class="p-3 min-w-[180px]">
                <div class="font-semibold text-sm mb-2">${parcel.plotId}</div>
                <div class="space-y-1 text-xs text-muted-foreground">
                  <div class="flex justify-between">
                    <span>Area</span>
                    <span class="font-medium text-foreground">${parcel.area.toLocaleString()} m²</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Subdivision</span>
                    <span class="font-medium text-foreground capitalize">${parcel.subdivisionStatus}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span>Status</span>
                    <span class="font-medium capitalize flex items-center gap-1">
                      <span>${statusIcon}</span>
                      <span>${parcel.verificationStatus}</span>
                    </span>
                  </div>
                </div>
              </div>
            `;

            popup.current
              ?.setLngLat(parcel.center)
              .setHTML(popupContent)
              .addTo(map.current);
          }
        });

        map.current?.on('mouseleave', layerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
            popup.current?.remove();
          }
        });

        // Click event
        map.current?.on('click', layerId, () => {
          onParcelClick(parcel.id);
        });
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token, parcels, onParcelClick, selectedParcelId]);

  useEffect(() => {
    initializeMap();
    
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initializeMap]);

  // Update parcel highlight when selection changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    parcels.forEach((parcel) => {
      const layerId = `parcel-layer-${parcel.id}`;
      const outlineId = `parcel-outline-${parcel.id}`;

      if (map.current?.getLayer(layerId)) {
        map.current.setPaintProperty(
          layerId,
          'fill-opacity',
          selectedParcelId === parcel.id ? 0.6 : 0.3
        );
      }

      if (map.current?.getLayer(outlineId)) {
        map.current.setPaintProperty(
          outlineId,
          'line-width',
          selectedParcelId === parcel.id ? 3 : 2
        );
      }
    });
  }, [selectedParcelId, parcels]);

  // Handle focus coordinates
  useEffect(() => {
    if (map.current && focusCoords && map.current.isStyleLoaded()) {
      map.current.flyTo({
        center: [focusCoords.lng, focusCoords.lat],
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [focusCoords, zoom]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      <style>{`
        .registry-popup .mapboxgl-popup-content {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 0;
          color: hsl(var(--card-foreground));
        }
        .registry-popup .mapboxgl-popup-tip {
          border-top-color: hsl(var(--card));
        }
      `}</style>
    </div>
  );
};

export default MapView;
