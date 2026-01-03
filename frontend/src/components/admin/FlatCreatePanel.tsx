import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { CheckCircle2, Home, Layers, Loader2, User } from 'lucide-react';
import React, { useState } from 'react';

interface FlatCreatePanelProps {
  onCreated?: () => Promise<void> | void;
}

const FlatCreatePanel: React.FC<FlatCreatePanelProps> = ({ onCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    buildingId: '',
    landRecordHash: '',
    flatNumber: '',
    floorNumber: '',
    ownerAddress: '',
    areaM2: '',
    isTransferable: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await adminApi.createFlat({
        building_id: formData.buildingId,
        land_record_hash: formData.landRecordHash,
        flat_number: formData.flatNumber,
        floor_number: formData.floorNumber,
        owner_address: formData.ownerAddress,
        area_m2: parseFloat(formData.areaM2),
        is_transferable: formData.isTransferable,
      });
      setResult(response);
      toast({
        title: 'Success',
        description: `Flat: ${response.flat_id || response.flatId}`,
      });
      // Refetch buildings and flats
      if (onCreated) {
        await onCreated();
      }
      setFormData({
        buildingId: '',
        landRecordHash: '',
        flatNumber: '',
        floorNumber: '',
        ownerAddress: '',
        areaM2: '',
        isTransferable: true,
      });
    } catch (error: any) {
      console.error('Flat error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not create flat',
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
        <h2 className="text-xl font-semibold text-foreground">Create Flat Unit</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            Flat Details
          </CardTitle>
          <CardDescription>Register a flat unit within a building</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parent References */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Layers className="h-4 w-4" />
                Parent References
              </div>
              <div>
                <Label htmlFor="buildingId">Building ID</Label>
                <Input
                  id="buildingId"
                  placeholder="bld-xxxxxx"
                  value={formData.buildingId}
                  onChange={e => setFormData({ ...formData, buildingId: e.target.value })}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="landRecordHash">Land Record Hash</Label>
                <Input
                  id="landRecordHash"
                  placeholder="0x..."
                  value={formData.landRecordHash}
                  onChange={e => setFormData({ ...formData, landRecordHash: e.target.value })}
                  className="font-mono text-sm"
                  required
                />
              </div>
            </div>

            {/* Flat Info */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Home className="h-4 w-4" />
                Flat Information
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="flatNumber">Flat Number</Label>
                  <Input
                    id="flatNumber"
                    placeholder="3A"
                    value={formData.flatNumber}
                    onChange={e => setFormData({ ...formData, flatNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="floorNumber">Floor Number</Label>
                  <Input
                    id="floorNumber"
                    type="number"
                    min="0"
                    placeholder="3"
                    value={formData.floorNumber}
                    onChange={e => setFormData({ ...formData, floorNumber: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="areaM2">Area (m²)</Label>
                <Input
                  id="areaM2"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="85.5"
                  value={formData.areaM2}
                  onChange={e => setFormData({ ...formData, areaM2: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Owner */}
            <div className="space-y-3 pt-4 border-t border-border">
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
              <div className="flex items-center justify-between">
                <div>
                  <Label>Transferable</Label>
                  <p className="text-xs text-muted-foreground">Can this flat be transferred?</p>
                </div>
                <Switch
                  checked={formData.isTransferable}
                  onCheckedChange={checked => setFormData({ ...formData, isTransferable: checked })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Flat...
                </>
              ) : (
                'Create Flat Unit'
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
              <span className="font-medium text-status-active">Flat Created Successfully</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Flat ID:</span>
                <p className="font-mono text-xs">{result.flat_id || result.flatId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Flat Hash:</span>
                <p className="font-mono text-xs break-all">{result.flat_hash || result.flatHash}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlatCreatePanel;
