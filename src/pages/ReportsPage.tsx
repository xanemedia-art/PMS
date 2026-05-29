import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, Calendar, AlertCircle, Download, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { exportHotelRevenuePdf, exportAgentStatementPdf } from '../utils/pdfExport';

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
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="agents">Travel Agent Reports</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
