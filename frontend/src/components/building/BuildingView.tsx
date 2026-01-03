import type { Building, Flat } from '@/types/registry';
import { AlertCircle, Building2, CheckCircle, Clock } from 'lucide-react';
import React from 'react';
import FloorRow from './FloorRow';

interface BuildingViewProps {
  building: Building;
  flats: Flat[];
  onFlatClick: (flatId: string) => void;
  selectedFlatId?: string;
}

const BuildingView: React.FC<BuildingViewProps> = ({
  building,
  flats,
  onFlatClick,
  selectedFlatId,
}) => {
  // Generate floors from top to bottom (highest floor first)
  const floors = Array.from({ length: building.totalFloors }, (_, i) => building.totalFloors - i);

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

  // Calculate statistics
  const stats = {
    total: flats.length,
    active: flats.filter(f => f.status === 'active').length,
    agreement: flats.filter(f => f.status === 'agreement').length,
    disputed: flats.filter(f => f.status === 'disputed').length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Building Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground truncate">{building.name}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {building.shortId} • {building.totalFloors} floors • {flats.length} units
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getStatusIcon(building.verificationStatus)}
            <span className="text-sm capitalize text-muted-foreground whitespace-nowrap">
              {building.verificationStatus}
            </span>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-lg font-semibold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-md bg-status-active/10 p-2 text-center">
            <div className="text-lg font-semibold text-status-active">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-md bg-status-agreement/10 p-2 text-center">
            <div className="text-lg font-semibold text-status-agreement">{stats.agreement}</div>
            <div className="text-xs text-muted-foreground">Agreement</div>
          </div>
          <div className="rounded-md bg-status-disputed/10 p-2 text-center">
            <div className="text-lg font-semibold text-status-disputed">{stats.disputed}</div>
            <div className="text-xs text-muted-foreground">Disputed</div>
          </div>
        </div>
      </div>

      {/* Building Elevation - Orthographic View */}
      <div className="flex-1 overflow-auto p-4 pr-6 bg-panel">
        <div className="w-full">
          {/* Roof */}
          <div className="h-4 bg-gradient-to-b from-muted to-transparent rounded-t-md mb-1 ml-11" />
          
          {/* Floors */}
          <div className="space-y-1 space-x-5">
            {floors.map((floor) => (
              <FloorRow
                key={floor}
                floor={floor}
                flats={flats}
                building={building}
                onFlatClick={onFlatClick}
                selectedFlatId={selectedFlatId}
              />
            ))}
          </div>

          {/* Ground/Foundation */}
          <div className="h-3 bg-gradient-to-t from-muted to-transparent rounded-b-md mt-1 ml-11" />
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-status-active" />
            <span className="text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-status-agreement" />
            <span className="text-muted-foreground">Agreement</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-status-disputed" />
            <span className="text-muted-foreground">Disputed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-status-unregistered" />
            <span className="text-muted-foreground">Unregistered</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingView;
