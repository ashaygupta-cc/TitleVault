import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { http } from '@/services/http';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Copy,
  Search,
  User
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface RegistryRecord {
  record_hash: string;
  owner_address: string;
  area_m2: number;
  is_subdivided: boolean;
  parcel_type?: string;
  created_at?: string;
}

// Helper to validate Ethereum address format
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Helper to sanitize address (remove multiple 0x prefixes)
const sanitizeAddress = (address: string): string => {
  let sanitized = address.trim();
  while (sanitized.startsWith('0x')) {
    sanitized = sanitized.slice(2);
  }
  return '0x' + sanitized;
};

// Helper to validate record hash format
const isValidRecordHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

// Helper to sanitize record hash
const sanitizeRecordHash = (hash: string): string => {
  let sanitized = hash.trim();
  while (sanitized.startsWith('0x')) {
    sanitized = sanitized.slice(2);
  }
  return '0x' + sanitized;
};

interface TransferInitiationPanelProps {
  onTransferCompleted?: (result: any) => void;
}

const TransferInitiationPanel: React.FC<TransferInitiationPanelProps> = ({
  onTransferCompleted
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [transferResult, setTransferResult] = useState<any>(null);
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Form state
  const [selectedRecord, setSelectedRecord] = useState<RegistryRecord | null>(null);
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [village, setVillage] = useState('');
  const [taluk, setTaluk] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  
  const [addressValidationError, setAddressValidationError] = useState<string>('');

  // Load records on mount
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await adminApi.getRegistryRecords();
        setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load records:', error);
        toast({
          title: "Error",
          description: "Failed to load registry records",
          variant: "destructive"
        });
      } finally {
        setIsLoadingRecords(false);
      }
    };
    loadRecords();
  }, [toast]);

  // Filter records based on search term
  const filteredRecords = records.filter(record =>
    record.record_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.owner_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle record selection
  const handleSelectRecord = (record: RegistryRecord) => {
    setSelectedRecord(record);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleTransferRecord = async () => {
    setAddressValidationError('');

    // Validate record selected
    if (!selectedRecord) {
      toast({
        title: "Missing Information",
        description: "Please select a record to transfer",
        variant: "destructive"
      });
      return;
    }

    // Validate record hash format
    if (!isValidRecordHash(selectedRecord.record_hash)) {
      toast({
        title: "Invalid Record",
        description: `Selected record hash is invalid: ${selectedRecord.record_hash}. Must be 0x + 64 hex characters.`,
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!newOwnerAddress.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter new owner address",
        variant: "destructive"
      });
      return;
    }

    // Sanitize and validate new owner address
    const sanitizedAddress = sanitizeAddress(newOwnerAddress);
    if (!isValidEthereumAddress(sanitizedAddress)) {
      const errorMsg = "New owner address must be a valid Ethereum address (0x + 40 hex characters)";
      setAddressValidationError(errorMsg);
      toast({
        title: "Invalid Address Format",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build metadata object - only include non-empty fields
      const metadataObj: Record<string, string> = {};
      if (village.trim()) metadataObj.village = village.trim();
      if (taluk.trim()) metadataObj.taluk = taluk.trim();
      if (district.trim()) metadataObj.district = district.trim();
      if (state.trim()) metadataObj.state = state.trim();

      const payload = {
        old_record_hash: selectedRecord.record_hash,
        new_owner_address: sanitizedAddress,
      } as any;

      // Only include metadata if there are values
      if (Object.keys(metadataObj).length > 0) {
        payload.metadata = metadataObj;
      }

      console.log('Transfer payload:', JSON.stringify(payload, null, 2));

      const response = await http.post('/registry/transfer', payload);

      console.log('Transfer response:', response);
      setTransferResult(response);

      toast({
        title: "Transfer Successful",
        description: `Record transferred to ${sanitizedAddress.slice(0, 10)}...`,
      });

      // Reset form
      setSelectedRecord(null);
      setNewOwnerAddress('');
      setVillage('');
      setTaluk('');
      setDistrict('');
      setState('');

      onTransferCompleted?.(response);
    } catch (error: any) {
      console.error('Transfer error full:', JSON.stringify(error, null, 2));
      
      let errorMsg = "Failed to transfer record";
      
      // Try to extract error message from different response structures
      if (error?.response?.data?.detail) {
        errorMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.response?.statusText) {
        errorMsg = error.response.statusText;
      } else if (error?.message && error.message !== '[object Object]') {
        errorMsg = error.message;
      }
      
      toast({
        title: "Transfer Failed",
        description: errorMsg,
        variant: "destructive"
      });
      console.error('Transfer error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Transfer Land Record</h2>
        </div>

        {/* Record Selection */}
        {!transferResult && (
          <Card className="border-border/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Select Record
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {isLoadingRecords ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading records...
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <Label className="text-xs">Record Hash / Owner Address *</Label>
                  <Input
                    placeholder="Search by record hash or owner address..."
                    className="text-xs"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  
                  {/* Dropdown Results */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => {
                          const isValidHash = isValidRecordHash(record.record_hash);
                          return (
                            <button
                              key={record.record_hash}
                              onClick={() => {
                                if (isValidHash) {
                                  handleSelectRecord(record);
                                } else {
                                  toast({
                                    title: "Invalid Record Hash",
                                    description: `This record has an invalid hash format. Expected 0x + 64 hex characters.`,
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-border/30 last:border-b-0 text-xs transition ${
                                isValidHash ? 'hover:bg-muted cursor-pointer' : 'bg-destructive/10 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-mono text-foreground truncate flex-1">{record.record_hash}</div>
                                {!isValidHash && <span className="text-xs text-destructive ml-2">⚠️</span>}
                              </div>
                              <div className="text-muted-foreground text-xs">Owner: {record.owner_address?.slice(0, 12)}...</div>
                              {record.area_m2 && (
                                <div className="text-muted-foreground text-xs">Area: {record.area_m2.toFixed(2)} m²</div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                          {searchTerm ? 'No records found' : 'Start typing to search'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Record Info */}
              {selectedRecord && (
                <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Selected Record</span>
                    <button
                      onClick={() => setSelectedRecord(null)}
                      className="text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="font-mono text-xs text-foreground truncate">{selectedRecord.record_hash}</div>
                  <div className="text-xs text-muted-foreground">Area: {selectedRecord.area_m2?.toFixed(2)} m²</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Owner Display (Auto-populated) */}
        {selectedRecord && !transferResult && (
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Owner</span>
              </div>
              <div className="font-mono text-xs text-foreground">{selectedRecord.owner_address}</div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Result */}
        {transferResult && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Transfer Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">New Record Hash</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-foreground truncate">{transferResult.new_record_hash}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transferResult.new_record_hash);
                      toast({ title: "Copied", description: "Hash copied to clipboard" });
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">New Owner</p>
                <p className="font-mono text-foreground">{transferResult.new_owner_address}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Transaction Hash</p>
                <p className="font-mono text-foreground truncate">{transferResult.tx_hash?.slice(0, 20)}...</p>
              </div>
              
              <Button 
                variant="outline"
                className="w-full mt-2"
                onClick={() => setTransferResult(null)}
              >
                Transfer Another Record
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Transfer Form */}
        {selectedRecord && !transferResult && (
          <>
            <Card className="border-border/50">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  New Owner
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">New Owner Address *</Label>
                  <Input
                    placeholder="0x..."
                    className={`font-mono text-xs ${addressValidationError ? 'border-destructive' : ''}`}
                    value={newOwnerAddress}
                    onChange={(e) => {
                      setNewOwnerAddress(e.target.value);
                      setAddressValidationError('');
                    }}
                  />
                  {addressValidationError && (
                    <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {addressValidationError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Updated Metadata (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Village</Label>
                  <Input
                    placeholder="Village name"
                    className="text-xs"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Taluk</Label>
                  <Input
                    placeholder="Taluk name"
                    className="text-xs"
                    value={taluk}
                    onChange={(e) => setTaluk(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">District</Label>
                  <Input
                    placeholder="District name"
                    className="text-xs"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">State</Label>
                  <Input
                    placeholder="State name"
                    className="text-xs"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full"
              onClick={handleTransferRecord}
              disabled={isSubmitting || !selectedRecord || !newOwnerAddress}
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Record
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              The record will be transferred on-chain to the new owner with the specified metadata.
            </p>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

export default TransferInitiationPanel;
