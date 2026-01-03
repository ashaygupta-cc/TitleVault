import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { adminApi } from '@/services/adminApi';
import {
    ArrowDown,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    FileSignature,
    Hash,
    Loader2,
    User
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface TimelineEvent {
  id: string;
  type: 'registration' | 'agreement_created' | 'agreement_activated' | 'transfer_complete' | 'ownership';
  title: string;
  description?: string;
  timestamp: string;
  hash?: string;
  txHash?: string;
  owner?: string;
  ownerName?: string;
  parties?: { buyer: string; seller: string };
  status: 'complete' | 'pending' | 'active';
}

interface OwnershipTimelineProps {
  recordHash: string;
  compact?: boolean;
  defaultOpen?: boolean;
}

const OwnershipTimeline: React.FC<OwnershipTimelineProps> = ({
  recordHash,
  compact = false,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!recordHash) return;
      
      setIsLoading(true);
      try {
        console.log(`📥 Fetching ownership timeline for flatId: ${recordHash}`);
        
        // Try to fetch agreement history for this flat
        try {
          const historyData = await adminApi.getAgreementHistory(recordHash);
          console.log('✅ Agreement history received:', historyData);
          
          if (historyData && historyData.history && historyData.history.length > 0) {
            // Create timeline showing full progression of each agreement
            const timelineEvents: TimelineEvent[] = [];
            
            historyData.history.forEach((event: any, eventIndex: number) => {
              const status = event.status || event.type || 'DRAFT';
              const buyerAddr = event.buyer_address || 'Unknown';
              const sellerAddr = event.seller_address || 'Unknown';
              const agreementId = event.agreement_id ? event.agreement_id.slice(0, 12) : 'N/A';
              const fullAgreementId = event.agreement_id || 'N/A';
              const isLastEvent = eventIndex === historyData.history.length - 1;
              
              // Determine verification status based on agreement status
              // ACTIVE = verified (locked on blockchain, can be anchored)
              // COMPLETED/DEFAULTED/CANCELLED = pending (inactive, need archival anchoring)
              let eventStatus: 'pending' | 'active' | 'complete' = 'pending';
              if (status === 'ACTIVE') {
                eventStatus = 'complete'; // Verified, locked on blockchain
              } else if (status === 'COMPLETED' || status === 'DEFAULTED' || status === 'CANCELLED') {
                eventStatus = 'pending'; // Inactive, pending archival
              }
              
              // Show all states in progression: DRAFT → ACTIVE → COMPLETED/DEFAULTED
              
              // 1. Agreement Created (DRAFT state)
              timelineEvents.push({
                id: `${fullAgreementId}-draft`,
                type: 'agreement_created',
                title: 'Agreement Created',
                description: `Agreement ID: ${agreementId}\nStatus: DRAFT\nBuyer: ${buyerAddr}\nSeller: ${sellerAddr}`,
                timestamp: event.created_at || new Date().toISOString(),
                hash: event.agreement_hash || fullAgreementId,
                status: 'pending'
              });
              
              // 2. Agreement Activated (ACTIVE state) - only if status is ACTIVE or higher
              if (status === 'ACTIVE' || status === 'COMPLETED' || status === 'DEFAULTED') {
                timelineEvents.push({
                  id: `${fullAgreementId}-active`,
                  type: 'agreement_activated',
                  title: 'Agreement Activated',
                  description: `Agreement ID: ${agreementId}\nLocked on blockchain\nBuyer: ${buyerAddr}\nSeller: ${sellerAddr}`,
                  timestamp: event.created_at || new Date().toISOString(),
                  hash: event.agreement_hash || fullAgreementId,
                  txHash: event.tx_hash,
                  parties: { buyer: buyerAddr, seller: sellerAddr },
                  status: eventStatus === 'complete' && isLastEvent ? 'active' : eventStatus
                });
              }
              
              // 3. Final state: Transfer, Defaulted, or Cancelled
              if (status === 'COMPLETED') {
                timelineEvents.push({
                  id: `${fullAgreementId}-completed`,
                  type: 'transfer_complete',
                  title: 'Flat Transferred',
                  description: `Agreement ID: ${agreementId}\nOwnership transferred from ${sellerAddr} to ${buyerAddr}\nStatus: Pending Archival`,
                  timestamp: event.created_at || new Date().toISOString(),
                  hash: event.agreement_hash || fullAgreementId,
                  txHash: event.tx_hash,
                  parties: { buyer: buyerAddr, seller: sellerAddr },
                  status: 'pending' // Completed agreements pending archival
                });
              } else if (status === 'DEFAULTED') {
                timelineEvents.push({
                  id: `${fullAgreementId}-defaulted`,
                  type: 'ownership',
                  title: 'Agreement Defaulted',
                  description: `Agreement ID: ${agreementId}\nBuyer (${buyerAddr}) defaulted\nFlat returns to seller: ${sellerAddr}\nStatus: Pending Archival`,
                  timestamp: event.created_at || new Date().toISOString(),
                  hash: event.agreement_hash || fullAgreementId,
                  status: 'pending' // Defaulted agreements pending archival
                });
              } else if (status === 'CANCELLED') {
                timelineEvents.push({
                  id: `${fullAgreementId}-cancelled`,
                  type: 'ownership',
                  title: 'Agreement Cancelled',
                  description: `Agreement ID: ${agreementId}\nCancelled by mutual consent\nStatus: Pending Archival`,
                  timestamp: event.created_at || new Date().toISOString(),
                  hash: event.agreement_hash || fullAgreementId,
                  status: 'pending' // Cancelled agreements pending archival
                });
              }
            });
            
            console.log('✅ Timeline events mapped:', timelineEvents);
            setEvents(timelineEvents);
          } else {
            console.log('ℹ️ No history found');
            setEvents([]);
          }
        } catch (err) {
          console.error('❌ Failed to fetch agreement history:', err);
          setEvents([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [recordHash]);

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'ownership':
        return <User className="h-4 w-4" />;
      case 'agreement_created':
      case 'agreement_activated':
        return <FileSignature className="h-4 w-4" />;
      case 'transfer_complete':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'registration':
        return <Hash className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'transfer_complete':
        return 'bg-orange-500 border-orange-500 text-white';
      default:
        switch (event.status) {
          case 'active':
            return 'bg-verified border-verified text-verified-foreground';
          case 'complete':
            return 'bg-orange-500 border-orange-500 text-white';
          case 'pending':
            return 'bg-pending border-pending text-pending-foreground';
          default:
            return 'bg-muted border-border text-muted-foreground';
        }
    }
  };

  const getLineColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'transfer_complete':
        return 'bg-orange-500';
      default:
        switch (event.status) {
          case 'active':
            return 'bg-verified';
          case 'complete':
            return 'bg-orange-500';
          case 'pending':
            return 'bg-pending';
          default:
            return 'bg-border';
        }
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTimelineContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading timeline...</span>
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No ownership history available</p>
        </div>
      );
    }

    return (
      <div className="relative pl-6 space-y-0 max-w-full overflow-hidden">
        {events.map((event, index) => (
          <div key={event.id} className="relative pb-6 last:pb-0 max-w-full">
            {/* Vertical line */}
            {index < events.length - 1 && (
              <div className={`absolute left-[-12px] top-6 bottom-0 w-0.5 ${getLineColor(events[index + 1])}`} />
            )}
            
            {/* Node */}
            <div className={`absolute left-[-18px] w-4 h-4 rounded-full border-2 flex items-center justify-center ${getEventColor(event)}`}>
              {event.status === 'active' && (
                <div className="w-2 h-2 rounded-full bg-verified animate-pulse" />
              )}
            </div>

            {/* Arrow between nodes */}
            {index < events.length - 1 && (
              <div className="absolute left-[-14px] top-[22px]">
                <ArrowDown className="h-3 w-3 text-muted-foreground" />
              </div>
            )}

            {/* Content */}
            <div className="ml-2 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`${event.status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {getEventIcon(event)}
                  </span>
                  <span className={`text-sm ${event.status === 'active' ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                    {event.title}
                  </span>
                  {event.status === 'active' && (
                    <Badge variant="default" className="bg-verified text-xs flex-shrink-0">Current</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                  {formatDate(event.timestamp)}
                </span>
              </div>

              {event.description && (
                <p className="text-xs text-muted-foreground mt-2 ml-6 whitespace-pre-wrap break-words overflow-hidden">
                  {event.description}
                </p>
              )}

              {event.ownerName && (
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-muted-foreground">Owner:</span>
                  <span className="text-xs font-medium text-foreground">{event.ownerName}</span>
                  {event.owner && (
                    <span className="text-xs font-mono text-muted-foreground">({event.owner})</span>
                  )}
                </div>
              )}

              {event.parties && (
                <div className="mt-1 ml-6 text-xs space-y-1">
                  <div className="break-words">
                    <span className="text-muted-foreground">Buyer: </span>
                    <span className="font-mono text-xs truncate">{event.parties.buyer}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-muted-foreground">Seller: </span>
                    <span className="font-mono text-xs truncate">{event.parties.seller}</span>
                  </div>
                </div>
              )}

              {(event.hash || event.txHash) && !compact && (
                <div className="flex flex-wrap gap-2 mt-2 ml-6">
                  {event.hash && (
                    <Badge variant="outline" className="text-xs font-mono">
                      <Hash className="h-3 w-3 mr-1" />
                      {event.hash.slice(0, 12)}...
                    </Badge>
                  )}
                  {event.txHash && (
                    <Badge variant="outline" className="text-xs font-mono cursor-pointer hover:bg-accent">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      TX: {event.txHash.slice(0, 10)}...
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-auto py-2 px-3"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Ownership Timeline</span>
              <Badge variant="secondary" className="text-xs">
                {events.length || '—'} events
              </Badge>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 overflow-hidden w-full">
          <div className="w-full overflow-x-hidden">
            {renderTimelineContent()}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Ownership Timeline
        </h3>
        <Badge variant="secondary" className="text-xs">
          {events.length} events
        </Badge>
      </div>
      {renderTimelineContent()}
    </div>
  );
};

export default OwnershipTimeline;
