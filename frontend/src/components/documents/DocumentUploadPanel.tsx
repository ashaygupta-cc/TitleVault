import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CourtBundleVerifier } from '@/components/user/CourtBundleVerifier';
import { PdfVerifier } from '@/components/user/PdfVerifier';
import { useToast } from '@/hooks/use-toast';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileCheck,
    RefreshCw
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'verifying' | 'verified' | 'rejected';
  hash?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

type DocumentType = 
  | 'sale_deed' 
  | 'encumbrance_certificate' 
  | 'tax_receipt' 
  | 'survey_map' 
  | 'identity_proof' 
  | 'address_proof'
  | 'power_of_attorney'
  | 'other';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'sale_deed', label: 'Sale Deed' },
  { value: 'encumbrance_certificate', label: 'Encumbrance Certificate' },
  { value: 'tax_receipt', label: 'Property Tax Receipt' },
  { value: 'survey_map', label: 'Survey Map / Blueprint' },
  { value: 'identity_proof', label: 'Identity Proof' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
  { value: 'other', label: 'Other' },
];

interface DocumentUploadPanelProps {
  subjectId?: string;
  subjectType?: 'LAND' | 'FLAT';
}

const DocumentUploadPanel: React.FC<DocumentUploadPanelProps> = ({
  subjectId,
  subjectType = 'LAND'
}) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: 'doc-1',
      name: 'Sale_Deed_2024.pdf',
      type: 'sale_deed',
      size: 2450000,
      uploadedAt: '2024-03-15T10:30:00Z',
      status: 'verified',
      hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      verifiedAt: '2024-03-15T11:00:00Z'
    },
    {
      id: 'doc-2',
      name: 'EC_Certificate.pdf',
      type: 'encumbrance_certificate',
      size: 1200000,
      uploadedAt: '2024-03-14T09:00:00Z',
      status: 'verifying',
    },
    {
      id: 'doc-3',
      name: 'Tax_Receipt_2023.pdf',
      type: 'tax_receipt',
      size: 450000,
      uploadedAt: '2024-03-10T14:00:00Z',
      status: 'pending',
    }
  ]);
  const [selectedType, setSelectedType] = useState<DocumentType>('sale_deed');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [selectedType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload PDF, JPEG, PNG, or TIFF files only.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 20MB.',
        variant: 'destructive'
      });
      return;
    }

    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          return null;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate document creation after upload
    setTimeout(() => {
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: selectedType,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
      };

      setDocuments(prev => [newDoc, ...prev]);
      setUploadProgress(null);
      
      toast({
        title: 'Document Uploaded',
        description: `${file.name} uploaded successfully. Verification pending.`,
      });

      // Simulate verification process
      setTimeout(() => {
        setDocuments(prev => prev.map(doc => 
          doc.id === newDoc.id 
            ? { ...doc, status: 'verifying' as const }
            : doc
        ));
      }, 2000);
    }, 2500);
  };

  const handleVerify = (docId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'verifying' as const }
        : doc
    ));

    // Simulate verification
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status: 'verified' as const,
              hash: '0x' + Math.random().toString(16).slice(2, 34),
              verifiedAt: new Date().toISOString()
            }
          : doc
      ));
      
      toast({
        title: 'Document Verified',
        description: 'Document integrity verified and hash anchored.',
      });
    }, 3000);
  };

  const handleDelete = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: 'Document Removed',
      description: 'Document has been removed from the registry.',
    });
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-verified text-verified-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'verifying':
        return (
          <Badge className="bg-pending text-pending-foreground">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Verifying
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Affidavit Verification</h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Upload affidavit PDFs, JSON, or TXT files to verify authenticity and extract key data
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold mb-3 text-foreground">Registry Affidavits</h3>
            <PdfVerifier affidavitType="registry" />
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 text-foreground">Flat Affidavits</h3>
            <PdfVerifier affidavitType="flat" />
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 text-foreground">Agreement Affidavits</h3>
            <PdfVerifier affidavitType="agreement" />
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 text-foreground">Court Bundle Verifier</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Upload the entire court bundle ZIP file to verify all contents - affidavits, JSONs, and detect any tampering
            </p>
            <CourtBundleVerifier />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Info Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-xs text-blue-900">
            <p className="font-medium mb-2">Supported Verification Types:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Registry Affidavits:</strong> PDF signature verification with EIP-191 cryptography</li>
              <li><strong>Flat Affidavits:</strong> PDF signature verification for flat unit records</li>
              <li><strong>Agreement Affidavits:</strong> PDF signature verification for agreement records</li>
              <li><strong>Court Bundle ZIP:</strong> Upload complete bundle to extract and verify all files (PDFs, JSONs, TXTs) and detect tampering</li>
            </ul>
            <p className="mt-3 text-xs italic">Court Bundle Verifier extracts all files from ZIP and checks affidavit signatures, JSON validity, and file integrity</p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default DocumentUploadPanel;
