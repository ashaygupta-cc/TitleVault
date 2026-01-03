import type { Parcel } from '@/types/registry';
import React from 'react';
import LeafletMapView from './LeafletMapView';
import type { MapProvider } from './MapProviderSelector';
import MapView from './MapView';

interface UnifiedMapViewProps {
  provider: MapProvider;
  mapboxToken?: string;
  parcels?: Parcel[];
  onParcelClick: (parcelId: string) => void;
  selectedParcelId?: string;
  focusCoords?: { lat: number; lng: number };
  zoom?: number;
}

const UnifiedMapView: React.FC<UnifiedMapViewProps> = ({
  provider,
  mapboxToken,
  parcels,
  onParcelClick,
  selectedParcelId,
  focusCoords,
  zoom = 15,
}) => {
  // 🛡️ HARD SAFETY: never pass undefined
  const safeParcels: Parcel[] = Array.isArray(parcels) ? parcels : [];

  // 🟦 Mapbox path (only if fully valid)
  if (provider === 'mapbox' && typeof mapboxToken === 'string' && mapboxToken.length > 0) {
    try {
      return (
        <MapView
          token={mapboxToken}
          parcels={safeParcels}
          onParcelClick={onParcelClick}
          selectedParcelId={selectedParcelId}
          focusCoords={focusCoords}
          zoom={zoom}
        />
      );
    } catch (err) {
      console.error('Mapbox failed, falling back to Leaflet', err);
    }
  }

  // 🟩 Leaflet fallback (ALWAYS SAFE)
  return (
    <LeafletMapView
      parcels={safeParcels}
      onParcelClick={onParcelClick}
      selectedParcelId={selectedParcelId}
      focusCoords={focusCoords}
      zoom={zoom}
    />
  );
};

export default UnifiedMapView;
