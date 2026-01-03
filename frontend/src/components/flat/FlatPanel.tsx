import OwnershipTimeline from '@/components/timeline/OwnershipTimeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Building, Flat, FlatDetails } from '@/types/registry';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  FileSignature,
  Layers,
  Save,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FlatPanelProps {
  buildings: Building[];
  selectedBuildingId?: string;
  flats: Flat[];
  selectedFlatId?: string;
  onBuildingSelect: (buildingId: string) => void;
  onFlatSelect: (flatId: string) => void;
  flatDetails?: FlatDetails;
  isAdmin?: boolean;
}

const FlatPanel: React.FC<FlatPanelProps> = ({
  buildings,
  selectedBuildingId,
  flats,
  selectedFlatId,
  onBuildingSelect,
  onFlatSelect,
  flatDetails,
  isAdmin = false
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<Partial<FlatDetails>>({});

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  useEffect(() => {
    if (flatDetails) {
      setEditedDetails(flatDetails);
    }
  }, [flatDetails]);

  // Get unique floors from flats
  const floors = selectedBuilding ? Array.from({ length: selectedBuilding.totalFloors }, (_, i) => selectedBuilding.totalFloors - i) : [];

  // Get flats for a specific floor
  const getFlatsForFloor = (floor: number) => {
    return flats.filter(f => f.floor === floor);
  };

  const handleSave = () => {
    toast({
      title: "Changes Saved",
      description: `Flat ${flatDetails?.flatNumber} has been updated successfully.`,
    });
    setIsEditing(false);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'agreement':
        return <FileSignature className="h-4 w-4 text-blue-500" />;
      case 'disputed':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'agreement':
        return 'bg-blue-100 text-blue-800';
      case 'disputed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedBuilding) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-muted-foreground">No Building Selected</h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Select a building to view flats
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Building Header */}
      <div className="p-4 border-b border-border bg-card relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{selectedBuilding.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedBuilding.shortId} • {selectedBuilding.totalFloors} floors • {flats.length} units
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-lg font-semibold text-foreground">{flats.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="rounded-md bg-green-100/50 p-2 text-center">
            <div className="text-lg font-semibold text-green-700">{flats.filter(f => f.status === 'active').length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-md bg-blue-100/50 p-2 text-center">
            <div className="text-lg font-semibold text-blue-700">{flats.filter(f => f.status === 'agreement').length}</div>
            <div className="text-xs text-muted-foreground">Agreement</div>
          </div>
          <div className="rounded-md bg-orange-100/50 p-2 text-center">
            <div className="text-lg font-semibold text-orange-700">{flats.filter(f => f.status === 'disputed').length}</div>
            <div className="text-xs text-muted-foreground">Disputed</div>
          </div>
        </div>
      </div>

      {/* Floors and Flats Grid */}
      <ScrollArea className="flex-1 relative z-0">
        <div className="p-4 space-y-6">
          {floors.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No floors available</p>
            </div>
          ) : (
            floors.map(floor => {
              const floorFlats = getFlatsForFloor(floor);

              return (
                <div key={floor} className="space-y-3">
                  {/* Floor Header */}
                  <div className="flex items-center gap-2 px-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">{floor}F</h3>
                    <span className="text-xs text-muted-foreground">({floorFlats.length} units)</span>
                  </div>

                  {/* Flats Grid */}
                  {floorFlats.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No flats on this floor
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {floorFlats.map(flat => (
                        <button
                          key={flat.id}
                          onClick={() => onFlatSelect(flat.id)}
                          className={`p-3 rounded-md border-2 transition-all text-center ${
                            selectedFlatId === flat.id
                              ? 'border-primary bg-primary/10 shadow-md'
                              : `border-border hover:border-primary/50 ${
                                  flat.status === 'active'
                                    ? 'bg-green-100/50 hover:bg-green-100'
                                    : flat.status === 'agreement'
                                    ? 'bg-blue-100/50 hover:bg-blue-100'
                                    : flat.status === 'disputed'
                                    ? 'bg-orange-100/50 hover:bg-orange-100'
                                    : 'bg-muted/30 hover:bg-muted/50'
                                }`
                            }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-foreground">
                              {flat.flatNumber || `U${flat.id.slice(0, 4)}`}
                            </span>
                            <div className="flex items-center justify-center">
                              {getStatusIcon(flat.status)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {flat.area ? `${flat.area}m²` : '-'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Flat Details - shown when a flat is selected */}
      {selectedFlatId && flatDetails && (
        <>
          <Separator />
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Flat Details</h3>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-7"
                >
                  {isEditing ? (
                    <>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Flat Number</Label>
                <p className="text-foreground font-medium">{flatDetails.flatNumber || 'N/A'}</p>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Area (m²)</Label>
                <p className="text-foreground">{flatDetails.area || 'N/A'}</p>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {isEditing && isAdmin ? (
                    <Select defaultValue={editedDetails.status || flatDetails.status}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="agreement">Agreement</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                        <SelectItem value="unregistered">Unregistered</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={getStatusColor(flatDetails.status)}>
                      {flatDetails.status || 'unknown'}
                    </Badge>
                  )}
                </div>
              </div>

              {flatDetails.currentHolder && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Current Owner</Label>
                  <p className="text-foreground">{flatDetails.currentHolder}</p>
                </div>
              )}

              {flatDetails.titleStatus && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Title Status</Label>
                  <p className="text-foreground capitalize">{flatDetails.titleStatus}</p>
                </div>
              )}

              {flatDetails.ownershipSince && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Ownership Since</Label>
                  <p className="text-foreground">{flatDetails.ownershipSince}</p>
                </div>
              )}

              {isEditing && isAdmin && (
                <Button 
                  onClick={handleSave} 
                  size="sm" 
                  className="w-full mt-3"
                >
                  <Save className="h-3.5 w-3.5 mr-2" />
                  Save Changes
                </Button>
              )}
            </div>

            {/* Ownership Timeline */}
            {flatDetails.id && (
              <div className="mt-4 pt-3 border-t border-border">
                <OwnershipTimeline
                  recordHash={flatDetails.id}
                  compact={true}
                  defaultOpen={false}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FlatPanel;
