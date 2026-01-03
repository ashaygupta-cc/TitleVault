# 🎨 Frontend Architecture Documentation

## Overview

The Title Vault frontend is a production-grade React 18+ application built with TypeScript, providing a comprehensive user interface for blockchain-backed property registry management, legal agreement handling, and court-admissible evidence generation.

---

## 🏗️ Architecture Overview

### Technology Stack

#### Core Framework
- **React 18.3.1**: Modern UI framework with concurrent features and automatic batching
- **TypeScript 5.8.3**: Type-safe JavaScript with comprehensive error checking
- **Vite 5.4.19**: Lightning-fast build tool with HMR and optimized production builds
- **React Router DOM 6.30.1**: Declarative routing with nested routes and data loading

#### UI Framework & Design System
- **Radix UI**: Headless, accessible UI primitives for complex components
- **Tailwind CSS 3.4.17**: Utility-first CSS framework with custom design tokens
- **Tailwind Animate**: Animation utilities for smooth transitions
- **Lucide React**: Beautiful, customizable SVG icons
- **Next Themes**: Dark/light theme management with system preference detection

#### State Management & Data Fetching
- **TanStack Query 5.83.0**: Powerful data synchronization for server state
- **React Hook Form 7.61.1**: Performant forms with minimal re-renders
- **Zod 3.25.76**: TypeScript-first schema validation

#### Mapping & Geospatial
- **Leaflet 1.9.4**: Open-source interactive maps
- **Mapbox GL 3.17.0**: Premium mapping with vector tiles
- **@types/leaflet & @types/mapbox-gl**: TypeScript definitions for mapping libraries

#### Charts & Visualization
- **Recharts 2.15.4**: Composable charting library built on React components
- **QRCode.react 4.2.0**: QR code generation for offline verification

#### Development Tools
- **ESLint 9.32.0**: Code linting with React-specific rules
- **TypeScript ESLint**: TypeScript-aware linting rules
- **Autoprefixer**: Automatic CSS vendor prefixing
- **PostCSS**: CSS transformation and optimization

---

## 📁 Project Structure

```
frontend/
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── admin/            # Admin-specific components
│   │   ├── auth/             # Authentication components
│   │   ├── building/         # Building management components
│   │   ├── documents/        # Document handling components
│   │   ├── flat/             # Flat/apartment components
│   │   ├── layout/           # Layout components
│   │   ├── map/              # Mapping components
│   │   ├── navigation/       # Navigation components
│   │   ├── realtime/         # Real-time updates
│   │   ├── registry/         # Registry management
│   │   ├── search/           # Search functionality
│   │   ├── timeline/         # Timeline components
│   │   ├── ui/               # Base UI components (Radix + Tailwind)
│   │   └── user/             # User-specific components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   ├── pages/                # Page components
│   ├── services/             # API services and HTTP client
│   ├── types/                # TypeScript type definitions
│   ├── App.tsx               # Root application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles and CSS variables
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── eslint.config.js          # ESLint configuration
```

---

## 🧩 Component Architecture

### Component Organization Principles

#### 1. Feature-Based Organization
Components are organized by feature/domain rather than by type:
- `admin/` - Administrative functionality
- `building/` - Building management
- `flat/` - Flat/apartment management
- `registry/` - Property registry operations
- `map/` - Geospatial mapping features

#### 2. Atomic Design Principles
- **Atoms**: Basic UI components in `ui/` (buttons, inputs, cards)
- **Molecules**: Simple component combinations (search bars, form fields)
- **Organisms**: Complex components (panels, forms, lists)
- **Templates**: Page layouts and structures
- **Pages**: Complete page implementations

#### 3. Composition Over Inheritance
Components use composition patterns with:
- Render props for flexible component behavior
- Compound components for related functionality
- Higher-order components for cross-cutting concerns

### Key Component Categories

