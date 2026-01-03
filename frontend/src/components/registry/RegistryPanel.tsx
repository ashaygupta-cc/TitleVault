import OwnershipTimeline from '@/components/timeline/OwnershipTimeline';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { FlatDetails } from '@/types/registry';
import { AlertCircle, CheckCircle, Clock, FileText, Home, MapPin, X } from 'lucide-react';
import React from 'react';

interface RegistryPanelProps {
  flatDetails: FlatDetails;
  onClose: () => void;
}

const RegistryPanel: React.FC<RegistryPanelProps> = ({ flatDetails, onClose }) => {
  // Determine flat status based on agreement status
  const determineFlatStatus = () => {
    // If flat has an agreement, check its status
    if (flatDetails.agreement) {
      const agrStatus = flatDetails.agreement.status?.toUpperCase();
      if (agrStatus === 'COMPLETED') {
        return 'active';  // Transferred - flat is now owned by new owner
      } else if (agrStatus === 'ACTIVE') {
        return 'agreement';  // Locked in agreement - waiting for completion
      } else if (agrStatus === 'DRAFT') {
        return 'agreement';  // In draft agreement
      } else {
        return 'agreement';  // Default to agreement for any other status
      }
    }
    // Fallback to original status if no agreement
    return flatDetails.status || 'unregistered';
  };

  const getStatusBadge = () => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium';
    const status = determineFlatStatus();
    
    switch (status) {
      case 'active': 
        return <span className={`${baseClass} bg-status-active text-status-active-foreground`}>Active</span>;
      case 'agreement': 
        return <span className={`${baseClass} bg-status-agreement text-status-agreement-foreground`}>In Agreement</span>;
      case 'disputed': 
        return <span className={`${baseClass} bg-status-disputed text-status-disputed-foreground`}>Disputed</span>;
      case 'unregistered': 
        return <span className={`${baseClass} bg-status-unregistered text-status-unregistered-foreground`}>Unregistered</span>;
    }
  };

  const getVerificationBadge = () => {
    const verification = flatDetails.verificationProgress || {};

    const allVerified =
      Object.keys(verification).length > 0 &&
      Object.values(verification).every(s => s === 'verified');

    const hasFailed = Object.values(flatDetails.verificationProgress).some(s => s === 'failed');
    
    if (allVerified) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-verified/10 border border-verified/20">
          <CheckCircle className="h-5 w-5 text-verified" />
          <span className="font-medium text-verified">VERIFIED</span>
        </div>
      );
    }
    if (hasFailed) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-failed/10 border border-failed/20">
          <AlertCircle className="h-5 w-5 text-failed" />
          <span className="font-medium text-failed">VERIFICATION FAILED</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-pending/10 border border-pending/20">
        <Clock className="h-5 w-5 text-pending" />
        <span className="font-medium text-pending">PENDING VERIFICATION</span>
      </div>
    );
  };

  const getVerificationIcon = (status?: 'verified' | 'pending' | 'failed') => {
  if (!status) return <Clock className="h-4 w-4 text-muted" />;
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-verified" />;
      case 'pending': return <Clock className="h-4 w-4 text-pending" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-failed" />;
    }
  };

  const getAgreementArchivalStatus = (): 'verified' | 'pending' | 'failed' => {
    // ACTIVE agreements = PENDING (still in progress, need archival)
    // COMPLETED/DEFAULTED/CANCELLED = VERIFIED (already done)
    // NO agreement = VERIFIED (not applicable)
    if (!flatDetails.agreement) {
      return 'verified'; // No active agreement, nothing to archive
    }
    
    const status = flatDetails.agreement.status?.toUpperCase();
    if (status === 'ACTIVE') {
      return 'pending'; // Active agreements are PENDING (need archival to merkle root)
    } else if (status === 'COMPLETED' || status === 'DEFAULTED' || status === 'CANCELLED') {
      return 'verified'; // Completed/Defaulted/Cancelled - already processed
    }
    
    return 'pending'; // Default to pending
  };

  const getTitleStatus = (): string => {
    if (!flatDetails.agreement) {
      return 'Active';
    }
    
    const status = flatDetails.agreement.status?.toUpperCase();
    if (status === 'ACTIVE') {
      return 'Draft'; // Active agreement = draft state
    } else if (status === 'COMPLETED') {
      return 'Active'; // Completed agreement = flat now active
    } else if (status === 'DRAFT') {
      return 'Draft';
    }
    
    return 'Active';
  };

  const getChainAnchoringStatus = (): 'verified' | 'pending' | 'failed' => {
    // If flat has COMPLETED/DEFAULTED/CANCELLED agreement = already verified
    // If flat is ACTIVE (no agreement or ACTIVE agreement) = use original status
    if (flatDetails.agreement) {
      const status = flatDetails.agreement.status?.toUpperCase();
      if (status === 'COMPLETED' || status === 'DEFAULTED' || status === 'CANCELLED') {
        return 'verified'; // Already anchored
      }
    }
    
    return flatDetails.verificationProgress.chainAnchoring;
  };

  return (
    <div className="h-full flex flex-col bg-card animate-panel-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-border relative z-10 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Flat {flatDetails.flatNumber}</h2>
              <p className="text-xs text-muted-foreground">Title Status: {getTitleStatus()}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {getStatusBadge()}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto overflow-x-hidden p-4 space-y-6 registry-scrollbar relative z-0">
        {/* Property Summary */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Property Summary
          </h3>
          <div className="bg-surface rounded-md p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flat ID</span>
              <span className="font-mono text-foreground text-xs truncate">{flatDetails.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Flat Number</span>
              <span className="text-foreground">{flatDetails.flatNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Building</span>
              <span className="text-foreground">{flatDetails.buildingName || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Floor</span>
              <span className="text-foreground">{flatDetails.floor || flatDetails.floor === 0 ? flatDetails.floor : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Area</span>
              <span className="text-foreground">{flatDetails.area ? `${flatDetails.area} m²` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Registration Date</span>
              <span className="text-foreground">{flatDetails.registrationDate ? new Date(flatDetails.registrationDate).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </section>

        <Separator />

        {/* Current Ownership */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Current Ownership
          </h3>
          <div className="bg-surface rounded-md p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Registered Owner</span>
              <span className="font-mono text-foreground text-xs">{flatDetails.currentHolder ? `${flatDetails.currentHolder.slice(0, 10)}...${flatDetails.currentHolder.slice(-8)}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ownership Since</span>
              <span className="text-foreground">{flatDetails.ownershipSince ? new Date(flatDetails.ownershipSince).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Title Status</span>
              <span className="text-foreground capitalize">{flatDetails.titleStatus || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* Agreement Status */}
        {flatDetails.agreement && (
          <>
            <Separator />
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Agreement Status</h3>
              <div className="bg-surface rounded-md p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agreement ID</span>
                  <span className="font-mono text-foreground text-xs truncate">{flatDetails.agreement.id || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground capitalize">{flatDetails.agreement.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-foreground capitalize">{flatDetails.agreement.status.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-col text-sm gap-1">
                  <span className="text-muted-foreground">Parties</span>
                  <span className="text-foreground text-xs">{flatDetails.agreement.buyerLabel}</span>
                  <span className="text-foreground text-xs">↔</span>
                  <span className="text-foreground text-xs">{flatDetails.agreement.sellerLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{flatDetails.agreement.createdDate}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{flatDetails.agreement.completedSteps} of {flatDetails.agreement.progressSteps}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-status-agreement rounded-full transition-all"
                      style={{ width: `${(flatDetails.agreement.completedSteps / flatDetails.agreement.progressSteps) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <Separator />

        {/* Collapsible Ownership Timeline with Visual Lineage */}
        <section className="border border-border rounded-lg overflow-hidden">
         {flatDetails.id && (
          <OwnershipTimeline
            recordHash={flatDetails.id}
            compact={true}
            defaultOpen={false}
          />
        )}
        </section>

        <Separator />

        {/* Verification Summary */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Verification Summary</h3>
          {getVerificationBadge()}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Registry Record</span>
              <div className="flex items-center gap-1.5">
                {getVerificationIcon(flatDetails.verificationProgress.registryRecord)}
                <span className="capitalize text-foreground">{flatDetails.verificationProgress.registryRecord}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Document Integrity</span>
              <div className="flex items-center gap-1.5">
                {getVerificationIcon(flatDetails.verificationProgress.documentIntegrity)}
                <span className="capitalize text-foreground">{flatDetails.verificationProgress.documentIntegrity}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chain Anchoring</span>
              <div className="flex items-center gap-1.5">
                {getVerificationIcon(getChainAnchoringStatus())}
                <span className="capitalize text-foreground">{getChainAnchoringStatus()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Geospatial Match</span>
              <div className="flex items-center gap-1.5">
                {getVerificationIcon(flatDetails.verificationProgress.geospatialMatch)}
                <span className="capitalize text-foreground">{flatDetails.verificationProgress.geospatialMatch}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agreement Archival</span>
              <div className="flex items-center gap-1.5">
                {getVerificationIcon(getAgreementArchivalStatus())}
                <span className="capitalize text-foreground">{getAgreementArchivalStatus()}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last verified: {new Date().toLocaleDateString()}
          </p>
        </section>
      </div>
    </div>
  );
};

export default RegistryPanel;
