import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, UserCheck, Plus, Edit, Trash2, CheckCircle2, Clock, AlertTriangle, 
  DollarSign, Wallet, Phone, Mail, Building2, CreditCard, Sparkles, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function StaffPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  // Modals state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [payingStaff, setPayingStaff] = useState<any>(null);

  // Form state for add/edit staff
  const initialForm = {
    name: '',
    email: '',
    phone: '',
    designation: '',
    monthlySalary: '',
    salaryPayoutDay: '1',
    joiningDate: new Date().toISOString().split('T')[0],
    bankDetails: '',
    status: 'active'
  };
  const [staffForm, setStaffForm] = useState(initialForm);

  // Pay salary modal state
  const [payForm, setPayForm] = useState({
    month: '',
    paymentMethod: 'Bank Transfer',
    notes: '',
    recordInExpenses: true
  });

  // Query staff data
  const { data: staffData = null, isLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => {
      const res = await fetch('/api/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch staff list');
      return res.json();
    },
    staleTime: 30000
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add staff member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      queryClient.invalidateQueries({ queryKey: ['salaryAlerts'] });
      setIsAddStaffOpen(false);
      setStaffForm(initialForm);
    },
    onError: (err: any) => alert(err.message)
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update staff member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      queryClient.invalidateQueries({ queryKey: ['salaryAlerts'] });
      setEditingStaff(null);
    },
    onError: (err: any) => alert(err.message)
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove staff member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      queryClient.invalidateQueries({ queryKey: ['salaryAlerts'] });
    },
    onError: (err: any) => alert(err.message)
  });

  // Pay salary mutation
  const paySalaryMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`/api/staff/${id}/pay-salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to record salary payment');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      queryClient.invalidateQueries({ queryKey: ['salaryAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['financialsReport'] });
      queryClient.invalidateQueries({ queryKey: ['categoryExpenses'] });
      alert(`✅ ${data.message}`);
      setPayingStaff(null);
    },
    onError: (err: any) => alert(err.message)
  });

  const staffList = staffData?.staff || [];
  const summary = staffData?.summary || {
    totalStaff: 0,
    activeStaff: 0,
    totalMonthlySalary: 0,
    paidTotal: 0,
    dueTotal: 0,
    currentMonth: ''
  };

  const handleOpenEdit = (member: any) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      designation: member.designation,
      monthlySalary: member.monthlySalary.toString(),
      salaryPayoutDay: (member.salaryPayoutDay || 1).toString(),
      joiningDate: member.joiningDate || '',
      bankDetails: member.bankDetails || '',
      status: member.status || 'active'
    });
  };

  const handleOpenPay = (member: any) => {
    setPayingStaff(member);
    setPayForm({
      month: summary.currentMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      paymentMethod: 'Bank Transfer',
      notes: '',
      recordInExpenses: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff & Payroll</h1>
          <p className="text-slate-500 mt-1">Manage staff roster, track monthly compensation, and record salary payouts.</p>
        </div>
        <Button 
          onClick={() => {
            setStaffForm(initialForm);
            setIsAddStaffOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-xl shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{summary.activeStaff}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{summary.totalStaff} total registered</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Payroll</p>
              <p className="text-2xl font-black text-blue-700 mt-0.5">
                ₹{summary.totalMonthlySalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Commitment per month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid This Month</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">
                ₹{summary.paidTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Cleared salaries</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 shadow-sm ${summary.dueTotal > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white'}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
              summary.dueTotal > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salaries Due</p>
              <p className={`text-2xl font-black mt-0.5 ${summary.dueTotal > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                ₹{summary.dueTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting payout</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Roster Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Hotel Staff Roster</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Staff member profiles, roles, salary figures, and monthly settlement status.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {staffList.length} Staff Members
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent text-xs">
                  <TableHead className="pl-6">Staff Member</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Payout Day</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">
                      Loading staff roster...
                    </TableCell>
                  </TableRow>
                ) : staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No staff members added yet</p>
                      <p className="text-xs text-slate-400">Click "Add Staff Member" to set up your hotel staff and salary notifications.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((member: any) => (
                    <TableRow key={member.id} className="hover:bg-slate-50/50 text-sm">
                      <TableCell className="pl-6 font-bold text-slate-900">
                        <div>
                          <span>{member.name}</span>
                          <div className="flex items-center gap-3 text-xs text-slate-400 font-normal mt-0.5">
                            {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>}
                            {member.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-semibold border-none text-xs">
                          {member.designation}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-extrabold text-slate-900 font-mono">
                        ₹{Number(member.monthlySalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-semibold text-slate-600">
                          {member.salaryPayoutDay ? `${member.salaryPayoutDay}th of month` : '1st of month'}
                        </span>
                      </TableCell>

                      <TableCell>
                        {member.payoutStatus === 'paid' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid for {member.lastPaidMonth}
                          </Badge>
                        ) : member.payoutStatus === 'due' ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold flex items-center gap-1 w-fit animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Salary Due
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 border-slate-200 font-semibold w-fit">
                            Due in {member.daysUntilPayout} days
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm"
                            className={`h-8 font-bold text-xs ${
                              member.payoutStatus === 'paid' 
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                            onClick={() => handleOpenPay(member)}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            {member.payoutStatus === 'paid' ? 'Mark Again' : 'Pay Salary'}
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-slate-700"
                            onClick={() => handleOpenEdit(member)}
                            title="Edit Staff Member"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${member.name} from the staff roster?`)) {
                                deleteStaffMutation.mutate(member.id);
                              }
                            }}
                            title="Remove Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ADD / EDIT STAFF MODAL */}
      <Dialog 
        open={isAddStaffOpen || !!editingStaff} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddStaffOpen(false);
            setEditingStaff(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingStaff ? `Edit ${editingStaff.name}` : 'Add Staff Member'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record designation, monthly salary, and payout day for automated salary notifications.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editingStaff) {
                updateStaffMutation.mutate({ id: editingStaff.id, data: staffForm });
              } else {
                createStaffMutation.mutate(staffForm);
              }
            }} 
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Full Name *</Label>
                <Input 
                  placeholder="e.g. Ramesh Kumar"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Designation / Role *</Label>
                <Input 
                  placeholder="e.g. Head Chef, Front Desk"
                  value={staffForm.designation}
                  onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Monthly Salary (₹) *</Label>
                <Input 
                  type="number"
                  step="100"
                  placeholder="e.g. 25000"
                  value={staffForm.monthlySalary}
                  onChange={(e) => setStaffForm({ ...staffForm, monthlySalary: e.target.value })}
                  required
                  className="rounded-xl font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Salary Payout Day *</Label>
                <select 
                  value={staffForm.salaryPayoutDay}
                  onChange={(e) => setStaffForm({ ...staffForm, salaryPayoutDay: e.target.value })}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}th of every month</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Phone Number</Label>
                <Input 
                  placeholder="+91 98765 43210"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Email Address</Label>
                <Input 
                  type="email"
                  placeholder="ramesh@hotel.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">Bank / UPI Settlement Details</Label>
              <Input 
                placeholder="UPI ID (e.g. ramesh@okhdfcbank) or Bank Account & IFSC"
                value={staffForm.bankDetails}
                onChange={(e) => setStaffForm({ ...staffForm, bankDetails: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddStaffOpen(false);
                  setEditingStaff(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
              >
                {createStaffMutation.isPending || updateStaffMutation.isPending 
                  ? 'Saving...' 
                  : editingStaff ? 'Save Changes' : 'Add Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PAY SALARY MODAL */}
      <Dialog open={!!payingStaff} onOpenChange={(open) => !open && setPayingStaff(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Wallet className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-center text-slate-900">
              Record Salary Payout
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-slate-500">
              Clear monthly compensation for {payingStaff?.name} ({payingStaff?.designation}).
            </DialogDescription>
          </DialogHeader>

          {payingStaff && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                paySalaryMutation.mutate({
                  id: payingStaff.id,
                  data: payForm
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Monthly Salary</p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">
                    ₹{Number(payingStaff.monthlySalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase">Settlement Account</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1 max-w-[160px] truncate">
                    {payingStaff.bankDetails || 'Not specified (Cash/Manual)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Payment Period *</Label>
                  <Input 
                    type="month"
                    value={payForm.month}
                    onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}
                    required
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Payment Method *</Label>
                  <select 
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Transaction Notes / Reference (Optional)</Label>
                <Input 
                  placeholder="e.g. UTR #123456789"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              {/* Auto expense checkbox */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <input 
                  type="checkbox"
                  id="recordInExpenses"
                  checked={payForm.recordInExpenses}
                  onChange={(e) => setPayForm({ ...payForm, recordInExpenses: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="recordInExpenses" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Auto-record this payout under 'Salaries' in Expense Reports
                </Label>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setPayingStaff(null)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={paySalaryMutation.isPending}
                >
                  {paySalaryMutation.isPending ? 'Processing...' : 'Confirm Salary Payout'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
