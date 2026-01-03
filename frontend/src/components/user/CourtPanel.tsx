import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { registryApi } from '@/services/registryApi';
import {
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FileText,
  Fingerprint,
  Loader2,
  Lock,
  Scale,
  Search,
  Shield
} from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import React, { useState } from 'react';

// Vite env: use VITE_BACKEND_URL for runtime backend base
const BACKEND_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';

interface AffidavitData {
  id: string;
  hash: string;
  type: 'registry' | 'flat' | 'agreement' | 'court';
  qrData: string;
  // Fields matching backend PDF renderer structure
  schema_version?: string;
  network?: string;
  generated_at?: string;
  record?: {
    record_hash?: string;
    canonical_hash?: string;
    owner_address?: string;
    parent_record?: string;
    cid?: string;
  };
  geometry?: any;
  metadata?: Record<string, string>;
  merkle_proof?: { leaf?: string; index?: number; proof?: string[] };
  anchoring?: { 
    root?: string; 
    tx_hash?: string; 
    block_number?: number; 
    anchored_at?: string; 
    chain_id?: string;
    // Agreement affidavit fields
    activation_tx?: string;
    activated_at?: string;
    merkle_root?: string;
    merkle_verified?: boolean;
    proof_length?: number;
  };
  verification?: { valid?: boolean; hash_function?: string };
  verification_text?: string[];
  signature?: { signer?: string; signature?: string };
  affidavit_hash?: string;
  affirmation?: string;
  affidavitDetails: {
    subject: string;
    description: string;
    details: Record<string, string>;
    statement?: string;
    affirmation?: string;
  };
  signers?: Array<{ name: string; role?: string; signature?: string; signedAt?: string; signer?: string }>;
  witnesses?: Array<{ name: string; role?: string }>;
  notary?: { name: string; commission?: string; signature?: string } | null;
  attachments?: string[];
  proof?: { merkleProof?: string; chain?: string; txHash?: string } | null;
  // Agreement-specific fields
  agreement?: any;
  enforcement_snapshot?: any;
  registrar_address?: string;
  // Flat-specific fields
  flat?: {
    flat_id?: string;
    flat_number?: string;
    building_id?: string;
    land_record_hash?: string;
    owner_address?: string;
  };
}

