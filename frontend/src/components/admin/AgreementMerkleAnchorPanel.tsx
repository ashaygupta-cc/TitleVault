import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { AlertCircle, CheckCircle2, FileSignature, Link2, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MerkleRootData {
  merkle_root?: string;
  root?: string;
  count?: number;
  block_number?: number;
  tx_hash?: string;
  anchored_at?: string;
}

const AgreementMerkleAnchorPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [merkleData, setMerkleData] = useState<MerkleRootData | null>(null);
  const [anchorResult, setAnchorResult] = useState<any>(null);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);

  // Fetch current merkle root on load
  useEffect(() => {
    fetchMerkleRoot();
  }, []);

  // Auto-refresh after anchoring (every 2 seconds for 30 seconds)
  useEffect(() => {
    if (autoRefreshCount > 0 && autoRefreshCount <= 15) {
      const timer = setTimeout(() => {
        fetchMerkleRoot();
        setAutoRefreshCount(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoRefreshCount]);

  const fetchMerkleRoot = async () => {
    try {
      const data = await adminApi.getAgreementMerkleRoot();
      setMerkleData(data);
    } catch (error: any) {
      console.error('Fetch merkle root error:', error);
      if (autoRefreshCount === 0) {
        toast({
          title: 'Failed to Fetch',
          description: error?.message || 'Could not fetch merkle root',
          variant: 'destructive',
        });
      }
    } finally {
      setIsFetching(false);
      setIsRefreshing(false);
    }
  };

  const handleAnchorMerkleRoot = async () => {
    if (!merkleData?.merkle_root && !merkleData?.root) {
      toast({
        title: 'No Merkle Root',
        description: 'No merkle root available to anchor',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminApi.anchorAgreementMerkleRoot();
      setAnchorResult(result);
      
      // Immediately update merkleData with the anchor result so UI shows "Anchored"
      setMerkleData(prev => prev ? {
        ...prev,
        tx_hash: result.tx_hash,
        block_number: result.block_number,
        anchored_at: result.anchored_at,
      } : null);
      
      toast({
        title: 'Success',
        description: 'Agreement merkle root anchored on blockchain! ✓',
      });
    } catch (error: any) {
      console.error('Anchor error:', error);
      toast({
        title: 'Anchor Failed',
        description: error?.message || 'Could not anchor merkle root',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMerkleRoot();
  };

  const merkleRoot = merkleData?.merkle_root || merkleData?.root;
  const recordCount = merkleData?.count || 0;
  const isAnchored = merkleData?.tx_hash ? true : false;

  return (
    <div className="p-6 space-y-6 overflow-auto registry-scrollbar h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
          Admin
        </Badge>
        <h2 className="text-xl font-semibold text-foreground">Agreement Merkle Root Anchor</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing || isFetching}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefreshCount > 0 && autoRefreshCount <= 15 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-600">Waiting for blockchain confirmation... ({autoRefreshCount * 2}s)</span>
          </CardContent>
        </Card>
      )}

      {/* Current Merkle Root Status */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            Current Merkle Root
          </CardTitle>
          <CardDescription>Latest merkle root of all active agreements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : merkleRoot ? (
            <>
              {/* Merkle Root Hash */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Merkle Root (Keccak-256)</p>
                <p className="font-mono text-xs break-all text-foreground">
                  {merkleRoot}
                </p>
              </div>

              {/* Agreement Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Agreements in Tree</p>
                  <p className="text-lg font-semibold text-foreground">{recordCount}</p>
                </div>

                {/* Anchor Status */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {isAnchored ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Anchored</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-600">Pending</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Blockchain Details (if anchored) */}
              {isAnchored && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Transaction Hash</p>
                    <p className="font-mono text-xs break-all text-foreground">
                      {merkleData?.tx_hash}
                    </p>
                  </div>
                  {merkleData?.block_number && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Block Number</p>
                        <p className="text-sm font-medium text-foreground">{merkleData.block_number}</p>
                      </div>
                      {merkleData?.anchored_at && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Anchored At</p>
                          <p className="text-xs text-foreground">
                            {new Date(merkleData.anchored_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No merkle root available (no agreements created yet)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anchor Action Button */}
      {merkleRoot && !isAnchored && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              Anchor Merkle Root
            </CardTitle>
            <CardDescription>Anchor the current merkle root on blockchain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will submit the merkle root hash to the blockchain. Once anchored, all agreements in this tree can be verified against the on-chain root.
            </p>

            <Button 
              onClick={handleAnchorMerkleRoot}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anchoring...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Anchor Merkle Root on Blockchain
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Anchor Result */}
      {anchorResult && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-600 mb-2">Merkle Root Anchored Successfully</p>
                <div className="space-y-2 text-xs font-mono break-all">
                  {anchorResult.tx_hash && (
                    <div>
                      <span className="text-muted-foreground">TX: </span>
                      <span className="text-foreground">{anchorResult.tx_hash}</span>
                    </div>
                  )}
                  {anchorResult.block_number && (
                    <div>
                      <span className="text-muted-foreground">Block: </span>
                      <span className="text-foreground">{anchorResult.block_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">How Agreement Merkle Root Anchoring Works</p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>All active agreements are organized into a Merkle tree</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>The root hash cryptographically represents all agreements</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Anchoring the root on blockchain creates immutable record</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Each agreement can prove membership in anchored tree</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgreementMerkleAnchorPanel;
