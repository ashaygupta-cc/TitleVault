import FlatTile from '@/components/flat/FlatTile';
import type { Building, Flat } from '@/types/registry';
import React from 'react';

interface FloorRowProps {
  floor: number;
  flats: Flat[];
  building: Building;
  onFlatClick: (flatId: string) => void;
  selectedFlatId?: string;
}

const FloorRow: React.FC<FloorRowProps> = ({ 
  floor, 
  flats, 
  building,
  onFlatClick, 
  selectedFlatId 
}) => {
  const floorFlats = flats.filter(f => f.floor === floor);
  
  return (
    <div className="flex items-stretch gap-1">
      {/* Floor label */}
      <div className="w-11 flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted/30 rounded-l-sm shrink-0">
        {floor}F
      </div>
      
      {/* Flats */}
      <div className="flex-1 flex gap-2">
        {floorFlats.map((flat) => (
          <FlatTile
            key={flat.id}
            flat={flat}
            building={building}
            onClick={() => onFlatClick(flat.id)}
            isSelected={selectedFlatId === flat.id}
          />
        ))}
      </div>
    </div>
  );
};

export default FloorRow;
