import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

const MapLegend: React.FC = () => {
  const legendItems = [
    { 
      status: 'verified', 
      label: 'Verified', 
      color: 'bg-emerald-500', 
      icon: CheckCircle,
      description: 'Ownership confirmed'
    },
    { 
      status: 'pending', 
      label: 'Pending', 
      color: 'bg-amber-500', 
      icon: Clock,
      description: 'Under review'
    },
    { 
      status: 'failed', 
      label: 'Failed', 
      color: 'bg-red-500', 
      icon: XCircle,
      description: 'Verification failed'
    },
  ];

  return (
    <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
      <CardContent className="p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Parcel Status</p>
        <div className="space-y-1.5">
          {legendItems.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${item.color} shrink-0`} />
              <span className="text-xs font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">— {item.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MapLegend;
