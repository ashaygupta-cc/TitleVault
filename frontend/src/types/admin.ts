// Admin Panel Types for Property Registry

export interface CreateRegistryRequest {
  owner_address?: string;
  ownerAddress?: string;
  polygon: { coordinates: [number, number][] } | [number, number][];
  metadata: RegistryMetadata;
  // DB-only fields
  survey_number?: string;
  owner_name?: string;
}

export interface RegistryMetadata {
  village: string;
  taluk: string;
  district: string;
  state: string;
}

export interface CreateBuildingRequest {
  land_record_hash?: string;
  landRecordHash?: string;
  name: string;
  total_floors?: number;
  totalFloors?: number;
}

export interface CreateFlatRequest {
  building_id?: string;
  buildingId?: string;
  land_record_hash?: string;
  landRecordHash?: string;
  flat_number?: string;
  flatNumber?: string;
  floor_number?: string;
  floorNumber?: string | number;
  owner_address?: string;
  ownerAddress?: string;
  area_m2?: number;
  areaM2?: number;
  is_transferable?: boolean;
  isTransferable?: boolean;
}

export interface CreateAgreementRequest {
  subject_type?: 'LAND' | 'FLAT';
  subjectType?: 'LAND' | 'FLAT';
  subject_id?: string;
  subjectId?: string;
  buyer_address?: string;
  buyerAddress?: string;
  seller_address?: string;
  sellerAddress?: string;
  total_price?: number;
  totalPrice?: number;
  paid_upfront?: number;
  paidUpfront?: number;
  agreement_type?: string;
  agreementType?: string;
  lease_end_date?: string;
  leaseEndDate?: string;
  schedule: PaymentSchedule[];
}

export interface PaymentSchedule {
  amount?: number;
  due_in_days?: number;
  dueInDays?: number;
}

export interface SubdivideRequest {
  parent_record_hash: string;
  children: SubdivisionChild[];
}

export interface SubdivisionChild {
  polygon: [number, number][];
  metadata: RegistryMetadata;
}

export interface SubdivisionResult {
  status: string;
  parent_record: string;
  children_created: number;
  residual_created: boolean;
  residual_record_hash?: string;
  childrenCreated?: number;
  residualCreated?: boolean;
}

export type AdminPanelType = 
  | 'registry-create'
  | 'building-create'
  | 'flat-create'
  | 'agreement-create'
  | 'subdivision'
  | 'registry-merkle-anchor'
  | 'agreement-merkle-anchor';

export type UserPanelType = 
  | 'explorer'
  | 'analytics'
  | 'heatmap'
  | 'merkle-viewer'
  | 'documents'
  | 'realtime'
  | 'verify'
  | 'court';

// Mock response types
export interface MockRegistryRecord {
  id: string;
  recordHash: string;
  ownerAddress: string;
  ownerName?: string;
  areaM2: number;
  parcelType: string;
  isSubdivided: boolean;
  isTransferable: boolean;
  registryStatus: 'VERIFIED' | 'PENDING' | 'DISPUTED';
  createdAt: string;
  metadata: RegistryMetadata;
}

export interface AnalyticsData {
  totalParcels: number;
  totalBuildings: number;
  totalFlats: number;
  activeAgreements: number;
  disputedRecords: number;
  verifiedRecords: number;
  pendingRecords: number;
  totalAreaM2: number;
  monthlyTransfers: { month: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
}

export interface HeatmapData {
  parcels: {
    id: string;
    center: { lng: number; lat: number };
    intensity: number; // 0-1 based on activity/value
    type: 'high-value' | 'disputed' | 'active' | 'dormant';
  }[];
}
