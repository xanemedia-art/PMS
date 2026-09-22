import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, Calendar, AlertCircle, Download, FileText, ChevronDown, ChevronUp, Layers, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { exportHotelRevenuePdf, exportAgentStatementPdf, exportProfitLossPdf } from '../utils/pdfExport';

interface ReportData {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  activeBookings: number;
  arrivalsToday: number;
  departuresToday: number;
  pendingBookings: number;
  dirtyRooms: number;
  dailyRevenue: number;
  allTimeRevenue: number;
  monthlyRevenue: { name: string; total: number }[];
  topAgents: { name: string; bookings: number; commission: number }[];
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // 1. Fetch general report dashboard data
  const { data, isLoading, error, refetch } = useQuery<ReportData>({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    staleTime: 60000, 
  });

  // 2. Fetch hotel details for branding the PDF report
  const { data: hotelInfo } = useQuery({
    queryKey: ['hotelSettings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/hotel', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch hotel settings');
      return res.json();
    },
    staleTime: 3600000, // 1 hour cached
  });

  // 3. Fetch detailed travel agents performance reports
  const { data: agentsReports = [], isLoading: agentsLoading } = useQuery<any[]>({
    queryKey: ['agentsReports'],
    queryFn: async () => {
      const res = await fetch('/api/reports/agents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch travel agents report');
      return res.json();
    },
    staleTime: 60000,
  });

  // 4. Fetch detailed financials (P&L) reports
  const { data: financialsData = null, isLoading: financialsLoading } = useQuery({
    queryKey: ['financialsReport'],
    queryFn: async () => {
      const res = await fetch('/api/reports/financials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch financials report');
      return res.json();
    },
    staleTime: 30000,
  });

