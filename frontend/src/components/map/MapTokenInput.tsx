import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Key, ExternalLink } from 'lucide-react';

interface MapTokenInputProps {
  onTokenSubmit: (token: string) => void;
  isLoading?: boolean;
}

const MapTokenInput: React.FC<MapTokenInputProps> = ({ onTokenSubmit, isLoading }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter your Mapbox public token');
      return;
    }
    if (!token.startsWith('pk.')) {
      setError('Token should start with "pk." for public access');
      return;
    }
    setError('');
    onTokenSubmit(token.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">
            Land Registry Map
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your Mapbox public token to view land parcels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="pk.eyJ1Ijoi..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pl-10 font-mono text-sm"
                  disabled={isLoading}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Loading Map...' : 'Load Map'}
            </Button>
            <div className="pt-2 text-center">
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Get your token from Mapbox
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapTokenInput;
