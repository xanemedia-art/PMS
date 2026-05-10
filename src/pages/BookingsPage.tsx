import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, BedDouble, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function BookingsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [showArchive, setShowArchive] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Agent availability sheet state
  const todayStr = new Date().toISOString().split('T')[0];
  const [availDate, setAvailDate] = useState(todayStr);

  // List view filter state
  const [listDate, setListDate] = useState<string>('');

  // Queries
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
    staleTime: 300000,
  });

  const loading = bookingsLoading || roomsLoading || plansLoading;

  const availabilityRows = useMemo(() => {
    if (!rooms.length) return [];

    // Group rooms by room type
    const typeMap: Record<string, { typeName: string; typeId: number | null; roomIds: number[] }> = {};
    for (const room of rooms) {
      const typeName = room.roomType?.name || room.roomType || 'Unknown';
      if (!typeMap[typeName]) typeMap[typeName] = { typeName, typeId: room.roomTypeId || null, roomIds: [] };
      typeMap[typeName].roomIds.push(room.id);
    }

    // For each room type, count how many rooms are occupied on availDate
    return Object.values(typeMap).map(({ typeName, typeId, roomIds }) => {
      const total = roomIds.length;
      
      const occupiedByRoomId = roomIds.filter(rid => {
        return bookings.some((b: any) =>
          b.roomId === rid &&
          b.status !== 'cancelled' &&
          b.status !== 'checked_out' &&
          b.checkInDate <= availDate &&
          b.checkOutDate > availDate
        );
      }).length;

      const occupiedByRoomType = bookings.filter((b: any) => 
          !b.roomId &&
          b.roomTypeId === typeId &&
          b.status !== 'cancelled' &&
          b.status !== 'checked_out' &&
          b.checkInDate <= availDate &&
          b.checkOutDate > availDate
      ).reduce((sum: number, b: any) => sum + (b.roomCount || 1), 0);

      const occupied = occupiedByRoomId + occupiedByRoomType;
      const vacant = Math.max(0, total - occupied);
      return { typeName, total, occupied, vacant };
    });
  }, [rooms, bookings, availDate]);

  // Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    roomTypeId: '',
    roomCount: '1',
    roomConfigs: [{ pax: 1, extraBeddings: 0, notes: '' }],
    planId: '',
    checkInDate: '',
    checkOutDate: '',
    agentCommission: ''
  });

  const handleRoomCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Math.max(1, parseInt(e.target.value) || 1);
    setFormData(prev => {
      const newConfigs = [...prev.roomConfigs];
      while (newConfigs.length < count) {
        newConfigs.push({ pax: 1, extraBeddings: 0, notes: '' });
      }
      return { ...prev, roomCount: count.toString(), roomConfigs: newConfigs.slice(0, count) };
    });
  };

  const uniqueRoomTypes = useMemo(() => {
    const map: any = {};
    rooms.forEach((r: any) => {
      if (r.roomTypeId && !map[r.roomTypeId]) {
        map[r.roomTypeId] = { id: r.roomTypeId, name: r.roomType?.name || r.roomType || 'Unknown', price: r.price };
      }
    });
    return Object.values(map);
  }, [rooms]);

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create booking');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsDialogOpen(false);
      setFormData({
        guestName: '', guestEmail: '', roomTypeId: '', roomCount: '1', roomConfigs: [{ pax: 1, extraBeddings: 0, notes: '' }], planId: '', checkInDate: '', checkOutDate: '', agentCommission: ''
      });
    },
    onError: (err: any) => alert(err.message)
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, roomId }: any) => {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, roomId: roomId ? parseInt(roomId) : undefined })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update status');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      
      if (variables.status === 'checked_in') {
        const room = rooms.find((r: any) => r.id === data.roomId);
        alert(`✅ Guest successfully checked in.\n\nPlease direct them to: ${room?.number || data.roomNumber || data.roomId}`);
      }
    },
    onError: (err: any) => alert(err.message)
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    checked_in: 'bg-blue-100 text-blue-800',
    checked_out: 'bg-slate-100 text-slate-800',
  };

  const filteredBookings = bookings.filter((b: any) => {
    if (user?.role === 'agent' && b.bookedById !== user.id) return false;
    const isHistory = b.status === 'cancelled' || b.status === 'checked_out';
    const matchesArchive = showArchive ? isHistory : !isHistory;
    if (!matchesArchive) return false;
    if (listDate) return b.checkInDate <= listDate && b.checkOutDate > listDate;
    return true;
  });

  const getRoomDisplay = (booking: any) => {
    const isCheckedInOrOut = booking.status === 'checked_in' || booking.status === 'checked_out';
    if (isCheckedInOrOut && booking.roomId) {
      if (booking.roomNumber) return booking.roomNumber;
      const room = rooms.find((r: any) => r.id === booking.roomId);
      return room ? room.number : booking.roomId;
    } else {
      if (booking.roomTypeId) {
        const type = uniqueRoomTypes.find((t: any) => t.id === booking.roomTypeId) as any;
        return type ? type.name : 'Unknown Type';
      }
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bookings</h1>
          <p className="text-slate-500 mt-1">Manage guest reservations and forecast.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowArchive(!showArchive)}
            className={showArchive ? "bg-slate-100 text-slate-600 border-slate-200" : "text-slate-600"}
          >
            {showArchive ? "Back to Active" : "View History"}
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button>New Booking</Button>} />
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
                <DialogDescription>
                  Enter the booking details below. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createBookingMutation.mutate({
                  ...formData,
                  roomId: null,
                  roomTypeId: formData.roomTypeId ? parseInt(formData.roomTypeId) : null,
                  roomCount: parseInt(formData.roomCount),
                  planId: formData.planId ? parseInt(formData.planId) : null,
                  agentCommission: formData.agentCommission ? parseFloat(formData.agentCommission) : null
                });
              }}>
                <div className="grid gap-4 py-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guestName" className="font-medium text-sm text-slate-700">Guest Name</Label>
                      <Input
                        id="guestName"
                        placeholder="John Doe"
                        value={formData.guestName}
                        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestEmail" className="font-medium text-sm text-slate-700">Email Address</Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        placeholder="guest@example.com"
                        value={formData.guestEmail}
                        onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roomTypeId" className="font-medium text-sm text-slate-700">Room Type</Label>
                      <select
                        id="roomTypeId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.roomTypeId}
                        onChange={(e) => setFormData({ ...formData, roomTypeId: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select a room type</option>
                        {uniqueRoomTypes.map((type: any) => (
                          <option key={type.id} value={type.id}>
                            {type.name} (₹{Number(type.price || 0).toFixed(0)}/n)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomCount" className="font-medium text-sm text-slate-700">Number of Rooms</Label>
                      <Input
                        id="roomCount"
                        type="number"
                        min="1"
                        value={formData.roomCount}
                        onChange={handleRoomCountChange}
                        required
                      />
                    </div>
                  </div>

                  {formData.roomConfigs.map((config, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700">Room {index + 1} Configuration</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-medium text-sm text-slate-700">Guests (PAX)</Label>
                          <Input type="number" min="1" className="h-8 text-sm" value={config.pax} onChange={e => {
                            const newConfigs = [...formData.roomConfigs];
                            newConfigs[index].pax = parseInt(e.target.value) || 1;
                            setFormData({ ...formData, roomConfigs: newConfigs });
                          }} required />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-medium text-sm text-slate-700">Extra Beds</Label>
                          <Input type="number" min="0" className="h-8 text-sm" value={config.extraBeddings} onChange={e => {
                            const newConfigs = [...formData.roomConfigs];
                            newConfigs[index].extraBeddings = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, roomConfigs: newConfigs });
                          }} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium text-sm text-slate-700">Special Notes / Requests</Label>
                        <Input type="text" placeholder="e.g. Needs a crib, accessible room, etc." className="h-8 text-sm" value={config.notes} onChange={e => {
                          const newConfigs = [...formData.roomConfigs];
                          newConfigs[index].notes = e.target.value;
                          setFormData({ ...formData, roomConfigs: newConfigs });
                        }} />
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2">
                    <Label htmlFor="planId" className="font-medium text-sm text-slate-700">Room Plan / Package</Label>
                    <select
                      id="planId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.planId}
                      onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    >
                      <option value="">No Plan (Standard Rate)</option>
                      {plans.map((plan: any) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ({plan.priceMultiplier}x)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkIn" className="font-medium text-sm text-slate-700">Check In Date</Label>
                      <Input
                        id="checkIn"
                        type="date"
                        value={formData.checkInDate}
                        onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkOut" className="font-medium text-sm text-slate-700">Check Out Date</Label>
                      <Input
                        id="checkOut"
                        type="date"
                        value={formData.checkOutDate}
                        onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {user?.role === 'agent' && (
                    <div className="space-y-2">
                      <Label htmlFor="commission" className="font-medium text-sm text-slate-700">Expected Commission (₹)</Label>
                      <Input
                        id="commission"
                        type="number"
                        placeholder="e.g. 50"
                        value={formData.agentCommission}
                        onChange={(e) => setFormData({ ...formData, agentCommission: e.target.value })}
                        required
                      />
                    </div>
                  )}

                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createBookingMutation.isPending}>
                    {createBookingMutation.isPending ? 'Creating...' : 'Create Booking'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue={user?.role === 'agent' ? 'list' : 'list'} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="availability">Room Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="border border-slate-200 shadow-sm mb-4">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-base">Filter Bookings for:</span>
                  <span className="text-blue-600 font-bold text-base">
                    {listDate ? new Date(listDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'All Dates'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!listDate) { setListDate(todayStr); return; }
                      const d = new Date(listDate);
                      d.setDate(d.getDate() - 1);
                      setListDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <input
                    type="date"
                    value={listDate}
                    onChange={e => setListDate(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-slate-700 font-medium"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!listDate) { setListDate(todayStr); return; }
                      const d = new Date(listDate);
                      d.setDate(d.getDate() + 1);
                      setListDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => setListDate(todayStr)}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-600 border-slate-200 hover:bg-slate-50"
                    onClick={() => setListDate('')}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room / Type</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">Loading bookings...</TableCell>
                    </TableRow>
                  ) : filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                        {showArchive ? 'No history found.' : 'No active bookings found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking: any) => (
                      <TableRow 
                        key={booking.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <TableCell className="font-medium">
                          {booking.guestName}
                          <div className="text-xs text-slate-500 font-normal">
                            {booking.bookedBy?.role === 'agent' ? `By ${booking.bookedBy?.name || 'Agent'}` : 'By Staff'}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700">
                          {getRoomDisplay(booking)}
                        </TableCell>
                        <TableCell>{new Date(booking.checkInDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(booking.checkOutDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[booking.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          {booking.status === 'confirmed' && user?.role !== 'agent' && (
                            <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'checked_in' })}>
                              Check In {(!booking.roomId) ? '(Auto-Assign)' : ''}
                            </Button>
                          )}
                          {booking.status === 'checked_in' && user?.role !== 'agent' && (
                            <Button variant="default" size="sm" onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'checked_out' })}>Check Out</Button>
                          )}
                          {booking.status === 'pending' && user?.role !== 'agent' && (
                            <div className="relative inline-block text-left">
                              <select
                                className="h-8 rounded-md border border-amber-300 bg-amber-50 text-amber-700 text-xs px-2 pr-6 font-semibold shadow-sm focus:ring-2 focus:ring-amber-500 animate-pulse cursor-pointer appearance-none"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    updateStatusMutation.mutate({ bookingId: booking.id, status: e.target.value });
                                  }
                                }}
                                defaultValue=""
                                style={{
                                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b45309' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundSize: '1em 1em',
                                }}
                              >
                                <option value="" disabled>⚠️ Action Required</option>
                                <option value="confirmed" className="text-emerald-700 font-semibold bg-white">✅ Confirm Booking</option>
                                <option value="cancelled" className="text-red-700 font-semibold bg-white">❌ Reject Booking</option>
                              </select>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details Dialog */}
          <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Booking Details</DialogTitle>
                <DialogDescription>
                  Full information for {selectedBooking?.guestName}'s reservation.
                </DialogDescription>
              </DialogHeader>
              {selectedBooking && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Guest Name</h4>
                      <p className="text-base font-medium">{selectedBooking.guestName}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Email</h4>
                      <p className="text-base font-medium">{selectedBooking.guestEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Room / Type</h4>
                      <p className="text-base font-medium">{getRoomDisplay(selectedBooking)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Check In</h4>
                      <p className="text-base font-medium">{new Date(selectedBooking.checkInDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Check Out</h4>
                      <p className="text-base font-medium">{new Date(selectedBooking.checkOutDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Status</h4>
                      <Badge variant="outline" className={statusColors[selectedBooking.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                        {selectedBooking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">PAX</h4>
                      <p className="text-base font-medium">{selectedBooking.pax || 1}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Extra Beds</h4>
                      <p className="text-base font-medium">{selectedBooking.extraBeddings || 0}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Room Count</h4>
                      <p className="text-base font-medium">{selectedBooking.roomCount || 1}</p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-sm font-semibold text-slate-500">Notes</h4>
                      <p className="text-base font-medium text-slate-700">{selectedBooking.notes || 'None'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500">Booked By</h4>
                      <p className="text-base font-medium capitalize">{selectedBooking.bookedBy?.name || 'Unknown'} ({selectedBooking.bookedBy?.role || 'staff'})</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Room Availability Sheet ── */}
        <TabsContent value="availability">
          <div className="space-y-5">
            {/* Date picker header */}
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="py-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CalendarDays className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-base">Viewing availability for:</span>
                    <span className="text-blue-600 font-bold text-base">
                      {new Date(availDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date(availDate);
                        d.setDate(d.getDate() - 1);
                        setAvailDate(d.toISOString().split('T')[0]);
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <input
                      type="date"
                      value={availDate}
                      onChange={e => setAvailDate(e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-slate-700 font-medium"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date(availDate);
                        d.setDate(d.getDate() + 1);
                        setAvailDate(d.toISOString().split('T')[0]);
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => setAvailDate(todayStr)}
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary stat cards */}
            {!loading && availabilityRows.length > 0 && (() => {
              const totalRooms    = availabilityRows.reduce((s, r) => s + r.total, 0);
              const totalOccupied = availabilityRows.reduce((s, r) => s + r.occupied, 0);
              const totalVacant   = availabilityRows.reduce((s, r) => s + r.vacant, 0);
              return (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                    <CardContent className="py-4 px-5 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100">
                        <BedDouble className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Rooms</p>
                        <p className="text-2xl font-bold text-slate-800">{totalRooms}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-red-100 shadow-sm bg-gradient-to-br from-red-50 to-white">
                    <CardContent className="py-4 px-5 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-100">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Occupied</p>
                        <p className="text-2xl font-bold text-red-600">{totalOccupied}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="py-4 px-5 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Vacant</p>
                        <p className="text-2xl font-bold text-emerald-600">{totalVacant}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Availability sheet table */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 px-6 pt-5 border-b border-slate-100 bg-slate-50">
                <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                  <BedDouble className="w-4 h-4" />
                  Room Type Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-slate-400 animate-pulse italic">
                    Calculating availability...
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6">Room Type</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Occupied</TableHead>
                          <TableHead className="text-center">Vacant</TableHead>
                          <TableHead className="text-right pr-6">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availabilityRows.map((row, i) => (
                          <TableRow key={i} className="hover:bg-slate-50/50">
                            <TableCell className="pl-6 font-semibold text-slate-700">{row.typeName}</TableCell>
                            <TableCell className="text-center font-medium">{row.total}</TableCell>
                            <TableCell className="text-center text-red-500 font-bold">{row.occupied}</TableCell>
                            <TableCell className="text-center text-emerald-600 font-bold">{row.vacant}</TableCell>
                            <TableCell className="text-right pr-6">
                              {row.vacant > 0 ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Available</Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-400 border-red-100">Full</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