#### Admin Components (`components/admin/`)
```typescript
// Administrative panels for property management
AdminFlatPanel.tsx              // Flat administration interface
AgreementCreatePanel.tsx        // Agreement creation form
AgreementManagementPanel.tsx    // Agreement lifecycle management
AgreementMerkleAnchorPanel.tsx  // Merkle tree anchoring
BuildingCreatePanel.tsx         // Building registration
FlatCreatePanel.tsx            // Flat registration
RegistryCreatePanel.tsx        // Property registry creation
RegistryMerkleAnchorPanel.tsx  // Registry Merkle operations
SubdivisionPanel.tsx           // Property subdivision
TransferInitiationPanel.tsx    // Ownership transfer initiation
```

#### User Components (`components/user/`)
```typescript
// User-facing functionality
AnalyticsPanel.tsx             // Registry analytics and insights
CourtBundleVerifier.tsx        // Court evidence verification
CourtPanel.tsx                 // Legal court interface
ExplorerPanel.tsx              // Property exploration
MerkleProofPanel.tsx           // Merkle proof verification
OwnershipHistoryPanel.tsx      // Ownership timeline
ParcelDetailPanel.tsx          // Detailed parcel information
PdfVerifier.tsx                // PDF document verification
VerifyPanel.tsx                // General verification interface
```

#### Map Components (`components/map/`)
```typescript
// Geospatial mapping functionality
LeafletMapView.tsx             // OpenStreetMap implementation
MapLegend.tsx                  // Map legend and controls
MapProviderSelector.tsx        // Map provider switching
MapTokenInput.tsx              // API token management
MapView.tsx                    // Base map component
ParcelList.tsx                 // Property list with map integration
UnifiedMapView.tsx             // Multi-provider map wrapper
```

#### UI Components (`components/ui/`)
```typescript
// Base design system components (Radix UI + Tailwind)
button.tsx, card.tsx, dialog.tsx, form.tsx, input.tsx, select.tsx
table.tsx, tabs.tsx, toast.tsx, tooltip.tsx, etc.
```

---

## 🔄 State Management

### State Architecture

