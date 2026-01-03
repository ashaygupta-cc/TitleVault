import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { Building2, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BuildingCreatePanelProps {
  onCreated?: () => Promise<void> | void;
}

const BuildingCreatePanel: React.FC<BuildingCreatePanelProps> = ({ onCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    landRecordHash: '',
    name: '',
    totalFloors: '',
  });

  useEffect(() => {
    adminApi.getRegistryRecords().then(setRecords);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await adminApi.createBuilding({
        land_record_hash: formData.landRecordHash,
        name: formData.name,
        total_floors: parseInt(formData.totalFloors),
      });
      setResult(response);
      toast({
        title: 'Success',
        description: `Building: ${response.building_id || response.buildingId}`,
      });
      // Refetch buildings
      if (onCreated) {
        await onCreated();
      }
      setFormData({ landRecordHash: '', name: '', totalFloors: '' });
    } catch (error: any) {
      console.error('Building error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not create building',
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
        <h2 className="text-xl font-semibold text-foreground">Create Building</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Building Details
          </CardTitle>
          <CardDescription>Add a building to an existing land parcel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Land Record Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Parent Land Record
              </div>
              <div>
                <Label htmlFor="landRecord">Select Land Parcel</Label>
                <Select
                  value={formData.landRecordHash}
                  onValueChange={value => setFormData({ ...formData, landRecordHash: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a land record" />
                  </SelectTrigger>
                  <SelectContent>
                    {records.filter(r => !r.is_subdivided).map(record => (
                      <SelectItem key={record.id || record.record_hash} value={record.record_hash || record.recordHash}>
                        <div className="flex items-center gap-2">
                          <span>{record.id || record.record_hash}</span>
                          <span className="text-muted-foreground text-xs">
                            ({record.area_m2 || record.areaM2 || '?'} m²)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Building Info */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Building Information
              </div>
              <div>
                <Label htmlFor="name">Building Name</Label>
                <Input
                  id="name"
                  placeholder="Tower A"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="totalFloors">Total Floors</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="12"
                  value={formData.totalFloors}
                  onChange={e => setFormData({ ...formData, totalFloors: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !formData.landRecordHash}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Building...
                </>
              ) : (
                'Create Building'
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
              <span className="font-medium text-status-active">Building Created Successfully</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Building ID:</span>
                <p className="font-mono text-xs break-all">{result.building_id || result.buildingId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuildingCreatePanel;
