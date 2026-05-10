import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

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

  const { data, isLoading, error, refetch } = useQuery<ReportData>({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    staleTime: 600000, 
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Detailed analytics and financial reports for your hotel.</p>
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
            <CardDescription>Agents by commission and total bookings</CardDescription>
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
    </div>
  );
}
