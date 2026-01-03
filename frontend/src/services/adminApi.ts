import type {
    AnalyticsData,
    CreateAgreementRequest,
    CreateBuildingRequest,
    CreateFlatRequest,
    CreateRegistryRequest,
    HeatmapData,
    SubdivideRequest,
} from '@/types/admin';
import { http } from './http';

export const adminApi = {
  createRegistry: async (req: CreateRegistryRequest) => http.post('/registry/create', req),
  getRegistryRecords: async () => {
    const resp = await http.get('/registry/list?limit=100');
    return resp.items || [];
  },
  getRecordHistory: async (recordHash: string) => http.get(`/registry/history/${encodeURIComponent(recordHash)}`),
  getRecordDetails: async (recordHash: string) => http.get(`/registry/record/${encodeURIComponent(recordHash)}`),
  verifyRecord: async (recordHash: string) => http.get(`/registry/verify/${encodeURIComponent(recordHash)}`),
  createBuilding: async (req: CreateBuildingRequest) => http.post('/building/create', req),
  createFlat: async (req: CreateFlatRequest) => http.post('/flat/create', req),
  transferRecord: async (oldRecordHash: string, newOwnerAddress: string, metadata?: any) =>
    http.post('/registry/transfer', {
      old_record_hash: oldRecordHash,
      new_owner_address: newOwnerAddress,
      metadata: metadata,
    }),
  createAgreement: async (req: CreateAgreementRequest) => http.post('/agreement/create', req),
  getAgreement: async (agreementId: string) => http.get(`/agreement/${encodeURIComponent(agreementId)}`),
  getAgreementHistory: async (subjectId: string) => http.get(`/agreement/history/${encodeURIComponent(subjectId)}`),
  activateAgreement: async (agreementId: string) => http.post(`/agreement/activate/${encodeURIComponent(agreementId)}`),
  completeAgreement: async (agreementId: string) => http.post(`/agreement/action/complete/${encodeURIComponent(agreementId)}`),
  cancelAgreement: async (agreementId: string) => http.post(`/agreement/action/cancel/${encodeURIComponent(agreementId)}`),
  defaultAgreement: async (agreementId: string) => http.post(`/agreement/action/default/${encodeURIComponent(agreementId)}`),
  subdivideRecord: async (req: SubdivideRequest) => http.post('/registry/subdivide', req),
  getAnalytics: async (): Promise<AnalyticsData> => http.get('/analytics'),
  getHeatmapData: async (): Promise<HeatmapData> => http.get('/analytics/heatmap'),
  getMerkleProof: async (recordHash: string) => http.get(`/registry/merkle/proof/${encodeURIComponent(recordHash)}`),
  getAgreementMerkleProof: async (agreementId: string) => http.get(`/agreement/merkle/proof/${encodeURIComponent(agreementId)}`),
  getAllAgreements: async () => {
    const resp = await http.get('/agreement/list');
    return resp.items || [];
  },
  // Merkle Root Anchoring
  anchorRegistryMerkleRoot: async () => http.post('/registry/merkle/anchor', {}),
  getRegistryMerkleRoot: async () => http.get('/registry/merkle/root'),
  anchorAgreementMerkleRoot: async () => http.post('/agreement/merkle/anchor', {}),
  getAgreementMerkleRoot: async () => http.get('/agreement/merkle/root'),
};

