import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { AlertCircle, CheckCircle2, Fingerprint, Hash, Loader2, Lock, Shield } from 'lucide-react';
import { useState } from 'react';

interface VerificationResult {
  record_hash: string;
  status: string;
  db_exists: boolean;
  ipfs_exists: boolean;
  blockchain_exists: boolean;
  parent_match?: boolean;
  hash_match?: boolean;
  cid_match?: boolean;
  owner_match?: boolean;
  merkle_anchored?: boolean;
  is_legacy?: boolean;
}

const VerifyPanel = () => {
  const [hash, setHash] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!hash || hash.length < 10) {
      toast({
        title: 'Invalid Hash',
        description: 'Please enter a valid record hash',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await adminApi.verifyRecord(hash);
      setVerificationResult(result);
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error?.message || 'Failed to verify record',
        variant: 'destructive',
      });
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = verificationResult?.status === 'VERIFIED';
  const isTampered = verificationResult?.status === 'TAMPERED';
  const isNotFound = verificationResult?.status === 'NOT_FOUND';

  return (
    <div className="h-full flex flex-col bg-background p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Verify Records</h2>
          <p className="text-xs text-muted-foreground">Check record authenticity, integrity & blockchain anchoring status</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="hash" className="text-xs flex-1" disabled>
            <Hash className="h-3.5 w-3.5 mr-1" />Hash Verification
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Record Hash (Keccak-256)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="0x7cebfaa61c37da3c06b9d0bb3f061de52e02edfef13b243fe220cbe16b0b17a2"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            className="font-mono text-xs h-9"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{hash.length}/66 characters (with 0x)</span>
          </div>

          <Button 
            className="w-full" 
            onClick={handleVerify}
            disabled={loading || hash.length < 10}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Record'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {isVerified && (
        <Card className="border-green-500/30 bg-green-500/5 mb-4">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-600">Record Verified ✓</p>
              <p className="text-xs text-muted-foreground">
                {verificationResult?.merkle_anchored 
                  ? 'Record authenticated via anchored Merkle root on blockchain'
                  : 'Record exists on blockchain and is authentic'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isTampered && (
        <Card className="border-destructive/30 bg-destructive/5 mb-4">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Record Tampered</p>
              <p className="text-xs text-muted-foreground">Data has been modified or doesn't match blockchain</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isNotFound && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 mb-4">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-600">Not Found</p>
              <p className="text-xs text-muted-foreground">No matching record exists in registry</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Details */}
      {verificationResult && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Verification Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Record Hash</span>
                <span className="font-mono text-xs text-foreground">{verificationResult.record_hash.slice(0, 20)}...</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Database</span>
                <span className={`text-xs font-medium ${verificationResult.db_exists ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationResult.db_exists ? '✓ Exists' : '✗ Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">IPFS Content</span>
                <span className={`text-xs font-medium ${verificationResult.ipfs_exists ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationResult.ipfs_exists ? '✓ Available' : '✗ Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Canonical Hash</span>
                <span className={`text-xs font-medium ${verificationResult.hash_match ? 'text-green-600' : 'text-red-600'}`}>
                  {verificationResult.hash_match !== undefined ? (verificationResult.hash_match ? '✓ Match' : '✗ Mismatch') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Blockchain Status</span>
                <span className={`text-xs font-medium ${verificationResult.blockchain_exists ? 'text-green-600' : 'text-yellow-600'}`}>
                  {verificationResult.merkle_anchored ? '🌳 Merkle Root Anchored' : verificationResult.blockchain_exists ? '✓ Anchored' : '⏳ Pending Anchor'}
                </span>
              </div>
              {verificationResult.blockchain_exists && (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Owner Match</span>
                    <span className={`text-xs font-medium ${verificationResult.owner_match ? 'text-green-600' : 'text-red-600'}`}>
                      {verificationResult.owner_match !== undefined ? (verificationResult.owner_match ? '✓ Match' : '✗ Mismatch') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">CID Match</span>
                    <span className={`text-xs font-medium ${verificationResult.cid_match ? 'text-green-600' : 'text-red-600'}`}>
                      {verificationResult.cid_match !== undefined ? (verificationResult.cid_match ? '✓ Match' : '✗ Mismatch') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">Parent Match</span>
                    <span className={`text-xs font-medium ${verificationResult.parent_match ? 'text-green-600' : 'text-red-600'}`}>
                      {verificationResult.parent_match !== undefined ? (verificationResult.parent_match ? '✓ Match' : '✗ Mismatch') : '—'}
                    </span>
                  </div>
                </>
              )}
              
              {verificationResult.merkle_anchored && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                  <p className="font-medium mb-1">ℹ️ Merkle-Rooted Record</p>
                  <p>This record is verified via anchored Merkle root. Match fields show "mismatch" because the record isn't individually on-chain yet, but it's proven valid through the merkle tree.</p>
                </div>
              )}
            </div>

            {/* Hash comparison for debugging */}
            {!verificationResult.hash_match && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                <p className="text-xs font-medium text-yellow-900">Hash Comparison</p>
                <div className="space-y-1">
                  <div className="text-xs">
                    <span className="text-yellow-700 font-mono text-[10px] break-all">
                      Stored: {(verificationResult as any).stored_canonical_hash || '—'}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-yellow-700 font-mono text-[10px] break-all">
                      Calculated: {(verificationResult as any).calculated_canonical_hash || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verification Methods</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-start gap-3">
              <Hash className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Canonical Record Verification</p>
                <p className="text-xs text-muted-foreground">
                  Verifies record exists in database and IPFS with matching canonical hash.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-start gap-3">
              <Fingerprint className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Blockchain Anchoring Status</p>
                <p className="text-xs text-muted-foreground">
                  <strong>✓ Verified:</strong> Record is authentic and integral<br/>
                  <strong>⏳ Pending Anchor:</strong> Merkle root not yet anchored (see Admin → Merkle Root)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Merkle Root Anchoring</p>
                <p className="text-xs text-muted-foreground">
                  Administrators can anchor the Merkle root to blockchain to enable full on-chain verification.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
    </div>
  );
};

export default VerifyPanel;