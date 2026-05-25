import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext';
import { Plus, TrendingDown, Receipt, Filter, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ExpensesPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));

  // Optimized fetching with React Query
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await fetch('/api/expenses', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['expensesTrend', filterDate],
    queryFn: async () => {
      const res = await fetch(`/api/expenses/trend?startDate=${filterDate}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch trend');
      return res.json();
    },
    staleTime: 300000,
  });

  // Mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesTrend'] });
      setOpen(false);
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesTrend'] });
      alert('Expense deleted successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  const handleAddExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    addExpenseMutation.mutate(data);
  };

  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Manage daily operational costs and track spending trends.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          } />
          <DialogContent>
            <form onSubmit={handleAddExpense}>
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>
                  Enter the details for the operational expense.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="name" className="text-left sm:text-right text-xs sm:text-sm">Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Electricity Bill" className="col-span-3" required />
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="type" className="text-left sm:text-right text-xs sm:text-sm">Type</Label>
                  <select
                    id="type"
                    name="type"
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Staff Wages">Staff Wages</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="amount" className="text-left sm:text-right text-xs sm:text-sm">Amount</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" className="col-span-3" required />
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                  <Label htmlFor="description" className="text-left sm:text-right text-xs sm:text-sm">Notes</Label>
                  <Input id="description" name="description" placeholder="Optional details..." className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addExpenseMutation.isPending}>
                  {addExpenseMutation.isPending ? 'Recording...' : 'Save Expense'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 mt-1">Current total operational costs</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Expense Trend</CardTitle>
              <CardDescription>Daily spending overview</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <Input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(str) => {
                      try {
                        return format(new Date(str), 'MMM d');
                      } catch {
                        return str;
                      }
                    }}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalAmount" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: "#ef4444" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-slate-400" />
            <CardTitle>Recent Entries</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {(user?.role === 'admin' || user?.role === 'manager') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesLoading ? (
                  <TableRow>
                    <TableCell colSpan={(user?.role === 'admin' || user?.role === 'manager') ? 6 : 5} className="text-center py-6 text-slate-500 animate-pulse">Loading expenses...</TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(user?.role === 'admin' || user?.role === 'manager') ? 6 : 5} className="text-center py-6 text-slate-500">No expense records found.</TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-slate-500">
                        {expense.createdAt ? format(new Date(expense.createdAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{expense.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {expense.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 max-w-[200px] truncate">{expense.description || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        -₹{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 h-8 w-8" 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete expense "${expense.name}"?`)) {
                                deleteExpenseMutation.mutate(expense.id);
                              }
                            }}
                            disabled={deleteExpenseMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
