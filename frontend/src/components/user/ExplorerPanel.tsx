import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import ParcelDetailPanel from './ParcelDetailPanel';

interface RegistryRecord {
  id: string;
  recordHash: string;
  ownerAddress: string;
  ownerName?: string;
  surveyNumber?: string;
  areaM2?: number;
  parcelType: string;
  isSubdivided: boolean;
  isTransferable: boolean;
  registryStatus: string;
  createdAt: string;
  metadata?: {
    surveyNo?: string;
    survey_no?: string;
    village?: string;
    taluk?: string;
    district?: string;
    state?: string;
  };
}

const ExplorerPanel = () => {
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RegistryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const rowsPerPage = 8;

  // Fetch records from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await adminApi.getRegistryRecords();
        if (!mounted) return;

        // Normalize records from backend response
        const items = Array.isArray(resp) ? resp : resp?.items || [];
        const normalized: RegistryRecord[] = items.map((it: any) => {
          const meta = it.metadata || {};
          return {
            id: it.id || it.record_hash || Math.random().toString(36).slice(2),
            recordHash: it.record_hash || it.recordHash || '',
            ownerAddress: it.owner_address || it.ownerAddress || '',
            ownerName: it.owner_name || it.ownerName || (it.owner_address || '').slice(0, 10) + '...',
            surveyNumber: it.survey_number || it.surveyNumber || meta.surveyNo || meta.survey_no || undefined,
            areaM2: it.area_m2 || it.areaM2 || null,
            parcelType: it.parcel_type || it.parcelType || 'LAND',
            isSubdivided: Boolean(it.is_subdivided || it.isSubdivided || it.subdivision_locked),
            isTransferable: Boolean(it.is_transferable ?? it.isTransferable ?? true),
            registryStatus: it.registry_status || it.status || 'VERIFIED',
            createdAt: it.created_at || it.createdAt || new Date().toISOString(),
            metadata: meta,
          };
        });

        setRecords(normalized);
      } catch (e: any) {
        console.error('Failed to load records:', e);
        toast({
          title: 'Failed to load records',
          description: e?.message || 'Could not fetch registry records',
          variant: 'destructive',
        });
        setRecords([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Filter records by search and status
  const filteredRecords = records.filter((record) => {
    const meta = record.metadata || {};
    const surveyNo = meta.surveyNo || meta.survey_no || '';
    const village = meta.village || '';
    const ownerName = record.ownerName || '';

    const matchesSearch =
      search === '' ||
      surveyNo.toLowerCase().includes(search.toLowerCase()) ||
      village.toLowerCase().includes(search.toLowerCase()) ||
      ownerName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(record.registryStatus);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const stats = {
    total: records.length,
    verified: records.filter((r) => r.registryStatus === 'VERIFIED').length,
    pending: records.filter((r) => r.registryStatus === 'PENDING').length,
    disputed: records.filter((r) => r.registryStatus === 'DISPUTED').length,
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'border-0 text-[10px]';
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return <Badge className={`bg-green-500/20 text-green-600 ${baseClasses}`}>Verified</Badge>;
      case 'PENDING':
        return <Badge className={`bg-yellow-500/20 text-yellow-600 ${baseClasses}`}>Pending</Badge>;
      case 'DISPUTED':
        return <Badge className={`bg-destructive/20 text-destructive ${baseClasses}`}>Disputed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  // Show parcel detail panel if record selected
  if (selectedRecord) {
    return (
      <ParcelDetailPanel
        record={selectedRecord as any}
        onBack={() => setSelectedRecord(null)}
        onViewParent={() => {}}
      />
    );
  }

  // Loading state
  if (loading && records.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Registry Explorer</h2>
            <p className="text-xs text-muted-foreground">
              Browse all records • Click to view details
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Verified', value: stats.verified },
            { label: 'Pending', value: stats.pending },
            { label: 'Disputed', value: stats.disputed },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>


      {/* Search & Filter */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by survey #, village, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 w-9 p-0"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Records List */}
      <div className="flex-1 overflow-auto divide-y divide-border">
        {paginatedRecords.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No records found</p>
          </div>
        ) : (
          paginatedRecords.map((record) => {
            const meta = record.metadata || {};
            const surveyNo = record.surveyNumber || meta.surveyNo || meta.survey_no || '—';
            const village = meta.village || 'Unknown village';
            const ownerName = record.ownerName || 'Unknown';
            return (
              <div
                key={record.id}
                className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedRecord(record)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-mono text-xs font-medium">
                      {surveyNo}
                    </span>
                  </div>
                  {getStatusBadge(record.registryStatus)}
                </div>

                <p className="text-xs text-muted-foreground ml-9">
                  {village}
                  {meta.district ? `, ${meta.district}` : ''}
                </p>

                <div className="flex justify-between text-[10px] ml-9 text-muted-foreground">
                  <span>{ownerName}</span>
                  <span>{record.areaM2 ? record.areaM2.toLocaleString() : '—'} m²</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-2 border-t border-border flex justify-between items-center bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorerPanel;
