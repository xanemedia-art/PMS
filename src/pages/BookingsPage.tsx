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
import { CalendarDays, BedDouble, CheckCircle2, XCircle, ChevronLeft, ChevronRight, User, Users, Coffee } from 'lucide-react';
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
    staleTime: 5000,
    refetchInterval: 10000, // Sync every 10 seconds
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    staleTime: 10000,
    refetchInterval: 30000, // Sync rooms every 30 seconds
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000, // Sync plans every minute
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
    guestPhone: '',
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
        map[r.roomTypeId] = { 
          id: r.roomTypeId, 
          name: r.roomType?.name || r.roomType || 'Unknown', 
          price: r.price,
          capacity: r.capacity || 2,
          imageUrl: r.imageUrl,
          images: (() => { try { return r.images ? JSON.parse(r.images) : []; } catch { return []; } })(),
          description: r.description || '',
          amenities: (() => { try { return r.amenities ? JSON.parse(r.amenities) : []; } catch { return []; } })()
        };
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
        guestName: '', guestEmail: '', guestPhone: '', roomTypeId: '', roomCount: '1', roomConfigs: [{ pax: 1, extraBeddings: 0, notes: '' }], planId: '', checkInDate: '', checkOutDate: '', agentCommission: ''
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
              <div className="bg-slate-900 px-8 py-6">
                <DialogTitle className="text-2xl font-bold text-white">New Reservation</DialogTitle>
                <DialogDescription className="text-slate-400 mt-1">
                  Secure a new stay for your guest. Complete all fields below.
                </DialogDescription>
              </div>
              
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
              }} className="px-8 py-6 space-y-8 bg-white">
                
                {/* Section: Guest Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-slate-800">Guest Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="guestName" className="text-xs font-bold uppercase tracking-wider text-slate-400">Guest Name</Label>
                      <Input id="guestName" placeholder="Full Name" value={formData.guestName} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })} required className="bg-slate-50 border-none focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guestEmail" className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</Label>
                      <Input id="guestEmail" type="email" placeholder="email@example.com" value={formData.guestEmail} onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })} className="bg-slate-50 border-none focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guestPhone" className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</Label>
                      <Input id="guestPhone" placeholder="+91 ..." value={formData.guestPhone} onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })} required className="bg-slate-50 border-none focus-visible:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Section: Stay Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <CalendarDays className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-slate-800">Stay Details</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="checkIn" className="text-xs font-bold uppercase tracking-wider text-slate-400">Check-In</Label>
                      <Input id="checkIn" type="date" value={formData.checkInDate} onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })} required className="bg-slate-50 border-none focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="checkOut" className="text-xs font-bold uppercase tracking-wider text-slate-400">Check-Out</Label>
                      <Input id="checkOut" type="date" value={formData.checkOutDate} onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })} required className="bg-slate-50 border-none focus-visible:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Section: Room & Plan */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <BedDouble className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-slate-800">Room & Inventory</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1 space-y-1.5">
                      <Label htmlFor="roomTypeId" className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</Label>
                      <select id="roomTypeId" value={formData.roomTypeId} onChange={(e) => setFormData({ ...formData, roomTypeId: e.target.value })} required className="flex h-10 w-full rounded-md border-none bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="" disabled>Select Type</option>
                        {uniqueRoomTypes.map((type: any) => <option key={type.id} value={type.id}>{type.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="roomCount" className="text-xs font-bold uppercase tracking-wider text-slate-400">No. Rooms</Label>
                      <Input id="roomCount" type="number" min="1" value={formData.roomCount} onChange={handleRoomCountChange} required className="bg-slate-50 border-none focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="planId" className="text-xs font-bold uppercase tracking-wider text-slate-400">Rate Plan</Label>
                      <select id="planId" value={formData.planId} onChange={(e) => setFormData({ ...formData, planId: e.target.value })} className="flex h-10 w-full rounded-md border-none bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Standard</option>
                        {plans.map((plan: any) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Room Configurations (Dynamic) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formData.roomConfigs.map((config, index) => (
                    <div key={index} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                         <h4 className="text-xs font-black uppercase text-blue-600">Room #{index + 1}</h4>
                         <Users size={14} className="text-blue-300" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">PAX</Label>
                          <Input type="number" min="1" className="h-8 text-xs bg-white border-none shadow-sm" value={config.pax} onChange={e => {
                            const newConfigs = [...formData.roomConfigs];
                            newConfigs[index].pax = parseInt(e.target.value) || 1;
                            setFormData({ ...formData, roomConfigs: newConfigs });
                          }} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Extra Beds</Label>
                          <Input type="number" min="0" className="h-8 text-xs bg-white border-none shadow-sm" value={config.extraBeddings} onChange={e => {
                            const newConfigs = [...formData.roomConfigs];
                            newConfigs[index].extraBeddings = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, roomConfigs: newConfigs });
                          }} required />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Special Request</Label>
                        <Input type="text" placeholder="e.g. Near Elevator" className="h-8 text-xs bg-white border-none shadow-sm" value={config.notes} onChange={e => {
                          const newConfigs = [...formData.roomConfigs];
                          newConfigs[index].notes = e.target.value;
                          setFormData({ ...formData, roomConfigs: newConfigs });
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {user?.role === 'agent' && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                    <Label htmlFor="commission" className="text-xs font-bold uppercase tracking-wider text-amber-600">Agent Commission (₹)</Label>
                    <Input id="commission" type="number" placeholder="Enter amount" value={formData.agentCommission} onChange={(e) => setFormData({ ...formData, agentCommission: e.target.value })} required className="bg-white border-none focus-visible:ring-amber-500" />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 text-slate-400 hover:text-slate-600">Discard</Button>
                  <Button type="submit" disabled={createBookingMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-200">
                    {createBookingMutation.isPending ? 'Processing...' : 'Confirm Reservation'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      <Tabs defaultValue={user?.role === 'agent' ? 'inventory' : 'list'} className="w-full">
        <TabsList className="mb-4">
          {user?.role === 'agent' && <TabsTrigger value="inventory">Room Inventory</TabsTrigger>}
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="availability">Room Availability</TabsTrigger>
        </TabsList>

        {user?.role === 'agent' && (
          <TabsContent value="inventory" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Agent Search Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-end gap-4">
               <div className="flex-1 space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-widest">Check-In</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-blue-500" />
                    <Input type="date" value={formData.checkInDate} onChange={e => setFormData({...formData, checkInDate: e.target.value})} className="pl-10 bg-slate-50 border-none h-11 rounded-xl" />
                  </div>
               </div>
               <div className="flex-1 space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-widest">Check-Out</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-blue-500" />
                    <Input type="date" value={formData.checkOutDate} onChange={e => setFormData({...formData, checkOutDate: e.target.value})} className="pl-10 bg-slate-50 border-none h-11 rounded-xl" />
                  </div>
               </div>
               <Button className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200">
                  Update Availability
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {uniqueRoomTypes.map((type: any) => (
                <div key={type.id} className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={type.imageUrl || (type.images?.[0]) || "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"} 
                      alt={type.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm">
                       <span className="text-lg font-black text-slate-900">₹{Number(type.price).toLocaleString('en-IN')}</span>
                       <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">/ Night</span>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{type.name}</h3>
                       <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <BedDouble size={20} />
                       </div>
                    </div>

                    <div className="flex items-center gap-6 mb-6">
                       <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded-lg"><Users size={12} className="text-slate-500" /></div>
                          <span className="text-xs font-bold text-slate-600">Up to {type.capacity} Guests</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded-lg"><Coffee size={12} className="text-slate-500" /></div>
                          <span className="text-xs font-bold text-slate-600">Official Rate</span>
                       </div>
                    </div>

                    <p className="text-slate-400 text-sm leading-relaxed mb-8 line-clamp-2 font-medium">
                       {type.description || `Experience the pinnacle of luxury in our meticulously designed ${type.name.toLowerCase()}. Featuring panoramic views and bespoke amenities.`}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                       {type.amenities?.slice(0, 3).map((a: string, i: number) => (
                         <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-500 border-none text-[10px] uppercase tracking-wider">{a}</Badge>
                       ))}
                    </div>

                    <Button 
                      className="w-full h-14 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl transition-all duration-300 group-hover:shadow-blue-200"
                      onClick={() => {
                        setFormData({ ...formData, roomTypeId: type.id.toString() });
                        setIsDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                         Reserve Now
                         <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

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
                      <h4 className="text-sm font-semibold text-slate-500">Phone</h4>
                      <p className="text-base font-medium">{selectedBooking.guestPhone || 'N/A'}</p>
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
                      <h4 className="text-sm font-semibold text-slate-500">Meal Plan</h4>
                      <p className="text-base font-medium">{selectedBooking.plan?.name || 'Room Only'}</p>
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
