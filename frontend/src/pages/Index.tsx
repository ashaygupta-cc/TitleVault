import AdminFlatPanel from '@/components/admin/AdminFlatPanel';
import AgreementCreatePanel from '@/components/admin/AgreementCreatePanel';
import AgreementManagementPanel from '@/components/admin/AgreementManagementPanel';
import AgreementMerkleAnchorPanel from '@/components/admin/AgreementMerkleAnchorPanel';
import BuildingCreatePanel from '@/components/admin/BuildingCreatePanel';
import FlatCreatePanel from '@/components/admin/FlatCreatePanel';
import RegistryCreatePanel from '@/components/admin/RegistryCreatePanel';
import RegistryMerkleAnchorPanel from '@/components/admin/RegistryMerkleAnchorPanel';
import SubdivisionPanel from '@/components/admin/SubdivisionPanel';
import TransferInitiationPanel from '@/components/admin/TransferInitiationPanel';
import BuildingList from '@/components/building/BuildingList';
import BuildingView from '@/components/building/BuildingView';
import MapLegend from '@/components/map/MapLegend';
import MapProviderSelector, { type MapProvider } from '@/components/map/MapProviderSelector';
import UnifiedMapView from '@/components/map/UnifiedMapView';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import RegistryPanel from '@/components/registry/RegistryPanel';
import AnalyticsPanel from '@/components/user/AnalyticsPanel';
import ExplorerPanel from '@/components/user/ExplorerPanel';
import { registryApi } from '@/services/registryApi';
import type { AdminPanelType, UserPanelType } from '@/types/admin';
import type { Building, Flat, FlatDetails, Parcel, ViewMode } from '@/types/registry';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import DocumentUploadPanel from '@/components/documents/DocumentUploadPanel';
import Footer from '@/components/layout/Footer';
import RealtimeStatusPanel from '@/components/realtime/RealtimeStatusPanel';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import ParcelSearch from '@/components/search/ParcelSearch';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CourtPanel from '@/components/user/CourtPanel';
import MerkleProofPanel from '@/components/user/MerkleProofPanel';
import VerifyPanel from '@/components/user/VerifyPanel';
import type { DemoUser } from '@/pages/Auth';
import { http } from '@/services/http';
import {
    ArrowRightLeft,
    BarChart3,
    Building2,
    CheckCircle,
    FileCheck,
    FileSignature,
    FileText,
    Home,
    Layers,
    LogOut,
    Map,
    Radio,
    Scale,
    Scissors,
    Search,
    Settings,
    Shield,
    TreeDeciduous,
    User,
    X
} from 'lucide-react';

