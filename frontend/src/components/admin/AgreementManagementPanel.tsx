import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { AlertCircle, CheckCircle2, Loader2, XCircle, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const AgreementManagementPanel = () => {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    adminApi.getAllAgreements()
      .then(setAgreements)
      .finally(() => setIsLoading(false));
  }, []);

  // Group agreements by division (subject_id or other logic)
  const divisions = Array.from(new Set(agreements.map(a => a.division || 'Unknown')));

  const filteredAgreements = selectedDivision === 'all'
    ? agreements
    : agreements.filter(a => a.division === selectedDivision);

  const handleStateChange = async (agreement: any, newState: string) => {
    setActionLoading(agreement.agreement_id || agreement.agreementId);
    try {
      if (newState === 'ACTIVE') await adminApi.activateAgreement(agreement.agreement_id || agreement.agreementId);
      if (newState === 'COMPLETED') await adminApi.completeAgreement(agreement.agreement_id || agreement.agreementId);
      if (newState === 'CANCELLED') await adminApi.cancelAgreement(agreement.agreement_id || agreement.agreementId);
      if (newState === 'DEFAULTED') await adminApi.defaultAgreement(agreement.agreement_id || agreement.agreementId);
      toast({ title: 'Success', description: `Agreement state updated to ${newState}` });
      // Update only the changed agreement in local state
      setAgreements(prev => prev.map(a => {
        if ((a.agreement_id || a.agreementId) === (agreement.agreement_id || agreement.agreementId)) {
          return { ...a, status: newState };
        }
        return a;
      }));
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Could not update agreement', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-auto registry-scrollbar h-full">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
          Admin
        </Badge>
        <CardTitle>Agreement Management</CardTitle>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
          <CardDescription>View and manage all agreements by division and state.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4 items-center">
            <span>Division:</span>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {divisions.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgreements.map(agreement => (
                <Card key={agreement.agreement_id || agreement.agreementId} className="border-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {agreement.status === 'DRAFT' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {agreement.status === 'ACTIVE' && <Zap className="h-5 w-5 text-blue-500" />}
                      {agreement.status === 'COMPLETED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {agreement.status === 'CANCELLED' && <XCircle className="h-5 w-5 text-red-500" />}
                      {agreement.status === 'DEFAULTED' && <AlertCircle className="h-5 w-5 text-orange-500" />}
                      <span className="font-medium">{agreement.status}</span>
                    </div>
                    <div className="text-xs mb-2">
                      <div>Agreement ID: <span className="font-mono">{agreement.agreement_id || agreement.agreementId}</span></div>
                      <div>Division: <span>{agreement.division || 'Unknown'}</span></div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {['DRAFT', 'ACTIVE'].includes(agreement.status) && (
                        <Select value={agreement.status} onValueChange={v => handleStateChange(agreement, v)} disabled={!!actionLoading}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder={agreement.status.charAt(0) + agreement.status.slice(1).toLowerCase()} />
                          </SelectTrigger>
                          <SelectContent>
                            {agreement.status === 'DRAFT' && <SelectItem value="ACTIVE">Activate</SelectItem>}
                            {agreement.status === 'ACTIVE' && <SelectItem value="COMPLETED">Complete</SelectItem>}
                            {agreement.status === 'ACTIVE' && <SelectItem value="CANCELLED">Cancel</SelectItem>}
                            {agreement.status === 'ACTIVE' && <SelectItem value="DEFAULTED">Default</SelectItem>}
                          </SelectContent>
                        </Select>
                      )}
                      {['COMPLETED', 'CANCELLED', 'DEFAULTED'].includes(agreement.status) && (
                        <span className="text-muted-foreground text-xs">State change not allowed</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredAgreements.length === 0 && <div className="text-center text-muted-foreground">No agreements found.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgreementManagementPanel;
