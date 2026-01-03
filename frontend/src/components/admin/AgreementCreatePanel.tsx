import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';
import { AlertCircle, Calendar, CheckCheck, CheckCircle2, DollarSign, FileSignature, Loader2, Plus, Users, X, XCircle, Zap } from 'lucide-react';
import React, { useState } from 'react';

const AgreementCreatePanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [agreementStatus, setAgreementStatus] = useState<'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED'>('DRAFT');
  const [agreementData, setAgreementData] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [paidInstallments, setPaidInstallments] = useState<Set<number>>(new Set());

  const handleActivateAgreement = async () => {
    if (!result?.agreement_id && !result?.agreementId) return;
    setIsActionLoading(true);
    try {
      const agreementId = result.agreement_id || result.agreementId;
      const response = await adminApi.activateAgreement(agreementId);
      setAgreementStatus('ACTIVE');
      setAgreementData(response);
      toast({
        title: 'Success',
        description: 'Agreement activated successfully',
      });
    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not activate agreement',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteAgreement = async () => {
    if (!result?.agreement_id && !result?.agreementId) return;
    setIsActionLoading(true);
    try {
      const agreementId = result.agreement_id || result.agreementId;
      const response = await adminApi.completeAgreement(agreementId);
      setAgreementStatus('COMPLETED');
      setAgreementData(response);
      toast({
        title: 'Success',
        description: 'Agreement marked as complete',
      });
    } catch (error: any) {
      console.error('Complete error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not complete agreement',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelAgreement = async () => {
    if (!result?.agreement_id && !result?.agreementId) return;
    setIsActionLoading(true);
    try {
      const agreementId = result.agreement_id || result.agreementId;
      const response = await adminApi.cancelAgreement(agreementId);
      setAgreementStatus('CANCELLED');
      setAgreementData(response);
      toast({
        title: 'Success',
        description: 'Agreement cancelled',
      });
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not cancel agreement',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDefaultAgreement = async () => {
    if (!result?.agreement_id && !result?.agreementId) return;
    setIsActionLoading(true);
    try {
      const agreementId = result.agreement_id || result.agreementId;
      const response = await adminApi.defaultAgreement(agreementId);
      setAgreementStatus('DEFAULTED');
      setAgreementData(response);
      toast({
        title: 'Success',
        description: 'Agreement marked as defaulted',
      });
    } catch (error: any) {
      console.error('Default error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not default agreement',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkInstallmentPaid = (index: number) => {
    const newPaidSet = new Set(paidInstallments);
    if (newPaidSet.has(index)) {
      newPaidSet.delete(index);
    } else {
      newPaidSet.add(index);
    }
    setPaidInstallments(newPaidSet);

    // Check if all installments are paid
    const installments = result?.canonical_json ? JSON.parse(result.canonical_json).schedule : [];
    if (newPaidSet.size === installments.length && installments.length > 0) {
      // Auto-complete after a short delay
      setTimeout(() => {
        handleCompleteAgreement();
      }, 500);
    }
  };

  const getScheduleFromResult = () => {
    if (!result) return [];
    try {
      if (result.canonical_json) {
        const parsed = JSON.parse(result.canonical_json);
        return parsed.schedule || [];
      }
    } catch (e) {
      console.error('Failed to parse schedule:', e);
    }
    return [];
  };

  const schedule = getScheduleFromResult();

  const [formData, setFormData] = useState({
    subjectType: 'FLAT' as 'LAND' | 'FLAT',
    subjectId: '',
    buyerAddress: '',
    sellerAddress: '',
    totalPrice: '',
    paidUpfront: '',
    agreementType: 'sale' as 'sale' | 'lease' | 'transfer' | 'mortgage',
    leaseEndDate: '',
    schedule: [{ amount: '', dueInDays: '' }],
  });

  const addScheduleItem = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, { amount: '', dueInDays: '' }],
    });
  };

  const removeScheduleItem = (index: number) => {
    setFormData({
      ...formData,
      schedule: formData.schedule.filter((_, i) => i !== index),
    });
  };

  const updateScheduleItem = (index: number, field: 'amount' | 'dueInDays', value: string) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setFormData({ ...formData, schedule: newSchedule });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await adminApi.createAgreement({
        subject_type: formData.subjectType,
        subject_id: formData.subjectId,
        buyer_address: formData.buyerAddress,
        seller_address: formData.sellerAddress,
        total_price: parseFloat(formData.totalPrice),
        paid_upfront: parseFloat(formData.paidUpfront),
        agreement_type: formData.agreementType.toUpperCase(),
        lease_end_date: formData.leaseEndDate || undefined,
        schedule: formData.schedule.map(s => ({
          amount: parseFloat(s.amount),
          due_in_days: parseInt(s.dueInDays),
        })),
      });
      setResult(response);
      toast({
        title: 'Success',
        description: `Agreement: ${response.agreement_id || response.agreementId}`,
      });
      setFormData({
        subjectType: 'FLAT' as const,
        subjectId: '',
        buyerAddress: '',
        sellerAddress: '',
        totalPrice: '',
        paidUpfront: '',
        agreementType: 'sale' as const,
        leaseEndDate: '',
        schedule: [{ amount: '', dueInDays: '' }],
      });
    } catch (error: any) {
      console.error('Agreement error:', error);
      toast({
        title: 'Failed',
        description: error?.message || 'Could not create agreement',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-auto registry-scrollbar h-full">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
          Admin
        </Badge>
        <h2 className="text-xl font-semibold text-foreground">Create Agreement</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            Agreement Details
          </CardTitle>
          <CardDescription>Create a sale, lease, transfer or mortgage agreement</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subject Type</Label>
                  <Select
                    value={formData.subjectType}
                    onValueChange={(v: 'LAND' | 'FLAT') => setFormData({ ...formData, subjectType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAND">Land Parcel</SelectItem>
                      <SelectItem value="FLAT">Flat Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agreement Type</Label>
                  <Select
                    value={formData.agreementType}
                    onValueChange={(v: 'sale' | 'lease' | 'transfer' | 'mortgage') => 
                      setFormData({ ...formData, agreementType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="lease">Lease</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="subjectId">Subject ID</Label>
                <Input
                  id="subjectId"
                  placeholder={formData.subjectType === 'FLAT' ? 'flat-uuid' : '0x...'}
                  value={formData.subjectId}
                  onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.subjectType === 'FLAT' ? 'Use flat UUID, not hash' : 'Use record hash (0x...)'}
                </p>
              </div>
            </div>

            {/* Parties */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Parties
              </div>
              <div>
                <Label htmlFor="sellerAddress">Seller Address</Label>
                <Input
                  id="sellerAddress"
                  placeholder="0x..."
                  value={formData.sellerAddress}
                  onChange={e => setFormData({ ...formData, sellerAddress: e.target.value })}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="buyerAddress">Buyer Address</Label>
                <Input
                  id="buyerAddress"
                  placeholder="0x..."
                  value={formData.buyerAddress}
                  onChange={e => setFormData({ ...formData, buyerAddress: e.target.value })}
                  className="font-mono text-sm"
                  required
                />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Payment Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="totalPrice">Total Price</Label>
                  <Input
                    id="totalPrice"
                    type="number"
                    min="0"
                    placeholder="5000000"
                    value={formData.totalPrice}
                    onChange={e => setFormData({ ...formData, totalPrice: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paidUpfront">Paid Upfront</Label>
                  <Input
                    id="paidUpfront"
                    type="number"
                    min="0"
                    placeholder="1000000"
                    value={formData.paidUpfront}
                    onChange={e => setFormData({ ...formData, paidUpfront: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Lease End Date */}
              {formData.agreementType === 'lease' && (
                <div>
                  <Label htmlFor="leaseEndDate">Lease End Date</Label>
                  <Input
                    id="leaseEndDate"
                    type="date"
                    value={formData.leaseEndDate}
                    onChange={e => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Payment Schedule */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Payment Schedule
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addScheduleItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              {formData.schedule.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="1000000"
                      value={item.amount}
                      onChange={e => updateScheduleItem(index, 'amount', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Due in Days</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="30"
                      value={item.dueInDays}
                      onChange={e => updateScheduleItem(index, 'dueInDays', e.target.value)}
                      required
                    />
                  </div>
                  {formData.schedule.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeScheduleItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Agreement...
                </>
              ) : (
                'Create Agreement'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={`border-2 ${
          agreementStatus === 'DRAFT' ? 'border-yellow-400/30 bg-yellow-400/5' :
          agreementStatus === 'ACTIVE' ? 'border-blue-400/30 bg-blue-400/5' :
          agreementStatus === 'COMPLETED' ? 'border-green-400/30 bg-green-400/5' :
          agreementStatus === 'CANCELLED' ? 'border-red-400/30 bg-red-400/5' :
          agreementStatus === 'DEFAULTED' ? 'border-orange-400/30 bg-orange-400/5' :
          'border-status-active/30 bg-status-active/5'
        }`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              {agreementStatus === 'DRAFT' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {agreementStatus === 'ACTIVE' && <Zap className="h-5 w-5 text-blue-500" />}
              {agreementStatus === 'COMPLETED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {agreementStatus === 'CANCELLED' && <XCircle className="h-5 w-5 text-red-500" />}
              {agreementStatus === 'DEFAULTED' && <AlertCircle className="h-5 w-5 text-orange-500" />}
              <span className="font-medium">
                Agreement {agreementStatus === 'DRAFT' && '(DRAFT)'}
                {agreementStatus === 'ACTIVE' && '(ACTIVE)'}
                {agreementStatus === 'COMPLETED' && '(COMPLETED)'}
                {agreementStatus === 'CANCELLED' && '(CANCELLED)'}
                {agreementStatus === 'DEFAULTED' && '(DEFAULTED)'}
              </span>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">Agreement ID:</span>
                <p className="font-mono text-xs">{result.agreement_id || result.agreementId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Agreement Hash:</span>
                <p className="font-mono text-xs break-all">{result.agreement_hash || result.agreementHash}</p>
              </div>
              {agreementStatus !== 'DRAFT' && (
                <div>
                  <span className="text-muted-foreground">TX Hash:</span>
                  <p className="font-mono text-xs break-all">{agreementData?.tx_hash || result.tx_hash || 'Pending...'}</p>
                </div>
              )}
            </div>

            {/* Payment Schedule - show when there are installments */}
            {schedule && schedule.length > 0 && agreementStatus === 'ACTIVE' && (
              <div className="space-y-3 mb-4 pt-4 border-t border-border">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Payment Schedule
                </div>
                <div className="space-y-2">
                  {schedule.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-sm bg-background/50">
                      <input
                        type="checkbox"
                        checked={paidInstallments.has(index)}
                        onChange={() => handleMarkInstallmentPaid(index)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 text-xs">
                        <div>Amount: <span className="font-mono">{item.amount}</span></div>
                        <div>Due in: <span className="font-mono">{item.due_in_days} days</span></div>
                      </div>
                      {paidInstallments.has(index) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {agreementStatus === 'DRAFT' && (
                <Button 
                  onClick={handleActivateAgreement}
                  disabled={isActionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 col-span-2"
                >
                  {isActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Activate Agreement
                    </>
                  )}
                </Button>
              )}

              {agreementStatus === 'ACTIVE' && (
                <>
                  <Button 
                    onClick={handleCompleteAgreement}
                    disabled={isActionLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Complete
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleCancelAgreement}
                    disabled={isActionLoading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleDefaultAgreement}
                    disabled={isActionLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 col-span-2"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Mark as Default
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgreementCreatePanel;
