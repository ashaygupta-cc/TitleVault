import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminApi } from '@/services/adminApi';
import type { AnalyticsData, HeatmapData } from '@/types/admin';
import { 
  BarChart3, 
  Building2, 
  Home, 
  FileSignature, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin,
  TrendingUp,
  Shield,
  RefreshCw,
  Flame,
  DollarSign,
  Map,
  BadgeCheck,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Scale,
  Activity,
  X,
  Calendar,
  ArrowRight,
  Filter,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const AnalyticsPanel = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [activeTab, setActiveTab] = useState('registrations');
  const [selectedSector, setSelectedSector] = useState<{
    zone: string;
    sectorIndex: number;
    sector: string;
    intensity: number;
    hue: number;
  } | null>(null);
  
  // Filter and sort state for drill-down
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Generate mock transaction history for drill-down
  const generateTransactionHistory = (zone: string, sectorIndex: number, intensity: number) => {
    const transactionTypes = ['Sale', 'Lease', 'Mortgage', 'Transfer'];
    const statuses = ['Completed', 'Pending', 'In Progress'];
    const parties = [
      { buyer: 'Rajesh Kumar', seller: 'Priya Sharma' },
      { buyer: 'Amit Patel', seller: 'Sunita Reddy' },
      { buyer: 'Vikram Singh', seller: 'Neha Gupta' },
      { buyer: 'Ananya Rao', seller: 'Suresh Menon' },
      { buyer: 'Karthik Iyer', seller: 'Meera Nair' },
      { buyer: 'Deepa Nair', seller: 'Ravi Shankar' },
      { buyer: 'Mohan Das', seller: 'Lakshmi Pillai' },
      { buyer: 'Sanjay Verma', seller: 'Kavitha Rao' },
    ];
    
    return Array.from({ length: 12 }).map((_, i) => {
      const valueNum = intensity * (Math.random() * 2 + 0.5);
      const party = parties[i % parties.length];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 60));
      
      return {
        id: `TXN-${zone.charAt(0)}${sectorIndex}-${String(i + 1).padStart(3, '0')}`,
        type: transactionTypes[i % transactionTypes.length],
        value: `₹${valueNum.toFixed(2)}M`,
        valueNum,
        buyer: party.buyer,
        seller: party.seller,
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        dateObj: date,
        status: statuses[i % statuses.length],
        parcelId: `PCL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      };
    });
  };

  // Filter and sort transactions
  const getFilteredTransactions = (zone: string, sectorIndex: number, intensity: number) => {
    let transactions = generateTransactionHistory(zone, sectorIndex, intensity);
    
    // Apply type filter
    if (typeFilter !== 'all') {
      transactions = transactions.filter(t => t.type === typeFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      transactions = transactions.filter(t => t.status === statusFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'date-desc':
        transactions.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        break;
      case 'date-asc':
        transactions.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        break;
      case 'value-desc':
        transactions.sort((a, b) => b.valueNum - a.valueNum);
        break;
      case 'value-asc':
        transactions.sort((a, b) => a.valueNum - b.valueNum);
        break;
      case 'type':
        transactions.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'status':
        transactions.sort((a, b) => a.status.localeCompare(b.status));
        break;
    }
    
    return transactions;
  };

  // Reset filters when sector changes
  useEffect(() => {
    if (selectedSector) {
      setTypeFilter('all');
      setStatusFilter('all');
      setSortBy('date-desc');
    }
  }, [selectedSector]);

  useEffect(() => {
    adminApi.getAnalytics().then(setData);
    adminApi.getHeatmapData().then(setHeatmapData);
  }, []);

  if (!data) return <div className="p-6 text-muted-foreground">Loading analytics...</div>;

  const chartData = data.monthlyTransfers.map(m => ({
    name: m.month,
    value: m.count,
  }));

  // Mock data for additional tabs
  const agreementData = [
    { month: 'Jan', sales: 45, leases: 28, mortgages: 15 },
    { month: 'Feb', sales: 52, leases: 35, mortgages: 22 },
    { month: 'Mar', sales: 48, leases: 32, mortgages: 18 },
    { month: 'Apr', sales: 61, leases: 41, mortgages: 25 },
    { month: 'May', sales: 55, leases: 38, mortgages: 20 },
    { month: 'Jun', sales: 67, leases: 45, mortgages: 30 },
    { month: 'Jul', sales: 72, leases: 48, mortgages: 28 },
    { month: 'Aug', sales: 65, leases: 42, mortgages: 24 },
  ];

  const financialData = [
    { month: 'Jan', revenue: 2.4, fees: 0.8 },
    { month: 'Feb', revenue: 2.8, fees: 0.9 },
    { month: 'Mar', revenue: 3.2, fees: 1.1 },
    { month: 'Apr', revenue: 3.8, fees: 1.3 },
    { month: 'May', revenue: 4.2, fees: 1.5 },
    { month: 'Jun', revenue: 4.8, fees: 1.7 },
    { month: 'Jul', revenue: 5.2, fees: 1.9 },
    { month: 'Aug', revenue: 5.6, fees: 2.1 },
  ];

  const districtData = [
    { name: 'North District', value: 35, color: 'hsl(var(--primary))' },
    { name: 'South District', value: 28, color: 'hsl(var(--verified))' },
    { name: 'East District', value: 22, color: 'hsl(var(--pending))' },
    { name: 'West District', value: 15, color: 'hsl(var(--status-agreement))' },
  ];

  const verificationStats = [
    { label: 'Auto-Verified', value: 847, percent: 68, trend: 'up' },
    { label: 'Manual Review', value: 234, percent: 19, trend: 'up' },
    { label: 'Pending', value: 98, percent: 8, trend: 'down' },
    { label: 'Rejected', value: 62, percent: 5, trend: 'down' },
  ];

  const typeColors: Record<string, string> = {
    'high-value': 'bg-verified',
    'active': 'bg-primary',
    'disputed': 'bg-destructive',
    'dormant': 'bg-muted-foreground',
  };

  const typeLabels: Record<string, string> = {
    'high-value': 'High Value',
    'active': 'Active Transactions',
    'disputed': 'Disputed',
    'dormant': 'Dormant',
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Registry Analytics</h2>
          <p className="text-xs text-muted-foreground">Real-time insights & metrics</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-2 shrink-0">
          <TabsList className="h-10 bg-transparent gap-0.5 w-full justify-start">
            <TabsTrigger value="registrations" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
              Registrations
            </TabsTrigger>
            <TabsTrigger value="agreements" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
              Agreements
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
              <Flame className="h-3 w-3 mr-1" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
              <DollarSign className="h-3 w-3 mr-1" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="districts" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
              Districts
            </TabsTrigger>
            <TabsTrigger value="verification" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5">
              Verification
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Registrations Tab */}
          <TabsContent value="registrations" className="m-0 space-y-4">
            {/* Registration Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Registration Trend
                  </CardTitle>
                  <Badge className="bg-verified/10 text-verified border-verified/30 text-xs">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +23% vs last period
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Records registered over the past 8 months</p>
              </CardHeader>
              <CardContent>
                <div className="h-48 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }} 
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorReg)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{data.totalParcels}</p>
                      <p className="text-xs text-muted-foreground">Total Parcels</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-pending/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-pending" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{data.totalBuildings}</p>
                      <p className="text-xs text-muted-foreground">Buildings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-verified/10 flex items-center justify-center">
                      <Home className="h-5 w-5 text-verified" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{data.totalFlats}</p>
                      <p className="text-xs text-muted-foreground">Flats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-status-agreement/10 flex items-center justify-center">
                      <FileSignature className="h-5 w-5 text-status-agreement" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{data.activeAgreements}</p>
                      <p className="text-xs text-muted-foreground">Agreements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Record Status
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-verified/10 border border-verified/20">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-verified" />
                  <p className="text-xl font-bold text-verified">{data.verifiedRecords}</p>
                  <p className="text-[10px] text-muted-foreground">Verified</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-pending/10 border border-pending/20">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-pending" />
                  <p className="text-xl font-bold text-pending">{data.pendingRecords}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
                  <p className="text-xl font-bold text-destructive">{data.disputedRecords}</p>
                  <p className="text-[10px] text-muted-foreground">Disputed</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Area */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Registered Area</p>
                  <p className="text-2xl font-bold text-foreground">{(data.totalAreaM2 / 1000000).toFixed(2)} km²</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                    Synced
                  </div>
                  <p className="text-xs font-medium text-verified">Live</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agreements Tab */}
          <TabsContent value="agreements" className="m-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    Agreement Types
                  </CardTitle>
                  <Badge className="bg-verified/10 text-verified border-verified/30 text-xs">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +15% this month
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Breakdown by agreement type over 8 months</p>
              </CardHeader>
              <CardContent>
                <div className="h-48 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agreementData}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }} 
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="leases" fill="hsl(var(--verified))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="mortgages" fill="hsl(var(--pending))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Sales</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-verified" />
                    <span className="text-muted-foreground">Leases</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-pending" />
                    <span className="text-muted-foreground">Mortgages</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-primary">465</p>
                  <p className="text-[10px] text-muted-foreground">Total Sales</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-verified">309</p>
                  <p className="text-[10px] text-muted-foreground">Total Leases</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-pending">182</p>
                  <p className="text-[10px] text-muted-foreground">Mortgages</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap" className="m-0 space-y-4">
            {/* Value Density Heatmap */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-destructive" />
                  Value Density by Region
                </CardTitle>
                <p className="text-xs text-muted-foreground">Total agreement value distribution</p>
              </CardHeader>
              <CardContent>
                {/* Heatmap Grid - 3 regions */}
                <div className="space-y-3">
                  {['North Zone', 'Central Zone', 'South Zone'].map((zone, zoneIndex) => (
                    <div key={zone} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{zone}</span>
                        <span className="text-xs text-muted-foreground">
                          {zoneIndex === 0 ? '₹45.2M' : zoneIndex === 1 ? '₹32.8M' : '₹28.1M'}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 gap-0.5 h-16">
                        {Array.from({ length: 12 }).map((_, colIndex) => {
                          // Generate intensity based on zone and column
                          const baseIntensity = zoneIndex === 0 ? 0.7 : zoneIndex === 1 ? 0.5 : 0.4;
                          const variance = Math.sin((colIndex + zoneIndex) * 0.8) * 0.3;
                          const intensity = Math.max(0.1, Math.min(1, baseIntensity + variance));
                          
                          // Color from blue (cold) to red (hot)
                          const hue = 240 - (intensity * 240); // 240=blue, 0=red
                          
                          // Generate mock stats for tooltip
                          const cellValue = (intensity * 10).toFixed(1);
                          const transactions = Math.floor(intensity * 50 + 10);
                          const avgPrice = (intensity * 2.5 + 0.5).toFixed(2);
                          const change = ((Math.random() - 0.3) * 20).toFixed(1);
                          const isPositive = parseFloat(change) > 0;
                          const sectorNames = ['Residential', 'Commercial', 'Mixed-Use', 'Industrial'];
                          const sector = sectorNames[Math.floor(colIndex / 3)];
                          
                          return (
                            <HoverCard key={colIndex} openDelay={100} closeDelay={50}>
                              <HoverCardTrigger asChild>
                                <div
                                  className="rounded-sm transition-all hover:scale-110 hover:z-10 cursor-pointer relative"
                                  style={{
                                    backgroundColor: `hsla(${hue}, 80%, 50%, ${0.3 + intensity * 0.7})`,
                                  }}
                                  onClick={() => setSelectedSector({
                                    zone,
                                    sectorIndex: colIndex + 1,
                                    sector,
                                    intensity,
                                    hue,
                                  })}
                                />
                              </HoverCardTrigger>
                              <HoverCardContent 
                                side="top" 
                                align="center" 
                                className="w-56 p-3 bg-card border-border shadow-lg"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-foreground">{zone} - Sector {colIndex + 1}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {sector}
                                    </Badge>
                                  </div>
                                  <div className="h-px bg-border" />
                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                      <p className="text-muted-foreground">Total Value</p>
                                      <p className="font-semibold text-foreground">₹{cellValue}M</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Transactions</p>
                                      <p className="font-semibold text-foreground">{transactions}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Avg. Price</p>
                                      <p className="font-semibold text-foreground">₹{avgPrice}M</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Change (30d)</p>
                                      <p className={`font-semibold ${isPositive ? 'text-verified' : 'text-destructive'}`}>
                                        {isPositive ? '+' : ''}{change}%
                                      </p>
                                    </div>
                                  </div>
                                  <div className="h-px bg-border" />
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground">Click for details</span>
                                    <div className="flex items-center gap-1.5">
                                      <div 
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}
                                      />
                                      <span className="font-medium text-foreground">{(intensity * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Heatmap Legend */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="text-[10px] text-muted-foreground">Low</span>
                  <div className="flex h-3 w-32 rounded overflow-hidden">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="flex-1"
                        style={{ backgroundColor: `hsl(${240 - i * 24}, 80%, 50%)` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">High</span>
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics with Circular Gauges */}
            <div className="grid grid-cols-4 gap-3">
              {/* Overall Risk Score */}
              <Card className="bg-card">
                <CardContent className="p-4 flex flex-col items-center">
                  <p className="text-[10px] text-muted-foreground mb-2">Overall Risk Score</p>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth="4" 
                        fill="none"
                        strokeDasharray={`${18 * 1.76} ${176}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">18.0</span>
                    </div>
                  </div>
                  <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">Low</Badge>
                </CardContent>
              </Card>

              {/* Default Probability */}
              <Card className="bg-card">
                <CardContent className="p-4 flex flex-col items-center">
                  <p className="text-[10px] text-muted-foreground mb-2">Default Probability</p>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        stroke="hsl(var(--pending))" 
                        strokeWidth="4" 
                        fill="none"
                        strokeDasharray={`${7.2 * 1.76} ${176}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">7.2</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-pending mt-2">7.2%</p>
                </CardContent>
              </Card>

              {/* Exposure at Risk */}
              <Card className="bg-card">
                <CardContent className="p-4 flex flex-col items-center">
                  <p className="text-[10px] text-muted-foreground mb-2">Exposure at Risk</p>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth="4" 
                        fill="none"
                        strokeDasharray={`${42 * 1.76} ${176}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">42.0</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-destructive mt-2">₹4.2M</p>
                </CardContent>
              </Card>

              {/* Coverage Ratio */}
              <Card className="bg-card">
                <CardContent className="p-4 flex flex-col items-center">
                  <p className="text-[10px] text-muted-foreground mb-2">Coverage Ratio</p>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        stroke="hsl(var(--verified))" 
                        strokeWidth="4" 
                        fill="none"
                        strokeDasharray={`${94 * 1.76} ${176}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-verified">94.0</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-verified mt-2">94%</p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Type Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Activity Classification</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {Object.entries(typeLabels).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${typeColors[type]}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="m-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Revenue & Fees
                  </CardTitle>
                  <Badge className="bg-verified/10 text-verified border-verified/30 text-xs">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +18% growth
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Financial performance (in millions)</p>
              </CardHeader>
              <CardContent>
                <div className="h-48 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={financialData}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }} 
                      />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--verified))" strokeWidth={2} dot={{ fill: 'hsl(var(--verified))' }} />
                      <Line type="monotone" dataKey="fees" stroke="hsl(var(--pending))" strokeWidth={2} dot={{ fill: 'hsl(var(--pending))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-verified" />
                    <span className="text-muted-foreground">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-pending" />
                    <span className="text-muted-foreground">Fees Collected</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-verified/5 border-verified/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-verified">₹32.4M</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-verified" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-pending/5 border-pending/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Fees Collected</p>
                      <p className="text-2xl font-bold text-pending">₹11.3M</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-pending" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Districts Tab */}
          <TabsContent value="districts" className="m-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  District Distribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">Registrations by district</p>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={districtData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {districtData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {districtData.map((district, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: district.color }}
                        />
                        <span className="text-sm font-medium">{district.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{district.value}%</span>
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(district.value * 12.4)} parcels
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="m-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  Verification Pipeline
                </CardTitle>
                <p className="text-xs text-muted-foreground">Record verification status breakdown</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {verificationStats.map((stat, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{stat.label}</span>
                        {stat.trend === 'up' ? (
                          <ArrowUpRight className="h-3 w-3 text-verified" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{stat.value}</span>
                        <Badge variant="outline" className="text-[10px]">{stat.percent}%</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          index === 0 ? 'bg-verified' : 
                          index === 1 ? 'bg-primary' : 
                          index === 2 ? 'bg-pending' : 'bg-destructive'
                        }`}
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-verified/5 border-verified/20">
                <CardContent className="p-4 text-center">
                  <BadgeCheck className="h-6 w-6 mx-auto mb-1 text-verified" />
                  <p className="text-2xl font-bold text-verified">87%</p>
                  <p className="text-[10px] text-muted-foreground">Success Rate</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <Activity className="h-6 w-6 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-primary">2.4h</p>
                  <p className="text-[10px] text-muted-foreground">Avg. Processing</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Sector Drill-Down Dialog */}
      <Dialog open={!!selectedSector} onOpenChange={() => setSelectedSector(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden">
          {selectedSector && (
            <>
              <DialogHeader className="p-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `hsla(${selectedSector.hue}, 80%, 50%, 0.2)` }}
                    >
                      <MapPin 
                        className="h-5 w-5"
                        style={{ color: `hsl(${selectedSector.hue}, 80%, 50%)` }}
                      />
                    </div>
                    <div>
                      <DialogTitle className="text-base">
                        {selectedSector.zone} - Sector {selectedSector.sectorIndex}
                      </DialogTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {selectedSector.sector}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Intensity: {(selectedSector.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-foreground">
                        ₹{(selectedSector.intensity * 10).toFixed(1)}M
                      </p>
                      <p className="text-[10px] text-muted-foreground">Total Value</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-foreground">
                        {Math.floor(selectedSector.intensity * 50 + 10)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Transactions</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-foreground">
                        ₹{(selectedSector.intensity * 2.5 + 0.5).toFixed(2)}M
                      </p>
                      <p className="text-[10px] text-muted-foreground">Avg. Price</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-verified">+12.4%</p>
                      <p className="text-[10px] text-muted-foreground">30d Change</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Recent Transactions
                    </h4>
                    <Badge variant="outline" className="text-[10px]">Last 60 days</Badge>
                  </div>
                  
                  {/* Filter and Sort Controls */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-7 text-xs w-[100px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Sale">Sale</SelectItem>
                          <SelectItem value="Lease">Lease</SelectItem>
                          <SelectItem value="Mortgage">Mortgage</SelectItem>
                          <SelectItem value="Transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-7 text-xs w-[110px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-1.5 ml-auto">
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-7 text-xs w-[120px]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date-desc">
                            <span className="flex items-center gap-1">Date (Newest)</span>
                          </SelectItem>
                          <SelectItem value="date-asc">
                            <span className="flex items-center gap-1">Date (Oldest)</span>
                          </SelectItem>
                          <SelectItem value="value-desc">
                            <span className="flex items-center gap-1">Value (High)</span>
                          </SelectItem>
                          <SelectItem value="value-asc">
                            <span className="flex items-center gap-1">Value (Low)</span>
                          </SelectItem>
                          <SelectItem value="type">Type</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {(() => {
                    const filteredTxns = getFilteredTransactions(
                      selectedSector.zone, 
                      selectedSector.sectorIndex, 
                      selectedSector.intensity
                    );
                    
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-muted-foreground">
                            {filteredTxns.length} transaction{filteredTxns.length !== 1 ? 's' : ''} found
                          </span>
                          {(typeFilter !== 'all' || statusFilter !== 'all') && (
                            <button 
                              onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                        
                        <ScrollArea className="h-[240px] rounded-lg border border-border">
                          {filteredTxns.length === 0 ? (
                            <div className="flex items-center justify-center h-full p-6">
                              <p className="text-sm text-muted-foreground">No transactions match your filters</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {filteredTxns.map((txn, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {txn.id}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] px-1.5 py-0 ${
                                    txn.type === 'Sale' ? 'border-primary/30 text-primary' :
                                    txn.type === 'Lease' ? 'border-verified/30 text-verified' :
                                    txn.type === 'Mortgage' ? 'border-pending/30 text-pending' :
                                    'border-border text-muted-foreground'
                                  }`}
                                >
                                  {txn.type}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    txn.status === 'Completed' ? 'bg-verified/10 border-verified/30 text-verified' :
                                    txn.status === 'Pending' ? 'bg-pending/10 border-pending/30 text-pending' :
                                    'bg-primary/10 border-primary/30 text-primary'
                                  }`}
                                >
                                  {txn.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-foreground">
                                <span className="font-medium">{txn.seller}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{txn.buyer}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Parcel: {txn.parcelId}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-foreground">{txn.value}</p>
                              <p className="text-[10px] text-muted-foreground">{txn.date}</p>
                            </div>
                          </div>
                        </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsPanel;
