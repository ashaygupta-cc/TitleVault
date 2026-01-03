import type { Building, Flat } from '@/types/registry';
import { AlertCircle, CheckCircle, Clock, Home } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface FlatHoverCardProps {
  flat: Flat;
  building: Building;
}

const FlatHoverCard: React.FC<FlatHoverCardProps> = ({ flat, building }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.parentElement?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.top - cardRef.current.offsetHeight - 8,
          left: rect.left + rect.width / 2 - cardRef.current.offsetWidth / 2
        });
      }
    }
  }, []);

  const getStatusBadge = () => {
    const baseClass = 'px-1.5 py-0.5 rounded text-[10px] font-medium';
    switch (flat.status) {
      case 'active': return <span className={`${baseClass} bg-status-active/20 text-status-active`}>Active</span>;
      case 'agreement': return <span className={`${baseClass} bg-status-agreement/20 text-status-agreement`}>Agreement</span>;
      case 'disputed': return <span className={`${baseClass} bg-status-disputed/20 text-status-disputed`}>Disputed</span>;
      case 'unregistered': return <span className={`${baseClass} bg-status-unregistered/20 text-muted-foreground`}>Unregistered</span>;
    }
  };

  const getVerificationIcon = (status: 'verified' | 'pending' | 'failed') => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-3 w-3 text-verified" />;
      case 'pending': return <Clock className="h-3 w-3 text-pending" />;
      case 'failed': return <AlertCircle className="h-3 w-3 text-failed" />;
    }
  };

  return (
    <div 
      ref={cardRef}
      className="fixed z-50 w-56 bg-card border border-border rounded-md shadow-lg p-3 animate-fade-in pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxWidth: '100vw'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">Flat {flat.flatNumber}</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Floor</span>
          <span className="text-foreground">{flat.floor}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Holder</span>
          <span className="text-foreground">{flat.currentHolder}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Building</span>
          <span className="text-foreground">{building.shortId}</span>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="mt-2 pt-2 border-t border-border">
        <div className="text-[10px] text-muted-foreground truncate">
          Land → {building.shortId} → Floor {flat.floor} → {flat.flatNumber}
        </div>
      </div>

      {/* Verification Progress */}
      <div className="mt-2 pt-2 border-t border-border">
        <div className="grid grid-cols-4 gap-1">
          <div className="flex flex-col items-center gap-0.5">
            {getVerificationIcon(flat.verificationStatus)}
            <span className="text-[8px] text-muted-foreground">Registry</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            {getVerificationIcon(flat.verificationStatus)}
            <span className="text-[8px] text-muted-foreground">Document</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            {getVerificationIcon(flat.status === 'disputed' ? 'failed' : flat.verificationStatus)}
            <span className="text-[8px] text-muted-foreground">Chain</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            {getVerificationIcon(flat.status === 'disputed' ? 'pending' : flat.verificationStatus)}
            <span className="text-[8px] text-muted-foreground">Geo</span>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card" style={{ filter: 'drop-shadow(0 1px 0 hsl(var(--border)))' }} />
    </div>
  );
};

export default FlatHoverCard;
