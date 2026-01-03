import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Map, Sparkles, ExternalLink, Check } from 'lucide-react';

export type MapProvider = 'leaflet' | 'mapbox';

interface MapProviderSelectorProps {
  provider: MapProvider;
  onProviderChange: (provider: MapProvider) => void;
  mapboxToken: string;
  onMapboxTokenChange: (token: string) => void;
}

const MapProviderSelector: React.FC<MapProviderSelectorProps> = ({
  provider,
  onProviderChange,
  mapboxToken,
  onMapboxTokenChange,
}) => {
  const [tokenInput, setTokenInput] = useState(mapboxToken);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const handleApplyToken = () => {
    if (!tokenInput.trim()) {
      setError('Please enter your Mapbox token');
      return;
    }
    if (!tokenInput.startsWith('pk.')) {
      setError('Token should start with "pk."');
      return;
    }
    setError('');
    onMapboxTokenChange(tokenInput.trim());
    onProviderChange('mapbox');
    setIsOpen(false);
  };

  const handleSwitchToLeaflet = () => {
    onProviderChange('leaflet');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Map className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {provider === 'mapbox' ? 'Mapbox' : 'OpenStreetMap'}
          </span>
          {provider === 'mapbox' && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              Premium
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Map Provider</h4>
            <p className="text-xs text-muted-foreground">
              Choose between free OpenStreetMap or premium Mapbox
            </p>
          </div>

          {/* Provider Options */}
          <div className="space-y-2">
            <button
              onClick={handleSwitchToLeaflet}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                provider === 'leaflet' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">OpenStreetMap</span>
                </div>
                {provider === 'leaflet' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Free, no API key required
              </p>
            </button>

            <div
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                provider === 'mapbox' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">Mapbox</span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                    Premium
                  </Badge>
                </div>
                {provider === 'mapbox' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Higher quality maps, better styling
              </p>

              {/* Token Input */}
              <div className="mt-3 ml-6 space-y-2">
                <Input
                  type="text"
                  placeholder="pk.eyJ1Ijoi..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleApplyToken}
                    className="h-7 text-xs"
                    disabled={!tokenInput.trim()}
                  >
                    Use Mapbox
                  </Button>
                  <a
                    href="https://account.mapbox.com/access-tokens/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Get token
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MapProviderSelector;
