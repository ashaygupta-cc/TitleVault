import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/layout/Footer';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { 
  Shield, 
  FileText, 
  Lock, 
  Building2, 
  Map, 
  CheckCircle2, 
  ArrowRight, 
  Fingerprint,
  Scale,
  FileCheck,
  Globe,
  Layers
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Shield,
      title: 'Immutable Records',
      description: 'Blockchain-anchored property records with cryptographic proof of authenticity and tamper-evident history.'
    },
    {
      icon: FileCheck,
      title: 'Court-Grade Verification',
      description: 'Multi-layer verification system meeting legal evidence standards for property disputes and transfers.'
    },
    {
      icon: Lock,
      title: 'Merkle Tree Proofs',
      description: 'Generate verifiable proofs of ownership without exposing sensitive registry data.'
    },
    {
      icon: Scale,
      title: 'Legal Compliance',
      description: 'Designed to meet government registry requirements with full audit trails and document integrity.'
    },
    {
      icon: Globe,
      title: 'Geospatial Integration',
      description: 'Precise parcel mapping with survey-grade coordinates linked to property records.'
    },
    {
      icon: Layers,
      title: 'Complete Lineage',
      description: 'Full ownership timeline from first registration through every transfer, subdivision, and encumbrance.'
    }
  ];

  const stats = [
    { value: '100%', label: 'Immutable' },
    { value: '256-bit', label: 'Encryption' },
    { value: '∞', label: 'Audit Trail' },
    { value: '< 1s', label: 'Verification' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-semibold text-foreground tracking-tight">Title Vault</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <ThemeToggle />
            <Link to="/registry">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Open Registry
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
            <Fingerprint className="h-4 w-4" />
            <span>Government-Grade Property Registry</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            Verified Property History
            <br />
            <span className="text-primary">You Can Trust in Court</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Title Vault provides immutable, blockchain-anchored property records with 
            court-admissible verification proofs. Track ownership, agreements, and 
            transfers with absolute certainty.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/registry">
              <Button size="lg" className="h-12 px-8 text-base">
                <Building2 className="h-5 w-5 mr-2" />
                Access Registry
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/registry">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                <Map className="h-5 w-5 mr-2" />
                View Parcel Map
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Registry-Grade Security
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed for legal admissibility and absolute data integrity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border hover:border-primary/30 transition-colors group">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-panel border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              From Land to Ledger
            </h2>
            <p className="text-lg text-muted-foreground">
              One unified flow for complete property transparency.
            </p>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />
            
            <div className="grid md:grid-cols-4 gap-8 relative">
              {[
                { icon: Map, title: 'Map', desc: 'Select parcel from survey map' },
                { icon: Building2, title: 'Building', desc: 'View stacked floor tiles' },
                { icon: FileText, title: 'Flat Tile', desc: 'Inspect registry card' },
                { icon: CheckCircle2, title: 'Verify', desc: 'Court-grade proof' }
              ].map((step, index) => (
                <div key={index} className="text-center relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card border-2 border-primary mx-auto mb-4 relative z-10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 md:top-0 md:right-1/4 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center z-20">
                    {index + 1}
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="bg-card border border-border rounded-2xl p-10 md:p-14">
            <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Access Verified Records?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Enter the registry to explore parcels, buildings, and flat ownership with 
              complete transparency and immutable proof.
            </p>
            <Link to="/registry">
              <Button size="lg" className="h-12 px-10 text-base">
                Enter Title Vault
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
