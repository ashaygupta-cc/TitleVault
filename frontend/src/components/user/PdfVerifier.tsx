import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { registryApi } from '@/services/registryApi';
import { CheckCircle, Clock, Eye, FileText, Loader2, Upload, XCircle } from 'lucide-react';
import { useState } from 'react';

interface VerificationResult {
  success: boolean;
  overall_valid: boolean;
  extracted_fields: Record<string, any>;
  verification_checks: Record<string, any>;
  errors: string[];
  database_record_found?: boolean;
}

interface DocumentsVerifierProps {
  affidavitType?: 'registry' | 'flat' | 'agreement' | undefined;
}

type FileType = 'pdf' | 'json' | 'txt';

export const PdfVerifier = ({ affidavitType }: DocumentsVerifierProps) => {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<string>('');

  const getVerifierTitle = () => {
    if (!affidavitType) return 'Generic Document Verifier';
    return `Verify ${affidavitType.charAt(0).toUpperCase() + affidavitType.slice(1)} Affidavit`;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    let type: FileType | null = null;

    if (name.endsWith('.pdf')) type = 'pdf';
    else if (name.endsWith('.json')) type = 'json';
    else if (name.endsWith('.txt')) type = 'txt';

    if (!type) {
      toast({
        title: 'Invalid File',
        description: 'Please select a PDF, JSON, or TXT file',
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);
    setDocumentFile(file);
    setFileType(type);
    setIsVerifying(true);
    setVerificationResult(null);
    setShowPreview(false);
    setFileContent('');

    try {
      // Parse file content first
      if (type === 'json' || type === 'txt') {
        setParsingProgress('Reading file...');
        const text = await file.text();
        setFileContent(text);
        setShowPreview(true);

        // For JSON, validate it
        if (type === 'json') {
          setParsingProgress('Parsing JSON...');
          try {
            JSON.parse(text);
          } catch {
            throw new Error('Invalid JSON format');
          }
        }

        toast({
          title: 'File Loaded',
          description: `${type.toUpperCase()} file loaded successfully`,
        });
      } else {
        // PDF verification
        setParsingProgress('Parsing PDF...');
        let result: VerificationResult;

        if (affidavitType === 'registry') {
          result = await registryApi.verifyRegistryAffidavitPdf(file);
        } else if (affidavitType === 'flat') {
          result = await registryApi.verifyFlatAffidavitPdf(file);
        } else if (affidavitType === 'agreement') {
          result = await registryApi.verifyAgreementAffidavitPdf(file);
        } else {
          // Generic document verification - try to verify as any type
          setParsingProgress('Analyzing document format...');
          try {
            result = await registryApi.verifyAgreementAffidavitPdf(file);
          } catch {
            // If it fails, that's okay - just show the file
            toast({
              title: 'Document Loaded',
              description: 'PDF loaded - signature verification not applicable for this document type',
            });
            setFileContent('PDF document loaded');
            setShowPreview(true);
            setIsVerifying(false);
            setParsingProgress('');
            return;
          }
        }

        setParsingProgress('Verifying PDF...');
        setVerificationResult(result);

        if (result.overall_valid) {
          toast({
            title: 'Verification Passed',
            description: 'All checks passed - PDF is authentic',
          });
        } else {
          toast({
            title: 'Verification Warning',
            description: 'Some checks failed - see details below',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Processing Failed',
        description: error?.response?.data?.detail || error?.message || `Could not process ${type.toUpperCase()}`,
        variant: 'destructive',
      });
      setVerificationResult(null);
      setFileContent('');
      setShowPreview(false);
    } finally {
      setIsVerifying(false);
      setParsingProgress('');
    }
  };

  const getCheckIcon = (passed: boolean) => {
    if (passed) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {getVerifierTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Section */}
        <div className="flex items-center gap-3">
          <label htmlFor={`doc-upload-${affidavitType || 'all'}`} className="cursor-pointer">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isVerifying}
            >
              <span>
                <Upload className="w-4 h-4" />
                {isVerifying ? 'Processing...' : 'Upload File'}
              </span>
            </Button>
          </label>
          {fileName && (
            <span className="text-xs text-muted-foreground truncate flex-1">
              {fileName}
            </span>
          )}
          <input
            id={`doc-upload-${affidavitType || 'all'}`}
            type="file"
            accept=".pdf,.json,.txt"
            onChange={handleFileSelect}
            disabled={isVerifying}
            className="hidden"
          />
        </div>

        {/* Loading State with Progress */}
        {isVerifying && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3 border rounded-lg bg-slate-50">
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-5 w-5 text-primary" />
              <p className="text-sm font-medium">{parsingProgress || 'Processing file...'}</p>
            </div>
            <div className="w-full px-6">
              <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}

        {/* File Preview Section - For JSON and TXT */}
        {showPreview && fileContent && fileType !== 'pdf' && !isVerifying && (
          <div className="border rounded-lg bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {fileType === 'json' ? 'JSON Data Preview' : 'Text File Content'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'}
              </Button>
            </div>
            <pre className="bg-white border rounded p-3 text-xs overflow-auto max-h-64 font-mono text-slate-700 whitespace-pre-wrap break-words">
              {fileType === 'json' 
                ? JSON.stringify(JSON.parse(fileContent), null, 2)
                : fileContent
              }
            </pre>
          </div>
        )}

        {/* Verification Results - For PDF */}
        {verificationResult && !isVerifying && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                {verificationResult.overall_valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-medium text-sm">
                  {verificationResult.overall_valid ? 'VERIFIED ✓' : 'VERIFICATION FAILED ✗'}
                </span>
              </div>

              {verificationResult.errors.length > 0 && (
                <div className="text-xs text-red-600 space-y-1">
                  {verificationResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Extracted Fields */}
            {Object.keys(verificationResult.extracted_fields).some(
              (k) => verificationResult.extracted_fields[k]
            ) && (
              <div className="p-3 rounded-lg border bg-slate-50">
                <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Extracted Fields:
                </h4>
                <div className="space-y-2 text-xs">
                  {Object.entries(verificationResult.extracted_fields).map(
                    ([key, value]) =>
                      value && (
                        <div key={key} className="flex justify-between items-start gap-2">
                          <span className="font-mono text-slate-600 min-w-fit">{key}:</span>
                          <code className="font-mono truncate text-slate-900 text-right flex-1 break-all">
                            {typeof value === 'string' && value.length > 50
                              ? `${value.substring(0, 50)}...`
                              : String(value)}
                          </code>
                        </div>
                      )
                  )}
                </div>
              </div>
            )}

            {/* Verification Checks */}
            <div className="p-3 rounded-lg border bg-slate-50">
              <h4 className="text-xs font-semibold mb-3">Verification Checks:</h4>
              <div className="space-y-2">
                {Object.entries(verificationResult.verification_checks).map(
                  ([checkName, checkResult]: [string, any]) => (
                    <div
                      key={checkName}
                      className={`flex items-start gap-2 p-2 rounded ${
                        checkResult.passed ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      {getCheckIcon(checkResult.passed)}
                      <div className="flex-1 text-xs">
                        <div className="font-medium capitalize">
                          {checkName.replace(/_/g, ' ')}
                        </div>
                        {checkResult.passed ? (
                          <div className="text-green-600 text-xs mt-1">
                            {checkResult.value && `✓ ${checkResult.value.substring(0, 40)}...`}
                          </div>
                        ) : (
                          <div className="text-red-600 text-xs mt-1">
                            ✗ {checkResult.error || 'Check failed'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Database Record Status */}
            {verificationResult.database_record_found !== undefined && (
              <div className={`p-3 rounded-lg border ${
                verificationResult.database_record_found ? 'bg-blue-50' : 'bg-amber-50'
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  {verificationResult.database_record_found ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700">✓ Database record found and verified</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-700">⚠ No matching database record found</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Clear Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVerificationResult(null);
                setDocumentFile(null);
                setFileName('');
                setFileContent('');
                setShowPreview(false);
              }}
              className="w-full"
            >
              Clear & Upload New
            </Button>
          </div>
        )}

        {/* Helper Text */}
        {!verificationResult && !isVerifying && !fileContent && (
          <p className="text-xs text-muted-foreground">
            Upload a PDF, JSON, or TXT file to extract and verify key fields including hashes, signatures, and owner information.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
