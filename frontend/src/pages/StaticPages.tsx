import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  FileText, 
  Book, 
  Code, 
  HelpCircle, 
  Activity,
  ExternalLink,
  Shield,
  Search,
  Database,
  Lock,
  Zap
} from 'lucide-react';
import Footer from '@/components/layout/Footer';

interface StaticPageProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const StaticPageLayout: React.FC<StaticPageProps> = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="font-semibold text-sm">Land Registry</p>
              <p className="text-xs text-muted-foreground">Transparency Portal</p>
            </div>
          </Link>
        </div>
        <Link to="/registry">
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            Go to Registry
          </Button>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Back Link */}
          <Link to="/registry" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Registry
          </Link>

          {/* Hero */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Documentation Page
export const DocsPage = () => (
  <StaticPageLayout 
    title="Documentation" 
    description="Learn how to use the Land Registry Portal"
    icon={Book}
  >
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>Welcome to the Land Registry Transparency Portal. This platform provides cryptographic verification and immutable records for land ownership.</p>
          <h4 className="text-foreground font-semibold mt-4">Key Features:</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>Browse verified land parcels on an interactive map</li>
            <li>View building and flat ownership details</li>
            <li>Verify record authenticity with Merkle proofs</li>
            <li>Track ownership history and lineage</li>
            <li>Generate court-grade verification documents</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Using the Explorer
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>The Registry Explorer allows you to search and browse all land records in the system.</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Navigate to the Tools section using the sidebar</li>
            <li>Select "Explorer" to view all records</li>
            <li>Use the search bar to find specific parcels</li>
            <li>Click on any record to view full details</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Verification & Proofs
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>Every record in the system is cryptographically secured using blockchain technology and Merkle trees.</p>
          <p className="mt-2">To verify a record:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Navigate to the record details page</li>
            <li>Click the "Verify" tab to see verification status</li>
            <li>View the Merkle proof and blockchain anchor</li>
            <li>Export verification documents for legal purposes</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  </StaticPageLayout>
);

// API Reference Page
export const ApiDocsPage = () => (
  <StaticPageLayout 
    title="API Reference" 
    description="Technical documentation for developers"
    icon={Code}
  >
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">REST API Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">The Land Registry API provides programmatic access to registry data.</p>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Base URL</p>
            <code className="text-sm font-mono text-foreground">https://api.landregistry.gov/v1</code>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground mb-2">Endpoints</h4>
            <div className="space-y-2">
              {[
                { method: 'GET', path: '/parcels', desc: 'List all parcels' },
                { method: 'GET', path: '/parcels/:id', desc: 'Get parcel details' },
                { method: 'GET', path: '/buildings/:id', desc: 'Get building details' },
                { method: 'GET', path: '/flats/:id', desc: 'Get flat details' },
                { method: 'GET', path: '/verify/:hash', desc: 'Verify record hash' },
              ].map((endpoint) => (
                <div key={endpoint.path} className="flex items-center gap-3 p-2 rounded bg-muted/20">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">{endpoint.method}</span>
                  <code className="text-xs font-mono text-foreground">{endpoint.path}</code>
                  <span className="text-xs text-muted-foreground ml-auto">{endpoint.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authentication</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>API access requires authentication via API keys. Contact the administrator to obtain credentials.</p>
          <div className="bg-muted/30 rounded-lg p-4 mt-4">
            <p className="text-xs text-muted-foreground mb-2">Header</p>
            <code className="text-sm font-mono text-foreground">Authorization: Bearer YOUR_API_KEY</code>
          </div>
        </CardContent>
      </Card>
    </div>
  </StaticPageLayout>
);

// Help Center Page
export const HelpPage = () => (
  <StaticPageLayout 
    title="Help Center" 
    description="Get help and support"
    icon={HelpCircle}
  >
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: 'How do I verify a land record?', a: 'Navigate to the record details and click the Verify tab. The system will show the cryptographic proof and blockchain anchor.' },
            { q: 'What is a Merkle proof?', a: 'A Merkle proof is a cryptographic method to prove that a specific record is part of a larger dataset without revealing the entire dataset.' },
            { q: 'How do I report a disputed record?', a: 'Contact the registry administrator through the Court panel with evidence supporting your claim.' },
            { q: 'Can I export records for legal purposes?', a: 'Yes, all records can be exported as court-grade documents with verification proofs included.' },
          ].map((faq, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/20">
              <p className="font-medium text-foreground mb-2">{faq.q}</p>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Support</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>For additional assistance, please contact our support team:</p>
          <div className="mt-4 space-y-2">
            <p className="text-sm"><strong>Email:</strong> support@landregistry.gov</p>
            <p className="text-sm"><strong>Phone:</strong> +91 1800-XXX-XXXX (Toll Free)</p>
            <p className="text-sm"><strong>Hours:</strong> Monday - Friday, 9 AM - 6 PM IST</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </StaticPageLayout>
);

// Status Page
export const StatusPage = () => (
  <StaticPageLayout 
    title="System Status" 
    description="Current operational status of all services"
    icon={Activity}
  >
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Registry API', status: 'operational', uptime: '99.99%' },
              { name: 'Map Services', status: 'operational', uptime: '99.95%' },
              { name: 'Verification Engine', status: 'operational', uptime: '100%' },
              { name: 'Blockchain Anchor', status: 'operational', uptime: '99.99%' },
              { name: 'Database', status: 'operational', uptime: '99.99%' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-foreground">{service.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{service.uptime} uptime</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p className="text-center py-8 text-sm">No incidents reported in the last 90 days.</p>
        </CardContent>
      </Card>
    </div>
  </StaticPageLayout>
);

// Terms of Service Page
export const TermsPage = () => (
  <StaticPageLayout 
    title="Terms of Service" 
    description="Legal terms governing the use of this platform"
    icon={FileText}
  >
    <Card>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground py-6">
        <p><strong className="text-foreground">Last Updated:</strong> December 30, 2025</p>
        
        <h3 className="text-foreground font-semibold mt-6">1. Acceptance of Terms</h3>
        <p>By accessing and using the Land Registry Transparency Portal, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        
        <h3 className="text-foreground font-semibold mt-6">2. Use of Service</h3>
        <p>The platform is provided for the purpose of accessing and verifying land ownership records. Users must not misuse the service for fraudulent purposes.</p>
        
        <h3 className="text-foreground font-semibold mt-6">3. Data Accuracy</h3>
        <p>While we strive to maintain accurate records, users should verify information through official channels before making legal decisions based on the data provided.</p>
        
        <h3 className="text-foreground font-semibold mt-6">4. Intellectual Property</h3>
        <p>All content, features, and functionality of this platform are owned by the Land Registry Authority and protected by applicable intellectual property laws.</p>
        
        <h3 className="text-foreground font-semibold mt-6">5. Limitation of Liability</h3>
        <p>The platform is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from the use of this service.</p>
      </CardContent>
    </Card>
  </StaticPageLayout>
);

// Privacy Policy Page
export const PrivacyPage = () => (
  <StaticPageLayout 
    title="Privacy Policy" 
    description="How we collect, use, and protect your data"
    icon={Lock}
  >
    <Card>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground py-6">
        <p><strong className="text-foreground">Last Updated:</strong> December 30, 2025</p>
        
        <h3 className="text-foreground font-semibold mt-6">Information We Collect</h3>
        <p>We collect information necessary to provide our services, including:</p>
        <ul className="list-disc pl-4">
          <li>Account information (name, email, role)</li>
          <li>Usage data and access logs</li>
          <li>Property search and verification requests</li>
        </ul>
        
        <h3 className="text-foreground font-semibold mt-6">How We Use Information</h3>
        <p>Your information is used to:</p>
        <ul className="list-disc pl-4">
          <li>Provide and improve our services</li>
          <li>Maintain security and prevent fraud</li>
          <li>Comply with legal obligations</li>
        </ul>
        
        <h3 className="text-foreground font-semibold mt-6">Data Security</h3>
        <p>We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your data.</p>
        
        <h3 className="text-foreground font-semibold mt-6">Your Rights</h3>
        <p>You have the right to access, correct, or delete your personal information. Contact our data protection officer for requests.</p>
      </CardContent>
    </Card>
  </StaticPageLayout>
);

// Data Policy Page
export const DataPolicyPage = () => (
  <StaticPageLayout 
    title="Data Policy" 
    description="Policies governing data storage and handling"
    icon={Database}
  >
    <Card>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground py-6">
        <p><strong className="text-foreground">Last Updated:</strong> December 30, 2025</p>
        
        <h3 className="text-foreground font-semibold mt-6">Data Retention</h3>
        <p>Land registry records are maintained indefinitely as required by law. User activity logs are retained for 7 years for audit purposes.</p>
        
        <h3 className="text-foreground font-semibold mt-6">Blockchain Immutability</h3>
        <p>Once records are anchored to the blockchain, they cannot be modified or deleted. This ensures the integrity and auditability of all land records.</p>
        
        <h3 className="text-foreground font-semibold mt-6">Data Sharing</h3>
        <p>Public record information may be shared with authorized government agencies and legal entities. Personal user data is never sold to third parties.</p>
        
        <h3 className="text-foreground font-semibold mt-6">Data Location</h3>
        <p>All data is stored in secure, government-certified data centers within the jurisdiction. Blockchain anchors are distributed across multiple networks for redundancy.</p>
      </CardContent>
    </Card>
  </StaticPageLayout>
);

// Compliance Page
export const CompliancePage = () => (
  <StaticPageLayout 
    title="Compliance" 
    description="Regulatory compliance and certifications"
    icon={Shield}
  >
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regulatory Compliance</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>The Land Registry Transparency Portal complies with all applicable regulations including:</p>
          <ul className="list-disc pl-4 mt-4">
            <li><strong className="text-foreground">Information Technology Act, 2000</strong> - Electronic records and digital signatures</li>
            <li><strong className="text-foreground">Registration Act, 1908</strong> - Property registration requirements</li>
            <li><strong className="text-foreground">Digital Personal Data Protection Act, 2023</strong> - Data protection and privacy</li>
            <li><strong className="text-foreground">Evidence Act, 1872</strong> - Admissibility of electronic records in court</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'ISO 27001', desc: 'Information Security' },
              { name: 'ISO 27701', desc: 'Privacy Management' },
              { name: 'SOC 2 Type II', desc: 'Security Controls' },
              { name: 'STQC', desc: 'Quality Certification' },
            ].map((cert) => (
              <div key={cert.name} className="p-4 rounded-lg bg-muted/20 text-center">
                <p className="font-semibold text-foreground">{cert.name}</p>
                <p className="text-xs text-muted-foreground">{cert.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </StaticPageLayout>
);
