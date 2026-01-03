import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, User, LogIn, UserPlus, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  department?: string;
}

export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@titlevault.gov', password: 'admin123', name: 'Registry Admin', role: 'admin' as const, department: 'Land Records Division' },
  user: { email: 'user@example.com', password: 'user123', name: 'John Citizen', role: 'user' as const },
};

interface AuthPanelProps {
  currentUser: DemoUser | null;
  onLogin: (user: DemoUser) => void;
  onLogout: () => void;
}

const AuthPanel: React.FC<AuthPanelProps> = ({ currentUser, onLogin, onLogout }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check demo credentials
    if (email === DEMO_CREDENTIALS.admin.email && password === DEMO_CREDENTIALS.admin.password) {
      onLogin({ 
        id: 'admin-001', 
        email: DEMO_CREDENTIALS.admin.email, 
        name: DEMO_CREDENTIALS.admin.name, 
        role: 'admin',
        department: DEMO_CREDENTIALS.admin.department
      });
      toast({ title: 'Welcome back, Administrator', description: 'Full registry access granted.' });
    } else if (email === DEMO_CREDENTIALS.user.email && password === DEMO_CREDENTIALS.user.password) {
      onLogin({ 
        id: 'user-001', 
        email: DEMO_CREDENTIALS.user.email, 
        name: DEMO_CREDENTIALS.user.name, 
        role: 'user' 
      });
      toast({ title: 'Welcome back!', description: 'You now have access to registry features.' });
    } else {
      setError('Invalid credentials. Use demo accounts below.');
    }

    setIsLoading(false);
  };

  const handleSignup = async () => {
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

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

    // Mock signup - in production this would create a real account
    onLogin({ id: `user-${Date.now()}`, email, name, role: 'user' });
    toast({ title: 'Account created!', description: 'Welcome to Title Vault.' });
    setIsLoading(false);
  };

  const fillDemoCredentials = (type: 'admin' | 'user') => {
    const creds = DEMO_CREDENTIALS[type];
    setEmail(creds.email);
    setPassword(creds.password);
    setError('');
  };

  if (currentUser) {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${currentUser.role === 'admin' ? 'bg-primary' : 'bg-muted'}`}>
              {currentUser.role === 'admin' ? (
                <Shield className="h-6 w-6 text-primary-foreground" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{currentUser.name}</CardTitle>
              <CardDescription>{currentUser.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'} className={currentUser.role === 'admin' ? 'bg-primary' : ''}>
              {currentUser.role === 'admin' ? 'Administrator' : 'Citizen User'}
            </Badge>
          </div>
          {currentUser.department && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Department</span>
              <span className="text-sm font-medium text-foreground">{currentUser.department}</span>
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Access Level</span>
            <span className="text-sm font-medium text-foreground">
              {currentUser.role === 'admin' ? 'Full Access' : 'Read Only'}
            </span>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Permissions</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'View Records', allowed: true },
                { label: 'Verify Documents', allowed: true },
                { label: 'Create Records', allowed: currentUser.role === 'admin' },
                { label: 'Manage Agreements', allowed: currentUser.role === 'admin' },
                { label: 'Transfer Titles', allowed: currentUser.role === 'admin' },
                { label: 'System Settings', allowed: currentUser.role === 'admin' },
              ].map((perm) => (
                <div key={perm.label} className="flex items-center gap-2 text-xs">
                  {perm.allowed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-verified" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={perm.allowed ? 'text-foreground' : 'text-muted-foreground'}>
                    {perm.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={onLogout}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary mx-auto mb-3">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle>Title Vault Access</CardTitle>
        <CardDescription>Sign in to access registry features</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={authMode} onValueChange={(v) => { setAuthMode(v as 'login' | 'signup'); setError(''); }}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login" className="text-xs">
              <LogIn className="h-3.5 w-3.5 mr-1.5" />Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
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

            <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Separator className="my-4" />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center mb-3">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-auto py-3 flex-col gap-1"
                  onClick={() => fillDemoCredentials('admin')}
                >
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Admin</span>
                  <span className="text-muted-foreground text-[10px]">Full Access</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-auto py-3 flex-col gap-1"
                  onClick={() => fillDemoCredentials('user')}
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">Citizen</span>
                  <span className="text-muted-foreground text-[10px]">Read Only</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="signup-password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
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

            <Button className="w-full" onClick={handleSignup} disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AuthPanel;
