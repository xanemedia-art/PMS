import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Trash2, Download, User, Calendar, FileText, CheckCircle2, Calculator, Settings, ReceiptText, Landmark } from 'lucide-react';
import { exportGstInvoicePdf } from '../utils/pdfExport';

export default function BillingPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('inhouse');

  // Selected Booking state for Detail Bill View
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isBillDetailOpen, setIsBillDetailOpen] = useState(false);

  // Custom Expense Form state
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    amount: '',
    sacCode: '999799',
    gstRate: '18',
    quantity: '1'
  });

  // Check-out Dialog state
  const [checkoutBookingId, setCheckoutBookingId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    guestGstin: '',
    guestStateName: 'Maharashtra',
    guestStateCode: '27',
    transactionType: 'intra_state' // intra_state (CGST+SGST) | inter_state (IGST)
  });

  // Indian States & GST Codes list
  const stateCodes = [
    { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
    { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
    { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' }, { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' }, { code: '35', name: 'Andaman & Nicobar Islands' },
    { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
    { code: '38', name: 'Ladakh' }
  ];

  // Queries
  const { data: activeGuests = [], isLoading: activeLoading } = useQuery({
    queryKey: ['activeGuestsBilling'],
    queryFn: async () => {
      const res = await fetch('/api/billing/active', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch active guests billing');
      return res.json();
    }
  });

  const { data: invoicesList = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['finalizedInvoices'],
    queryFn: async () => {
      const res = await fetch('/api/billing/invoices', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch finalized invoices');
      return res.json();
    }
  });

  const { data: runningBill = null, isLoading: runningBillLoading } = useQuery({
    queryKey: ['runningBill', selectedBookingId],
    queryFn: async () => {
      if (!selectedBookingId) return null;
      const res = await fetch(`/api/billing/${selectedBookingId}/running-bill`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch running bill breakdown');
      return res.json();
    },
    enabled: !!selectedBookingId
  });

  // Mutations
  const addExpenseMutation = useMutation({
    mutationFn: async (expense: typeof expenseForm) => {
      const res = await fetch(`/api/billing/${selectedBookingId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(expense)
      });
      if (!res.ok) throw new Error('Failed to add custom expense');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runningBill', selectedBookingId] });
      queryClient.invalidateQueries({ queryKey: ['activeGuestsBilling'] });
      setExpenseForm({ name: '', amount: '', sacCode: '999799', gstRate: '18', quantity: '1' });
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      const res = await fetch(`/api/billing/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete custom expense');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runningBill', selectedBookingId] });
      queryClient.invalidateQueries({ queryKey: ['activeGuestsBilling'] });
    },
    onError: (err: any) => alert(err.message)
  });

  const checkoutMutation = useMutation({
    mutationFn: async (form: typeof checkoutForm) => {
      const res = await fetch(`/api/billing/${checkoutBookingId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Checkout processing failed');
      return res.json();
    },
    onSuccess: async (data) => {
      alert(`✓ Guest checked out successfully! Invoice: ${data.invoiceNumber}`);
      setIsCheckoutOpen(false);
      setIsBillDetailOpen(false);
      setCheckoutBookingId(null);
      setSelectedBookingId(null);
      queryClient.invalidateQueries({ queryKey: ['activeGuestsBilling'] });
      queryClient.invalidateQueries({ queryKey: ['finalizedInvoices'] });

      // Automatically download PDF of the generated invoice
      try {
        // Fetch invoice details list to feed the PDF generator
        const listRes = await fetch(`/api/billing/invoices`, { headers: { Authorization: `Bearer ${token}` } });
        if (listRes.ok) {
          const list = await listRes.json();
          const match = list.find((i: any) => i.invoiceNumber === data.invoiceNumber);
          if (match) {
            handleDownloadPdf(match.id);
          }
        }
      } catch (err) {
        console.error('Failed to trigger invoice PDF download', err);
      }
    },
    onError: (err: any) => alert(err.message)
  });

  // Trigger historical PDF export
  const handleDownloadPdf = async (invoiceId: number) => {
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      const invoiceData = await res.json();
      
      const invoiceObj = {
        invoiceNumber: invoiceData.invoice.invoiceNumber,
        issuedAt: invoiceData.invoice.issuedAt,
        baseAmount: invoiceData.invoice.baseAmount,
        extrasAmount: invoiceData.invoice.extrasAmount,
        taxAmount: invoiceData.invoice.taxAmount,
        totalAmount: invoiceData.invoice.totalAmount,
        gstin: invoiceData.invoice.gstin,
        billingStateName: invoiceData.invoice.billingStateName,
        billingStateCode: invoiceData.invoice.billingStateCode,
        guestGstin: invoiceData.invoice.guestGstin,
        guestStateName: invoiceData.invoice.guestStateName,
        guestStateCode: invoiceData.invoice.guestStateCode,
        cgstAmount: invoiceData.invoice.cgstAmount,
        sgstAmount: invoiceData.invoice.sgstAmount,
        igstAmount: invoiceData.invoice.igstAmount,
        transactionType: invoiceData.invoice.transactionType,
        hotelName: invoiceData.invoice.hotelName || runningBill?.hotel?.name || 'Xane Partner',
        hotelAddress: invoiceData.invoice.hotelAddress || runningBill?.hotel?.address || 'India'
      };

      exportGstInvoicePdf(invoiceObj, invoiceData.guest, invoiceData.items);
    } catch (err: any) {
      alert(`Could not generate invoice PDF: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Billing Control Hub</h1>
          <p className="text-gray-500">Manage checked-in guest folios, add dynamic room charges/extra services, and print Indian GST invoices.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="inhouse" className="gap-2">
            <Landmark className="w-4 h-4" /> In-House Guests (Folio)
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <ReceiptText className="w-4 h-4" /> Finalized Invoices
          </TabsTrigger>
        </TabsList>

        {/* IN-HOUSE GUESTS FOLIO LIST */}
        <TabsContent value="inhouse">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle>Folios of In-House Guests</CardTitle>
              <CardDescription>Manage expenses, food charges, and view real-time bill previews of checked-in guests.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Room / Category</TableHead>
                    <TableHead>Guest Details</TableHead>
                    <TableHead>Stay Duration</TableHead>
                    <TableHead className="text-right">Taxable base</TableHead>
                    <TableHead className="text-right">GST taxes</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400">Loading checked-in guest folios...</TableCell></TableRow>
                  ) : activeGuests.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">No guests currently checked in.</TableCell></TableRow>
                  ) : activeGuests.map((folio: any) => (
                    <TableRow key={folio.id} className="hover:bg-slate-50/50">
                      <TableCell className="pl-6">
                        <div className="font-semibold text-slate-800">Room {folio.roomNumber}</div>
                        <div className="text-xs text-slate-400 font-medium">{folio.roomTypeName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800">{folio.guestName}</div>
                        <div className="text-xs text-slate-500">{folio.guestPhone || 'No contact'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-700">
                          {new Date(folio.checkInDate).toLocaleDateString('en-IN')} - {new Date(folio.checkOutDate).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 font-semibold uppercase">{folio.nights} Night(s) / {folio.roomCount} Room(s)</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{Number(folio.totalTaxable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">₹{Number(folio.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">₹{Number(folio.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 border-slate-200 hover:bg-slate-100"
                            onClick={() => {
                              setSelectedBookingId(folio.id);
                              setIsBillDetailOpen(true);
                            }}
                          >
                            Manage Folio
                          </Button>
                          <Button 
                            variant="default"
                            size="sm"
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                            onClick={() => {
                              setCheckoutBookingId(folio.id);
                              // Populate default state based on guest GSTIN if any
                              setCheckoutForm({
                                guestGstin: '',
                                guestStateName: 'Maharashtra',
                                guestStateCode: '27',
                                transactionType: 'intra_state'
                              });
                              setIsCheckoutOpen(true);
                            }}
                          >
                            Check-out
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORICAL FINALIZED INVOICES */}
        <TabsContent value="history">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle>Historical Finalized Invoices</CardTitle>
              <CardDescription>View, print, and export GST-compliant invoice bills of checked-out guests.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Invoice No.</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Checkout Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400">Loading invoice history...</TableCell></TableRow>
                  ) : invoicesList.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">No finalized invoices found.</TableCell></TableRow>
                  ) : invoicesList.map((inv: any) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50">
                      <TableCell className="pl-6 font-bold text-slate-800">{inv.invoiceNumber}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{inv.guestName}</TableCell>
                      <TableCell className="font-medium text-slate-600">Room {inv.roomNumber || 'N/A'}</TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-slate-900">₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                          PAID
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleDownloadPdf(inv.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MANAGE FOLIO / BILL DETAILS DIALOG */}
      <Dialog open={isBillDetailOpen} onOpenChange={setIsBillDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Landmark className="w-5 h-5 text-blue-600" /> Guest Folio & Bill Preview
            </DialogTitle>
            <DialogDescription>
              Details for {runningBill?.booking?.guestName} (Room {runningBill?.items[0]?.description.split('Room ')[1]?.split(')')[0] || 'N/A'})
            </DialogDescription>
          </DialogHeader>

          {runningBillLoading ? (
            <div className="py-10 text-center text-slate-400">Loading running bill details...</div>
          ) : !runningBill ? (
            <div className="py-10 text-center text-slate-400">No bill data found.</div>
          ) : (
            <div className="space-y-6">
              {/* Hotel GST check alert */}
              {!runningBill.hotel.gstin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs flex gap-2 items-center">
                  <span className="font-bold">⚠️ Notice:</span> GST details are not configured for this property in Settings. GST calculations will default, but please configure GSTIN to generate compliant tax invoices.
                </div>
              )}

              {/* Folio Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Billing Item Description</TableHead>
                      <TableHead className="text-center">SAC Code</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Rate</TableHead>
                      <TableHead className="text-right">Taxable Val</TableHead>
                      <TableHead className="text-center">GST Rate</TableHead>
                      <TableHead className="text-right">GST Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runningBill.items.map((item: any, idx: number) => {
                      const totalItem = item.taxableValue + item.taxAmount;
                      return (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="font-medium text-slate-800 text-xs py-3 max-w-[240px] truncate" title={item.description}>
                            {item.description}
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-500 font-mono">{item.sacCode}</TableCell>
                          <TableCell className="text-center text-xs text-slate-700 font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-right text-xs">₹{item.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">₹{item.taxableValue.toFixed(2)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-500">{item.gstRate}%</TableCell>
                          <TableCell className="text-right text-xs font-medium text-amber-600">₹{item.taxAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-900">₹{totalItem.toFixed(2)}</TableCell>
                          <TableCell className="py-2 text-center">
                            {item.type === 'expense' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Remove this extra expense item "${item.description}"?`)) {
                                    deleteExpenseMutation.mutate(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Add Custom Expense form */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" /> Add Custom Expense to Bill
                </h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  addExpenseMutation.mutate(expenseForm);
                }} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px]">Expense Description</Label>
                    <Input 
                      placeholder="e.g. Airport Transfer, Laundry" 
                      value={expenseForm.name} 
                      onChange={e => setExpenseForm({...expenseForm, name: e.target.value})} 
                      required 
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">Amount (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 1500" 
                      value={expenseForm.amount} 
                      onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} 
                      required 
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px]">Qty</Label>
                    <Input 
                      type="number" 
                      value={expenseForm.quantity} 
                      onChange={e => setExpenseForm({...expenseForm, quantity: e.target.value})} 
                      required 
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">SAC Code</Label>
                    <Input 
                      value={expenseForm.sacCode} 
                      onChange={e => setExpenseForm({...expenseForm, sacCode: e.target.value})} 
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="sm:col-span-1.5 space-y-1">
                    <Label className="text-[11px]">GST %</Label>
                    <select
                      value={expenseForm.gstRate} 
                      onChange={e => setExpenseForm({...expenseForm, gstRate: e.target.value})}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1.5">
                    <Button 
                      type="submit" 
                      disabled={addExpenseMutation.isPending}
                      className="h-8 w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs"
                    >
                      {addExpenseMutation.isPending ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* GST Splits Summary */}
              <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between border-t border-slate-100 pt-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">GST State Codes</h4>
                  <p className="text-xs text-slate-500">
                    Hotel State: <span className="font-semibold text-slate-700">{runningBill.hotel.stateName || 'Goa'} (Code: {runningBill.hotel.stateCode || '30'})</span>
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full md:max-w-xs space-y-2.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Taxable Base Value:</span>
                    <span className="font-semibold text-slate-800">₹{runningBill.totals.taxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>GST Tax Amount:</span>
                    <span className="font-semibold text-amber-600">₹{runningBill.totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Est. Grand Total:</span>
                    <span>₹{runningBill.totals.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsBillDetailOpen(false)}>Close Folio</Button>
            <Button 
              type="button" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={() => {
                setCheckoutBookingId(runningBill?.booking?.id || null);
                setCheckoutForm({
                  guestGstin: '',
                  guestStateName: runningBill?.hotel?.stateName || 'Maharashtra',
                  guestStateCode: runningBill?.hotel?.stateCode || '27',
                  transactionType: 'intra_state'
                });
                setIsCheckoutOpen(true);
              }}
            >
              Proceed to Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINAL CHECK-OUT & TAX PREFERENCES DIALOG */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-lg font-bold">
              <Calculator className="w-5 h-5 text-blue-600" /> Invoice GST Preferences
            </DialogTitle>
            <DialogDescription>
              Configure Indian GST billing preferences for this recipient check-out.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            checkoutMutation.mutate(checkoutForm);
          }} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Guest GSTIN (Optional, for Corporate Credit Claims)</Label>
              <Input 
                placeholder="e.g. 27AAAAA1111A1Z1" 
                value={checkoutForm.guestGstin} 
                onChange={e => setCheckoutForm({...checkoutForm, guestGstin: e.target.value.toUpperCase()})}
              />
            </div>
            
            <div className="space-y-1">
              <Label>Place of Supply (Guest State)</Label>
              <select
                value={checkoutForm.guestStateCode}
                onChange={(e) => {
                  const match = stateCodes.find(s => s.code === e.target.value);
                  setCheckoutForm({
                    ...checkoutForm,
                    guestStateCode: e.target.value,
                    guestStateName: match ? match.name : 'Maharashtra',
                    // Auto switch to inter_state if state codes are different
                    transactionType: runningBill?.hotel?.stateCode && runningBill.hotel.stateCode !== e.target.value ? 'inter_state' : 'intra_state'
                  });
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
              >
                {stateCodes.map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>GST Transaction Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={checkoutForm.transactionType === 'intra_state' ? 'default' : 'outline'}
                  className="h-9 text-xs font-semibold"
                  onClick={() => setCheckoutForm({...checkoutForm, transactionType: 'intra_state'})}
                >
                  Intra-state (CGST + SGST)
                </Button>
                <Button
                  type="button"
                  variant={checkoutForm.transactionType === 'inter_state' ? 'default' : 'outline'}
                  className="h-9 text-xs font-semibold"
                  onClick={() => setCheckoutForm({...checkoutForm, transactionType: 'inter_state'})}
                >
                  Inter-state (IGST)
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 space-y-1.5">
              <div className="flex justify-between">
                <span>Hotel State Code:</span>
                <span className="font-semibold text-slate-700">{runningBill?.hotel?.stateCode || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Guest State Code:</span>
                <span className="font-semibold text-slate-700">{checkoutForm.guestStateCode}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-800">
                <span>Taxes splits:</span>
                <span>
                  {checkoutForm.transactionType === 'intra_state' ? 'CGST (50%) + SGST (50%)' : 'IGST (100%)'}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={checkoutMutation.isPending} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {checkoutMutation.isPending ? 'Processing Check-out...' : 'Confirm Checkout & Print Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
