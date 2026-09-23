import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BedDouble, Users, CalendarCheck, Activity, Mail, Calendar, Info, 
  CreditCard, AlertTriangle, Wallet, ChevronRight, ArrowUpRight, DollarSign, Clock, CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface Booking {
  id: number;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  agentCommission?: number;
  roomNumber?: string;
  notes?: string;
  pax?: number;
  paymentStatus?: string;
  totalEstimatedAmount?: number;
  amountPaid?: number;
  paymentMethod?: string;
  bookedBy?: {
    name: string;
    role: string;
  };
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [selectedGuest, setSelectedGuest] = useState<Booking | null>(null);

  // Optimized fetching with React Query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats', user?.role],
    queryFn: async () => {
      const res = await fetch(user?.role === 'agent' ? '/api/agents/dashboard' : '/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: recentBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['recentBookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings?scope=live', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      return data.slice(-10).reverse() as Booking[];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Fetch all bookings for pending payments & agent reports widgets
  const { data: allBookings = [], isLoading: allBookingsLoading } = useQuery({
    queryKey: ['dashboardAllBookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings?scope=live', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json() as Promise<Booking[]>;
    },
    refetchInterval: 30000,
  });

  // Fetch staff salary alerts for property owners / managers
  const { data: salaryAlerts } = useQuery({
    queryKey: ['salaryAlerts'],
    queryFn: async () => {
      const res = await fetch('/api/staff/salary-alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return { totalPendingAmount: 0, pendingCount: 0, alerts: [] };
      return res.json();
    },
    enabled: user?.role === 'admin' || user?.role === 'manager' || user?.role === 'management',
    refetchInterval: 60000,
  });

  // Derived: Pending Guest Payments
  const pendingGuestBookings = React.useMemo(() => {
    return allBookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const isPayAtCheckout = b.paymentStatus === 'pay_at_checkout';
      const isPartial = b.paymentStatus === 'partial';
      const hasBalance = b.totalEstimatedAmount && (b.totalEstimatedAmount - (b.amountPaid || 0) > 0);
      return isPayAtCheckout || isPartial || hasBalance;
    });
  }, [allBookings]);

  const totalPendingGuestAmount = React.useMemo(() => {
    return pendingGuestBookings.reduce((acc, b) => {
      const due = (b.totalEstimatedAmount || 0) - (b.amountPaid || 0);
      return acc + (due > 0 ? due : (b.totalEstimatedAmount || 0));
    }, 0);
  }, [pendingGuestBookings]);

  // Derived: Agent Bookings & Pending Commission Reports
  const agentBookings = React.useMemo(() => {
    return allBookings.filter(b => {
      return (b.bookedBy?.role === 'agent' || (b.agentCommission && b.agentCommission > 0)) && b.status !== 'cancelled';
    });
  }, [allBookings]);

  const totalAgentCommission = React.useMemo(() => {
    return agentBookings.reduce((acc, b) => acc + (parseFloat(b.agentCommission as any) || 0), 0);
  }, [agentBookings]);

  const loading = statsLoading || bookingsLoading;
  const displayStats = stats || {
    occupancyRate: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    arrivalsToday: 0,
    departuresToday: 0,
    activeBookings: 0,
    pendingBookings: 0,
    dirtyRooms: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Live overview of your property status
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-mono">Real-time optimization active</span>
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-semibold shadow-sm gap-2"
          onClick={() => window.location.reload()}
        >
          <Activity className="w-4 h-4 text-blue-500" />
          Refresh Live Data
        </Button>
      </div>

      {/* Owner Salary Alert Notification */}
      {salaryAlerts && salaryAlerts.pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-400/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Monthly Staff Salaries Due</h3>
                <Badge className="bg-rose-500 text-white border-none text-[10px] uppercase font-black px-2 py-0.5">
                  {salaryAlerts.pendingCount} Pending
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Staff salary payout cycle requires attention. Total pending payroll: <strong className="text-rose-600 font-mono text-sm">₹{Number(salaryAlerts.totalPendingAmount || 0).toLocaleString('en-IN')}</strong>.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/staff')} 
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md gap-2 shrink-0 h-10 px-5"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            Review & Pay Staff
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <BedDouble className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '-' : `${displayStats.occupancyRate}%`}</div>
            <p className="text-xs text-slate-500 mt-1">
              {statsLoading ? '...' : `${displayStats.occupiedRooms} / ${displayStats.totalRooms} rooms occupied`}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => navigate('/bookings')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrivals Today</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '-' : displayStats.arrivalsToday}</div>
            <p className="text-xs text-slate-500 mt-1">Confirmed guests arriving today</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => navigate('/bookings')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departures Today</CardTitle>
            <CalendarCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '-' : displayStats.departuresToday}</div>
            <p className="text-xs text-slate-500 mt-1">Checked-in guests leaving today</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-House Guests</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '-' : displayStats.activeBookings}</div>
            <p className="text-xs text-slate-500 mt-1">Rooms occupied today</p>
          </CardContent>
        </Card>

        {/* Pending Payments KPI Card */}
        <Card 
          className="cursor-pointer hover:bg-amber-50/50 transition-colors border-amber-200 bg-amber-50/20"
          onClick={() => navigate('/bookings')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Pending Receivables</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ₹{Number(totalPendingGuestAmount).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {pendingGuestBookings.length} booking(s) with pending dues
            </p>
          </CardContent>
        </Card>

        {/* Agent Commission KPI Card */}
        <Card 
          className="cursor-pointer hover:bg-indigo-50/50 transition-colors border-indigo-200 bg-indigo-50/20"
          onClick={() => navigate('/agents')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-800">Agent Commission</CardTitle>
            <Wallet className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              ₹{Number(totalAgentCommission).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              {agentBookings.length} agent referral reservation(s)
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-orange-50 transition-colors border-orange-200 bg-orange-50/20"
          onClick={() => navigate('/bookings')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Pending Bookings</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statsLoading ? '-' : displayStats.pendingBookings || 0}</div>
            <p className="text-xs text-orange-500 mt-1">All pending bookings</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-red-50 transition-colors border-red-200 bg-red-50/20"
          onClick={() => navigate('/housekeeping')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Dirty Rooms</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statsLoading ? '-' : displayStats.dirtyRooms || 0}</div>
            <p className="text-xs text-red-500 mt-1">Housekeeping alert</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="col-span-1 md:col-span-7 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest reservations and status updates</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">{recentBookings.length} Logged</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {bookingsLoading ? (
                <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm animate-pulse italic">
                  Synchronizing bookings...
                </div>
              ) : recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-slate-100 hover:border-blue-200 hover:shadow-sm group"
                    onClick={() => setSelectedGuest(booking)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-600 group-hover:bg-blue-100 transition-colors">
                        {booking.guestName ? booking.guestName.charAt(0) : 'G'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{booking.guestName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 uppercase tracking-wider">{booking.status}</Badge>
                          {(booking as any).selfCheckInCompleted && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] h-4 px-1 font-bold inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Pre-Checked In
                            </Badge>
                          )}
                          <p className="text-xs text-slate-500">
                             {new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {booking.roomNumber ? `Room ${booking.roomNumber}` : 'Pending Assignment'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase">Room Status</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm italic">
                  No recent bookings found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments & Agent Pending Reports Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Widget 1: Pending Payments Section */}
        <Card className="border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 bg-amber-50/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Pending Payments</CardTitle>
                  <CardDescription className="text-xs">Guest reservations with outstanding balances</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 font-mono text-xs">
                {pendingGuestBookings.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {allBookingsLoading ? (
                <div className="h-[150px] flex items-center justify-center text-slate-400 text-xs italic animate-pulse">
                  Checking payment statuses...
                </div>
              ) : pendingGuestBookings.length > 0 ? (
                pendingGuestBookings.slice(0, 8).map((b) => {
                  const balanceDue = Math.max(0, (b.totalEstimatedAmount || 0) - (b.amountPaid || 0));
                  return (
                    <div 
                      key={b.id}
                      className="p-3 rounded-xl border border-slate-100 hover:border-amber-300 bg-white hover:bg-amber-50/20 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{b.guestName}</p>
                          <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 border-none uppercase font-semibold">
                            {b.paymentStatus === 'partial' ? 'Advance' : 'Pay at Checkout'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.roomNumber ? `Room ${b.roomNumber}` : 'Room unassigned'} • {new Date(b.checkInDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="text-xs font-bold text-rose-600 font-mono">
                            Due: ₹{Number(balanceDue || b.totalEstimatedAmount || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Paid: ₹{Number(b.amountPaid || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                          onClick={() => navigate('/bookings')}
                        >
                          Settle
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-slate-400 text-xs italic gap-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
                  All active guest reservations are fully settled!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Widget 2: Agents Pending Reports Section */}
        <Card className="border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 bg-indigo-50/40 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Agents Pending Reports</CardTitle>
                  <CardDescription className="text-xs">Agent referrals and commission balances</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-indigo-300 text-indigo-800 bg-indigo-50 font-mono text-xs">
                ₹{Number(totalAgentCommission).toLocaleString('en-IN')} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {allBookingsLoading ? (
                <div className="h-[150px] flex items-center justify-center text-slate-400 text-xs italic animate-pulse">
                  Loading agent records...
                </div>
              ) : agentBookings.length > 0 ? (
                agentBookings.slice(0, 8).map((b) => (
                  <div 
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {b.bookedBy?.name || 'Agent Referral'}
                        </p>
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-indigo-100 text-indigo-800 border-none uppercase font-semibold">
                          Agent
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Guest: {b.guestName} • {b.roomNumber ? `Room ${b.roomNumber}` : 'Stay active'}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-indigo-700 font-mono">
                          Comm: ₹{Number(b.agentCommission || 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase">
                          {b.status}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={() => navigate('/agents')}
                      >
                        Reports
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-slate-400 text-xs italic gap-1">
                  <Users className="w-8 h-8 text-slate-300 mb-1" />
                  No pending agent commission referrals found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedGuest} onOpenChange={(open) => !open && setSelectedGuest(null)}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="bg-slate-900 p-6 text-white">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl font-bold shadow-lg">
                  {selectedGuest?.guestName?.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">{selectedGuest?.guestName}</DialogTitle>
                  <DialogDescription className="text-slate-400 font-medium">
                    Booking ID: #{selectedGuest?.id}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-xs uppercase font-bold">
                  {selectedGuest?.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room</p>
                <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   <BedDouble className="w-4 h-4 text-blue-500" />
                   {selectedGuest?.roomNumber || 'Not Assigned'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-200">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedGuest?.guestEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration of Stay</p>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Check-In</p>
                      <p className="text-xs font-bold text-slate-900">{selectedGuest ? new Date(selectedGuest.checkInDate).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="w-8 h-px bg-slate-200" />
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Check-Out</p>
                      <p className="text-xs font-bold text-slate-900">{selectedGuest ? new Date(selectedGuest.checkOutDate).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guests</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedGuest?.pax || 1} Pax</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Info className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes</p>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[100px]">{selectedGuest?.notes || 'None'}</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" className="w-full rounded-xl font-bold text-slate-600" onClick={() => setSelectedGuest(null)}>
              Close Details
            </Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold" onClick={() => navigate('/bookings')}>
              Manage Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
