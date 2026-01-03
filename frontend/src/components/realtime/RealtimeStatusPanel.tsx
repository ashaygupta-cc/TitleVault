import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Agreement, AgreementUpdate, useRealtimeAgreements } from '@/hooks/useRealtimeAgreements';
import {
    Banknote,
    Bell,
    Clock,
    Eye,
    PenTool,
    Radio,
    RefreshCw,
    Trash2,
    Upload,
    Wifi,
    WifiOff
} from 'lucide-react';
import React, { useEffect } from 'react';

interface RealtimeStatusPanelProps {
  agreementIds?: string[];
}

const RealtimeStatusPanel: React.FC<RealtimeStatusPanelProps> = ({
  agreementIds
}) => {
  const { toast } = useToast();
  
  const {
    isConnected,
    updates,
    agreements,
    connect,
    disconnect,
    clearUpdates,
    updateCount
  } = useRealtimeAgreements({
    agreementIds,
    onUpdate: (update) => {
      toast({
        title: getUpdateTitle(update.type),
        description: update.message,
      });
    }
  });

  useEffect(() => {
    // Auto-connect on mount (only once)
    connect();
    return () => disconnect();
  }, []);

  const getUpdateTitle = (type: AgreementUpdate['type'], message?: string) => {
    // For user_action types, map the action name to a title
    if (type === 'user_action' && message) {
      switch (message) {
        // Registry verification actions
        case 'verified_registry_record': return 'Registry Record Verified';
        
        // Affidavit verification actions
        case 'verified_registry_affidavit': return 'Registry Affidavit Verified';
        case 'verified_flat_affidavit': return 'Flat Affidavit Verified';
        case 'verified_agreement_affidavit': return 'Agreement Affidavit Verified';
        
        // PDF download actions
        case 'downloaded_registry_affidavit_pdf': return 'Registry Affidavit Downloaded';
        case 'downloaded_flat_affidavit_pdf': return 'Flat Affidavit Downloaded';
        case 'downloaded_agreement_affidavit_pdf': return 'Agreement Affidavit Downloaded';
        
        // Court verification actions
        case 'verified_parcel_court': return 'Parcel Verified (Court)';
        case 'verified_agreement_court': return 'Agreement Verified (Court)';
        case 'verified_agreement_on_chain': return 'Agreement Verified (On-Chain)';
        
        // Court affidavit actions
        case 'viewed_court_affidavit_registry': return 'Court Affidavit Viewed (Registry)';
        case 'viewed_court_affidavit_agreement': return 'Court Affidavit Viewed (Agreement)';
        case 'viewed_court_affidavit_flat': return 'Court Affidavit Viewed (Flat)';
        
        // Merkle tree actions
        case 'viewed_agreement_merkle_proof': return 'Agreement Merkle Proof Viewed';
        case 'viewed_registry_merkle_proof': return 'Registry Merkle Proof Viewed';
        
        default: return message.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    
    switch (type) {
      case 'status_change': return 'Status Update';
      case 'payment_received': return 'Payment Received';
      case 'document_uploaded': return 'Document Uploaded';
      case 'signature_added': return 'Signature Added';
      case 'user_action': return 'User Action';
      default: return 'Update';
    }
  };

  const getUpdateIcon = (type: AgreementUpdate['type'], message?: string) => {
    if (type === 'user_action' && message) {
      switch (message) {
        // Verification actions - green checkmark
        case 'verified_registry_record':
        case 'verified_registry_affidavit':
        case 'verified_flat_affidavit':
        case 'verified_agreement_affidavit':
        case 'verified_parcel_court':
        case 'verified_agreement_court':
        case 'verified_agreement_on_chain':
          return <RefreshCw className="h-4 w-4 text-verified" />;
        
        // Download actions - upload icon
        case 'downloaded_registry_affidavit_pdf':
        case 'downloaded_flat_affidavit_pdf':
        case 'downloaded_agreement_affidavit_pdf':
          return <Upload className="h-4 w-4 text-primary" />;
        
        // Merkle proof view actions - eye icon
        case 'viewed_court_affidavit_registry':
        case 'viewed_court_affidavit_agreement':
        case 'viewed_court_affidavit_flat':
        case 'viewed_agreement_merkle_proof':
        case 'viewed_registry_merkle_proof':
          return <Eye className="h-4 w-4 text-primary" />;
        
        default:
          return <Bell className="h-4 w-4" />;
      }
    }
    
    switch (type) {
      case 'status_change': return <RefreshCw className="h-4 w-4" />;
      case 'payment_received': return <Banknote className="h-4 w-4 text-verified" />;
      case 'document_uploaded': return <Upload className="h-4 w-4 text-primary" />;
      case 'signature_added': return <PenTool className="h-4 w-4 text-status-agreement" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: Agreement['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-verified text-verified-foreground">Active</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-primary text-primary-foreground">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'DEFAULTED':
        return <Badge className="bg-status-disputed text-status-disputed-foreground">Defaulted</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Connection Status */}
        <Card className={`border-2 ${isConnected ? 'border-verified/30 bg-verified/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isConnected ? 'bg-verified/20' : 'bg-destructive/20'}`}>
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-verified" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isConnected ? 'Real-time updates active' : 'Click to reconnect'}
                  </p>
                </div>
              </div>
              <Button
                variant={isConnected ? 'outline' : 'default'}
                size="sm"
                onClick={isConnected ? disconnect : connect}
                className={!isConnected ? 'bg-slate-400 hover:bg-slate-500 text-white border-0' : ''}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
            
            {isConnected && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Radio className="h-3 w-3 text-verified animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Listening for user updates...
                </span>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Live Updates Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Live Updates
            </h3>
            <div className="flex items-center gap-2">
              {updateCount > 0 && (
                <Badge variant="default" className="bg-primary">
                  {updateCount} new
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={clearUpdates}
                disabled={updates.length === 0}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {updates.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Waiting for updates...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Updates will appear here in real-time
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {updates.map(update => (
                <Card key={update.id} className="border-border/50 animate-fade-in">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        {getUpdateIcon(update.type, update.message)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              {getUpdateTitle(update.type, update.message)}
                            </p>
                            {/* Show all metadata - always display if present */}
                            {update.metadata && Object.keys(update.metadata).length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground space-y-1 leading-relaxed">
                                {Object.entries(update.metadata).map(([key, value]) => {
                                  if (value === null || value === undefined || value === '') return null;
                                  
                                  const displayLabel = key
                                    .replace(/_/g, ' ')
                                    .split(' ')
                                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(' ');
                                  
                                  return (
                                    <div key={key} className="break-words">
                                      <span className="text-foreground font-medium">{displayLabel}:</span> {String(value)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(update.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};

export default RealtimeStatusPanel;