  // 5. Fetch category-wise expenses report (exact previous month figures & breakdown)
  const { data: categoryExpensesData = null, isLoading: categoryExpensesLoading } = useQuery({
    queryKey: ['categoryExpenses', selectedExpenseMonth],
    queryFn: async () => {
      const url = selectedExpenseMonth 
        ? `/api/reports/expenses-by-category?month=${selectedExpenseMonth}` 
        : '/api/reports/expenses-by-category';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch category expenses report');
      return res.json();
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <div className="text-center">
          <p className="text-slate-900 font-bold text-lg">Failed to load reports</p>
          <p className="text-slate-500">{(error as any)?.message || 'Something went wrong'}</p>
        </div>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  const hotelDetails = hotelInfo || { name: 'Xane PMS Hotel', address: '123 Luxury Way, Paradise City' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">Detailed analytics, financial summaries, and travel agent statements.</p>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full sm:w-[600px] grid-cols-3 mb-6">
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="agents">Travel Agent Reports</TabsTrigger>
          <TabsTrigger value="financials">Financials (P&L)</TabsTrigger>
        </TabsList>

        {/* Tab 1: Revenue Reports */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-sm font-semibold text-slate-600">Export Overall Hotel Revenue Performance Sheet</span>
            <Button 
              onClick={() => exportHotelRevenuePdf(data, hotelDetails)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF Report</span>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(data.dailyRevenue || 0).toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">Expected today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All-time Revenue</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(data.allTimeRevenue || 0).toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">Paid invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Occupancy</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.occupancyRate}%</div>
                <p className="text-xs text-slate-500 mt-1">{data.occupiedRooms} out of {data.totalRooms} rooms</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Traffic</CardTitle>
                <Users className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.arrivalsToday + data.departuresToday}</div>
                <p className="text-xs text-slate-500 mt-1">{data.arrivalsToday} Arrivals, {data.departuresToday} Departures</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue across all properties (Last 6 Months)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Agents</CardTitle>
                <CardDescription>Agents by total bookings and revenue generated</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topAgents.length > 0 ? (
                   <div className="space-y-4 pt-2">
                     {data.topAgents.map((agent, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 font-medium">
                              {agent.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none">{agent.name}</p>
                              <p className="text-sm text-slate-500 mt-1">{agent.bookings} bookings</p>
                            </div>
                          </div>
                          <div className="font-medium text-emerald-600">
                            ₹{(agent.commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                     ))}
                   </div>
                ) : (
                  <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-md">
                    <Users className="w-8 h-8 mb-2 opacity-20" />
                    No agent data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Travel Agents Report */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Travel Agents Performance Listing</CardTitle>
              <CardDescription>Export detailed statements and booking lists for travel agents.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Total Stays Booked</TableHead>
                      <TableHead className="text-right">Total Revenue Generated</TableHead>
                      <TableHead className="text-right">Statement Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500 animate-pulse">
                          Loading agent statements...
                        </TableCell>
                      </TableRow>
                    ) : agentsReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                          No travel agents found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      agentsReports.map((report) => (
                        <TableRow key={report.agentId}>
                          <TableCell className="font-semibold text-slate-800">{report.name}</TableCell>
                          <TableCell className="text-slate-500">{report.email}</TableCell>
                          <TableCell className="text-center">{report.totalBookings}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            ₹{report.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 ml-auto"
                              onClick={() => exportAgentStatementPdf(report, hotelDetails)}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Export Statement (PDF)</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Financials (Profit & Loss) Reports */}
        <TabsContent value="financials" className="space-y-6 animate-in fade-in duration-300">
          {financialsLoading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse italic">
              Compiling Profit & Loss statement...
            </div>
          ) : financialsData ? (
            <div className="space-y-6">
              {/* PDF Exporter Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Profit & Loss Financial Statement</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Generate a complete audited PDF report of recorded incomes and expenses.</p>
                </div>
                <Button 
                  onClick={() => exportProfitLossPdf(financialsData, hotelDetails)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 self-start sm:self-auto shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Statement (PDF)</span>
                </Button>
              </div>

              {/* Summary stat cards */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                  <CardContent className="py-5 px-6 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Incomes (Revenue)</p>
                      <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                        ₹{financialsData.totals.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
                  <CardContent className="py-5 px-6 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses (Losses)</p>
                      <p className="text-3xl font-extrabold text-rose-600 mt-1">
                        ₹{financialsData.totals.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border border-slate-200 shadow-sm bg-gradient-to-br ${
                  financialsData.totals.profit >= 0 
                    ? 'from-blue-50/50 to-white' 
                    : 'from-amber-50/50 to-white'
                }`}>
                  <CardContent className="py-5 px-6 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      financialsData.totals.profit >= 0 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Profit / (Loss)</p>
                      <p className={`text-3xl font-extrabold mt-1 ${
                        financialsData.totals.profit >= 0 ? 'text-blue-600' : 'text-rose-600'
                      }`}>
                        ₹{financialsData.totals.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly visual chart */}
              {financialsData.monthly.length > 0 && (
                <Card className="border border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-800">Monthly Revenue vs Expense Trend</CardTitle>
                    <CardDescription>Visual comparison of monthly generated room billing invoices against recorded losses.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialsData.monthly.slice().reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E293B', color: '#FFF', borderRadius: '12px', border: 'none' }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                        />
                        <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Incomes (Revenue)" />
                        <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses (Losses)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Breakdown Tables */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Monthly P&L table */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Monthly Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">Month</TableHead>
                            <TableHead className="text-right">Income</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right pr-6">Profit / (Loss)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialsData.monthly.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6 text-slate-400 italic">
                                No records found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            financialsData.monthly.map((m: any) => (
                              <TableRow key={m.period} className="hover:bg-slate-50/50">
                                <TableCell className="pl-6 font-bold text-slate-800">{m.period}</TableCell>
                                <TableCell className="text-right font-medium text-slate-600">₹{m.income.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium text-rose-500">₹{m.expenses.toLocaleString()}</TableCell>
                                <TableCell className={`text-right font-bold pr-6 ${m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ₹{m.profit.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Yearly P&L table */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Yearly Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">Year</TableHead>
                            <TableHead className="text-right">Income</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right pr-6">Profit / (Loss)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialsData.yearly.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6 text-slate-400 italic">
                                No records found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            financialsData.yearly.map((y: any) => (
                              <TableRow key={y.period} className="hover:bg-slate-50/50">
                                <TableCell className="pl-6 font-bold text-slate-800">{y.period}</TableCell>
                                <TableCell className="text-right font-medium text-slate-600">₹{y.income.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium text-rose-500">₹{y.expenses.toLocaleString()}</TableCell>
                                <TableCell className={`text-right font-bold pr-6 ${y.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ₹{y.profit.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── CATEGORY-WISE EXPENSES SECTION (PREVIOUS MONTH DATA) ── */}
              <div className="pt-6 border-t border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-rose-500" />
                      <h3 className="text-lg font-bold text-slate-900">Category-Wise Expenses</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Exact cost breakdown by operational category with previous month comparison.
                    </p>
                  </div>

                  {/* Month Selector */}
                  {categoryExpensesData && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Period:</span>
                      <select 
                        value={selectedExpenseMonth || categoryExpensesData.targetMonth}
                        onChange={(e) => setSelectedExpenseMonth(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {categoryExpensesData.availableMonths.map((m: string) => {
                          const [y, mo] = m.split('-').map(Number);
                          const label = new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                          return (
                            <option key={m} value={m}>
                              {label} {m === categoryExpensesData.defaultMonth ? '(Default)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {categoryExpensesLoading ? (
                  <div className="h-40 flex items-center justify-center text-slate-400 italic text-sm">
                    Loading category expenses...
                  </div>
                ) : categoryExpensesData ? (
                  <div className="space-y-6">
                    {/* Summary Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {categoryExpensesData.targetMonthLabel} Expenses
                          </p>
                          <p className="text-2xl font-black text-rose-600 mt-1">
                            ₹{categoryExpensesData.targetTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Across {categoryExpensesData.categories.reduce((acc: number, c: any) => acc + c.count, 0)} expense vouchers
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Previous Month ({categoryExpensesData.priorMonthLabel})
                          </p>
                          <p className="text-2xl font-black text-slate-800 mt-1">
                            ₹{categoryExpensesData.priorTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {categoryExpensesData.overallPercentChange !== null ? (
                              categoryExpensesData.overallChange >= 0 ? (
                                <span className="text-xs font-bold text-rose-600 flex items-center">
                                  <ArrowUpRight className="w-3.5 h-3.5" /> +₹{categoryExpensesData.overallChange.toLocaleString()} (+{categoryExpensesData.overallPercentChange}%)
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-emerald-600 flex items-center">
                                  <ArrowDownRight className="w-3.5 h-3.5" /> -₹{Math.abs(categoryExpensesData.overallChange).toLocaleString()} ({categoryExpensesData.overallPercentChange}%)
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">No prior records</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Expense Driver</p>
                          <p className="text-xl font-bold text-slate-900 mt-1 capitalize truncate">
                            {categoryExpensesData.categories[0]?.category || 'None'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {categoryExpensesData.categories[0] 
                              ? `₹${categoryExpensesData.categories[0].totalAmount.toLocaleString()} (${categoryExpensesData.categories[0].percentage}% of total spend)`
                              : 'No recorded expenses'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Category Breakdown Table with Expandable Items */}
                    <Card className="border border-slate-200 shadow-sm overflow-hidden">
                      <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                            Category Cost Breakdown & Audit
                          </CardTitle>
                          <Badge variant="outline" className="text-xs font-bold font-mono">
                            {categoryExpensesData.categories.length} Categories
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-0">
                        {categoryExpensesData.categories.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 italic text-sm">
                            No expenses recorded for {categoryExpensesData.targetMonthLabel}.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {categoryExpensesData.categories.map((cat: any) => {
                              const isExpanded = expandedCategory === cat.category;
                              return (
                                <div key={cat.category} className="transition-colors hover:bg-slate-50/50">
                                  <div 
                                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                                    onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                                        {cat.category.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold text-slate-900 capitalize truncate">{cat.category}</p>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                                          </span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                          <div 
                                            className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${Math.min(100, cat.percentage)}%` }} 
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                                      <div className="text-right">
                                        <p className="text-sm font-extrabold text-slate-900">
                                          ₹{cat.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                                          {cat.percentage}% of month total
                                        </p>
                                      </div>

                                      <div className="text-right hidden sm:block">
                                        <p className="text-xs font-semibold text-slate-500">
                                          Prior: ₹{cat.priorAmount.toLocaleString()}
                                        </p>
                                        {cat.percentChange !== null ? (
                                          <p className={`text-[10px] font-bold ${cat.percentChange >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {cat.percentChange >= 0 ? `+${cat.percentChange}%` : `${cat.percentChange}%`}
                                          </p>
                                        ) : (
                                          <p className="text-[10px] text-slate-400">New</p>
                                        )}
                                      </div>

                                      <div className="text-slate-400 hover:text-slate-600">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expandable Itemized Vouchers Drawer */}
                                  {isExpanded && (
                                    <div className="px-6 pb-4 pt-1 bg-slate-50/80 border-t border-slate-100 animate-in fade-in duration-200">
                                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                                        Itemized Expenses in {cat.category}:
                                      </p>
                                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="hover:bg-transparent text-[11px]">
                                              <TableHead className="py-2 pl-4">Expense Title</TableHead>
                                              <TableHead className="py-2">Description</TableHead>
                                              <TableHead className="py-2">Date</TableHead>
                                              <TableHead className="py-2 text-right pr-4">Amount</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {cat.items.map((item: any) => (
                                              <TableRow key={item.id} className="text-xs">
                                                <TableCell className="pl-4 font-bold text-slate-800">{item.name}</TableCell>
                                                <TableCell className="text-slate-500">{item.description || '-'}</TableCell>
                                                <TableCell className="text-slate-400">
                                                  {new Date(item.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right pr-4 font-bold text-rose-600 font-mono">
                                                  ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic">
              Failed to load P&L statement. Please try again.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
