import React from 'react';
import type { Parcel } from '@/types/registry';
import { CheckCircle, AlertCircle, Clock, MapPin } from 'lucide-react';

interface ParcelListProps {
  parcels: Parcel[];
  onParcelClick: (parcelId: string) => void;
  selectedParcelId?: string;
}

const ParcelList: React.FC<ParcelListProps> = ({ parcels, onParcelClick, selectedParcelId }) => {
  const getStatusIcon = (status: Parcel['verificationStatus']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-verified" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-pending" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-failed" />;
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground px-1">Land Parcels</h3>
      <div className="space-y-1">
        {parcels.map((parcel) => (
          <button
            key={parcel.id}
            onClick={() => onParcelClick(parcel.id)}
            className={`w-full p-3 rounded-md text-left transition-colors ${
              selectedParcelId === parcel.id
                ? 'bg-accent border border-ring'
                : 'bg-card hover:bg-accent/50 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium text-sm text-foreground">{parcel.plotId}</div>
                  <div className="text-xs text-muted-foreground">{parcel.surveyId}</div>
                </div>
              </div>
              {getStatusIcon(parcel.verificationStatus)}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{parcel.area.toLocaleString()} m²</span>
              <span className="capitalize">{parcel.subdivisionStatus}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ParcelList;
