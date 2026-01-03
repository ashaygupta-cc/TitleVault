import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import type { RegistryMetadata, SubdivisionResult } from '@/types/admin';
import { CheckCircle2, Loader2, MapPin, Plus, Scissors, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const SubdivisionPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [result, setResult] = useState<SubdivisionResult | null>(null);

  const [parentRecordHash, setParentRecordHash] = useState('');
  const [children, setChildren] = useState<{
    polygonCoords: string;
    metadata: RegistryMetadata;
    survey_number?: string;
  }[]>([
    {
      polygonCoords: '',
      metadata: { village: '', taluk: '', district: '', state: 'Karnataka' },
      survey_number: '',
    },
  ]);

  useEffect(() => {
    adminApi.getRegistryRecords().then(setRecords);
  }, []);

  const addChild = () => {
    setChildren([
      ...children,
      {
        polygonCoords: '',
        metadata: { village: '', taluk: '', district: '', state: 'Karnataka' },
        survey_number: '',
      },
    ]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: string, value: string) => {
    const newChildren = [...children];
    if (field === 'polygonCoords') {
      newChildren[index].polygonCoords = value;
    } else if (field === 'survey_number') {
      newChildren[index].survey_number = value;
    } else {
      newChildren[index].metadata = {
        ...newChildren[index].metadata,
        [field]: value,
      };
    }
    setChildren(newChildren);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsLoading(true);

    try {
    // Sanitize: ensure only a single 0x prefix, never double 0x
    let sanitizedParentHash = parentRecordHash.trim();
    while (sanitizedParentHash.startsWith('0x')) {
      sanitizedParentHash = sanitizedParentHash.slice(2);
    }
    sanitizedParentHash = '0x' + sanitizedParentHash.toLowerCase();

    // Validate owner address of parent record
    const parentRecord = records.find(r => (r.record_hash || r.recordHash) === sanitizedParentHash);
    const ownerAddress = parentRecord?.owner_address || parentRecord?.ownerAddress || "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
      toast({
        title: 'Invalid Owner Address',
        description: `Owner address for parent record must be a valid Ethereum address (0x + 40 hex digits). Got: ${ownerAddress}`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    // Validate parent record hash: must be 0x-prefixed, 64 hex chars after 0x
    if (!/^0x[a-fA-F0-9]{64}$/.test(sanitizedParentHash)) {
      toast({
        title: 'Invalid Record Hash',
        description: 'Parent record hash must be a 32-byte hex string (64 hex characters) with 0x prefix.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    const recordHashWith0x = sanitizedParentHash;
    console.log('parent_record_hash to backend:', recordHashWith0x);

      // Parse and auto-close polygons
      const parsedChildren: any[] = children.map(c => {
        let coords = c.polygonCoords.split(';').map(pair => {
          const [lng, lat] = pair.split(',').map(Number);
          return [lng, lat] as [number, number];
        });
        // Auto-close polygon if not closed
        if (coords.length > 2) {
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push([...first]);
          }
        }
        return {
          polygon: coords,
          metadata: c.metadata,
        };
      });

      // If parentDetails and parent polygon exist, check for leftover land and auto-add residual if needed
      let allPolygons = parsedChildren.map(child => child.polygon);
      let parentPolygon = null;
      if (parentDetails && Array.isArray(parentDetails.polygon)) {
        parentPolygon = parentDetails.polygon.map((pt: any) => Array.isArray(pt) ? pt : [pt[0], pt[1]]);
        // Auto-close parent polygon if not closed
        if (parentPolygon.length > 2) {
          const first = parentPolygon[0];
          const last = parentPolygon[parentPolygon.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            parentPolygon.push([...first]);
          }
        }
      }

      // Only attempt to auto-add residual if parentPolygon and at least one child
      if (parentPolygon && parsedChildren.length > 0) {
        try {
          // Use turf.js via window (if available) for polygon difference, else skip
          // (In production, use a backend or geo library for robust difference)
          // Here, just check if union of children covers parent (simple area check)
          // If not, add a residual polygon (as parent minus children) -- placeholder logic
          // This is a stub: in real use, use a geo library for polygon difference
          // For now, just warn if not covered
        } catch (e) {
          // Ignore errors in auto-residual
        }
      }

      // Satisfy both backend (snake_case) and TS type (camelCase)
      const payload = {
        parent_record_hash: recordHashWith0x, // only snake_case for backend
        children: parsedChildren,
      };
      // Log the payload for debugging
      console.log('Subdivision payload:', JSON.stringify(payload, null, 2));

      const response = await adminApi.subdivideRecord(payload);

      setResult(response);
      toast({
        title: 'Subdivision Complete',
        description: `Created ${response.childrenCreated} child parcels`,
      });
    } catch (error: any) {
      // Deep log the error for debugging
      try {
        console.error('Subdivision error (stringified):', JSON.stringify(error, null, 2));
      } catch {
        console.error('Subdivision error (raw):', error);
      }
      let description = 'Could not subdivide record';
      // Axios style error
      if (error?.response && error.response.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          description = data;
        } else if (typeof data === 'object') {
          if (Array.isArray(data.detail)) {
            // FastAPI validation error: show all details
            description = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
          } else if (data.detail) {
            description = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
          } else {
            description = JSON.stringify(data);
          }
        } else {
          description = JSON.stringify(data);
        }
      } else if (error?.response && typeof error.response.json === 'function') {
        // Fetch style error
        try {
          const data = await error.response.json();
          if (Array.isArray(data.detail)) {
            description = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
          } else if (data.detail) {
            description = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
          } else {
            description = JSON.stringify(data);
          }
        } catch (err) {
          description = 'Unknown error (could not parse response)';
        }
      } else if (error?.message) {
        description = error.message;
      } else if (typeof error === 'object') {
        try {
          description = JSON.stringify(error);
        } catch {
          description = String(error);
        }
      } else if (typeof error === 'string') {
        description = error;
      }
      // Always show the stringified error if it's still not helpful
      if (description === 'Could not subdivide record' || description === '[object Object]' || description === '{}') {
        try {
          description = JSON.stringify(error, null, 2);
        } catch {
          description = String(error);
        }
      }
      toast({
        title: 'Subdivision Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [parentDetails, setParentDetails] = useState<any>(null);
  const selectedRecord = records.find(r => r.recordHash === parentRecordHash);

  useEffect(() => {
    if (parentRecordHash) {
      adminApi.getRecordDetails(parentRecordHash).then(setParentDetails);
    } else {
      setParentDetails(null);
    }
  }, [parentRecordHash]);

  return (
    <div className="p-6 space-y-6 overflow-auto registry-scrollbar h-full">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
          Admin
        </Badge>
        <h2 className="text-xl font-semibold text-foreground">Subdivide Land</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            Subdivision Details
          </CardTitle>
          <CardDescription>Split a parent parcel into multiple child parcels</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parent Selection */}
            <div className="space-y-3">
              <Label>Parent Land Record</Label>

              <Select value={parentRecordHash} onValueChange={setParentRecordHash}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent record" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const getLabel = (record: any) =>
                      record.survey_number
                        ? `${record.survey_number} (${record.record_hash || record.recordHash})`
                        : (record.record_hash || record.recordHash);
                    const getKey = (record: any) => String(record.id || record.recordHash || Math.random());
                    const eligible = records.filter(r => !r.isSubdivided && r.isTransferable);
                    if (eligible.length === 0 && records.length > 0) {
                      return [
                        <div key="no-eligible" className="px-3 py-2 text-xs text-muted-foreground">No eligible parent records found. Showing all records for debugging.</div>,
                        ...records.map(record => (
                          <SelectItem key={getKey(record)} value={String(record.record_hash || record.recordHash)}>
                            <div className="flex items-center gap-2">
                              <span>{getLabel(record)}</span>
                              <Badge variant="outline" className="text-xs">
                                {record.areaM2?.toLocaleString?.() || ''} m²
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ];
                    }
                    if (eligible.length === 0) {
                      return <div className="px-3 py-2 text-xs text-muted-foreground">No parent records available.</div>;
                    }
                    return eligible.map(record => (
                      <SelectItem key={getKey(record)} value={String(record.record_hash || record.recordHash)}>
                        <div className="flex items-center gap-2">
                          <span>{getLabel(record)}</span>
                          <Badge variant="outline" className="text-xs">
                            {(record.area_m2 || record.areaM2)?.toLocaleString?.() || ''} m²
                          </Badge>
                        </div>
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>

              {/* Parent hash validation warning */}
              {parentRecordHash && !/^0x[a-fA-F0-9]{64}$/.test(parentRecordHash) && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  <strong>Invalid parent record hash:</strong><br />
                  Must be a 32-byte hex string (64 hex digits) with <code>0x</code> prefix.<br />
                  Example: <code>0x1234abcd... (total 66 characters)</code>
                </div>
              )}
              {parentDetails && (
                <div className="p-3 bg-muted/30 rounded-md text-sm space-y-2">
                  {parentDetails.village && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Village:</span>{' '}
                        {parentDetails.village}
                      </div>
                      <div>
                        <span className="text-muted-foreground">District:</span>{' '}
                        {parentDetails.district}
                      </div>
                    </div>
                  )}
                  {parentDetails.polygon && Array.isArray(parentDetails.polygon) && (
                    <div>
                      <span className="text-muted-foreground">Parent Coordinates:</span>
                      <div className="font-mono text-xs break-all bg-white/60 border rounded p-2 mt-1">
                        {parentDetails.polygon.map((pt: any) =>
                          Array.isArray(pt) ? `${pt[0]},${pt[1]}` : ''
                        ).join('; ')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Child Parcels */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Child Parcels ({children.length})
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addChild}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Parcel
                </Button>
              </div>

              {children.map((child, index) => (
                <Card key={index} className="border-dashed">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Parcel {index + 1}</Badge>
                      {children.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChild(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>Survey Number</Label>
                      <Input
                        placeholder="SY-142/A-1"
                        value={child.survey_number || ''}
                        onChange={e => updateChild(index, 'survey_number', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Polygon Coordinates</Label>
                      <Input
                        placeholder="lng,lat;lng,lat;..."
                        value={child.polygonCoords}
                        onChange={e => updateChild(index, 'polygonCoords', e.target.value)}
                        className="font-mono text-xs"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !parentRecordHash}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subdividing...
                </>
              ) : (
                'Execute Subdivision'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-status-active/30 bg-status-active/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-status-active" />
              <span className="font-medium text-status-active">Subdivision Complete</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Children Created:</span>{' '}
                <span className="font-medium">{result.childrenCreated}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Residual Parcel:</span>{' '}
                <span className="font-medium">{result.residualCreated ? 'Yes ✅' : 'No'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Residual Parcel Details */}
      {result && (result.residual_created || result.residualCreated) && (result.residual_record_hash || result.residualCreated) && (
        <Card className="border-blue-300/30 bg-blue-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-600">Residual Parcel Auto-Created</span>
            </div>
            <div className="space-y-2 text-xs">
              {(result.residual_record_hash || result.residual_record_hash) && (
                <div className="break-all font-mono bg-white/60 p-2 rounded border border-blue-200">
                  <span className="text-muted-foreground">Hash: </span>
                  {result.residual_record_hash}
                </div>
              )}
              <p className="text-muted-foreground">
                ✅ Remaining land has been automatically patched with correct coordinates and registered with the same owner address.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubdivisionPanel;
