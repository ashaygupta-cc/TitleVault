import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  plotId: string;
  address: string;
  area: number;
  status: 'verified' | 'pending' | 'failed';
}

interface ParcelSearchProps {
  onSelect: (parcelId: string) => void;
  className?: string;
}

// Mock address data for autocomplete
const mockAddresses: SearchResult[] = [
  { id: 'parcel-1', plotId: 'PLT-2024-001', address: '123 MG Road, Bangalore', area: 2500, status: 'verified' },
  { id: 'parcel-2', plotId: 'PLT-2024-002', address: '456 Brigade Road, Bangalore', area: 1800, status: 'pending' },
  { id: 'parcel-3', plotId: 'PLT-2024-003', address: '789 Indiranagar, Bangalore', area: 3200, status: 'verified' },
  { id: 'parcel-4', plotId: 'PLT-2024-004', address: '321 Koramangala, Bangalore', area: 2100, status: 'verified' },
  { id: 'parcel-5', plotId: 'PLT-2024-005', address: '654 Whitefield, Bangalore', area: 4500, status: 'failed' },
  { id: 'parcel-6', plotId: 'PLT-2024-006', address: '987 Electronic City, Bangalore', area: 5000, status: 'pending' },
];

const ParcelSearch: React.FC<ParcelSearchProps> = ({ onSelect, className }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulated search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const filtered = mockAddresses.filter(
        addr => 
          addr.address.toLowerCase().includes(query.toLowerCase()) ||
          addr.plotId.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setIsOpen(true);
      setIsSearching(false);
      setHighlightedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.address);
    setIsOpen(false);
    onSelect(result.id);
  };

  const getStatusColor = (status: SearchResult['status']) => {
    switch (status) {
      case 'verified': return 'bg-emerald-500';
      case 'pending': return 'bg-amber-500';
      case 'failed': return 'bg-red-500';
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search address or plot ID..."
          className="pl-9 pr-8 h-9 bg-muted/50 border-border/50 focus:bg-background"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {isSearching && (
          <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No results found for "{query}"
            </div>
          ) : (
            <ul className="py-1">
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full px-3 py-2 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors",
                      highlightedIndex === index && "bg-muted/50"
                    )}
                  >
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{result.address}</span>
                        <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor(result.status))} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{result.plotId}</span>
                        <span className="text-xs text-muted-foreground">• {result.area.toLocaleString()} m²</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ParcelSearch;
