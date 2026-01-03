import { cn } from '@/lib/utils';
import type { Building, Flat } from '@/types/registry';
import React, { useState } from 'react';
import FlatHoverCard from './FlatHoverCard';

interface FlatTileProps {
  flat: Flat;
  building: Building;
  onClick: () => void;
  isSelected?: boolean;
}

const FlatTile: React.FC<FlatTileProps> = ({ flat, building, onClick, isSelected }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusClass = () => {
    switch (flat.status) {
      case 'active': return 'bg-status-active text-status-active-foreground';
      case 'agreement': return 'bg-status-agreement text-status-agreement-foreground';
      case 'disputed': return 'bg-status-disputed text-status-disputed-foreground';
      case 'unregistered': return 'bg-status-unregistered text-status-unregistered-foreground';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'w-16 h-12 rounded-sm flex items-center justify-center text-xs font-medium transition-all duration-200',
          getStatusClass(),
          isSelected && 'ring-2 ring-ring ring-offset-1 ring-offset-background scale-105',
          !isSelected && 'hover:scale-102 hover:brightness-110'
        )}
      >
        {flat.flatNumber}
      </button>
      
      {isHovered && !isSelected && (
        <FlatHoverCard flat={flat} building={building} />
      )}
    </div>
  );
};

export default FlatTile;
