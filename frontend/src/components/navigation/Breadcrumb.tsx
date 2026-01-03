import React from 'react';
import { ChevronRight, MapPin, Building2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'parcel' | 'building' | 'flat';
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (type: 'parcel' | 'building' | 'flat' | 'map', id?: string) => void;
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onNavigate, className }) => {
  const getIcon = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'parcel': return MapPin;
      case 'building': return Building2;
      case 'flat': return Home;
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className={cn("flex items-center gap-1 text-sm", className)}>
      {/* Map root */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate('map')}
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
      >
        Map
      </Button>

      {items.map((item, index) => {
        const Icon = getIcon(item.type);
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.type}-${item.id}`}>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => !isLast && onNavigate(item.type, item.id)}
              className={cn(
                "h-7 px-2 gap-1.5",
                isLast 
                  ? "text-foreground font-medium cursor-default hover:bg-transparent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              disabled={isLast}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="max-w-24 truncate">{item.label}</span>
            </Button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
