import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import type { MockRegistryRecord } from '@/types/admin';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    FileText,
    GitBranch,
    Hash,
    History,
    MapPin,
    Share2,
    Shield,
    User
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ParcelDetailPanelProps {
  record: MockRegistryRecord;
  onBack: () => void;
  onViewParent?: (parentHash: string) => void;
}

const ParcelDetailPanel: React.FC<ParcelDetailPanelProps> = ({ record, onBack, onViewParent }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('summary');
  const [details, setDetails] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingDetails(true);
      try {
        const d = await adminApi.getRecordDetails(record.recordHash);
        const h = await adminApi.getRecordHistory(record.recordHash);
        if (!mounted) return;
        setDetails(d || {});
        setHistory((h && h.history) || (Array.isArray(h) ? h : []));
      } catch (e: any) {
        console.error('Failed to load record details', e);
        toast({ title: 'Failed to load record', description: e?.message || String(e), variant: 'destructive' });
        setDetails({});
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [record.recordHash]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'DISPUTED':
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Disputed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatArea = (m2: number | undefined) => {
    if (!m2) return '—';
    const acres = (m2 / 4046.86).toFixed(2);
    return `${acres} acres (${m2.toLocaleString()} m²)`;
  };

  // Safe metadata access
  const getMeta = (key: string): string => {
    if (!details?.metadata) return '—';
    const meta = details.metadata;
    return String(meta[key] || meta[key.replace(/([A-Z])/g, '_$1').toLowerCase()] || '—');
  };
  

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Back Button */}
      <div className="p-3 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 h-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Explorer
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Header Card */}
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{getMeta('survey_no') || getMeta('surveyNo') || record.metadata?.surveyNo || 'Parcel'}</h1>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{getMeta('village') || record.metadata?.village || 'Unknown'}, {getMeta('district') || record.metadata?.district || ''}, {getMeta('state') || record.metadata?.state || ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(record.registryStatus)}
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[10px]">📐</span>
                  </div>
                  <span>{formatArea(details?.area_m2 ?? record.areaM2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(details?.created_at || record.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Record Hash */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Canonical Record Hash (keccak256)</span>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-foreground break-all pr-2">{record.recordHash || details?.record_hash || '—'}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(record.recordHash || '', 'Record hash')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="summary" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="ownership" className="text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                Ownership History
              </TabsTrigger>
              <TabsTrigger value="lineage" className="text-xs gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Lineage Tree
              </TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-4 space-y-4">
              {/* Parcel Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Parcel Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Survey Number', value: details?.survey_number || getMeta('survey_no') || getMeta('surveyNo') || record.metadata?.surveyNo },
                    { label: 'Registration No.', value: (record.id || '').slice(0, 12) + '...' },
                    { label: 'Area', value: formatArea(details?.area_m2 ?? record.areaM2) },
                    { label: 'Created', value: new Date(details?.created_at || record.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { label: 'IPFS CID', value: details?.cid || '—', mono: true },
                    { label: 'Village', value: getMeta('village') || record.metadata?.village },
                    { label: 'Taluk', value: getMeta('taluk') || record.metadata?.taluk },
                    { label: 'District', value: getMeta('district') || record.metadata?.district },
                    { label: 'State', value: getMeta('state') || record.metadata?.state },
                    { label: 'Owner Name', value: details?.owner_name || getMeta('owner_name') || getMeta('ownerName') || record.ownerName || '—' },
                    { label: 'Survey Date', value: getMeta('survey_date') || getMeta('surveyDate') || '—' },
                    { label: 'Subdivided', value: (details?.is_subdivided ?? record.isSubdivided) ? 'Yes' : 'No' },
                    { label: 'Transferable', value: details?.is_transferable ?? record.isTransferable, isTransferable: true },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      {item.isTransferable ? (
                        <span className={`text-xs font-medium flex items-center gap-1 ${item.value ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {item.value && <ExternalLink className="h-3 w-3" />}
                          {item.value ? 'Yes' : 'No'}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium text-foreground ${item.mono ? 'font-mono' : ''}`}>
                          {String(item.value)}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Polygon Coordinates */}
              {details?.polygon && Array.isArray(details.polygon) && details.polygon.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Polygon Coordinates ({details.polygon.length} points)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="max-h-48 overflow-y-auto">
                      {details.polygon.map((coord: any, idx: number) => (
                        <div key={idx} className="py-1.5 border-b border-border/50 last:border-0">
                          <span className="text-xs text-muted-foreground">Point {idx + 1}</span>
                          <code className="text-xs font-mono text-foreground block">
                            ({(coord[0] ?? 0).toFixed(6)}, {(coord[1] ?? 0).toFixed(6)})
                          </code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Owner */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Current Owner
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Owner Address</p>
                    <code className="text-xs font-mono text-foreground break-all">{record.ownerAddress || details?.owner_address || '—'}</code>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Registered Owners</p>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{getMeta('owner_name') || getMeta('ownerName') || record.ownerName || 'Unknown Owner'}</p>
                        <p className="text-xs font-mono text-muted-foreground">{(record.ownerAddress || details?.owner_address || '').slice(0, 20)}...</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ownership History Tab */}
            <TabsContent value="ownership" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Ownership Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {history.length > 0 ? (
                      history.map((event: any, index: number) => (
                        <div key={event.id || index} className="flex gap-3 pb-4 last:pb-0">
                          {/* Timeline line */}
                          <div className="relative flex flex-col items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              event.status === 'complete' ? 'bg-emerald-500/20' : 'bg-muted'
                            }`}>
                              {event.status === 'complete' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {index < history.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border mt-2" />
                            )}
                          </div>

                          {/* Event content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-foreground">{event.description || 'Ownership Change'}</p>
                              <span className="text-xs text-muted-foreground">{event.date || event.timestamp || '—'}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium text-foreground">{event.owner || event.owner_address || '—'}</span>
                              </div>
                              <code className="text-[10px] font-mono text-muted-foreground break-all">{event.ownerAddress || event.owner_address || '—'}</code>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">No ownership history available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lineage Tree Tab */}
            <TabsContent value="lineage" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Lineage Tree
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Record */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Current Record</span>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground break-all">{record.recordHash || '—'}</code>
                  </div>

                  {/* Parent Record */}
                  {details?.parent_record && (
                    <div className="relative pl-6 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-border">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Parent Record</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              const parent = details.parent_record;
                              if (onViewParent && parent) {
                                onViewParent(parent);
                              } else {
                                toast({ title: 'Parent Record', description: parent });
                              }
                            }}
                          >
                            View Parent
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        <code className="text-xs font-mono text-foreground break-all">{details.parent_record}</code>
                      </div>
                    </div>
                  )}

                  {/* Child Records */}
                  {(details?.children_records && Array.isArray(details.children_records) && details.children_records.length > 0) ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Child Records (Subdivisions) — {details.children_records.length}</p>
                      {details.children_records.map((child: string, index: number) => (
                        <div key={index} className="p-2 rounded-lg bg-muted/20 border border-border/50">
                          <code className="text-xs font-mono text-foreground break-all">{child}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/20 text-center">
                      <p className="text-sm text-muted-foreground">No subdivisions found</p>
                      <p className="text-xs text-muted-foreground mt-1">This parcel has not been subdivided</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ParcelDetailPanel;
