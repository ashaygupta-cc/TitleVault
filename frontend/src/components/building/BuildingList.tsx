import type { Building } from '@/types/registry';
import { AlertCircle, Building2, CheckCircle, Clock } from 'lucide-react';
import React from 'react';

interface BuildingListProps {
  buildings: Building[];
  onBuildingClick: (buildingId: string) => void;
  selectedBuildingId?: string;
}

const BuildingList: React.FC<BuildingListProps> = ({
  buildings,
  onBuildingClick,
  selectedBuildingId,
}) => {
  const getStatusIcon = (status: Building['verificationStatus']) => {
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
      <h3 className="text-sm font-medium text-muted-foreground px-1">Buildings</h3>
      <div className="space-y-1">
        {buildings.map((building) => (
          <button
            key={building.id}
            onClick={() => onBuildingClick(building.id)}
            className={`w-full p-3 rounded-md text-left transition-colors ${
              selectedBuildingId === building.id
                ? 'bg-accent border border-ring'
                : 'bg-card hover:bg-accent/50 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">{building.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{building.shortId}</div>
                </div>
              </div>
              {getStatusIcon(building.verificationStatus)}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{building.totalFloors} floors</span>
              <span>{building.flatsPerFloor * building.totalFloors} units</span>
              <span>Built {building.constructionYear}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BuildingList;
