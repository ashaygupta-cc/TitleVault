import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  TreePine,
  XCircle
} from 'lucide-react';
import { useState } from 'react';

interface MerkleProof {
  leafHash: string;
  leafIndex: number;
  proofNodes: string[];
  merkleRoot: string;
  verified: boolean;
}

interface BlockchainAnchoring {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  network: string;
  contractAddress: string;
  cid: string;
}

const MerkleProofPanel = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('registry');
  const [proofNodesOpen, setProofNodesOpen] = useState(true);
  const [registryHash, setRegistryHash] = useState('');
  const [agreementId, setAgreementId] = useState('');
  const [proof, setProof] = useState<MerkleProof | null>(null);
  const [anchoring, setAnchoring] = useState<BlockchainAnchoring | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRegistryProof = async () => {
    if (!registryHash || registryHash.length < 10) {
      toast({
        title: 'Invalid Hash',
        description: 'Please enter a valid record hash',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const resp: any = await adminApi.getMerkleProof(registryHash);
      const mapped: MerkleProof = {
        leafHash: resp.record_hash || resp.leaf_hash || resp.leafHash || resp.leaf || '',
        leafIndex: resp.index ?? resp.leaf_index ?? resp.leafIndex ?? 0,
        proofNodes: resp.proof || resp.proof_nodes || resp.proofNodes || [],
        merkleRoot: resp.root || resp.merkle_root || resp.merkleRoot || '',
        verified: !!(resp.proof && resp.root && (Array.isArray(resp.proof) && resp.proof.length > 0 || resp.leaf === resp.root)),
      };
      setProof(mapped);
      
      if (resp.tx_hash || resp.txHash) {
        setAnchoring({
          txHash: resp.tx_hash || resp.txHash || '',
          blockNumber: resp.block_number || resp.blockNumber || 0,
          timestamp: resp.anchored_at || resp.timestamp || '',
          network: 'Polygon',
          contractAddress: resp.contract_address || resp.contractAddress || '',
          cid: resp.cid || resp.ipfs_cid || '',
        });
      } else {
        setAnchoring(null);
      }

      toast({
        title: 'Success',
        description: 'Merkle proof retrieved',
      });
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error?.message || 'Could not fetch merkle proof',
        variant: 'destructive',
      });
      setProof(null);
      setAnchoring(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgreementProof = async () => {
    if (!agreementId || agreementId.length < 5) {
      toast({
        title: 'Invalid ID',
        description: 'Please enter a valid agreement ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const resp: any = await adminApi.getAgreementMerkleProof(agreementId);
      const mapped: MerkleProof = {
        leafHash: resp.record_hash || resp.leaf_hash || resp.leafHash || resp.leaf || '',
        leafIndex: resp.index ?? resp.leaf_index ?? resp.leafIndex ?? 0,
        proofNodes: resp.proof || resp.proof_nodes || resp.proofNodes || [],
        merkleRoot: resp.root || resp.merkle_root || resp.merkleRoot || '',
        verified: !!(resp.proof && resp.root && (Array.isArray(resp.proof) && resp.proof.length > 0 || resp.leaf === resp.root)),
      };
      setProof(mapped);
      
      if (resp.tx_hash || resp.txHash) {
        setAnchoring({
          txHash: resp.tx_hash || resp.txHash || '',
          blockNumber: resp.block_number || resp.blockNumber || 0,
          timestamp: resp.anchored_at || resp.timestamp || '',
          network: 'Polygon',
          contractAddress: resp.contract_address || resp.contractAddress || '',
          cid: resp.cid || resp.ipfs_cid || '',
        });
      } else {
        setAnchoring(null);
      }

      toast({
        title: 'Success',
        description: 'Agreement merkle proof retrieved',
      });
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error?.message || 'Could not fetch agreement merkle proof',
        variant: 'destructive',
      });
      setProof(null);
      setAnchoring(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="h-5 w-5" />
          Merkle Proof Viewer
        </CardTitle>
        <CardDescription>
          Verify records and agreements in the Merkle tree
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registry">Registry Record</TabsTrigger>
            <TabsTrigger value="agreement">Agreement</TabsTrigger>
          </TabsList>

          {/* Registry Tab */}
          <TabsContent value="registry" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="registry-hash">Record Hash</Label>
              <div className="flex gap-2">
                <Input
                  id="registry-hash"
                  placeholder="Enter registry record hash to view merkle proof..."
                  value={registryHash}
                  onChange={(e) => setRegistryHash(e.target.value)}
                  className="font-mono text-xs"
                  disabled={loading}
                />
                <Button
                  onClick={fetchRegistryProof}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Agreement Tab */}
          <TabsContent value="agreement" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="agreement-id">Agreement ID or Subject ID</Label>
              <p className="text-xs text-slate-500">
                Enter the agreement UUID (e.g., 9106edaa-0e7c-4e58-ac89-1c4368f08356) or the subject ID to view its merkle proof
              </p>
              <div className="flex gap-2">
                <Input
                  id="agreement-id"
                  placeholder="e.g., 9106edaa-0e7c-4e58-ac89-1c4368f08356 or subject ID..."
                  value={agreementId}
                  onChange={(e) => setAgreementId(e.target.value)}
                  className="font-mono text-xs"
                  disabled={loading}
                />
                <Button
                  onClick={fetchAgreementProof}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Proof Display */}
        {proof && (
          <div className="space-y-4 border-t pt-4">
            {/* Verification Status */}
            <div className={`p-3 rounded-lg ${proof.verified ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="flex items-center gap-2 font-semibold">
                {proof.verified ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Valid Merkle Proof
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Invalid Proof
                  </>
                )}
              </div>
            </div>

            {/* Leaf Hash */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Leaf Hash</Label>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded font-mono text-xs break-all">
                <span>{proof.leafHash}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(proof.leafHash);
                    toast({
                      title: 'Copied',
                      description: 'Leaf hash copied to clipboard',
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Leaf Index */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Leaf Index</Label>
              <div className="bg-slate-50 p-2 rounded font-mono text-xs">
                {proof.leafIndex}
              </div>
            </div>

            {/* Merkle Root */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Merkle Root</Label>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded font-mono text-xs break-all">
                <span>{proof.merkleRoot}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(proof.merkleRoot);
                    toast({
                      title: 'Copied',
                      description: 'Merkle root copied to clipboard',
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Proof Nodes */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProofNodesOpen(!proofNodesOpen)}
                className="w-full justify-between"
              >
                <span>Proof Path ({proof.proofNodes.length} nodes)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${proofNodesOpen ? 'rotate-180' : ''}`} />
              </Button>
              {proofNodesOpen && (
                <div className="space-y-2">
                  {proof.proofNodes.length > 0 ? (
                    proof.proofNodes.map((node: string, idx: number) => (
                      <div key={idx} className="text-xs bg-slate-50 p-2 rounded font-mono break-all">
                        <span className="text-slate-500">{idx}.</span> {node}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 p-2">No proof nodes</div>
                  )}
                </div>
              )}
            </div>

            {/* Blockchain Anchoring */}
            {anchoring && (
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm">🌍 Blockchain Anchoring</h3>
                <div className="grid gap-2 text-xs">
                  {anchoring.txHash && (
                    <div>
                      <Label className="text-xs font-semibold">TX Hash</Label>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded font-mono break-all">
                        <span>{anchoring.txHash}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(anchoring.txHash);
                            toast({
                              title: 'Copied',
                              description: 'TX hash copied',
                            });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {anchoring.blockNumber > 0 && (
                    <div>
                      <Label className="text-xs font-semibold">Block Number</Label>
                      <div className="bg-slate-50 p-2 rounded font-mono text-xs">
                        {anchoring.blockNumber}
                      </div>
                    </div>
                  )}
                  {anchoring.timestamp && (
                    <div>
                      <Label className="text-xs font-semibold">Timestamp</Label>
                      <div className="bg-slate-50 p-2 rounded font-mono text-xs">
                        {new Date(anchoring.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {anchoring.network && (
                    <div>
                      <Label className="text-xs font-semibold">Network</Label>
                      <div className="bg-slate-50 p-2 rounded text-xs font-semibold text-purple-700">
                        {anchoring.network}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Proof */}
        {!proof && !loading && (
          <div className="text-center py-8 text-slate-500">
            <TreePine className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {activeTab === 'registry'
                ? 'Enter a registry record hash to view its merkle proof'
                : 'Enter an agreement ID to view its merkle proof'}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-slate-500" />
            <p className="text-sm text-slate-500">Loading proof...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MerkleProofPanel;