#### 1. Server State (TanStack Query)
```typescript
// API data fetching and caching
const { data: parcels, isLoading, error } = useQuery({
  queryKey: ['parcels'],
  queryFn: registryApi.getParcels,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

#### 2. Local Component State (useState)
```typescript
// Component-specific state
const [selectedParcelId, setSelectedParcelId] = useState<string>();
const [viewMode, setViewMode] = useState<ViewMode>('map');
const [mapProvider, setMapProvider] = useState<MapProvider>('leaflet');
```

#### 3. URL State (React Router)
```typescript
// URL-based state for deep linking
const [searchParams, setSearchParams] = useSearchParams();
const searchId = searchParams.get('search');
const searchType = searchParams.get('type');
```

#### 4. Global State (Context + localStorage)
```typescript
// Authentication and user preferences
const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
const [theme, setTheme] = useTheme(); // Next Themes
```

### Custom Hooks

#### Authentication Hook
```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    localStorage.setItem('access_token', response.access_token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    http.setTokens(null, null);
  };

  return { user, isLoading, login, logout };
};
```

#### Real-time Updates Hook
```typescript
// hooks/useRealtimeAgreements.ts
export const useRealtimeAgreements = () => {
  const [updates, setUpdates] = useState<AgreementUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchUserActivity = async () => {
      try {
        const response = await adminApi.getUserActivity();
        const activityUpdates = response.items.map(item => ({
          type: 'user_action' as const,
          message: `${item.action} completed`,
          timestamp: item.timestamp,
        }));
        setUpdates(activityUpdates);
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    fetchUserActivity();
    const interval = setInterval(fetchUserActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  return { updates, isConnected };
};
```

---

## 🌐 API Integration

### HTTP Client Configuration

#### Base HTTP Service
```typescript
// services/http.ts
class HttpService {
  private baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  setTokens(access: string | null, refresh: string | null) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

export const http = new HttpService();
```

#### API Service Layers
```typescript
// services/registryApi.ts
export const registryApi = {
  // Property operations
  getParcels: (): Promise<Parcel[]> => 
    http.get('/registry/list'),
  
  getParcel: (id: string): Promise<Parcel> => 
    http.get(`/registry/${id}`),
  
  createParcel: (data: CreateParcelRequest): Promise<Parcel> => 
    http.post('/registry/create', data),
  
  // Building operations
  getBuildingsForParcel: (parcelId: string): Promise<Building[]> => 
    http.get(`/buildings/parcel/${parcelId}`),
  
  // Flat operations
  getFlatsForBuilding: (buildingId: string): Promise<Flat[]> => 
    http.get(`/flats/building/${buildingId}`),
  
  // Verification operations
  verifyRecord: (hash: string): Promise<VerificationResult> => 
    http.post(`/verify/${hash}`),
};

// services/adminApi.ts
export const adminApi = {
  // Agreement management
  createAgreement: (data: CreateAgreementRequest): Promise<Agreement> => 
    http.post('/agreements', data),
  
  getAllAgreements: (): Promise<Agreement[]> => 
    http.get('/agreements'),
  
  activateAgreement: (id: string): Promise<Agreement> => 
    http.post(`/agreements/${id}/activate`),
  
  // User activity
  getUserActivity: (params?: ActivityParams): Promise<UserActivityResponse> => 
    http.get('/activity/my-activity', { params }),
};
```

---

## 🎨 Design System & Theming

### Tailwind Configuration

#### Custom Design Tokens
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Base colors
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Registry-specific colors
        status: {
          active: "hsl(var(--status-active))",
          agreement: "hsl(var(--status-agreement))",
          disputed: "hsl(var(--status-disputed))",
          unregistered: "hsl(var(--status-unregistered))",
        },
        
        // Verification colors
        verified: {
          DEFAULT: "hsl(var(--verified))",
          foreground: "hsl(var(--verified-foreground))",
        },
        pending: {
          DEFAULT: "hsl(var(--pending))",
          foreground: "hsl(var(--pending-foreground))",
        },
        failed: {
          DEFAULT: "hsl(var(--failed))",
          foreground: "hsl(var(--failed-foreground))",
        },
      },
      
      // Custom animations
      keyframes: {
        "tile-expand": {
          from: { transform: "scale(1) translateZ(0)" },
          to: { transform: "scale(1.02) translateZ(20px)" },
        },
        "panel-slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
      },
      
      animation: {
        "tile-expand": "tile-expand 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "panel-slide-in": "panel-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
      
      // Typography
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
} satisfies Config;
```

#### CSS Variables & Theme System
```css
/* src/index.css */
:root {
  /* Light theme */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  
  /* Registry status colors */
  --status-active: 142.1 76.2% 36.3%;
  --status-agreement: 47.9 95.8% 53.1%;
  --status-disputed: 0 84.2% 60.2%;
  --status-unregistered: 215.4 16.3% 46.9%;
  
  /* Verification colors */
  --verified: 142.1 76.2% 36.3%;
  --verified-foreground: 355.7 100% 97.3%;
  --pending: 47.9 95.8% 53.1%;
  --pending-foreground: 26 83.3% 14.1%;
  --failed: 0 84.2% 60.2%;
  --failed-foreground: 210 40% 98%;
}

.dark {
  /* Dark theme overrides */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
}
```

### Component Styling Patterns

#### Consistent Component Structure
```typescript
// Example: Card component with consistent styling
interface CardProps {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
}

const Card = ({ className, children, variant = 'default' }: CardProps) => {
  return (
    <div
      className={cn(
        // Base styles
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        // Variant styles
        {
          'border-border': variant === 'default',
          'border-2 border-dashed border-muted-foreground/25': variant === 'outline',
          'border-transparent shadow-none': variant === 'ghost',
        },
        className
      )}
    >
      {children}
    </div>
  );
};
```

---

## 🗺️ Mapping & Geospatial Features

### Multi-Provider Map System

#### Unified Map Interface
```typescript
// components/map/UnifiedMapView.tsx
interface UnifiedMapViewProps {
  provider: 'leaflet' | 'mapbox';
  mapboxToken?: string;
  parcels: Parcel[];
  onParcelClick: (parcelId: string) => void;
  selectedParcelId?: string;
  focusCoords?: { lat: number; lng: number };
  zoom?: number;
}

const UnifiedMapView = ({ provider, ...props }: UnifiedMapViewProps) => {
  if (provider === 'mapbox' && props.mapboxToken) {
    return <MapboxMapView {...props} />;
  }
  return <LeafletMapView {...props} />;
};
```

#### Leaflet Implementation
```typescript
// components/map/LeafletMapView.tsx
const LeafletMapView = ({ parcels, onParcelClick, selectedParcelId }: Props) => {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([40.7128, -74.0060], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Add parcel layers
    parcels.forEach(parcel => {
      if (parcel.geometry) {
        const layer = L.geoJSON(parcel.geometry, {
          style: {
            color: selectedParcelId === parcel.id ? '#3b82f6' : '#6b7280',
            weight: 2,
            fillOpacity: 0.3,
          },
        });
        
        layer.on('click', () => onParcelClick(parcel.id));
        layer.addTo(mapRef.current!);
      }
    });
  }, [parcels, selectedParcelId, onParcelClick]);

  return <div id="map" className="w-full h-full" />;
};
```

### Geospatial Data Handling

#### GeoJSON Processing
```typescript
// lib/geoUtils.ts
export const processParcelGeometry = (geometry: any) => {
  if (!geometry || !geometry.coordinates) return null;
  
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: geometry.type,
      coordinates: geometry.coordinates,
    },
  };
};

export const calculateBounds = (parcels: Parcel[]) => {
  const bounds = new L.LatLngBounds([]);
  
  parcels.forEach(parcel => {
    if (parcel.geometry?.coordinates) {
      const coords = parcel.geometry.coordinates[0];
      coords.forEach(([lng, lat]: [number, number]) => {
        bounds.extend([lat, lng]);
      });
    }
  });
  
  return bounds;
};
```

---

## 🔐 Authentication & Security

### JWT Token Management

#### Token Storage & Refresh
```typescript
// services/auth.ts
class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await http.post<AuthResponse>('/auth/login', credentials);
    
    this.storeTokens(response.access_token, response.refresh_token);
    http.setTokens(response.access_token, response.refresh_token);
    
    return response;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await http.post<{ access_token: string }>('/auth/refresh', {
      token: refreshToken,
    });

    this.storeTokens(response.access_token, refreshToken);
    return response.access_token;
  }

  private storeTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }
}
```

#### Protected Route Component
```typescript
// components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    } else if (user && requiredRole && !user.roles.includes(requiredRole)) {
      navigate('/unauthorized');
    }
  }, [user, isLoading, requiredRole, navigate]);

  if (isLoading) return <LoadingSpinner />;
  if (!user) return null;
  if (requiredRole && !user.roles.includes(requiredRole)) return null;

  return <>{children}</>;
};
```

---

## 📱 Responsive Design & Accessibility

### Mobile-First Approach

#### Responsive Breakpoints
```typescript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px',   // Small devices
  md: '768px',   // Medium devices
  lg: '1024px',  // Large devices
  xl: '1280px',  // Extra large devices
  '2xl': '1536px', // 2X large devices
};
```

#### Responsive Component Example
```typescript
// components/layout/ResponsiveLayout.tsx
const ResponsiveLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isMobile ? "flex flex-col" : "flex"
    )}>
      {children}
    </div>
  );
};
```

### Accessibility Features

#### ARIA Labels & Semantic HTML
```typescript
// Accessible button component
const AccessibleButton = ({ children, onClick, disabled, ...props }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        props.className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
```

#### Keyboard Navigation
```typescript
// Keyboard navigation hook
const useKeyboardNavigation = (items: string[], onSelect: (item: string) => void) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
          event.preventDefault();
          onSelect(items[selectedIndex]);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect]);

  return selectedIndex;
};
```

---

## ⚡ Performance Optimization

### Code Splitting & Lazy Loading

#### Route-Based Code Splitting
```typescript
// App.tsx with lazy loading
import { lazy, Suspense } from 'react';

const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const AdminPanel = lazy(() => import('./components/admin/AgreementManagementPanel'));

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/registry" element={<Index />} />
        <Route path="/admin/agreements" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
```

#### Component-Level Lazy Loading
```typescript
// Lazy load heavy components
const MapView = lazy(() => import('./components/map/UnifiedMapView'));
const AnalyticsPanel = lazy(() => import('./components/user/AnalyticsPanel'));

const LazyMapView = (props: MapViewProps) => (
  <Suspense fallback={<div className="h-full bg-muted animate-pulse" />}>
    <MapView {...props} />
  </Suspense>
);
```

### Memoization & Optimization

#### React.memo for Expensive Components
```typescript
// Memoized map component
const MapView = React.memo(({ parcels, selectedParcelId, onParcelClick }: Props) => {
  // Expensive rendering logic
  return <div>Map content</div>;
}, (prevProps, nextProps) => {
  return (
    prevProps.selectedParcelId === nextProps.selectedParcelId &&
    prevProps.parcels.length === nextProps.parcels.length
  );
});
```

#### useMemo for Expensive Calculations
```typescript
const ParcelList = ({ parcels, searchTerm }: Props) => {
  const filteredParcels = useMemo(() => {
    return parcels.filter(parcel =>
      parcel.plotId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parcels, searchTerm]);

  const sortedParcels = useMemo(() => {
    return [...filteredParcels].sort((a, b) => a.plotId.localeCompare(b.plotId));
  }, [filteredParcels]);

  return (
    <div>
      {sortedParcels.map(parcel => (
        <ParcelItem key={parcel.id} parcel={parcel} />
      ))}
    </div>
  );
};
```

### Bundle Optimization

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          maps: ['leaflet', 'mapbox-gl'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'leaflet', 'mapbox-gl'],
  },
});
```

---

## 🧪 Testing Strategy

### Testing Stack
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Cypress**: End-to-end testing
- **MSW (Mock Service Worker)**: API mocking

### Unit Testing Examples

#### Component Testing
```typescript
// __tests__/components/ParcelSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParcelSearch } from '../components/search/ParcelSearch';

describe('ParcelSearch', () => {
  it('should filter parcels based on search input', async () => {
    const mockOnSelect = jest.fn();
    
    render(<ParcelSearch onSelect={mockOnSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Search parcels...');
    fireEvent.change(searchInput, { target: { value: 'P001' } });
    
    await waitFor(() => {
      expect(screen.getByText('P001-A')).toBeInTheDocument();
    });
  });
});
```

#### Hook Testing
```typescript
// __tests__/hooks/useAuth.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

describe('useAuth', () => {
  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login({
        username: 'admin',
        password: 'admin123',
      });
    });
    
    expect(result.current.user).toBeTruthy();
    expect(result.current.user?.role).toBe('admin');
  });
});
```

### E2E Testing

#### Cypress Test Example
```typescript
// cypress/e2e/property-management.cy.ts
describe('Property Management', () => {
  beforeEach(() => {
    cy.login('admin', 'admin123');
    cy.visit('/registry');
  });

  it('should create a new property record', () => {
    cy.get('[data-testid="create-property-btn"]').click();
    cy.get('[data-testid="plot-id-input"]').type('P001-TEST');
    cy.get('[data-testid="area-input"]').type('1000');
    cy.get('[data-testid="submit-btn"]').click();
    
    cy.contains('Property created successfully').should('be.visible');
    cy.contains('P001-TEST').should('be.visible');
  });
});
```

---

## 🚀 Build & Deployment

### Development Workflow

#### Development Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "e2e": "cypress open",
    "e2e:headless": "cypress run"
  }
}
```

