import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { http } from "@/services/http";
import type { Building, Flat, Parcel } from "@/types/registry";
import { Building2, FileText, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: 'parcel' | 'building' | 'flat';
  name: string;
  description: string;
  parcelId: string; // The parcel this item belongs to
  center?: { lat: number; lng: number }; // Center of the parcel
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const allResults: SearchResult[] = [];
      const queryLower = query.toLowerCase();

      // Fetch all parcels with buildings and flats
      const parcelsResp = await http.get('/registry/list?limit=50');
      const parcels = parcelsResp.items || [];

      console.log(`[GlobalSearch] Searching for: "${query}"`);
      console.log(`[GlobalSearch] Total parcels to search: ${parcels.length}`);

      // For each parcel, search for buildings and flats
      for (const parcel of parcels) {
        // First get the parcel geo data
        let parcelCenter: { lat: number; lng: number } | undefined;
        try {
          const geo = await http.get(`/map/parcel/${encodeURIComponent(parcel.record_hash)}`);
          if (geo && geo.geometry && geo.geometry.coordinates) {
            const coords = geo.geometry.coordinates;
            if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
              const lngLat = coords[0][0];
              parcelCenter = { lng: lngLat[0], lat: lngLat[1] };
            }
          }
        } catch (e) {
          console.warn(`[GlobalSearch] Failed to get geo for parcel ${parcel.record_hash}`);
        }

        // Check if parcel matches search query
        const parcelHashMatch = parcel.record_hash && parcel.record_hash.toLowerCase().includes(queryLower);
        const parcelAreaMatch = parcel.area_m2 && String(parcel.area_m2).includes(queryLower);
        const parcelOwnerMatch = parcel.owner_address && parcel.owner_address.toLowerCase().includes(queryLower);

        if (parcelHashMatch || parcelAreaMatch || parcelOwnerMatch) {
          allResults.push({
            id: parcel.record_hash,
            type: 'parcel',
            name: `Parcel ${parcel.record_hash.substring(0, 20)}...`,
            description: `${parcel.area_m2} m² • ${parcel.registry_status || 'unknown'}`,
            parcelId: parcel.record_hash,
            center: parcelCenter,
          });
        }

        // Search buildings for this parcel
        try {
          const buildingsResp = await http.get(`/building/by-land/${encodeURIComponent(parcel.record_hash)}`);
          if (Array.isArray(buildingsResp)) {
            for (const building of buildingsResp) {
              const buildingNameMatch = building.name && building.name.toLowerCase().includes(queryLower);
              const buildingIdMatch = building.id && building.id.toLowerCase().includes(queryLower);

              if (buildingNameMatch || buildingIdMatch) {
                allResults.push({
                  id: building.id,
                  type: 'building',
                  name: building.name || `Building ${building.id.substring(0, 8)}...`,
                  description: `${building.totalFloors || 1} floors • ${building.flatsPerFloor || 4} units`,
                  parcelId: parcel.record_hash,
                  center: parcelCenter,
                });
              }

              // Search flats for this building
              try {
                const flatsResp = await http.get(`/flat/by-building/${encodeURIComponent(building.id)}`);
                if (flatsResp.flats && Array.isArray(flatsResp.flats)) {
                  for (const flat of flatsResp.flats) {
                    const flatNumberMatch = flat.flat_number && String(flat.flat_number).includes(queryLower);
                    const flatIdMatch = flat.flat_id && flat.flat_id.toLowerCase().includes(queryLower);

                    if (flatNumberMatch || flatIdMatch) {
                      allResults.push({
                        id: flat.flat_id,
                        type: 'flat',
                        name: `Flat ${flat.flat_number}`,
                        description: `Floor ${flat.floor_number} • ${flat.area_m2} m²`,
                        parcelId: parcel.record_hash,
                        center: parcelCenter,
                      });
                    }
                  }
                }
              } catch (e) {
                // Skip if flats can't be fetched
              }
            }
          }
        } catch (e) {
          // Skip if buildings can't be fetched for this parcel
        }
      }

      console.log(`[GlobalSearch] Found ${allResults.length} parcels/buildings/flats`);

      // Search for direct building by ID
      try {
        const buildingResp = await http.get(`/building/${encodeURIComponent(query)}`).catch(() => null);
        if (buildingResp) {
          console.log(`[GlobalSearch] Direct building found:`, buildingResp);
          
          // Check if this building already exists in results (avoid duplicates)
          const buildingExists = allResults.some(r => r.id === buildingResp.building_id && r.type === 'building');
          if (!buildingExists) {
            const parcelId = buildingResp.land_record_hash;
            
            // Get parcel geo
            try {
              const geoResp = await http.get(`/map/parcel/${encodeURIComponent(parcelId)}`).catch(() => null);
              let center: { lat: number; lng: number } | undefined;
              if (geoResp && geoResp.geometry && geoResp.geometry.coordinates) {
                const coords = geoResp.geometry.coordinates;
                if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                  const lngLat = coords[0][0];
                  center = { lng: lngLat[0], lat: lngLat[1] };
                }
              }

              allResults.push({
                id: buildingResp.building_id,
                type: 'building',
                name: buildingResp.name || `Building ${buildingResp.building_id.substring(0, 8)}`,
                description: `${buildingResp.total_floors || 1} floors`,
                parcelId: parcelId,
                center: center,
              });
              console.log(`[GlobalSearch] Added direct building result`);
            } catch (e) {
              console.error(`[GlobalSearch] Failed to get parcel geo for building:`, e);
            }
          } else {
            console.log(`[GlobalSearch] Building already in results, skipping duplicate`);
          }
        }
      } catch (e) {
        console.error(`[GlobalSearch] Direct building search error:`, e);
      }

      // Also search for agreements by ID
      try {
        const agreementResp = await http.get(`/agreement/${encodeURIComponent(query)}`).catch(() => null);
        if (agreementResp) {
          // Check if agreement already exists (avoid duplicates)
          const agreementExists = allResults.some(r => r.id === agreementResp.agreement_id);
          if (!agreementExists) {
            // Found an agreement - now find which flat/building it's attached to
            const subjectId = agreementResp.subject_id;
            const subjectType = agreementResp.subject_type; // 'FLAT' or 'BUILDING'
            
            console.log(`[GlobalSearch] Agreement found - Subject: ${subjectType} ${subjectId}`);

            if (subjectType === 'FLAT') {
            // Get the flat to find building and parcel
            try {
              const flatResp = await http.get(`/flat/${encodeURIComponent(subjectId)}`).catch(() => null);
              console.log(`[GlobalSearch] Flat response:`, flatResp);
              
              if (flatResp) {
                const buildingId = flatResp.building_id;
                console.log(`[GlobalSearch] Building ID from flat: ${buildingId}`);
                
                // Get building to find parcel
                try {
                  const buildingResp = await http.get(`/building/${encodeURIComponent(buildingId)}`).catch(() => null);
                  console.log(`[GlobalSearch] Building response:`, buildingResp);
                  
                  if (buildingResp) {
                    const parcelId = buildingResp.land_record_hash || buildingResp.parcelId;
                    console.log(`[GlobalSearch] Parcel ID: ${parcelId}`);
                    
                    // Get parcel geo
                    try {
                      const geoResp = await http.get(`/map/parcel/${encodeURIComponent(parcelId)}`).catch(() => null);
                      console.log(`[GlobalSearch] Geo response:`, geoResp);
                      
                      let center: { lat: number; lng: number } | undefined;
                      if (geoResp && geoResp.geometry && geoResp.geometry.coordinates) {
                        const coords = geoResp.geometry.coordinates;
                        if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                          const lngLat = coords[0][0];
                          center = { lng: lngLat[0], lat: lngLat[1] };
                        }
                      }

                      allResults.push({
                        id: agreementResp.agreement_id || subjectId,
                        type: 'flat',
                        name: `Flat ${flatResp.flat_number} (Agreement)`,
                        description: `Status: ${agreementResp.status || 'unknown'}`,
                        parcelId: parcelId,
                        center: center,
                      });
                      console.log(`[GlobalSearch] Added agreement result for flat`);
                    } catch (e) {
                      console.error(`[GlobalSearch] Geo fetch error:`, e);
                    }
                  }
                } catch (e) {
                  console.error(`[GlobalSearch] Building fetch error:`, e);
                }
              }
            } catch (e) {
              console.error(`[GlobalSearch] Flat fetch error:`, e);
            }
          } else if (subjectType === 'BUILDING') {
            // Get building to find parcel
            try {
              const buildingResp = await http.get(`/building/${encodeURIComponent(subjectId)}`).catch(() => null);
              console.log(`[GlobalSearch] Building response:`, buildingResp);
              
              if (buildingResp) {
                const parcelId = buildingResp.land_record_hash || buildingResp.parcelId;
                console.log(`[GlobalSearch] Parcel ID: ${parcelId}`);
                
                // Get parcel geo
                try {
                  const geoResp = await http.get(`/map/parcel/${encodeURIComponent(parcelId)}`).catch(() => null);
                  console.log(`[GlobalSearch] Geo response:`, geoResp);
                  
                  let center: { lat: number; lng: number } | undefined;
                  if (geoResp && geoResp.geometry && geoResp.geometry.coordinates) {
                    const coords = geoResp.geometry.coordinates;
                    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                      const lngLat = coords[0][0];
                      center = { lng: lngLat[0], lat: lngLat[1] };
                    }
                  }

                  allResults.push({
                    id: agreementResp.agreement_id || subjectId,
                    type: 'building',
                    name: `${buildingResp.name || 'Building'} (Agreement)`,
                    description: `Status: ${agreementResp.status || 'unknown'}`,
                    parcelId: parcelId,
                    center: center,
                  });
                  console.log(`[GlobalSearch] Added agreement result for building`);
                } catch (e) {
                  console.error(`[GlobalSearch] Geo fetch error:`, e);
                }
              }
            } catch (e) {
              console.error(`[GlobalSearch] Building fetch error:`, e);
            }
            }
          }
        }
      } catch (e) {
        console.error(`[GlobalSearch] Agreement search error:`, e);
      }

      console.log(`[GlobalSearch] Final ${allResults.length} results`);
      setResults(allResults.slice(0, 20)); // Limit to 20 results
    } catch (error) {
      console.error('[GlobalSearch] Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    performSearch(value);
  };

  const handleSelect = (result: SearchResult) => {
    console.log(`[GlobalSearch] handleSelect called with:`, result);
    console.log(`[GlobalSearch] Type: ${result.type}, ID: ${result.id}, ParcelID: ${result.parcelId}`);
    console.log(`[GlobalSearch] Center:`, result.center);
    
    setOpen(false);
    
    // Build the URL
    let url = '';
    if (result.center) {
      url = `/registry?search=${result.parcelId}&type=parcel&lat=${result.center.lat}&lng=${result.center.lng}`;
      console.log(`[GlobalSearch] URL with center:`, url);
    } else {
      url = `/registry?search=${result.parcelId}&type=parcel`;
      console.log(`[GlobalSearch] URL without center:`, url);
    }
    
    // Use setTimeout to ensure dialog closes first
    setTimeout(() => {
      console.log(`[GlobalSearch] setTimeout callback - navigating to:`, url);
      try {
        navigate(url);
        console.log(`[GlobalSearch] navigate() call completed`);
      } catch (error) {
        console.error(`[GlobalSearch] Error in navigate:`, error);
        console.log(`[GlobalSearch] Using window.location.href as fallback`);
        window.location.href = url;
      }
    }, 100);
  };

  // Group results by type
  const parcelResults = results.filter(r => r.type === 'parcel');
  const buildingResults = results.filter(r => r.type === 'building');
  const flatResults = results.filter(r => r.type === 'flat');

  console.log(`[GlobalSearch] Filtering results:`, {
    total: results.length,
    parcelResults: parcelResults.length,
    buildingResults: buildingResults.length,
    flatResults: flatResults.length,
    allResults: results.map(r => ({ id: r.id, type: r.type }))
  });

  // Log what will be rendered
  if (buildingResults.length > 0) {
    console.log(`[GlobalSearch] Rendering ${buildingResults.length} building(s):`, buildingResults.map(r => ({ id: r.id, name: r.name })));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search registry...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search for parcels, buildings, and flats in the registry.
        </DialogDescription>
        <CommandInput 
          placeholder="Search parcels, buildings, flats..." 
          onValueChange={handleInputChange}
        />
        <CommandList>
          {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
          {!isLoading && !searchQuery && <CommandEmpty>Type to search...</CommandEmpty>}
          {!isLoading && searchQuery && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {parcelResults.length > 0 && (
            <>
              <CommandGroup heading="Parcels">
                {parcelResults.map((result) => (
                  <CommandItem
                    key={`parcel-${result.id}`}
                    value={`parcel-${result.id}`}
                    onSelect={() => {
                      console.log(`[GlobalSearch] onSelect fired for parcel:`, result);
                      handleSelect(result);
                    }}
                    onClick={() => {
                      console.log(`[GlobalSearch] onClick fired for parcel:`, result);
                      handleSelect(result);
                    }}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium">{result.name}</span>
                      <span className="text-xs text-muted-foreground">{result.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {(buildingResults.length > 0 || flatResults.length > 0) && <CommandSeparator />}
            </>
          )}

          {buildingResults.length > 0 && (
            <>
              <CommandGroup heading="Buildings">
                {buildingResults.map((result, index) => {
                  console.log(`[GlobalSearch] Rendering building item ${index + 1}/${buildingResults.length}:`, { id: result.id, name: result.name, center: result.center });
                  return (
                    <CommandItem
                      key={`building-${result.id}`}
                      value={`building-${result.id}`}
                      onSelect={() => {
                        console.log(`[GlobalSearch] onSelect fired for building:`, result);
                        handleSelect(result);
                      }}
                      onClick={() => {
                        console.log(`[GlobalSearch] onClick fired for building:`, result);
                        handleSelect(result);
                      }}
                      className="cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">{result.name}</span>
                        <span className="text-xs text-muted-foreground">{result.description}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {flatResults.length > 0 && <CommandSeparator />}
            </>
          )}

          {flatResults.length > 0 && (
            <>
              <CommandGroup heading="Flats">
                {flatResults.map((result) => (
                  <CommandItem
                    key={`flat-${result.id}`}
                    value={`flat-${result.id}`}
                    onSelect={() => {
                      console.log(`[GlobalSearch] onSelect fired for flat:`, result);
                      handleSelect(result);
                    }}
                    onClick={() => {
                      console.log(`[GlobalSearch] onClick fired for flat:`, result);
                      handleSelect(result);
                    }}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 text-green-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">{result.name}</span>
                      <span className="text-xs text-muted-foreground">{result.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Quick Actions">
            <CommandItem
              value="verify document"
              onSelect={() => { setOpen(false); navigate("/registry?panel=verify"); }}
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4 text-purple-500" />
              <span>Verify Document Hash</span>
            </CommandItem>
            <CommandItem
              value="court evidence"
              onSelect={() => { setOpen(false); navigate("/registry?panel=court"); }}
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4 text-red-500" />
              <span>Generate Court Evidence</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