type PanelMode = 'user' | 'admin';
type ExtendedAdminPanelType = AdminPanelType | 'transfer-initiate';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>();
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>();
  const [selectedFlatId, setSelectedFlatId] = useState<string>();
  const [flatDetails, setFlatDetails] = useState<FlatDetails>();
  
  // Map provider state
  const [mapProvider, setMapProvider] = useState<MapProvider>('leaflet');
  const [mapboxToken, setMapboxToken] = useState('');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  
  // Panel state
  const [panelMode, setPanelMode] = useState<PanelMode>('user');
  const [adminPanel, setAdminPanel] = useState<ExtendedAdminPanelType>('registry-create');
  const [agreementSubPanel, setAgreementSubPanel] = useState<'create' | 'manage'>('create');
  const [userPanel, setUserPanel] = useState<UserPanelType>('explorer');
  const [showFlatDetails, setShowFlatDetails] = useState(false);
  const [activeSection, setActiveSection] = useState<'map' | 'tools' | 'settings'>('map');
  const [mapFocusCoords, setMapFocusCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [mapZoom, setMapZoom] = useState(15);

  // Check auth on mount
  useEffect(() => {
    const stored = localStorage.getItem('titlevault_user');
    if (stored) {
      const user = JSON.parse(stored) as DemoUser;
      setCurrentUser(user);
      setPanelMode(user.role === 'admin' ? 'admin' : 'user');
    } else {
      navigate('/auth');
    }
  }, [navigate]);

  // Handle URL search parameters (from GlobalSearch)
  useEffect(() => {
    const searchId = searchParams.get('search');
    const searchType = searchParams.get('type');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    console.log('[Index] URL params:', { searchId, searchType, lat, lng });

    if (searchId && searchType) {
      if (searchType === 'parcel') {
        setSelectedParcelId(searchId);
        // Focus map on coordinates if provided
        if (lat && lng) {
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lng);
          if (!isNaN(latNum) && !isNaN(lngNum)) {
            setMapFocusCoords({ lat: latNum, lng: lngNum });
            setMapZoom(17); // Zoom in on the parcel
            console.log(`[Index] Setting map focus to ${latNum}, ${lngNum} at zoom 17`);
          } else {
            console.error('[Index] Failed to parse coordinates:', { lat, lng, latNum, lngNum });
          }
        }
      } else if (searchType === 'building') {
        // For building search, find the parent parcel
        console.log(`[Index] Searching for building ${searchId} to find parent parcel`);
        registryApi.getBuilding(searchId)
          .then(building => {
            if (building && building.parcelId) {
              console.log(`[Index] Found building's parent parcel: ${building.parcelId}`);
              setSelectedParcelId(building.parcelId);
              setSelectedBuildingId(searchId);
              // Fetch parcel geospatial data to get coordinates
              registryApi.getParcelGeo(building.parcelId)
                .then(geo => {
                  if (geo && geo.geometry && geo.geometry.coordinates) {
                    const coords = geo.geometry.coordinates[0][0]; // [lng, lat]
                    const lng = coords[0];
                    const lat = coords[1];
                    setMapFocusCoords({ lat, lng });
                    setMapZoom(17);
                    console.log(`[Index] Building's parcel center: ${lat}, ${lng}`);
                  }
                })
                .catch(err => console.error('[Index] Failed to fetch parcel geo:', err));
            }
          })
          .catch(err => console.error('[Index] Failed to fetch building:', err));
      } else if (searchType === 'flat') {
        // For flat search, find building -> parent parcel
        console.log(`[Index] Searching for flat ${searchId} to find parent building/parcel`);
        registryApi.getFlat(searchId)
          .then(flat => {
            if (flat && flat.buildingId) {
              console.log(`[Index] Found flat's parent building: ${flat.buildingId}`);
              setSelectedFlatId(searchId);
              return registryApi.getBuilding(flat.buildingId);
            }
            throw new Error('Flat has no building');
          })
          .then(building => {
            if (building && building.parcelId) {
              console.log(`[Index] Found building's parent parcel: ${building.parcelId}`);
              setSelectedParcelId(building.parcelId);
              setSelectedBuildingId(building.id);
              // Fetch parcel geospatial data to get coordinates
              return registryApi.getParcelGeo(building.parcelId);
            }
            throw new Error('Building has no parcel');
          })
          .then(geo => {
            if (geo && geo.geometry && geo.geometry.coordinates) {
              const coords = geo.geometry.coordinates[0][0]; // [lng, lat]
              const lng = coords[0];
              const lat = coords[1];
              setMapFocusCoords({ lat, lng });
              setMapZoom(17);
              console.log(`[Index] Flat's parcel center: ${lat}, ${lng}`);
            }
          })
          .catch(err => console.error('[Index] Failed to resolve flat chain:', err));
      }
    }
  }, [searchParams]);

  useEffect(() => { 
    registryApi.getParcels()
      .then(setParcels)
      .catch((err) => {
        console.error('Failed to fetch parcels:', err);
        setParcels([]);
      });
  }, []);
  useEffect(() => { 
    if (selectedParcelId) {
      registryApi.getBuildingsForParcel(selectedParcelId)
        .then(setBuildings)
        .catch((err) => {
          console.error('Failed to fetch buildings:', err);
          setBuildings([]);
        });
    }
  }, [selectedParcelId]);

  useEffect(() => { 
    if (selectedBuildingId) {
      registryApi.getFlatsForBuilding(selectedBuildingId)
        .then(setFlats)
        .catch((err) => {
          console.error('Failed to fetch flats:', err);
          setFlats([]);
        });
    }
  }, [selectedBuildingId]);
  useEffect(() => { 
    if (selectedFlatId) {
      registryApi.getFlatDetails(selectedFlatId)
        .then((details) => {
          setFlatDetails(details);
          setShowFlatDetails(true);
        })
        .catch((err) => {
          console.error('Failed to fetch flat details:', err);
          setFlatDetails(undefined);
        });
    } else {
      setFlatDetails(undefined);
      setShowFlatDetails(false);
    }
  }, [selectedFlatId]);

  const handleParcelClick = (parcelId: string) => { 
    setSelectedParcelId(parcelId); 
    setSelectedBuildingId(undefined); 
    setSelectedFlatId(undefined); 
  };
  
  const handleBuildingClick = (buildingId: string) => { 
    setSelectedBuildingId(buildingId); 
    setSelectedFlatId(undefined); 
    setViewMode('building'); 
  };
  
  const handleFlatClick = (flatId: string) => { 
    setSelectedFlatId(flatId); 
  };
  
  const handleBack = () => { 
    if (showFlatDetails) {
      setShowFlatDetails(false);
      setSelectedFlatId(undefined);
    } else if (viewMode === 'building') { 
      setViewMode('map'); 
      setSelectedBuildingId(undefined); 
      setSelectedFlatId(undefined);
    } 
  };

  const handleLogout = () => {
    localStorage.removeItem('titlevault_user');
    try { http.setTokens(null, null); } catch (e) {}
    setCurrentUser(null);
    navigate('/auth');
  };

  const handleBreadcrumbNavigate = (type: 'parcel' | 'building' | 'flat' | 'map', id?: string) => {
    if (type === 'map') {
      setViewMode('map');
      setSelectedParcelId(undefined);
      setSelectedBuildingId(undefined);
      setSelectedFlatId(undefined);
      setShowFlatDetails(false);
    } else if (type === 'parcel') {
      setViewMode('map');
      setSelectedBuildingId(undefined);
      setSelectedFlatId(undefined);
      setShowFlatDetails(false);
    } else if (type === 'building') {
      setSelectedFlatId(undefined);
      setShowFlatDetails(false);
    }
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const selectedParcel = parcels.find(p => p.id === selectedParcelId);
  const selectedFlat = flats.find(f => f.id === selectedFlatId);

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: { id: string; label: string; type: 'parcel' | 'building' | 'flat' }[] = [];
    if (selectedParcel) {
      items.push({ id: selectedParcel.id, label: selectedParcel.plotId, type: 'parcel' });
    }
    if (selectedBuilding) {
      items.push({ id: selectedBuilding.id, label: selectedBuilding.name, type: 'building' });
    }
    if (selectedFlat && showFlatDetails) {
      items.push({ id: selectedFlat.id, label: selectedFlat.flatNumber, type: 'flat' });
    }
    return items;
  }, [selectedParcel, selectedBuilding, selectedFlat, showFlatDetails]);

  const refetchParcels = async () => {
    try {
      const updatedParcels = await registryApi.getParcels();
      setParcels(updatedParcels);
    } catch (err) {
      console.error('Failed to refetch parcels:', err);
    }
  };

  const refetchBuildings = async () => {
    if (selectedParcelId) {
      try {
        const updatedBuildings = await registryApi.getBuildingsForParcel(selectedParcelId);
        setBuildings(updatedBuildings);
      } catch (err) {
        console.error('Failed to refetch buildings:', err);
      }
    }
  };

  const renderToolsContent = () => {
    if (showFlatDetails && flatDetails) {
      if (panelMode === 'admin') {
        return <AdminFlatPanel flatDetails={flatDetails} onClose={() => { setShowFlatDetails(false); setSelectedFlatId(undefined); }} />;
      }
      return <RegistryPanel flatDetails={flatDetails} onClose={() => { setShowFlatDetails(false); setSelectedFlatId(undefined); }} />;
    }

    if (panelMode === 'admin' && currentUser?.role === 'admin') {
      switch (adminPanel) {
        case 'registry-create': return <RegistryCreatePanel onCreated={refetchParcels} />;
        case 'building-create': return <BuildingCreatePanel onCreated={refetchBuildings} />;
        case 'flat-create': return <FlatCreatePanel onCreated={refetchBuildings} />;
        case 'agreement-create':
          return (
            <div>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={agreementSubPanel === 'create' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setAgreementSubPanel('create')}
                >
                  Create
                </Button>
                <Button
                  variant={agreementSubPanel === 'manage' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setAgreementSubPanel('manage')}
                >
                  Manage
                </Button>
              </div>
              {agreementSubPanel === 'create' && <AgreementCreatePanel />}
              {agreementSubPanel === 'manage' && <AgreementManagementPanel />}
            </div>
          );
        case 'subdivision': return <SubdivisionPanel />;
        case 'registry-merkle-anchor': return <RegistryMerkleAnchorPanel />;
        case 'agreement-merkle-anchor': return <AgreementMerkleAnchorPanel />;
        case 'transfer-initiate': return (
          <TransferInitiationPanel 
            subjectId={flatDetails?.id || selectedParcelId}
            subjectType={flatDetails ? 'FLAT' : 'LAND'}
            currentOwner={flatDetails?.currentHolder || '0x1234...5678'}
            onTransferCreated={(id) => console.log('Transfer created:', id)}
          />
        );
      }
    }

    switch (userPanel) {
      case 'explorer': return <ExplorerPanel />;
      case 'building-panel':
        return (
          <div className="h-full flex flex-col">
            {selectedBuilding && buildings.length > 0 ? (
              <BuildingView 
                building={selectedBuilding} 
                flats={flats} 
                onFlatClick={handleFlatClick} 
                selectedFlatId={selectedFlatId} 
              />
            ) : buildings.length > 0 ? (
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <BuildingList 
                    buildings={buildings} 
                    onBuildingClick={handleBuildingClick} 
                    selectedBuildingId={selectedBuildingId} 
                  />
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-muted-foreground">No Building Selected</h3>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Select a parcel on the map first, then a building
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case 'analytics': return <AnalyticsPanel />;
      case 'merkle-viewer': return <MerkleProofPanel />;
      case 'verify': return <VerifyPanel />;
      case 'court': return <CourtPanel />;
      case 'documents': return <DocumentUploadPanel subjectId={flatDetails?.id || selectedParcelId} subjectType={flatDetails ? 'FLAT' : 'LAND'} />;
      case 'realtime': return <RealtimeStatusPanel />;
      default: return <ExplorerPanel />;
    }
  };

  const adminTabs = [
    { id: 'registry-create', label: 'Registry', icon: FileText },
    { id: 'building-create', label: 'Building', icon: Building2 },
    { id: 'flat-create', label: 'Flat', icon: Home },
    { id: 'agreement-create', label: 'Agreement', icon: FileSignature },
    { id: 'subdivision', label: 'Subdivide', icon: Scissors },
    { id: 'transfer-initiate', label: 'Transfer', icon: ArrowRightLeft },
    { id: 'registry-merkle-anchor', label: 'Merkle Root', icon: Layers },
    { id: 'agreement-merkle-anchor', label: 'Agreement Merkle', icon: Layers },
  ];

  const userTabs = [
    { id: 'explorer', label: 'Explorer', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'verify', label: 'Verify', icon: CheckCircle },
    { id: 'court', label: 'Court', icon: Scale },
    { id: 'merkle-viewer', label: 'Merkle', icon: TreeDeciduous },
    { id: 'documents', label: 'Docs', icon: FileCheck },
    { id: 'realtime', label: 'Live', icon: Radio },
  ];

  const isAdmin = currentUser?.role === 'admin';

  if (!currentUser) {
    return null;
  }

  // Building view with split panel
  if (viewMode === 'building' && selectedBuilding) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
          </div>

          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
            <Separator orientation="vertical" className="h-6" />
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isAdmin ? 'bg-primary/10' : 'bg-muted'}`}>
                    {isAdmin ? <Shield className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setPanelMode('user')}>
                      <User className="h-4 w-4 mr-2" />
                      User Mode
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPanelMode('admin')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Mode
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Building Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Building View */}
          <main className="flex-1 relative overflow-hidden">
            <BuildingView 
              building={selectedBuilding} 
              flats={flats} 
              onFlatClick={handleFlatClick} 
              selectedFlatId={selectedFlatId} 
            />
          </main>

          {/* Right Panel - Only when flat is selected */}
          {showFlatDetails && flatDetails && (
            <aside className="w-[420px] border-l border-border bg-card overflow-hidden shrink-0">
              <ScrollArea className="h-full">
                {panelMode === 'admin' ? (
                  <AdminFlatPanel flatDetails={flatDetails} onClose={() => { setShowFlatDetails(false); setSelectedFlatId(undefined); }} />
                ) : (
                  <RegistryPanel flatDetails={flatDetails} onClose={() => { setShowFlatDetails(false); setSelectedFlatId(undefined); }} />
                )}
              </ScrollArea>
            </aside>
          )}
        </div>

        <Footer />
      </div>
    );
  }

  // Map view - Clean layout with sidebar icons
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-12 border-b border-border bg-card px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="hidden lg:block">
              <p className="font-semibold text-sm leading-tight">Land Registry</p>
              <p className="text-[10px] text-muted-foreground">Transparency Portal</p>
            </div>
          </Link>

          {/* Breadcrumb */}
          {breadcrumbItems.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
            </>
          )}
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-sm mx-3">
          <ParcelSearch onSelect={handleParcelClick} />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <MapProviderSelector
            provider={mapProvider}
            onProviderChange={setMapProvider}
            mapboxToken={mapboxToken}
            onMapboxTokenChange={setMapboxToken}
          />
          <GlobalSearch />
          <ThemeToggle />
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isAdmin ? 'bg-primary/10' : 'bg-muted'}`}>
                  {isAdmin ? <Shield className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
              </div>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => setPanelMode('user')}>
                    <User className="h-4 w-4 mr-2" />
                    User Mode
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPanelMode('admin')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Mode
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setActiveSection('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Circular Icons */}
        <TooltipProvider delayDuration={0}>
          <aside className="w-14 border-r border-border bg-card flex flex-col items-center py-3 gap-1.5 shrink-0">
            {/* Section Icons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeSection === 'map' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setActiveSection('map')}
                >
                  <Map className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Map View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeSection === 'tools' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setActiveSection('tools')}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Tools</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeSection === 'settings' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setActiveSection('settings')}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </aside>
        </TooltipProvider>

        {/* Main Panel Area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Map Section */}
          {activeSection === 'map' && (
            <div className="flex-1 flex min-w-0">
              {/* Map View */}
              <div className="flex-1 relative min-w-0">
                <UnifiedMapView
                  provider={mapProvider}
                  mapboxToken={mapboxToken}
                  parcels={parcels}
                  onParcelClick={handleParcelClick}
                  selectedParcelId={selectedParcelId}
                  focusCoords={mapFocusCoords}
                  zoom={mapZoom}
                />

                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 z-10">
                  <MapLegend />
                </div>
              </div>

              {/* Right Sidebar: Buildings & Building Details */}
              {selectedParcelId && (
                <div className="w-96 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">
                  {/* Building List Header */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">Buildings</h3>
                      <p className="text-xs text-muted-foreground truncate">{selectedParcel?.plotId}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full shrink-0" 
                      onClick={() => { setSelectedParcelId(undefined); setSelectedBuildingId(undefined); setBuildings([]); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Buildings List & Details */}
                  <ScrollArea className="flex-1">
                    {selectedBuildingId && selectedBuilding ? (
                      <BuildingView 
                        building={selectedBuilding} 
                        flats={flats} 
                        onFlatClick={handleFlatClick} 
                        selectedFlatId={selectedFlatId} 
                      />
                    ) : buildings.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No buildings found for this parcel</p>
                      </div>
                    ) : (
                      <div className="p-4">
                        <BuildingList 
                          buildings={buildings} 
                          onBuildingClick={handleBuildingClick} 
                          selectedBuildingId={selectedBuildingId} 
                        />
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Flat Details Panel - Shows when flat is selected */}
              {showFlatDetails && flatDetails && (
                <div className="w-96 border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
                  <ScrollArea className="h-full">
                    {panelMode === 'admin' ? (
                      <AdminFlatPanel flatDetails={flatDetails} onClose={() => { setShowFlatDetails(false); setSelectedFlatId(undefined); }} />
                    ) : (
                      <RegistryPanel flatDetails={flatDetails} onClose={() => { setShowFlatDetails(false); setSelectedFlatId(undefined); }} />
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Tools Section */}
          {activeSection === 'tools' && (
            <div className="flex-1 flex flex-col bg-background">
              {/* Tools Header with Tabs */}
              <div className="border-b border-border bg-card p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {panelMode === 'admin' && isAdmin ? (
                    adminTabs.map(tab => (
                      <Button 
                        key={tab.id} 
                        variant={adminPanel === tab.id ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setAdminPanel(tab.id as ExtendedAdminPanelType)} 
                        className="h-8 gap-2"
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </Button>
                    ))
                  ) : (
                    userTabs.map(tab => (
                      <Button 
                        key={tab.id} 
                        variant={userPanel === tab.id ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setUserPanel(tab.id as UserPanelType)} 
                        className="h-8 gap-2"
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              {/* Tools Content */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {renderToolsContent()}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="flex-1 flex flex-col bg-background">
              <div className="border-b border-border bg-card p-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Map Provider */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Map className="h-4 w-4" />
                        Map Provider
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button 
                          variant={mapProvider === 'leaflet' ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setMapProvider('leaflet')}
                          className="flex-1"
                        >
                          OpenStreetMap (Free)
                        </Button>
                        <Button 
                          variant={mapProvider === 'mapbox' ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setMapProvider('mapbox')}
                          className="flex-1"
                        >
                          Mapbox (Premium)
                        </Button>
                      </div>
                      {mapProvider === 'mapbox' && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Enter your Mapbox access token for premium map features</p>
                          <input
                            type="text"
                            value={mapboxToken}
                            onChange={(e) => setMapboxToken(e.target.value)}
                            placeholder="pk.your_mapbox_token..."
                            className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Account Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Account
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isAdmin ? 'bg-primary/10' : 'bg-muted'}`}>
                          {isAdmin ? <Shield className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium">{currentUser.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{currentUser.role} Account</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleLogout} className="w-full gap-2">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
