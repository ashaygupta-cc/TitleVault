import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { http } from '@/services/http';
import { Eye, EyeOff, FileText, Fingerprint, Lock, LogIn, Mail, Scale, Shield, User, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  department?: string;
}

export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@gmail.com', password: 'admin@123', name: 'Ashay Gupta', role: 'admin' as const, department: 'Land Records Division' },
  user: { email: 'user1@gmail.com', password: 'user1@123', name: 'User One', role: 'user' as const },
};

const Auth = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in
  useEffect(() => {
    const stored = localStorage.getItem('titlevault_user');
    if (stored) {
      navigate('/registry');
    }
  }, [navigate]);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const resp = await http.post('/auth/login', { username: email, password });
      const access = resp.access_token;
      const refresh = resp.refresh_token;
      if (access) {
        http.setTokens(access, refresh);

        const payload = http.decodeJwtPayload(access) || {};
        const user: DemoUser = {
          id: payload.sub || `user-${Date.now()}`,
          email: payload.username || email,
          name: payload.username || email,
          role: Array.isArray(payload.roles) && payload.roles.length ? payload.roles[0] : 'user',
        };

        localStorage.setItem('titlevault_user', JSON.stringify(user));
        toast({ title: `Welcome back, ${user.name}`, description: 'You are signed in.' });
        navigate('/registry');
      } else {
        throw new Error('No access token returned');
      }
    } catch (err) {
      setError(`Login failed: ${err instanceof Error ? err.message : 'Invalid credentials'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (!name || !email || !password) {
        setError('Please fill in all fields.');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setIsLoading(false);
        return;
      }

      // Note: Admin must create user accounts via /auth/register
      // Users cannot self-register via this endpoint
      setError('Account registration must be done by an administrator. Contact your registry administrator.');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (type: 'admin' | 'user') => {
    const creds = DEMO_CREDENTIALS[type];
    setEmail(creds.email);
    setPassword(creds.password);
    setError('');
  };

  const features = [
    { icon: Shield, title: 'Cryptographic Security', description: 'All records secured with SHA-256 hashing and blockchain anchoring' },
    { icon: Scale, title: 'Court-Grade Evidence', description: 'Generate legally admissible affidavits with Merkle proofs' },
    { icon: Fingerprint, title: 'Tamper-Proof Records', description: 'Immutable ownership history with complete audit trail' },
    { icon: FileText, title: 'Document Verification', description: 'Instant verification of property documents and titles' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-foreground text-lg">Title Vault</span>
            <p className="text-xs text-muted-foreground">Transparency Portal</p>
          </div>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Left Side - Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-muted/30 p-12 flex-col justify-center">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Secure Property Registry
            </h1>
            <p className="text-muted-foreground mb-8">
              Access the nation's most trusted land records system with cryptographic transparency and immutable verification.
            </p>
            <div className="space-y-6">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-border">
            <CardHeader className="text-center pb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Welcome to Title Vault</CardTitle>
              <CardDescription>Sign in to access registry features</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(v) => { setAuthMode(v as 'login' | 'signup'); setError(''); }}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">
                    <LogIn className="h-4 w-4 mr-2" />Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup">
                    <UserPlus className="h-4 w-4 mr-2" />Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button className="w-full h-11" onClick={handleLogin} disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <Separator className="my-6" />

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">🔐 Test Credentials</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-auto py-4 flex-col gap-2 text-xs"
                        onClick={() => fillDemoCredentials('admin')}
                      >
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-medium">admin@gmail.com</span>
                        <span className="text-xs text-muted-foreground">admin@123</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-auto py-4 flex-col gap-2 text-xs"
                        onClick={() => fillDemoCredentials('user')}
                      >
                        <User className="h-5 w-5" />
                        <span className="font-medium">user1@gmail.com</span>
                        <span className="text-xs text-muted-foreground">user1@123</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="John Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-password" 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button className="w-full h-11" onClick={handleSignup} disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    By registering, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
