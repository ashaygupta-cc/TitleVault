import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { FlatDetails } from '@/types/registry';
import {
    AlertTriangle,
    ArrowRightLeft,
    Ban,
    Building2,
    CheckCircle2,
    Clock,
    Edit,
    FileSignature,
    Hash,
    Home,
    MapPin,
    Save,
    Shield,
    User
} from 'lucide-react';
import React, { useState } from 'react';

interface AdminFlatPanelProps {
  flatDetails?: FlatDetails;
  onClose?: () => void;
}

const AdminFlatPanel: React.FC<AdminFlatPanelProps> = ({ flatDetails, onClose }) => {
  const { toast } = useToast();
  
  // Guard: return early if no flat details
  if (!flatDetails) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No flat details available</p>
      </div>
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'active' | 'agreement' | 'disputed' | 'unregistered'>(flatDetails?.status || 'active');
  const [titleStatus, setTitleStatus] = useState<'clear' | 'encumbered' | 'disputed'>(flatDetails?.titleStatus || 'clear');
  const [agreementStatus, setAgreementStatus] = useState<'draft' | 'in_progress' | 'completed' | 'cancelled'>(flatDetails?.agreement?.status || 'draft');

  if (!flatDetails) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-muted-foreground">No Flat Selected</h3>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Select a flat from the building view to manage
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    toast({
      title: "Changes Saved",
      description: `Flat ${flatDetails.flatNumber} has been updated successfully.`,
    });
    setIsEditing(false);
  };

  const handleStatusUpdate = (newStatus: 'active' | 'agreement' | 'disputed' | 'unregistered') => {
    setStatus(newStatus);
    toast({
      title: "Status Updated",
      description: `Flat status changed to ${newStatus}`,
    });
  };

  const handleAgreementAction = (action: 'activate' | 'complete' | 'cancel') => {
    const actionLabels = {
      activate: 'activated',
      complete: 'completed', 
      cancel: 'cancelled'
    };
    toast({
      title: "Agreement Updated",
      description: `Agreement has been ${actionLabels[action]}`,
    });
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-registry-active" />;
      case 'agreement': return <FileSignature className="h-4 w-4 text-registry-agreement" />;
      case 'disputed': return <AlertTriangle className="h-4 w-4 text-registry-disputed" />;
      default: return <Clock className="h-4 w-4 text-registry-pending" />;
    }
  };

  return (
    <ScrollArea className="h-full w-full overflow-x-hidden">
      <div className="p-4 space-y-4 max-w-full w-full overflow-x-hidden">
        {/* Header with Admin Badge */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-foreground">
                Flat {flatDetails.flatNumber}
              </h2>
              <Badge variant="default" className="bg-registry-active">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {flatDetails.buildingName} • {flatDetails.buildingShortId}
            </p>
          </div>
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? (
              <><Save className="h-3 w-3 mr-1" />Save</>
            ) : (
              <><Edit className="h-3 w-3 mr-1" />Edit</>
            )}
          </Button>
        </div>

        {/* Quick Info */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3 min-w-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">Floor {flatDetails.floor}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{flatDetails.area} m²</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm min-w-0">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-foreground break-all">{flatDetails.currentHolder}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm min-w-0">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Flat ID</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground break-all pl-6">
                {flatDetails.id}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              {getStatusIcon(status)}
              Status Management
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Flat Status</Label>
              <Select value={status} onValueChange={handleStatusUpdate} disabled={!isEditing}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-registry-active" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="agreement">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-3 w-3 text-registry-agreement" />
                      Under Agreement
                    </div>
                  </SelectItem>
                  <SelectItem value="disputed">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-registry-disputed" />
                      Disputed
                    </div>
                  </SelectItem>
                  <SelectItem value="unregistered">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-registry-pending" />
                      Unregistered
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Title Status</Label>
              <Select value={titleStatus} onValueChange={(v) => setTitleStatus(v as 'clear' | 'encumbered' | 'disputed')} disabled={!isEditing}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clear">Clear Title</SelectItem>
                  <SelectItem value="encumbered">Encumbered</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Transferability</Label>
              <div className="flex gap-2">
                <Button 
                  variant={flatDetails.titleStatus === 'clear' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  disabled={!isEditing}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Transferable
                </Button>
                <Button 
                  variant={flatDetails.titleStatus !== 'clear' ? 'destructive' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  disabled={!isEditing}
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Locked
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Management */}
        {flatDetails.agreement && (
          <Card className="border-registry-agreement/30 bg-registry-agreement/5">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-registry-agreement" />
                Active Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Agreement ID</p>
                  <p className="font-mono text-foreground">{flatDetails.agreement.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="capitalize text-foreground">{flatDetails.agreement.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Buyer</p>
                  <p className="text-foreground">{flatDetails.agreement.buyerLabel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Seller</p>
                  <p className="text-foreground">{flatDetails.agreement.sellerLabel}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Agreement Status</Label>
                <Select value={agreementStatus} onValueChange={(v) => setAgreementStatus(v as 'draft' | 'in_progress' | 'completed' | 'cancelled')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Agreement Actions</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-registry-verified"
                    onClick={() => handleAgreementAction('activate')}
                  >
                    Activate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAgreementAction('complete')}
                  >
                    Complete
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleAgreementAction('cancel')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Progress: {flatDetails.agreement.completedSteps}/{flatDetails.agreement.progressSteps} steps</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Ownership */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Transfer Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">New Owner Address</Label>
              <Input 
                placeholder="0x..." 
                className="font-mono text-xs w-full truncate"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Transfer Type</Label>
              <Select defaultValue="sale">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="gift">Gift/Inheritance</SelectItem>
                  <SelectItem value="court_order">Court Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" variant="default">
              <ArrowRightLeft className="h-3 w-3 mr-2" />
              Initiate Transfer
            </Button>
          </CardContent>
        </Card>

        {/* Verification Progress (Read-only) */}
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Verification Status</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              {Object.entries(flatDetails.verificationProgress).map(([key, value]) => {
                const getIcon = () => {
                  if (value === 'verified') return <CheckCircle2 className="h-4 w-4 text-registry-verified" />;
                  if (value === 'pending') return <Clock className="h-4 w-4 text-registry-pending" />;
                  return <AlertTriangle className="h-4 w-4 text-registry-disputed" />;
                };
                
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-2">
                      {getIcon()}
                      <span className="capitalize text-foreground text-xs font-medium">{value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default AdminFlatPanel;