#### Environment Configuration
```typescript
// Environment variables
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_CHAIN_NAME: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_BLOCK_EXPLORER: string;
  readonly VITE_REGISTRY_CONTRACT: string;
  readonly VITE_AGREEMENT_CONTRACT: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_DEFAULT_MAP_CENTER_LAT: string;
  readonly VITE_DEFAULT_MAP_CENTER_LNG: string;
  readonly VITE_DEFAULT_MAP_ZOOM: string;
  readonly VITE_ENABLE_SPATIAL_FEATURES: string;
  readonly VITE_ENABLE_COURT_FEATURES: string;
  readonly VITE_ENABLE_FRAUD_DETECTION: string;
}
```

### Production Build

#### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔧 Development Setup

### Prerequisites
- **Node.js 18+** with npm or Bun package manager
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Auto Rename Tag
  - Prettier - Code formatter

### Quick Start

#### 1. Install Dependencies
```bash
cd frontend
bun install  # or npm install
```

#### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
VITE_API_BASE_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

#### 3. Start Development Server
```bash
bun dev  # or npm run dev
```

#### 4. Access Application
- **Frontend**: http://localhost:8080
- **API Docs**: http://localhost:8000/docs

### Development Guidelines

#### Code Style
- Use TypeScript for all new components
- Follow React functional component patterns
- Use custom hooks for reusable logic
- Implement proper error boundaries
- Add loading states for async operations