const CourtPanel = () => {
  const { toast } = useToast();
  const [activeAffidavitTab, setActiveAffidavitTab] = useState<'registry' | 'flat' | 'agreement' | 'court' | 'verify'>('registry');
  const [registryInput, setRegistryInput] = useState('');
  const [flatInput, setFlatInput] = useState('');
  const [agreementInput, setAgreementInput] = useState('');
  const [courtInput, setCourtInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({
    registry: false,
    flat: false,
    agreement: false,
    court: false,
  });

  // Get suggestions from sessionStorage per tab (cleared when browser/tab closes)
  const getSuggestions = (tab: string): string[] => {
    try {
      const stored = sessionStorage.getItem(`court-panel-suggestions-${tab}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save suggestion to sessionStorage
  const saveSuggestion = (tab: string, value: string) => {
    if (!value || value.length < 4) return;
    try {
      const suggestions = getSuggestions(tab);
      const filtered = suggestions.filter(s => s !== value);
      const updated = [value, ...filtered].slice(0, 5);
      sessionStorage.setItem(`court-panel-suggestions-${tab}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save suggestion', e);
    }
  };

  // Get current input based on active tab
  const hashInput = activeAffidavitTab === 'registry' ? registryInput :
                    activeAffidavitTab === 'flat' ? flatInput :
                    activeAffidavitTab === 'agreement' ? agreementInput :
                    courtInput;

  const setHashInput = (value: string) => {
    if (activeAffidavitTab === 'registry') setRegistryInput(value);
    else if (activeAffidavitTab === 'flat') setFlatInput(value);
    else if (activeAffidavitTab === 'agreement') setAgreementInput(value);
    else setCourtInput(value);
  };

  // Get filtered suggestions for current tab
  const suggestions = getSuggestions(activeAffidavitTab).filter(s =>
    s.toLowerCase().includes(hashInput.toLowerCase())
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedAffidavit, setGeneratedAffidavit] = useState<AffidavitData | null>(null);

  const handleGenerate = async (type: 'registry' | 'flat' | 'agreement') => {
    if (!hashInput || hashInput.length < 4) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid hash or ID',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      let affidavitData: any = null;

      if (type === 'registry') {
        affidavitData = await registryApi.getRegistryAffidavit(hashInput);
      } else if (type === 'flat') {
        affidavitData = await registryApi.getFlatAffidavit(hashInput);
      } else if (type === 'agreement') {
        affidavitData = await registryApi.getAgreementAffidavit(hashInput);
      }

      // Transform backend response to frontend AffidavitData
      const affidavit = transformBackendAffidavit(affidavitData, type, hashInput);
      setGeneratedAffidavit(affidavit);
      setShowPreview(true);

      // Save to suggestion history on successful generation
      saveSuggestion(activeAffidavitTab, hashInput);

      toast({
        title: 'Success',
        description: `${type.toUpperCase()} affidavit generated`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed',
        description: error?.message || 'Could not generate affidavit',
        variant: 'destructive',
      });
      console.error('Affidavit generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async (type: 'registry' | 'flat' | 'agreement') => {
    if (!generatedAffidavit) return;

    try {
      let blob: Blob;
      if (type === 'registry') {
        blob = await registryApi.downloadRegistryAffidavitPdf(hashInput);
      } else if (type === 'flat') {
        blob = await registryApi.downloadFlatAffidavitPdf(hashInput);
      } else if (type === 'agreement') {
        blob = await registryApi.downloadAgreementAffidavitPdf(hashInput);
      } else {
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `affidavit_${type}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Downloaded',
        description: `${type.toUpperCase()} affidavit PDF downloaded`,
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error?.message || 'Could not download PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadBundle = async () => {
    if (!hashInput) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter an agreement ID',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const blob = await registryApi.downloadCourtBundle(hashInput);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `court_bundle_${hashInput}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Save to suggestion history on successful download
      saveSuggestion(activeAffidavitTab, hashInput);

      toast({
        title: 'Downloaded',
        description: 'Court bundle ZIP downloaded',
      });
    } catch (error: any) {
      // Show user-friendly message for inactive/invalid agreements
      const errorMessage = error?.response?.data?.detail || error?.message || 'Could not download bundle';
      
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        toast({
          title: 'Unable to Generate Court Bundle',
          description: 'The ID is either invalid or the agreement is inactive. For inactive agreements, download affidavit from that panel!',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('ACTIVE') || errorMessage.includes('not active')) {
        toast({
          title: 'Unable to Generate Court Bundle',
          description: 'The ID is either invalid or the agreement is inactive. For inactive agreements, download affidavit from that panel!',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Download Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      console.error('Court bundle error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <Scale className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Court Evidence</h2>
          <p className="text-xs text-muted-foreground">Generate legal affidavits with proofs and blockchain verification</p>
        </div>
      </div>

      {/* Search & Generate */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search & Generate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="hash-input" className="text-xs">
                {activeAffidavitTab === 'registry' && 'Record Hash (0x...)'}
                {activeAffidavitTab === 'flat' && 'Flat ID (UUID)'}
                {activeAffidavitTab === 'agreement' && 'Agreement ID (UUID)'}
                {activeAffidavitTab === 'court' && 'Agreement ID (UUID)'}
              </Label>
              <div className="relative w-full">
                <Input 
                  id="hash-input"
                  name="hash-input"
                  autoComplete="off"
                  placeholder={
                    activeAffidavitTab === 'registry' ? 'Enter parcel hash (0x...)' :
                    activeAffidavitTab === 'flat' ? 'Enter flat UUID...' :
                    activeAffidavitTab === 'agreement' ? 'Enter agreement UUID...' :
                    'Enter agreement UUID for court bundle...'
                  }
                  value={hashInput}
                  onChange={(e) => {
                    setHashInput(e.target.value);
                    setShowSuggestions({ ...showSuggestions, [activeAffidavitTab]: true });
                  }}
                  onFocus={() => setShowSuggestions({ ...showSuggestions, [activeAffidavitTab]: true })}
                  onBlur={() => setTimeout(() => setShowSuggestions({ ...showSuggestions, [activeAffidavitTab]: false }), 200)}
                  className="font-mono text-xs h-9 w-full"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions[activeAffidavitTab] && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-sm z-50 max-h-40 overflow-y-auto">
                    {suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setHashInput(suggestion);
                          setShowSuggestions({ ...showSuggestions, [activeAffidavitTab]: false });
                        }}
                        className="px-3 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-50"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {activeAffidavitTab === 'registry' && 'Expects 0x-prefixed hex hash (64 characters)'}
                {activeAffidavitTab === 'flat' && 'Expects UUID format (e.g., 50ce00ae-228e-4570...)'}
                {activeAffidavitTab === 'agreement' && 'Expects UUID format (e.g., 69537f40-ef53-4268...)'}
                {activeAffidavitTab === 'court' && 'Only ACTIVE agreements can generate court bundles'}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Affidavit Types Tabs */}
      <Tabs value={activeAffidavitTab} onValueChange={(tab) => {
        setActiveAffidavitTab(tab as 'registry' | 'flat' | 'agreement' | 'court');
      }} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="flat">Flat</TabsTrigger>
          <TabsTrigger value="agreement">Agreement</TabsTrigger>
          <TabsTrigger value="court">Court Bundle</TabsTrigger>
        </TabsList>

        {/* Registry Tab */}
        <TabsContent value="registry" className="flex-1 space-y-4 mt-4">
          <AffidavitPanel
            type="registry"
            isGenerating={isGenerating}
            onGenerate={() => handleGenerate('registry')}
            onDownload={() => handleDownloadPdf('registry')}
            generatedAffidavit={generatedAffidavit?.type === 'registry' ? generatedAffidavit : null}
            showPreview={showPreview && generatedAffidavit?.type === 'registry'}
            onPreviewChange={setShowPreview}
          />
        </TabsContent>

        {/* Flat Tab */}
        <TabsContent value="flat" className="flex-1 space-y-4 mt-4">
          <AffidavitPanel
            type="flat"
            isGenerating={isGenerating}
            onGenerate={() => handleGenerate('flat')}
            onDownload={() => handleDownloadPdf('flat')}
            generatedAffidavit={generatedAffidavit?.type === 'flat' ? generatedAffidavit : null}
            showPreview={showPreview && generatedAffidavit?.type === 'flat'}
            onPreviewChange={setShowPreview}
          />
        </TabsContent>

        {/* Agreement Tab */}
        <TabsContent value="agreement" className="flex-1 space-y-4 mt-4">
          <AffidavitPanel
            type="agreement"
            isGenerating={isGenerating}
            onGenerate={() => handleGenerate('agreement')}
            onDownload={() => handleDownloadPdf('agreement')}
            generatedAffidavit={generatedAffidavit?.type === 'agreement' ? generatedAffidavit : null}
            showPreview={showPreview && generatedAffidavit?.type === 'agreement'}
            onPreviewChange={setShowPreview}
          />
        </TabsContent>

        {/* Court Bundle Tab */}
        <TabsContent value="court" className="flex-1 space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Complete Court Bundle
              </CardTitle>
              <CardDescription className="text-xs">
                Download all affidavits (Registry, Flat, Agreement) as a single ZIP file for court proceedings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input for Agreement ID */}
              <div className="space-y-2">
                <Label htmlFor="court-bundle-input" className="text-xs">
                  Agreement ID (UUID)
                </Label>
                <div className="relative w-full">
                  <Input 
                    id="court-bundle-input"
                    autoComplete="off"
                    placeholder="Enter agreement UUID..."
                    value={hashInput}
                    onChange={(e) => {
                      setHashInput(e.target.value);
                      setShowSuggestions({ ...showSuggestions, court: true });
                    }}
                    onFocus={() => setShowSuggestions({ ...showSuggestions, court: true })}
                    onBlur={() => setTimeout(() => setShowSuggestions({ ...showSuggestions, court: false }), 200)}
                    className="font-mono text-xs h-9 w-full"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions['court'] && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-sm z-50 max-h-40 overflow-y-auto">
                      {suggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setHashInput(suggestion);
                            setShowSuggestions({ ...showSuggestions, court: false });
                          }}
                          className="px-3 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-50"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Download Button */}
              <Button 
                className="w-full"
                onClick={handleDownloadBundle}
                disabled={!hashInput || isGenerating}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download Bundle (ZIP)'}
              </Button>

              {/* Info Box */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <p className="font-medium">Note:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only ACTIVE agreements can generate court bundles</li>
                  <li>Bundle includes Registry, Flat, and Agreement affidavits</li>
                  <li>For inactive agreements, download affidavits individually from their tabs</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features */}
      <div className="mt-6 space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Features</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield, title: 'Integrity', desc: 'SHA-256' },
            { icon: Fingerprint, title: 'Merkle Proof', desc: 'Provable' },
            { icon: Lock, title: 'Anchored', desc: 'Blockchain' },
          ].map((f, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/50 text-center">
              <f.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-[10px] font-medium">{f.title}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface AffidavitPanelProps {
  type: 'registry' | 'flat' | 'agreement';
  isGenerating: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  generatedAffidavit: AffidavitData | null;
  showPreview: boolean;
  onPreviewChange: (show: boolean) => void;
}

const AffidavitPanel: React.FC<AffidavitPanelProps> = ({
  type,
  isGenerating,
  onGenerate,
  onDownload,
  generatedAffidavit,
  showPreview,
  onPreviewChange,
}) => {
  const hasRecord = !!generatedAffidavit?.record;
  const hasGeometry = !!generatedAffidavit?.geometry;
  const hasMerkle = !!generatedAffidavit?.merkle_proof;
  const hasAnchoring = !!generatedAffidavit?.anchoring;
  const hasVerification = !!generatedAffidavit?.verification;
  const hasVerificationText = !!generatedAffidavit?.verification_text?.length;
  const hasAffirmation = !!(generatedAffidavit?.affirmation || generatedAffidavit?.affidavitDetails?.affirmation);
  const hasSigners = !!generatedAffidavit?.signers?.length;
  const hasWitnesses = !!generatedAffidavit?.witnesses?.length;
  const hasAttachments = !!generatedAffidavit?.attachments?.length;
  const hasProof = !!generatedAffidavit?.proof?.merkleProof;
    const [sigStatus, setSigStatus] = React.useState<'unknown' | 'pending' | 'valid' | 'invalid'>('unknown');
    const { toast } = useToast();
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {type.toUpperCase()} Affidavit
          </CardTitle>
          <Badge variant="outline" className="text-xs capitalize">{type}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Generate Button */}
        <Button 
          className="w-full"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Affidavit...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate {type.toUpperCase()} Affidavit
            </>
          )}
        </Button>

        {/* Affidavit Preview */}
        {generatedAffidavit && (
          <div className="space-y-4">
            {/* Preview Toggle */}
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => onPreviewChange(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'View Affidavit Preview'}
            </Button>

            {/* Affidavit Content Preview */}
            {showPreview && (<>
              {/* AGREEMENT AFFIDAVIT PREVIEW - Completely separate from registry/flat */}
              {type === 'agreement' && (
                <div className="border rounded-lg p-6 bg-white space-y-4">
                  {/* Header */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg">{generatedAffidavit.affidavitDetails.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {generatedAffidavit.affidavitDetails.description}
                    </p>
                  </div>

                  {/* A. Agreement Details */}
                  {generatedAffidavit.agreement && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">A. Agreement Details</div>
                      <div className="text-sm text-muted-foreground break-all">Agreement ID: {generatedAffidavit.agreement?.agreement_id}</div>
                      <div className="text-sm text-muted-foreground break-all">Agreement Hash: {generatedAffidavit.agreement?.agreement_hash}</div>
                      <div className="text-sm text-muted-foreground">Agreement Type: {generatedAffidavit.agreement?.agreement_type}</div>
                      <div className="text-sm text-muted-foreground">Status: {generatedAffidavit.agreement?.status}</div>
                      <div className="text-sm text-muted-foreground">Subject Type: {generatedAffidavit.agreement?.subject_type}</div>
                      <div className="text-sm text-muted-foreground break-all">Subject ID: {generatedAffidavit.agreement?.subject_id}</div>
                      
                      {/* Terms Section */}
                      {generatedAffidavit.agreement?.terms && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="font-semibold text-sm">Terms & Conditions</div>
                          <div className="text-sm text-muted-foreground break-all">Seller: {generatedAffidavit.agreement.terms?.seller}</div>
                          <div className="text-sm text-muted-foreground break-all">Buyer: {generatedAffidavit.agreement.terms?.buyer}</div>
                          <div className="text-sm text-muted-foreground">Total Price: {generatedAffidavit.agreement.terms?.total_price}</div>
                          <div className="text-sm text-muted-foreground">Paid Upfront: {generatedAffidavit.agreement.terms?.paid_upfront}</div>
                          {generatedAffidavit.agreement.terms?.lease_end && (
                            <div className="text-sm text-muted-foreground">Lease End: {new Date(generatedAffidavit.agreement.terms.lease_end).toLocaleDateString()}</div>
                          )}
                          {generatedAffidavit.agreement.terms?.schedule && Array.isArray(generatedAffidavit.agreement.terms.schedule) && generatedAffidavit.agreement.terms.schedule.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="font-medium text-xs">Payment Schedule:</div>
                              {generatedAffidavit.agreement.terms.schedule.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm text-muted-foreground ml-2">
                                  • Amount: {item.amount}, Due in {item.due_in_days} days
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* B. Blockchain Anchoring */}
                  {hasAnchoring && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">B. Blockchain Anchoring</div>
                      <div className="text-sm text-muted-foreground break-all">Activation TX: {generatedAffidavit.anchoring?.activation_tx}</div>
                      {generatedAffidavit.anchoring?.activation_tx && !generatedAffidavit.anchoring.activation_tx.includes('0x0000') && (
                        <div className="text-sm text-blue-600 hover:underline">
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${generatedAffidavit.anchoring?.activation_tx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View on Ethereum Explorer
                          </a>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">Activated At: {generatedAffidavit.anchoring?.activated_at ? new Date(generatedAffidavit.anchoring.activated_at).toLocaleString() : '—'}</div>
                      <div className="text-sm text-muted-foreground break-all">Merkle Root: {generatedAffidavit.anchoring?.merkle_root}</div>
                      <div className="text-sm text-muted-foreground">Merkle Verified: {generatedAffidavit.anchoring?.merkle_verified ? '✓ Yes' : '✗ No'}</div>
                      {generatedAffidavit.anchoring?.proof_length && (
                        <div className="text-sm text-muted-foreground">Proof Length: {generatedAffidavit.anchoring.proof_length}</div>
                      )}
                    </div>
                  )}

                  {/* C. Enforcement Snapshot */}
                  {generatedAffidavit.enforcement_snapshot && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">C. Enforcement Snapshot</div>
                      <div className="text-sm text-muted-foreground">Status: {generatedAffidavit.enforcement_snapshot?.status || 'UNKNOWN'}</div>
                      <div className="text-sm text-muted-foreground">Enforceable: {generatedAffidavit.enforcement_snapshot?.enforceable ? 'Yes' : 'No'}</div>
                      {generatedAffidavit.enforcement_snapshot?.reason && (
                        <div className="text-sm text-muted-foreground">Reason: {generatedAffidavit.enforcement_snapshot.reason}</div>
                      )}
                      {generatedAffidavit.enforcement_snapshot?.last_enforced_at && (
                        <div className="text-sm text-muted-foreground">Last Enforced: {new Date(generatedAffidavit.enforcement_snapshot.last_enforced_at).toLocaleString()}</div>
                      )}
                      {generatedAffidavit.enforcement_snapshot?.enforcement_count !== undefined && (
                        <div className="text-sm text-muted-foreground">Enforcement Count: {generatedAffidavit.enforcement_snapshot.enforcement_count}</div>
                      )}
                      {generatedAffidavit.enforcement_snapshot?.violations !== undefined && (
                        <div className="text-sm text-muted-foreground">Violations: {generatedAffidavit.enforcement_snapshot.violations}</div>
                      )}
                    </div>
                  )}

                  {/* D. Digital Signature */}
                  {hasSigners && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                      <div className="font-semibold text-sm">D. Digital Signature</div>
                      {generatedAffidavit.signers?.map((s, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="font-medium text-sm">{s.name}</div>
                          <div className="text-sm text-muted-foreground">{s.role} • Signed: {s.signedAt ? new Date(s.signedAt).toLocaleString() : '—'}</div>
                          <div className="h-24 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
                            <img
                              src={`${BACKEND_BASE.replace(/\/$/, '')}/assets/signature.jpeg`}
                              alt="Signature"
                              className="object-contain h-full w-full"
                              onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="bg-gray-50 p-2 rounded border font-mono text-[9px] break-all text-muted-foreground leading-relaxed">
                            {s.signature}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!generatedAffidavit.affidavit_hash || !s.signature || !s.signer) return;
                                setSigStatus('pending');
                                try {
                                  // Clean up the affidavit hash (remove double 0x prefix if present)
                                  let cleanHash = generatedAffidavit.affidavit_hash;
                                  if (cleanHash.startsWith('0x0x')) {
                                    cleanHash = '0x' + cleanHash.substring(4);
                                  }
                                  
                                  // Use agreement-specific endpoint for agreement affidavits
                                  const res = type === 'agreement' 
                                    ? await registryApi.verifyAgreementAffidavitSignature({
                                        affidavit_hash: cleanHash,
                                        signature: s.signature,
                                        signer: s.signer,
                                      })
                                    : await registryApi.verifyAffidavitSignature({
                                        affidavit_hash: cleanHash,
                                        signature: s.signature,
                                        signer: s.signer,
                                      });
                                  if (res && res.valid) {
                                    setSigStatus('valid');
                                    toast({ title: 'Signature Verified', description: 'Signature matches expected signer' });
                                  } else {
                                    setSigStatus('invalid');
                                    toast({ title: 'Signature Invalid', description: 'Signature did not verify', variant: 'destructive' });
                                  }
                                } catch (err) {
                                  setSigStatus('invalid');
                                  toast({ title: 'Verification Failed', description: 'Could not verify signature', variant: 'destructive' });
                                }
                              }}
                            >
                              Verify Signature
                            </Button>
                            <div className={`text-sm ${sigStatus === 'valid' ? 'text-green-600' : sigStatus === 'invalid' ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {sigStatus === 'pending' ? 'Verifying…' : sigStatus === 'valid' ? 'Verified' : sigStatus === 'invalid' ? 'Invalid' : 'Not checked'}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Notary */}
                      {generatedAffidavit.notary && (
                        <div className="space-y-2 mt-4">
                          <div className="font-medium text-sm">Notary: {generatedAffidavit.notary.name}</div>
                          <div className="text-sm text-muted-foreground">{generatedAffidavit.notary.commission}</div>
                          <div className="bg-gray-50 p-2 rounded border font-mono text-[9px] text-muted-foreground break-all leading-relaxed">
                            {generatedAffidavit.notary.signature}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code at bottom */}
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <div className="font-semibold text-sm mb-1">Verification QR Code</div>
                      <p className="text-xs text-muted-foreground">Scan with any QR code reader to verify this agreement affidavit</p>
                    </div>
                    <div className="flex justify-center p-4 bg-white rounded border">
                      <QRCode 
                        value={generatedAffidavit.qrData} 
                        size={250}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FLAT AFFIDAVIT PREVIEW - Completely separate from registry/agreement */}
              {type === 'flat' && (
                <div className="border rounded-lg p-6 bg-white space-y-4">
                  {/* Header */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg">Flat Ownership Affidavit</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Cryptographic certification of flat ownership agreement on blockchain
                    </p>
                  </div>

                  {/* A. Flat Record */}
                  {generatedAffidavit.flat && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">A. Flat Record</div>
                      <div className="text-sm text-muted-foreground break-all">Flat ID: {generatedAffidavit.flat?.flat_id}</div>
                      <div className="text-sm text-muted-foreground">Flat Number: {generatedAffidavit.flat?.flat_number}</div>
                      <div className="text-sm text-muted-foreground break-all">Building ID: {generatedAffidavit.flat?.building_id}</div>
                      <div className="text-sm text-muted-foreground break-all">Land Record Hash: {generatedAffidavit.flat?.land_record_hash}</div>
                      <div className="text-sm text-muted-foreground break-all">Owner Address: {generatedAffidavit.flat?.owner_address}</div>
                    </div>
                  )}

                  {/* B. Agreement Details */}
                  {generatedAffidavit.agreement && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">B. Agreement Details</div>
                      <div className="text-sm text-muted-foreground break-all">Agreement ID: {generatedAffidavit.agreement?.agreement_id}</div>
                      <div className="text-sm text-muted-foreground break-all">Agreement Hash: {generatedAffidavit.agreement?.agreement_hash}</div>
                      <div className="text-sm text-muted-foreground">Subject Type: {generatedAffidavit.agreement?.subject_type}</div>
                      <div className="text-sm text-muted-foreground break-all">Subject ID: {generatedAffidavit.agreement?.subject_id}</div>
                      <div className="text-sm text-muted-foreground">Status: {generatedAffidavit.agreement?.status}</div>
                      <div className="text-sm text-muted-foreground">Activated At: {generatedAffidavit.agreement?.activated_at ? new Date(generatedAffidavit.agreement.activated_at).toLocaleString() : '—'}</div>
                    </div>
                  )}

                  {/* C. Blockchain Anchoring */}
                  {hasAnchoring && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">C. Blockchain Anchoring</div>
                      <div className="text-sm text-muted-foreground break-all">Activation TX: {generatedAffidavit.anchoring?.activation_tx}</div>
                      {generatedAffidavit.anchoring?.activation_tx && !generatedAffidavit.anchoring.activation_tx.includes('0x0000') && (
                        <div className="text-sm text-blue-600 hover:underline">
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${generatedAffidavit.anchoring?.activation_tx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View on Ethereum Explorer
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* D. Affirmation */}
                  {hasAffirmation && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">D. Affirmation</div>
                      <div className="text-sm text-muted-foreground">
                        {generatedAffidavit.affirmation}
                      </div>
                    </div>
                  )}

                  {/* E. Registrar Information */}
                  {generatedAffidavit.registrar_address && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">E. Registrar Information</div>
                      <div className="text-sm text-muted-foreground break-all">Registrar Address: {generatedAffidavit.registrar_address}</div>
                    </div>
                  )}

                  {/* F. Cryptographic Attestation */}
                  {generatedAffidavit.affidavit_hash && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">F. Cryptographic Attestation</div>
                      <div className="text-sm text-muted-foreground">Affidavit Hash (keccak256):</div>
                      <div className="bg-gray-50 p-2 rounded border font-mono text-[9px] break-all text-muted-foreground leading-relaxed">
                        {generatedAffidavit.affidavit_hash}
                      </div>
                    </div>
                  )}

                  {/* G. Digital Signature */}
                  {generatedAffidavit.signature && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                      <div className="font-semibold text-sm">G. Digital Signature</div>
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Registrar Signature</div>
                        <div className="text-sm text-muted-foreground break-all">Signer: {generatedAffidavit.signature?.signer}</div>
                        <div className="h-24 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
                          <img
                            src={`${BACKEND_BASE.replace(/\/$/, '')}/assets/signature.jpeg`}
                            alt="Registrar Signature"
                            className="object-contain h-full w-full"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              el.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="bg-gray-50 p-2 rounded border font-mono text-[9px] break-all text-muted-foreground leading-relaxed">
                          {generatedAffidavit.signature?.signature}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!generatedAffidavit.affidavit_hash || !generatedAffidavit.signature?.signature || !generatedAffidavit.signature?.signer) return;
                              setSigStatus('pending');
                              try {
                                // Clean up the affidavit hash (remove double 0x prefix if present)
                                let cleanHash = generatedAffidavit.affidavit_hash;
                                if (cleanHash.startsWith('0x0x')) {
                                  cleanHash = '0x' + cleanHash.substring(4);
                                }
                                
                                // Use agreement-specific endpoint for flat affidavits
                                const res = await registryApi.verifyAgreementAffidavitSignature({
                                  affidavit_hash: cleanHash,
                                  signature: generatedAffidavit.signature.signature,
                                  signer: generatedAffidavit.signature.signer,
                                });
                                if (res && res.valid) {
                                  setSigStatus('valid');
                                  toast({ title: 'Signature Verified', description: 'Signature matches expected signer' });
                                } else {
                                  setSigStatus('invalid');
                                  toast({ title: 'Signature Invalid', description: 'Signature did not verify', variant: 'destructive' });
                                }
                              } catch (err) {
                                setSigStatus('invalid');
                                toast({ title: 'Verification Failed', description: 'Could not verify signature', variant: 'destructive' });
                              }
                            }}
                          >
                            Verify Signature
                          </Button>
                          <div className={`text-sm ${sigStatus === 'valid' ? 'text-green-600' : sigStatus === 'invalid' ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {sigStatus === 'pending' ? 'Verifying…' : sigStatus === 'valid' ? 'Verified' : sigStatus === 'invalid' ? 'Invalid' : 'Not checked'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR Code at bottom */}
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <div className="font-semibold text-sm mb-1">Verification QR Code</div>
                      <p className="text-xs text-muted-foreground">Scan with any QR code reader to verify this flat affidavit</p>
                    </div>
                    <div className="flex justify-center p-4 bg-white rounded border">
                      <QRCode 
                        value={generatedAffidavit.qrData} 
                        size={250}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* REGISTRY AFFIDAVIT PREVIEW - Completely separate from agreement/flat */}
              {type === 'registry' && (
                <div className="border rounded-lg p-6 bg-white space-y-4">
                  {/* Header */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg">{generatedAffidavit.affidavitDetails.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {generatedAffidavit.affidavitDetails.description}
                    </p>
                  </div>

                  {/* A. Property Record */}
                  {hasRecord && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">A. Property Record</div>
                      <div className="text-sm text-muted-foreground break-all">Record Hash: {generatedAffidavit.record?.record_hash}</div>
                      <div className="text-sm text-muted-foreground break-all">Canonical Hash: {generatedAffidavit.record?.canonical_hash}</div>
                      <div className="text-sm text-muted-foreground">Owner Address: {generatedAffidavit.record?.owner_address}</div>
                      <div className="text-sm text-muted-foreground">Parent Record: {generatedAffidavit.record?.parent_record ?? 'None'}</div>
                      <div className="text-sm text-muted-foreground">IPFS CID: {generatedAffidavit.record?.cid}</div>
                    </div>
                  )}

                  {/* B. Property Description */}
                  {hasGeometry && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">B. Property Description</div>
                      <div className="text-sm text-muted-foreground">Geodesic Area (m²): {generatedAffidavit.geometry?.area_m2}</div>
                      <div className="text-sm text-muted-foreground">Subdivision Status: {generatedAffidavit.geometry?.is_subdivided ? 'YES' : 'NO'}</div>
                    </div>
                  )}

                  {/* D. Merkle Inclusion Proof */}
                  {hasMerkle && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">D. Merkle Inclusion Proof</div>
                      <div className="text-sm text-muted-foreground break-all">Leaf Hash: {generatedAffidavit.merkle_proof?.leaf}</div>
                      <div className="text-sm text-muted-foreground">Leaf Index: {String(generatedAffidavit.merkle_proof?.index ?? '')}</div>
                      <div className="text-sm text-muted-foreground font-medium">Merkle Proof Nodes:</div>
                      {generatedAffidavit.merkle_proof?.proof?.map((p, i) => (
                        <div key={i} className="text-sm text-muted-foreground break-all">- {p}</div>
                      ))}
                    </div>
                  )}

                  {/* E. Blockchain Anchoring */}
                  {hasAnchoring && (
                    <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                      <div className="font-semibold text-sm">E. Blockchain Anchoring</div>
                    <div className="text-sm text-muted-foreground break-all">Merkle Root: {generatedAffidavit.anchoring?.root}</div>
                    <div className="text-sm text-muted-foreground break-all">Transaction Hash: {generatedAffidavit.anchoring?.tx_hash}</div>
                    {generatedAffidavit.anchoring?.tx_hash && !generatedAffidavit.anchoring.tx_hash.includes('0x0000') && (
                      <div className="text-sm text-blue-600 hover:underline">
                        <a 
                            href={`https://sepolia.etherscan.io/tx/${generatedAffidavit.anchoring?.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View on Ethereum Explorer
                        </a>
                      </div>
                    )}
                    {(!generatedAffidavit.anchoring?.tx_hash || generatedAffidavit.anchoring.tx_hash.includes('0x0000')) && (
                      <div className="text-sm text-yellow-600">⏳ Anchoring pending - transaction hash not yet available</div>
                    )}
                    <div className="text-sm text-muted-foreground">Block Number: {String(generatedAffidavit.anchoring?.block_number ?? '')}</div>
                    <div className="text-sm text-muted-foreground">Anchored At: {generatedAffidavit.anchoring?.anchored_at ? new Date(generatedAffidavit.anchoring.anchored_at).toLocaleString() : '—'}</div>
                    {generatedAffidavit.anchoring?.chain_id && (
                      <div className="text-sm text-muted-foreground">Chain ID: {generatedAffidavit.anchoring.chain_id}</div>
                    )}
                  </div>
                )}

                {/* F. Verification Summary */}
                {hasVerification && (
                  <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                    <div className="font-semibold text-sm">F. Verification Summary</div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">Status:</div>
                      <div className={`text-sm ${generatedAffidavit.verification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {generatedAffidavit.verification?.valid ? 'PASSED' : 'FAILED'}
                      </div>
                      <div className="text-xs text-muted-foreground">• {generatedAffidavit.verification?.hash_function}</div>
                    </div>
                    {hasVerificationText && generatedAffidavit.verification_text?.map((p, i) => (
                      <div key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</div>
                    ))}
                  </div>
                )}

                {/* G. Affirmation */}
                {hasAffirmation && (
                  <div className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                    <div className="font-semibold text-sm">G. Affirmation</div>
                    <div className="text-sm text-muted-foreground">
                      {generatedAffidavit.affirmation || generatedAffidavit.affidavitDetails?.affirmation}
                    </div>
                  </div>
                )}

                {/* H. Digital Signature */}
                {hasSigners && (
                  <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                    <div className="font-semibold text-sm">H. Digital Signature</div>
                    {generatedAffidavit.signers?.map((s, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-sm text-muted-foreground">{s.role} • Signed: {s.signedAt ? new Date(s.signedAt).toLocaleString() : '—'}</div>
                        <div className="h-24 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
                          <img
                            src={`${BACKEND_BASE.replace(/\/$/, '')}/assets/signature.jpeg`}
                            alt="Registrar Signature"
                            className="object-contain h-full w-full"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              el.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="bg-gray-50 p-2 rounded border font-mono text-[9px] break-all text-muted-foreground leading-relaxed">
                          {s.signature}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!generatedAffidavit.affidavit_hash || !s.signature || !s.name) return;
                              setSigStatus('pending');
                              try {
                                const res = await registryApi.verifyAffidavitSignature({
                                  affidavit_hash: generatedAffidavit.affidavit_hash,
                                  signature: s.signature,
                                  signer: s.name,
                                });
                                if (res && res.valid) {
                                  setSigStatus('valid');
                                  toast({ title: 'Signature Verified', description: 'Signature matches expected on-chain signer' });
                                } else {
                                  setSigStatus('invalid');
                                  toast({ title: 'Signature Invalid', description: 'Signature did not verify against expected signer', variant: 'destructive' });
                                }
                              } catch (err) {
                                setSigStatus('invalid');
                                toast({ title: 'Verification Failed', description: 'Could not verify signature', variant: 'destructive' });
                              }
                            }}
                          >
                            Verify Signature
                          </Button>
                          <div className={`text-sm ${sigStatus === 'valid' ? 'text-green-600' : sigStatus === 'invalid' ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {sigStatus === 'pending' ? 'Verifying…' : sigStatus === 'valid' ? 'Verified' : sigStatus === 'invalid' ? 'Invalid' : 'Not checked'}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Notary */}
                    {generatedAffidavit.notary && (
                      <div className="space-y-2 mt-4">
                        <div className="font-medium text-sm">Notary: {generatedAffidavit.notary.name}</div>
                        <div className="text-sm text-muted-foreground">{generatedAffidavit.notary.commission}</div>
                        <div className="bg-gray-50 p-2 rounded border font-mono text-[9px] text-muted-foreground break-all leading-relaxed">
                          {generatedAffidavit.notary.signature}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Code at bottom */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <div className="font-semibold text-sm mb-1">Verification QR Code</div>
                    <p className="text-xs text-muted-foreground">Scan with any QR code reader to verify this affidavit</p>
                  </div>
                  <div className="flex justify-center p-4 bg-white rounded border">
                    <QRCode 
                      value={generatedAffidavit.qrData} 
                      size={250}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                </div>
              )}
            </>)}

            {/* Download & Actions */}
            {!showPreview && (
              <div className="space-y-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Click "View Affidavit Preview" to see full details and QR code</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Download Button */}
            <Button 
              className="w-full"
              variant="default"
              onClick={onDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>

            {/* Metadata */}
            <div className="text-xs space-y-1 p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Affidavit ID:</span>
                <span className="font-mono">{generatedAffidavit.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Block:</span>
                <span className="font-mono">{generatedAffidavit.anchoring?.block_number ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Generated:</span>
                <span className="text-xs">{new Date(generatedAffidavit.generated_at || generatedAffidavit.affidavitDetails?.details['Timestamp']).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder */}
        {!generatedAffidavit && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">No affidavit generated yet</p>
              <p className="text-xs text-muted-foreground">Click "Generate" to create an affidavit</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ====================================
// Helper function to transform backend affidavit data
// ====================================
function transformBackendAffidavit(rawAffidavit: any, type: 'registry' | 'flat' | 'agreement', hashInput: string): AffidavitData {
  const now = new Date();
  const generatedAt = rawAffidavit?.generated_at || now.toISOString();
  const affidavitId = rawAffidavit?.affidavit_hash || `AFF-${Date.now()}`;
  
  // Create QR data - use backend qr_payload if available, otherwise construct based on type
  let qrData;
  if (rawAffidavit?.qr_payload) {
    // Use backend's provided QR payload
    qrData = rawAffidavit.qr_payload;
  } else if (type === 'agreement') {
    // Construct from agreement section
    qrData = {
      type: 'AGREEMENT_AFFIDAVIT_QR',
      schema_version: rawAffidavit?.schema_version || '1.0.0',
      chain_id: rawAffidavit?.chain_id,
      agreement_hash: rawAffidavit?.agreement?.agreement_hash,
      subject_id: rawAffidavit?.agreement?.subject_id,
      subject_type: rawAffidavit?.agreement?.subject_type,
      activation_tx: rawAffidavit?.agreement?.activation_tx,
      generated_at: generatedAt,
    };
  } else if (type === 'flat') {
    // Construct from flat + agreement section
    qrData = {
      type: 'FLAT_AFFIDAVIT_QR',
      schema_version: rawAffidavit?.schema_version || '1.0.0',
      chain_id: rawAffidavit?.chain_id,
      flat_id: rawAffidavit?.flat?.flat_id,
      flat_number: rawAffidavit?.flat?.flat_number,
      agreement_hash: rawAffidavit?.agreement?.agreement_hash,
      subject_id: rawAffidavit?.agreement?.subject_id,
      activation_tx: rawAffidavit?.agreement?.activation_tx,
      generated_at: generatedAt,
    };
  } else {
    // Fallback for registry
    qrData = {
      type: 'REGISTRY_AFFIDAVIT_QR',
      schema_version: rawAffidavit?.schema_version || '1.0.0',
      chain_id: rawAffidavit?.chain_id,
      record_hash: hashInput,
      owner_address: rawAffidavit?.record?.owner_address,
      generated_at: generatedAt,
    };
  }

  // Build signers from backend signature if available
  const signers = [];
  if (rawAffidavit?.signature) {
    signers.push({
      name: rawAffidavit.signature.signer || 'Registrar',
      role: 'Registrar',
      signature: rawAffidavit.signature.signature || '',
      signedAt: generatedAt,
      signer: rawAffidavit.signature.signer,
    });
  }

  // Create affidavit details for display
  let affidavitDetails;
  
  if (type === 'agreement') {
    // Agreement-specific details
    affidavitDetails = {
      subject: `Agreement Affidavit - ${rawAffidavit?.agreement?.id || hashInput}`,
      description: `This affidavit certifies the authenticity, blockchain anchoring, and enforcement status of the agreement.`,
      statement: `The information contained in this agreement record is accurate as of ${new Date(generatedAt).toLocaleDateString()}.`,
      details: {
        'Agreement ID': rawAffidavit?.agreement?.id || hashInput,
        'Generated': new Date(generatedAt).toLocaleString(),
        'Type': 'AGREEMENT',
      },
    };
  } else {
    // Registry/Flat details
    affidavitDetails = {
      subject: `${type.toUpperCase()} Registry Affidavit`,
      description: `This affidavit certifies the authenticity and inclusion of the ${type} record in the blockchain.`,
      statement: `The information contained in this ${type} record is accurate as of ${new Date(generatedAt).toLocaleDateString()}.`,
      details: {
        'Record Hash': hashInput.slice(0, 40) + (hashInput.length > 40 ? '...' : ''),
        'Generated': new Date(generatedAt).toLocaleString(),
        'Type': type.toUpperCase(),
      },
    };
  }

  // Add anchoring info to details if available
  if (rawAffidavit?.anchoring?.block_number) {
    affidavitDetails.details['Block Number'] = String(rawAffidavit.anchoring.block_number);
  }
  if (rawAffidavit?.anchoring?.anchored_at) {
    affidavitDetails.details['Anchored At'] = new Date(rawAffidavit.anchoring.anchored_at).toLocaleString();
  }

  // Static verification paragraphs (mirror PDF renderer) to show in preview
  const verificationParagraphs = [
    "All cryptographic checks were successfully verified at the time this affidavit was generated. Independent re-verification may be performed using the Merkle inclusion proof, anchored Merkle root, blockchain transaction hash, and the digital signature referenced herein.",
    "Geospatial integrity is enforced using geodesic area computation on authoritative WGS84 coordinate geometry. During subdivision operations, the registry enforces strict conservation of land area such that the sum of all child parcel areas remains within a tolerance of not less than ninety-nine percent (≥99%) of the parent parcel area.",
    "Any minor residual parcels arising due to geospatial projection limits, numerical precision, or boundary alignment are automatically preserved as non-transferable residual records. Such residual land remains cryptographically anchored, auditable, and legally attributable to the original parent parcel, and does not constitute loss, dilution, or extinguishment of ownership or title.",
    "All subdivision actions are deterministically replay-verifiable, cryptographically anchored, and auditable through registry records, Merkle proofs, blockchain anchors, and geospatial appendices, ensuring full transparency and court-admissible traceability.",
  ];

  const result: AffidavitData = {
    id: affidavitId,
    hash: hashInput,
    type,
    qrData: JSON.stringify(qrData),
    schema_version: rawAffidavit?.schema_version || '1.0.0',
    network: rawAffidavit?.network || 'ethereum',
    generated_at: generatedAt,
    record: rawAffidavit?.record,
    geometry: rawAffidavit?.geometry,
    merkle_proof: rawAffidavit?.merkle_proof,
    anchoring: rawAffidavit?.anchoring,
    verification: rawAffidavit?.verification,
    verification_text: rawAffidavit?.verification_text || verificationParagraphs,
    signature: rawAffidavit?.signature,
    affidavit_hash: rawAffidavit?.affidavit_hash,
    affirmation: rawAffidavit?.affirmation,
    affidavitDetails,
    signers,
    witnesses: [],
    notary: rawAffidavit?.notary || null,
    attachments: [],
    proof: null,
  };

  // Add agreement-specific fields if this is an agreement affidavit
  if (type === 'agreement') {
    result.agreement = rawAffidavit?.agreement;
    result.enforcement_snapshot = rawAffidavit?.enforcement_snapshot;
  }

  // Add flat-specific fields if this is a flat affidavit
  if (type === 'flat') {
    result.flat = rawAffidavit?.flat;
    result.agreement = rawAffidavit?.agreement;
  }

  // Add registrar address for both agreement and flat affidavits
  if (type === 'flat' || type === 'agreement') {
    result.registrar_address = rawAffidavit?.registrar_address;
  }

  return result;
}

export default CourtPanel;
