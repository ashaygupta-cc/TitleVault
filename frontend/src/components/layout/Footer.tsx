import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, FileText, CheckCircle, BarChart3, Map, Scale, ExternalLink } from 'lucide-react';

const Footer = () => {
  const navigation = [
    { label: 'Explorer', href: '/registry', icon: Search },
    { label: 'Registry Browser', href: '/registry', icon: FileText },
    { label: 'Verify Records', href: '/registry', icon: CheckCircle },
    { label: 'Analytics', href: '/registry', icon: BarChart3 },
    { label: 'Map View', href: '/registry', icon: Map },
  ];

  const resources = [
    { label: 'Documentation', href: '/docs', internal: true },
    { label: 'API Reference', href: '/api-docs', internal: true },
    { label: 'Help Center', href: '/help', internal: true },
    { label: 'Status Page', href: '/status', internal: true },
  ];

  const legal = [
    { label: 'Terms of Service', href: '/terms', internal: true },
    { label: 'Privacy Policy', href: '/privacy', internal: true },
    { label: 'Data Policy', href: '/data-policy', internal: true },
    { label: 'Compliance', href: '/compliance', internal: true },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-semibold text-foreground text-lg">Title Vault</span>
                <p className="text-xs text-muted-foreground">Transparency Portal</p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              Cryptographic transparency and immutable verification for land ownership records. 
              Court-grade evidence for property disputes.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-3">
              {navigation.map((item) => (
                <li key={item.label}>
                  <Link 
                    to={item.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3">
              {resources.map((item) => (
                <li key={item.label}>
                  <Link 
                    to={item.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    {item.label}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3">
              {legal.map((item) => (
                <li key={item.label}>
                  <Link 
                    to={item.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Title Vault. All records are cryptographically secured and immutable.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-verified animate-pulse" />
                <span>System Operational</span>
              </div>
              <span className="text-xs text-muted-foreground">v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
