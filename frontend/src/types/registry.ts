// Registry Types - Court-Grade Property Registry Viewer
// All types are public-facing safe - no cryptographic data exposed

export type VerificationStatus = 'verified' | 'pending' | 'failed';
export type FlatStatus = 'active' | 'agreement' | 'disputed' | 'unregistered';
export type AgreementType = 'sale' | 'lease' | 'transfer' | 'mortgage';
export type AgreementStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface ParcelPolygon {
  type: 'Polygon';
  coordinates: Coordinates[];
}

export interface Parcel {
  id: string;
  surveyId: string;
  plotId: string;
  area: number; // in square meters
  subdivisionStatus: 'none' | 'partial' | 'complete';
  verificationStatus: VerificationStatus;
  center: Coordinates;
  polygon: ParcelPolygon;
  buildingIds: string[];
}

export interface Building {
  id: string;
  parcelId: string;
  name: string;
  shortId: string; // e.g., "B-12"
  totalFloors: number;
  flatsPerFloor: number;
  constructionYear: number;
  verificationStatus: VerificationStatus;
}

export interface Flat {
  id: string;
  buildingId: string;
  flatNumber: string;
  floor: number;
  area: number; // in square meters
  status: FlatStatus;
  registrationDate: string;
  verificationStatus: VerificationStatus;
  currentHolder: string; // Display name, not wallet address
  ownershipSince: string;
  titleStatus: 'clear' | 'encumbered' | 'disputed';
}

export interface VerificationProgress {
  registryRecord: VerificationStatus;
  documentIntegrity: VerificationStatus;
  chainAnchoring: VerificationStatus;
  geospatialMatch: VerificationStatus;
}

export interface OwnershipEvent {
  id: string;
  type: 'registration' | 'agreement' | 'transfer' | 'activation';
  date: string;
  description: string;
  status: 'complete' | 'pending' | 'failed';
}

export interface Agreement {
  id: string;
  flatId: string;
  type: AgreementType;
  status: AgreementStatus;
  buyerLabel: string; // "Buyer" - no address
  sellerLabel: string; // "Seller" - no address
  createdDate: string;
  progressSteps: number;
  completedSteps: number;
}

export interface FlatDetails extends Flat {
  buildingName: string;
  buildingShortId: string;
  parcelId: string;
  verificationProgress: VerificationProgress;
  ownershipTimeline: OwnershipEvent[];
  agreement?: Agreement;
}

// View state types
export type ViewMode = 'map' | 'building' | 'flat';

export interface NavigationState {
  currentView: ViewMode;
  selectedParcelId?: string;
  selectedBuildingId?: string;
  selectedFlatId?: string;
}

// Hierarchy breadcrumb
export interface HierarchyPath {
  parcel?: { id: string; plotId: string };
  building?: { id: string; shortId: string };
  floor?: number;
  flat?: { id: string; flatNumber: string };
}
