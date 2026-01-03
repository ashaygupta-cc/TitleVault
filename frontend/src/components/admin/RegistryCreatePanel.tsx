import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { CheckCircle2, FileText, Loader2, MapPin, User } from 'lucide-react';
import React, { useState } from 'react';

interface RegistryCreatePanelProps {
  onCreated?: () => Promise<void> | void;
}

const RegistryCreatePanel: React.FC<RegistryCreatePanelProps> = ({ onCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    ownerAddress: '',
    ownerName: '',
    surveyNo: '',
    village: '',
    taluk: '',
    district: '',
    state: 'Karnataka',
    // Polygon coords (simplified for MVP - in real app would use map drawing)
    polygonCoords: '',
  });
  
  const normalize = (r: any) => ({
  status:
    r?.status ||
    r?.code ||
    r?.error_code ||
    (r?.record_hash ? 'CREATED' : undefined),

  message:
    r?.message ||
    r?.detail ||
    r?.error ||
    r?.msg ||
    (r?.status === 'ALREADY_EXISTS'
      ? 'Registry record already exists'
      : undefined),

  record_hash: r?.record_hash || r?.recordHash,
  tx_hash: r?.tx_hash || r?.txHash,
  cid: r?.cid,
  area_m2: r?.area_m2,
  raw: r,
});


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const addr = formData.ownerAddress.trim(); // ✅ MOVE HERE
    setIsLoading(true);
    try {
      if (!formData.ownerAddress || !formData.polygonCoords) {
        throw new Error('Owner address and polygon required');
      }
      // Validate owner: allow either an Ethereum address (0x + 40 hex chars)
      // or a 32-byte hex (0x + 64 hex chars) which some workflows use as an identifier
      const addr = formData.ownerAddress.trim();
      const ethAddrRe = /^0x[a-fA-F0-9]{40}$/;
      const bytes32Re = /^0x[a-fA-F0-9]{64}$/;
      if (!ethAddrRe.test(addr) && !bytes32Re.test(addr)) {
        throw new Error('Owner must be a valid Ethereum address (0x-prefixed, 40 hex chars) or 32-byte hex (0x + 64 hex chars)');
      }
      const coords: [number, number][] = formData.polygonCoords
      .split(';')
      .map(pair => {
        const [lng, lat] = pair.trim().split(',').map(Number);
        if (isNaN(lng) || isNaN(lat)) {
          throw new Error('Invalid coordinates');
        }
        return [lng, lat] as [number, number];
      });
      if (coords.length < 3) throw new Error('Need at least 3 points');
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

      const req: any = {
        owner_address: formData.ownerAddress,
        polygon: { coordinates: coords },
        metadata: {
          village: formData.village,
          taluk: formData.taluk,
          district: formData.district,
          state: formData.state,
        },
      };
      // Add DB-only fields if present
      if (formData.surveyNo) req.survey_number = formData.surveyNo;
      if (formData.ownerName) req.owner_name = formData.ownerName;
      const response = await adminApi.createRegistry(req);

          const out = normalize(response); // ✅ normalize
          setResult(out);                 // ✅ always set

          if (out.status === 'CREATED') {
            toast({
              title: 'Success',
              description: out.message || 'Registry record created',
            });
            // Refetch parcels list
            if (onCreated) {
              await onCreated();
            }
          } else if (out.status === 'ALREADY_EXISTS') {
            toast({
              title: 'Already Exists',
              description: out.message || 'Registry record already exists',
              variant: 'default',
            });
          }

      setFormData({ ownerAddress: '', ownerName: '', surveyNo: '', village: '', taluk: '', district: '', state: 'Karnataka', polygonCoords: '' });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not create record',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-auto registry-scrollbar h-full">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
          Admin
        </Badge>
        <h2 className="text-xl font-semibold text-foreground">Create Registry Record</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Property Details
          </CardTitle>
          <CardDescription>Register a new land parcel in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Owner Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Owner Information
              </div>
              <div>
                <Label htmlFor="ownerAddress">Owner Address</Label>
                <Input
                  id="ownerAddress"
                  placeholder="0x..."
                  value={formData.ownerAddress}
                  onChange={e => setFormData({ ...formData, ownerAddress: e.target.value })}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ownerName">Owner Name (DB only)</Label>
                <Input
                  id="ownerName"
                  placeholder="John Doe"
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Location Metadata
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="surveyNo">Survey Number</Label>
                  <Input
                    id="surveyNo"
                    placeholder="SY-142/A"
                    value={formData.surveyNo}
                    onChange={e => setFormData({ ...formData, surveyNo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="village">Village</Label>
                  <Input
                    id="village"
                    placeholder="Malleshwaram"
                    value={formData.village}
                    onChange={e => setFormData({ ...formData, village: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="taluk">Taluk</Label>
                  <Input
                    id="taluk"
                    placeholder="Bangalore North"
                    value={formData.taluk}
                    onChange={e => setFormData({ ...formData, taluk: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    placeholder="Bangalore Urban"
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Polygon Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label htmlFor="polygonCoords">Polygon Coordinates</Label>
              <Input
                id="polygonCoords"
                placeholder="lng,lat;lng,lat;lng,lat;lng,lat"
                value={formData.polygonCoords}
                onChange={e => setFormData({ ...formData, polygonCoords: e.target.value })}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter coordinates as semicolon-separated lng,lat pairs. Polygon must be closed.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Record...
                </>
              ) : (
                'Create Registry Record'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
          <Card
            className={
              result.status === 'ALREADY_EXISTS'
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-status-active/30 bg-status-active/5'
            }
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2
                  className={`h-5 w-5 ${
                    result.status === 'ALREADY_EXISTS'
                      ? 'text-yellow-500'
                      : 'text-status-active'
                  }`}
                />
                <span
                  className={`font-medium ${
                    result.status === 'ALREADY_EXISTS'
                      ? 'text-yellow-600'
                      : 'text-status-active'
                  }`}
                >
                  {result.status === 'ALREADY_EXISTS'
                    ? 'Registry Record Already Exists'
                    : 'Record Created Successfully'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {result.record_hash && (
                  <div>
                    <span className="text-muted-foreground">Record Hash:</span>
                    <p className="font-mono text-xs break-all">
                      {result.record_hash}
                    </p>
                  </div>
                )}

                {result.tx_hash && (
                  <div>
                    <span className="text-muted-foreground">Transaction:</span>
                    <p className="font-mono text-xs break-all">
                      {result.tx_hash}
                    </p>
                  </div>
                )}

                {result.area_m2 && (
                  <div>
                    <span className="text-muted-foreground">Area:</span>
                    <p className="font-medium">{result.area_m2} m²</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default RegistryCreatePanel;