#### Component Development
```typescript
// Template for new components
interface ComponentProps {
  // Define props with TypeScript
}

const Component = ({ prop1, prop2 }: ComponentProps) => {
  // Use hooks at the top
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = useCallback(() => {
    // Handle events
  }, []);
  
  // Render
  return (
    <div className="component-styles">
      {/* Component content */}
    </div>
  );
};

export default Component;
```

#### Testing Guidelines
- Write unit tests for utility functions
- Test component behavior, not implementation
- Mock external dependencies
- Use data-testid for E2E test selectors
- Maintain >80% test coverage

---

## 📈 Performance Monitoring

### Metrics & Analytics

#### Core Web Vitals
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist
```

#### Performance Monitoring
```typescript
// Performance monitoring setup
const reportWebVitals = (metric: any) => {
  console.log(metric);
  // Send to analytics service
};

// In main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(reportWebVitals);
getFID(reportWebVitals);
getFCP(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

---

## 🔮 Future Enhancements

### Planned Features

#### Phase 17: Mobile Application
- React Native mobile app
- Offline verification capabilities
- Push notifications
- Mobile-optimized property management

#### Phase 18: Advanced Features
- Progressive Web App (PWA) capabilities
- Service Worker for offline functionality
- WebRTC for real-time collaboration
- WebAssembly for performance-critical operations

#### Phase 19: Enterprise Integration
- Single Sign-On (SSO) integration
- Multi-tenant architecture
- Advanced analytics dashboard
- Custom branding and white-labeling

### Technical Debt & Improvements
- Migrate to React 19 when stable
- Implement React Server Components
- Add comprehensive error monitoring
- Optimize bundle splitting further
- Enhance accessibility compliance

---

## 📚 Resources & Documentation

### Internal Documentation
- [API Documentation](http://localhost:8000/docs)
- [Component Storybook](./storybook) (planned)
- [Testing Guide](./.kiro/docs/testing-guide.md)
- [Authentication Setup](./.kiro/docs/authentication-setup.md)

### External Resources
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)
- [Vite Documentation](https://vitejs.dev/guide)

### Community & Support
- [GitHub Repository](https://github.com/your-org/titlevault)
- [Discord Community](https://discord.gg/)

---

## 🏆 Contributions

### Contributing Guidelines
1. Fork the repository
2. Create a feature branch
3. Follow coding standards
4. Write comprehensive tests
5. Submit pull request with detailed description

---

*This documentation is maintained by the Title Vault development team and updated with each major release.*