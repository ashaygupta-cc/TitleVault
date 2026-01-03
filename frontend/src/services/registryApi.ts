import type {
    Building,
    Flat,
    FlatDetails,
    HierarchyPath,
    Parcel,
} from '@/types/registry';
import { http } from './http';

const registryApi = {
  getParcels: async (): Promise<Parcel[]> => {
    const resp = await http.get('/registry/list?limit=100');
    const items = resp.items || [];

    const parcels: Parcel[] = await Promise.all(
      items.map(async (it: any) => {
        let geo = null;
        try {
          geo = await http.get(`/map/parcel/${encodeURIComponent(it.record_hash)}`);
          console.log(`✅ Geo loaded for ${it.record_hash}:`, geo);
        } catch (e) {
          console.error(`❌ Failed to load geo for ${it.record_hash}:`, e);
          geo = null;
        }

        let buildingIds: string[] = [];
        try {
          const b = await http.get(`/building/by-land/${encodeURIComponent(it.record_hash)}`);
          buildingIds = Array.isArray(b) ? b.map((x: any) => x.building_id) : [];
        } catch (e) {
          buildingIds = [];
        }

        const parcel = {
          id: it.record_hash,
          surveyId: it.record_hash,
          plotId: it.record_hash,
          area: it.area_m2,
          subdivisionStatus: it.is_subdivided ? 'complete' : 'none',
          verificationStatus: it.registry_status || 'unknown',
          center: geo && geo.geometry && geo.geometry.coordinates && Array.isArray(geo.geometry.coordinates[0])
            ? { lng: geo.geometry.coordinates[0][0][0], lat: geo.geometry.coordinates[0][0][1] }
            : undefined,
          polygon: geo ? geo.geometry : undefined,
          buildingIds,
        } as Parcel;
        
        if (parcel.polygon) {
          console.log(`✅ Parcel ${parcel.plotId} has polygon:`, parcel.polygon);
        } else {
          console.warn(`⚠️ Parcel ${parcel.plotId} has NO polygon!`);
        }
        
        return parcel;
      })
    );

    return parcels;
  },

  getParcel: async (recordHash: string): Promise<Parcel | undefined> => {
    const geo = await http.get(`/map/parcel/${encodeURIComponent(recordHash)}`);
    if (!geo) return undefined;
    return {
      id: geo.properties.record_hash,
      surveyId: geo.properties.record_hash,
      plotId: geo.properties.record_hash,
      area: geo.properties.area_m2,
      subdivisionStatus: geo.properties.is_subdivided ? 'complete' : 'none',
      verificationStatus: 'verified',
      center: geo.geometry && geo.geometry.coordinates && Array.isArray(geo.geometry.coordinates[0])
        ? { lng: geo.geometry.coordinates[0][0][0], lat: geo.geometry.coordinates[0][0][1] }
        : undefined,
      polygon: geo.geometry,
      buildingIds: [],
    } as Parcel;
  },

  getParcelGeo: async (recordHash: string): Promise<any> => {
    return await http.get(`/map/parcel/${encodeURIComponent(recordHash)}`);
  },

  getBuildingsForParcel: async (recordHash: string): Promise<Building[]> => {
    return await http.get(`/building/by-land/${encodeURIComponent(recordHash)}`);
  },

  getBuilding: async (buildingId: string): Promise<Building | undefined> => {
    return await http.get(`/building/${encodeURIComponent(buildingId)}`);
  },

  getFlatsForBuilding: async (buildingId: string): Promise<Flat[]> => {
    const resp = await http.get(`/flat/by-building/${encodeURIComponent(buildingId)}`);
    return (resp.flats || []).map((f: any) => ({
      id: f.flat_id,
      buildingId: f.building_id,
      flatNumber: f.flat_number,
      floor: parseInt(f.floor_number) || 0,
      area: parseFloat(f.area_m2) || 0,
      status: f.is_locked ? 'agreement' : 'active',
      registrationDate: new Date().toISOString(),
      verificationStatus: 'verified' as const,
      currentHolder: f.owner_address?.slice(0, 10) + '...' || 'Unknown',
      ownershipSince: new Date().toISOString(),
      titleStatus: 'clear' as const,
    }));
  },

  getFlat: async (flatId: string): Promise<Flat | undefined> => {
    return await http.get(`/flat/${encodeURIComponent(flatId)}`);
  },

  getFlatDetails: async (flatId: string): Promise<FlatDetails | undefined> => {
    try {
      console.log(`📥 Fetching flat details for flatId: ${flatId}`);
      const flatRaw = await http.get(`/flat/${encodeURIComponent(flatId)}`);
      if (!flatRaw) {
        console.error('❌ No flat data returned');
        return undefined;
      }

      console.log('✅ Flat data received:', flatRaw);

      // Map raw database fields to TypeScript interface
      const flat: Flat = {
        id: flatRaw.id || flatRaw.flat_id,
        buildingId: flatRaw.building_id,
        flatNumber: flatRaw.flat_number,
        floor: parseInt(flatRaw.floor_number) || 0,
        area: parseFloat(flatRaw.area_m2) || 0,
        status: flatRaw.is_locked ? 'agreement' : 'active',
        registrationDate: flatRaw.created_at || new Date().toISOString(),
        verificationStatus: 'verified' as const,
        currentHolder: flatRaw.owner_address || 'Unknown',
        ownershipSince: flatRaw.created_at || new Date().toISOString(),
        titleStatus: 'clear' as const,
      };

      console.log('✅ Flat mapped:', flat);

      // Fetch building details
      let buildingName = 'Unknown';
      let buildingShortId = 'N/A';
      try {
        const building = await http.get(`/building/${encodeURIComponent(flat.buildingId)}`);
        if (building) {
          buildingName = building.name || 'Unknown';
          buildingShortId = building.shortId || 'N/A';
          console.log(`✅ Building fetched: ${buildingName}`);
        }
      } catch (err) {
        console.error('❌ Failed to fetch building details:', err);
      }

      const details: FlatDetails = {
        ...flat,
        buildingName,
        buildingShortId,
        parcelId: flatRaw.land_record_hash || undefined,
        verificationProgress: {
          registryRecord: 'verified',
          documentIntegrity: 'verified',
          chainAnchoring: flatRaw.is_locked ? 'verified' : 'pending',
          geospatialMatch: 'verified',
        },
        ownershipTimeline: [],
        agreement: null,
      };

      console.log('✅ FlatDetails complete:', details);
      
      return details;
    } catch (err) {
      console.error('❌ Failed to fetch flat details:', err);
      return undefined;
    }
  },

  getHierarchyPath: async (flatId: string): Promise<HierarchyPath | undefined> => {
    const flat = await http.get(`/flat/${encodeURIComponent(flatId)}`);
    if (!flat) return undefined;
    const building = await http.get(`/building/${encodeURIComponent(flat.building_id)}`);
    const record = await http.get(`/registry/record/${encodeURIComponent(flat.land_record_hash)}`);

    return {
      parcel: { id: record ? record.record_hash : undefined, plotId: record ? record.record_hash : undefined },
      building: { id: building ? building.building_id : undefined, shortId: building ? building.shortId : undefined },
      floor: flat.floor_number || flat.floor,
      flat: { id: flat.flat_id || flat.id, flatNumber: flat.flat_number || flat.flatNumber },
    } as HierarchyPath;
  },
  // ===== AFFIDAVIT ENDPOINTS (REAL BACKEND) =====
  getRegistryAffidavit: async (recordHash: string): Promise<any> => {
    const clean = recordHash.startsWith('0x') ? recordHash : `0x${recordHash}`;
    return await http.get(`/registry/affidavit/${encodeURIComponent(clean)}`);
  },

  getFlatAffidavit: async (flatId: string): Promise<any> => {
    return await http.get(`/flat/affidavit/${encodeURIComponent(flatId)}`);
  },

  getAgreementAffidavit: async (agreementId: string): Promise<any> => {
    return await http.get(`/agreement/affidavit/${encodeURIComponent(agreementId)}`);
  },

  downloadRegistryAffidavitPdf: async (recordHash: string): Promise<Blob> => {
    const clean = recordHash.startsWith('0x') ? recordHash : `0x${recordHash}`;
    return await http.get(`/registry/affidavit/${encodeURIComponent(clean)}/pdf`, { responseType: 'blob' });
  },

  downloadFlatAffidavitPdf: async (flatId: string): Promise<Blob> => {
    return await http.get(`/flat/affidavit/${encodeURIComponent(flatId)}/pdf`, { responseType: 'blob' });
  },

  downloadAgreementAffidavitPdf: async (agreementId: string): Promise<Blob> => {
    return await http.get(`/agreement/affidavit/${encodeURIComponent(agreementId)}/pdf`, { responseType: 'blob' });
  },

  downloadCourtBundle: async (agreementId: string): Promise<Blob> => {
    return await http.post(`/court/bundle/${encodeURIComponent(agreementId)}`, {}, { responseType: 'blob' });
  },

  // PDF Verification endpoints
  verifyRegistryAffidavitPdf: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    return await http.post(`/verify/pdf/verify-pdf-registry`, formData);
  },

  verifyFlatAffidavitPdf: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    return await http.post(`/verify/pdf/verify-pdf-flat`, formData);
  },

  verifyAgreementAffidavitPdf: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    return await http.post(`/verify/pdf/verify-pdf-agreement`, formData);
  },

  // Verify affidavit signature (calls backend /registry/affidavit/verify-signature)
  verifyAffidavitSignature: async (payload: { affidavit_hash: string; signature: string; signer: string }): Promise<any> => {
    return await http.post(`/registry/affidavit/verify-signature`, payload);
  },

  // Verify agreement affidavit signature (calls backend /agreement/affidavit/verify-signature)
  verifyAgreementAffidavitSignature: async (payload: { affidavit_hash: string; signature: string; signer: string }): Promise<any> => {
    return await http.post(`/agreement/affidavit/verify-signature`, payload);
  },
};

export { registryApi };

