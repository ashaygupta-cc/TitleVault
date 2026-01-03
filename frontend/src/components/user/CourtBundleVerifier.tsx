import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { http } from '@/services/http';
import {
    AlertCircle,
    Archive,
    CheckCircle2,
    Clock,
    File,
    FileText,
    Loader2,
    Upload,
    XCircle
} from 'lucide-react';
import { useState } from 'react';

interface BundleFile {
  name: string;
  type: 'pdf' | 'json' | 'txt' | 'other';
  status: 'verified' | 'tampered' | 'error' | 'pending';
  message: string;
  details?: Record<string, any>;
}

interface BundleVerificationResult {
  bundle_name: string;
  total_files: number;
  verified_count: number;
  tampered_count: number;
  error_count: number;
  files: BundleFile[];
  overall_status: 'verified' | 'tampered' | 'mixed' | 'error';
}

export const CourtBundleVerifier = () => {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<BundleVerificationResult | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a ZIP file containing the court bundle',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Use FormData to send the ZIP file
      const formData = new FormData();
      formData.append('file', file);

      // Use http service for API call with proper base URL
      const result = await http.post('/court/bundle/verify-bundle', formData);
      setVerificationResult(result);

      if (result.overall_status === 'verified') {
        toast({
          title: 'Bundle Verified',
          description: `All ${result.verified_count} files verified - no tampering detected`,
        });
      } else if (result.overall_status === 'tampered') {
        toast({
          title: 'Tampering Detected',
          description: `${result.tampered_count} file(s) show signs of tampering`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Verification Complete',
          description: `${result.verified_count} verified, ${result.tampered_count} tampered, ${result.error_count} errors`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error?.message || 'Could not verify court bundle ZIP',
        variant: 'destructive',
      });
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <File className="w-4 h-4 text-red-600" />;
      case 'json':
        return <File className="w-4 h-4 text-blue-600" />;
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'tampered':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'tampered':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'error':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Court Bundle ZIP Verifier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Section */}
          <div className="flex items-center gap-3">
            <label htmlFor="bundle-upload" className="cursor-pointer">
              <Button asChild variant="outline" size="sm">
                <span className="flex items-center gap-2">
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isVerifying ? 'Verifying...' : 'Upload ZIP Bundle'}
                </span>
              </Button>
            </label>
            <input
              id="bundle-upload"
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              disabled={isVerifying}
              className="hidden"
            />
          </div>

          {/* Results Section */}
          {verificationResult && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{verificationResult.bundle_name}</h3>
                <div className="flex items-center gap-2">
                  {verificationResult.overall_status === 'verified' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold">VERIFIED</span>
                    </div>
                  )}
                  {verificationResult.overall_status === 'tampered' && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">TAMPERED</span>
                    </div>
                  )}
                  {verificationResult.overall_status === 'mixed' && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">MIXED</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2 rounded text-xs">
                <div className="text-center">
                  <div className="font-semibold text-gray-700">{verificationResult.total_files}</div>
                  <div className="text-gray-600">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{verificationResult.verified_count}</div>
                  <div className="text-gray-600">Verified</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{verificationResult.tampered_count}</div>
                  <div className="text-gray-600">Tampered</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">{verificationResult.error_count}</div>
                  <div className="text-gray-600">Errors</div>
                </div>
              </div>

              {/* Files List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-700">Bundle Contents:</p>
                {verificationResult.files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                  >
                    <div className="flex-shrink-0 pt-0.5">{getFileIcon(file.type)}</div>
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{file.message}</p>
                      {file.details && (
                        <div className="mt-1 p-1 bg-white rounded text-gray-700 max-h-16 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap break-words">
                            {JSON.stringify(file.details, null, 2).substring(0, 200)}
                          </pre>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      {getStatusIcon(file.status)}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeColor(file.status)}`}>
                        {file.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 text-xs text-blue-900">
          <p className="font-medium mb-2">Court Bundle Verification:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>ZIP File Upload:</strong> Upload the complete court bundle ZIP file</li>
            <li><strong>Affidavit Verification:</strong> PDF files are checked for valid EIP-191 signatures</li>
            <li><strong>JSON Validation:</strong> JSON files are parsed and validated for structure</li>
            <li><strong>Tamper Detection:</strong> Any file integrity issues are flagged as "tampered"</li>
            <li><strong>File Listing:</strong> All bundle contents extracted and individually verified</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourtBundleVerifier;
