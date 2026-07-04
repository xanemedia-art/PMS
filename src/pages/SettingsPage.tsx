import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Hotel, Database, Users, Trash2, Plus, Save, Key, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { user, token, login } = useAuth();
  const queryClient = useQueryClient();

  // Profile State
  const [profileData, setProfileData] = useState({ name: '', email: '', password: '' });
  
  // Hotel State
  const emptyHotelData = {
    name: '',
    address: '',
    gstin: '',
    billingStateName: '',
    billingStateCode: '',
    roomGstRate: '12.0',
    foodGstRate: '5.0',
    roomSacCode: '996311',
    foodSacCode: '99633'
  };
  const [hotelData, setHotelData] = useState(emptyHotelData);
  const [editingHotelId, setEditingHotelId] = useState<number | null>(null);
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);

  // Team State
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({ name: '', email: '', password: '', role: 'staff' });

  // Dialog States for Inventory
  const [isRoomTypeDialogOpen, setIsRoomTypeDialogOpen] = useState(false);
  const [editingRoomTypeId, setEditingRoomTypeId] = useState<number | null>(null);
  const [roomTypeData, setRoomTypeData] = useState({ 
    name: '', 
    price: '', 
    capacity: '', 
    imageUrl: '', 
    images: [] as string[],
    description: '',
    amenities: '' // Comma separated for input
  });
  
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [roomData, setRoomData] = useState({ number: '', roomTypeId: '' });

  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [planData, setPlanData] = useState({ name: '', price: '' });
  const [isUploading, setIsUploading] = useState(false);

  // Subscription State
  const { data: subscription = null, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch subscription status');
      return res.json();
    },
  });

  const [paying, setPaying] = useState(false);

  const handlePaySubscription = async () => {
    setPaying(true);
    try {
      // 1. Create Razorpay order on backend
      const orderRes = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderRes.json();

      // 2. Load Razorpay script dynamically
      const loadScript = (src: string) => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const isScriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!isScriptLoaded) {
        alert('Razorpay payment gateway failed to load. Check your internet connection.');
        setPaying(false);
        return;
      }

      // 3. Configure Razorpay options
      const options = {
        key: subscription.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Xane PMS',
        description: `PMS Subscription renewal for ${subscription.name}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // 4. Verify payment on backend
          try {
            const verifyRes = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (!verifyRes.ok) {
              throw new Error('Payment verification failed');
            }

            alert('✓ Payment Successful! Your subscription is active now.');
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            window.location.reload();
          } catch (err: any) {
            alert(err.message || 'Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: '#0f172a' // slate-900 cosmic dark
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      alert(err.message || 'Failed to initialize payment');
    } finally {
      setPaying(false);
    }
  };

  // --- QUERIES ---

  const { isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/settings/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfileData({ ...data, password: '' });
      return data;
    },
    staleTime: Infinity,
  });

  const { data: hotelsList = [], isLoading: hotelsLoading } = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => {
      const res = await fetch('/api/settings/hotels', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['roomTypes'],
    queryFn: async () => {
      const res = await fetch('/api/rooms/types', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await fetch('/api/settings/team', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: user?.role === 'admin',
  });

  const { data: subscriptionData, refetch: refetchSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: async () => {
      const res = await fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch subscription status');
      return res.json();
    },
  });

  // Dynamic Razorpay checkout script loading on component mount
  React.useEffect(() => {
    if (!window.hasOwnProperty('Razorpay')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const handlePayRenew = async () => {
    try {
      const res = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: subscriptionData?.subscriptionDues || 6000
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment order');
      }

      const orderData = await res.json();

      const options = {
        key: subscriptionData?.razorpayKeyId || 'rzp_live_SufeFLg6s8EJfH',
        amount: orderData.amount, // already in paise
        currency: orderData.currency,
        name: 'PMS Subscription',
        description: `Subscription Renewal for ${hotelsList.find((h: any) => h.id === user?.hotelId)?.name || 'Property'}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (!verifyRes.ok) {
              const err = await verifyRes.json();
              throw new Error(err.error || 'Payment verification failed');
            }

            alert('Subscription payment successfully verified and activated!');
            refetchSubscription();
            queryClient.invalidateQueries({ queryKey: ['hotels'] });
            window.location.reload();
          } catch (error: any) {
            alert('Verification Error: ' + error.message);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563EB',
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      alert('Payment Error: ' + error.message);
    }
  };

  const getDaysLeft = (endsAtStr: string | null) => {
    if (!endsAtStr) return 0;
    const endsAt = new Date(endsAtStr);
    const diffTime = endsAt.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // --- MUTATIONS ---

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      alert('Profile updated successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  const saveHotelMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingHotelId ? `/api/settings/hotels/${editingHotelId}` : '/api/settings/hotels';
      const method = editingHotelId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save property details');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      setIsHotelDialogOpen(false);
      setEditingHotelId(null);
      setHotelData(emptyHotelData);
      alert('Property details saved successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  const handleSwitchHotel = async (hotelId: number) => {
    try {
      const res = await fetch('/api/auth/switch-hotel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ hotelId })
      });
      const data = await res.json();
      if (data.token && data.user) {
        login(data.token, data.user);
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch hotel", err);
    }
  };

  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setIsTeamDialogOpen(false);
      setNewTeamMember({ name: '', email: '', password: '', role: 'staff' });
    },
    onError: (err: any) => alert(err.message)
  });

  const createRoomTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingRoomTypeId ? `/api/rooms/types/${editingRoomTypeId}` : '/api/rooms/types';
      const method = editingRoomTypeId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          amenities: data.amenities.split(',').map((s: string) => s.trim()).filter(Boolean)
        })
      });
      if (!res.ok) throw new Error('Failed to save room type');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      setIsRoomTypeDialogOpen(false);
      setEditingRoomTypeId(null);
      setRoomTypeData({ name: '', price: '', capacity: '', imageUrl: '', images: [], description: '', amenities: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create room');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsRoomDialogOpen(false);
      setRoomData({ number: '', roomTypeId: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsPlanDialogOpen(false);
      setPlanData({ name: '', price: '' });
    },
    onError: (err: any) => alert(err.message)
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setRoomTypeData(prev => ({ 
          ...prev, 
          imageUrl: prev.imageUrl || data.url, 
          images: [...prev.images, data.url] 
        }));
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteItemMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const res = await fetch(`/api/settings/${type}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete item');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.type === 'room-types') queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      if (variables.type === 'rooms') queryClient.invalidateQueries({ queryKey: ['rooms'] });
      if (variables.type === 'plans') queryClient.invalidateQueries({ queryKey: ['plans'] });
      if (variables.type === 'team') queryClient.invalidateQueries({ queryKey: ['team'] });
      if (variables.type === 'hotels') queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
    onError: (err: any) => alert(err.message)
  });

  // Helper to get room type name
  const getRoomTypeName = (id: number) => roomTypes.find((t: any) => t.id === id)?.name || 'Unknown';

  const isExpired = subscriptionData?.subscriptionStatus === 'expired';

  const [activeTab, setActiveTab] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('tab') || 'profile';
  });

  // Force active tab to billing if expired
  React.useEffect(() => {
    if (isExpired && activeTab !== 'billing') {
      setActiveTab('billing');
    }
  }, [isExpired, activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your profile, hotel, and team.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100/50 p-1 border border-slate-200">
          {!isExpired && (
            <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" /> Profile</TabsTrigger>
          )}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <>
              {!isExpired && (
                <>
                  <TabsTrigger value="hotel" className="gap-2"><Hotel className="w-4 h-4" /> Properties</TabsTrigger>
                  <TabsTrigger value="inventory" className="gap-2"><Database className="w-4 h-4" /> Inventory</TabsTrigger>
                </>
              )}
              <TabsTrigger value="billing" className="gap-2"><CreditCard className="w-4 h-4" /> Subscription & Billing</TabsTrigger>
            </>
          )}
          {user?.role === 'admin' && !isExpired && (
            <TabsTrigger value="team" className="gap-2"><Users className="w-4 h-4" /> Team</TabsTrigger>
          )}
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Manage your identity and security settings.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileData); }} className="space-y-6 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      value={profileData.name} 
                      onChange={e => setProfileData({...profileData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input 
                      type="email" 
                      value={profileData.email} 
                      onChange={e => setProfileData({...profileData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>New Password (Leave blank to keep current)</Label>
                  <div className="relative">
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={profileData.password} 
                      onChange={e => setProfileData({...profileData, password: e.target.value})}
                    />
                    <Key className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROPERTIES TAB */}
        <TabsContent value="hotel">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 py-4">
              <div>
                <CardTitle>Properties</CardTitle>
                <CardDescription>Manage hotels and properties in your chain.</CardDescription>
              </div>
              <Button onClick={() => {
                setEditingHotelId(null);
                setHotelData(emptyHotelData);
                setIsHotelDialogOpen(true);
              }} className="gap-2">
                <Plus className="w-4 h-4" /> Add Property
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Property Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotelsLoading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400">Loading properties...</TableCell></TableRow>
                    ) : hotelsList.map((hotelItem: any) => (
                      <TableRow key={hotelItem.id} className={user?.hotelId === hotelItem.id ? 'bg-blue-50/30' : ''}>
                        <TableCell className="pl-6 font-medium">
                          <div className="flex items-center gap-2">
                            {hotelItem.name}
                            {user?.hotelId === hotelItem.id && (
                              <Badge variant="default" className="text-[10px] py-0.5 px-1.5 font-bold">Active</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500">{hotelItem.address || 'No address'}</TableCell>
                        <TableCell className="text-right pr-6 flex justify-end gap-2 items-center">
                          {user?.hotelId !== hotelItem.id ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleSwitchHotel(hotelItem.id)}
                            >
                              Manage
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium px-3">Managing</span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 text-blue-500 hover:text-blue-600"
                            onClick={() => {
                              setEditingHotelId(hotelItem.id);
                              setHotelData({
                                name: hotelItem.name,
                                address: hotelItem.address || '',
                                gstin: hotelItem.gstin || '',
                                billingStateName: hotelItem.billingStateName || '',
                                billingStateCode: hotelItem.billingStateCode || '',
                                roomGstRate: (hotelItem.roomGstRate ?? 12.0).toString(),
                                foodGstRate: (hotelItem.foodGstRate ?? 5.0).toString(),
                                roomSacCode: hotelItem.roomSacCode || '996311',
                                foodSacCode: hotelItem.foodSacCode || '99633'
                              });
                              setIsHotelDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 h-8 w-8" 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the property "${hotelItem.name}"?`)) {
                                deleteItemMutation.mutate({ type: 'hotels', id: hotelItem.id });
                              }
                            }}
                            disabled={deleteItemMutation.isPending || user?.hotelId === hotelItem.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 py-4">
                <div>
                  <CardTitle className="text-lg">Room Types</CardTitle>
                  <CardDescription>Manage categories like Suite, Deluxe, etc.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsRoomTypeDialogOpen(true)}><Plus className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">Name</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!Array.isArray(roomTypes) || roomTypes.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-4 text-slate-400">No room types defined</TableCell></TableRow>
                        ) : roomTypes.map((type: any) => (
                          <TableRow key={type.id}>
                            <TableCell className="pl-6 font-medium">
                              <div className="flex items-center gap-3">
                                {type.imageUrl && <img src={type.imageUrl} className="w-8 h-8 rounded object-cover shadow-sm" />}
                                {type.name}
                              </div>
                            </TableCell>
                            <TableCell>₹{type.price}</TableCell>
                            <TableCell className="text-right pr-6 flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 text-blue-500 hover:text-blue-600"
                                onClick={() => {
                                  setEditingRoomTypeId(type.id);
                                  setRoomTypeData({
                                    name: type.name,
                                    price: type.price.toString(),
                                    capacity: type.capacity.toString(),
                                    imageUrl: type.imageUrl || '',
                                    images: (() => { try { return type.images ? JSON.parse(type.images) : []; } catch { return []; } })(),
                                    description: type.description || '',
                                    amenities: (() => { try { return type.amenities ? JSON.parse(type.amenities).join(', ') : ''; } catch { return ''; } })()
                                  });
                                  setIsRoomTypeDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-600 h-8 w-8" 
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete the room type "${type.name}"?`)) {
                                    deleteItemMutation.mutate({ type: 'room-types', id: type.id });
                                  }
                                }}
                                disabled={deleteItemMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 py-4">
                <div>
                  <CardTitle className="text-lg">Rooms</CardTitle>
                  <CardDescription>Specific units and assignments.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsRoomDialogOpen(true)}><Plus className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!Array.isArray(rooms) || rooms.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400">No rooms added</TableCell></TableRow>
                      ) : rooms.map((room: any) => (
                        <TableRow key={room.id}>
                          <TableCell className="pl-6 font-medium">{room.number}</TableCell>
                          <TableCell><Badge variant="secondary">{getRoomTypeName(room.roomTypeId)}</Badge></TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 h-8 w-8" 
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete room number ${room.number}?`)) {
                                  deleteItemMutation.mutate({ type: 'rooms', id: room.id });
                                }
                              }}
                              disabled={deleteItemMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm mt-6">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 py-4">
              <div>
                <CardTitle className="text-lg">Meal Plans</CardTitle>
                <CardDescription>Configure pricing for breakfast, half-board, etc.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsPlanDialogOpen(true)}><Plus className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Plan Name</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(plans) || plans.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400">No meal plans found</TableCell></TableRow>
                    ) : plans.map((plan: any) => (
                      <TableRow key={plan.id}>
                        <TableCell className="pl-6 font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.priceMultiplier}x</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 h-8 w-8" 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the meal plan "${plan.name}"?`)) {
                                deleteItemMutation.mutate({ type: 'plans', id: plan.id });
                              }
                            }}
                            disabled={deleteItemMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 py-4">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage staff accounts and permissions.</CardDescription>
              </div>
              <Button onClick={() => setIsTeamDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Member
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(team) && team.map((member: any) => (member.id !== user?.id) && (
                      <TableRow key={member.id}>
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <span className="text-xs text-slate-500">{member.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'manager' ? 'default' : 'secondary'} className="capitalize">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 h-8 w-8" 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete team member "${member.name}"?`)) {
                                deleteItemMutation.mutate({ type: 'team', id: member.id });
                              }
                            }}
                            disabled={deleteItemMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Current User indicator */}
                    {team.find((m: any) => m.id === user?.id) && (
                      <TableRow className="bg-slate-50/30">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name} <span className="text-xs font-normal text-slate-400 ml-1">(You)</span></span>
                            <span className="text-xs text-slate-500">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTION & BILLING TAB */}
        <TabsContent value="billing">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>Manage your property's subscription status, payments, and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {subscriptionLoading ? (
                <div className="text-center py-6 text-slate-500">Loading subscription details...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-slate-150 shadow-none bg-slate-50/50">
                      <CardContent className="pt-6">
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Plan</div>
                        <div className="text-2xl font-bold text-slate-900">₹6,000<span className="text-sm font-normal text-slate-500">/month</span></div>
                        <div className="text-xs text-slate-400 mt-1">Per property subscription plan</div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-150 shadow-none bg-slate-50/50">
                      <CardContent className="pt-6">
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Subscription Status</div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              subscriptionData?.subscriptionStatus === 'active' 
                                ? 'default' 
                                : subscriptionData?.subscriptionStatus === 'trialing'
                                ? 'outline'
                                : 'destructive'
                            }
                            className={`font-bold capitalize ${
                              subscriptionData?.subscriptionStatus === 'active' 
                                ? 'bg-emerald-600 hover:bg-emerald-600 text-white' 
                                : subscriptionData?.subscriptionStatus === 'trialing'
                                ? 'bg-indigo-600 hover:bg-indigo-600 text-white'
                                : 'bg-rose-600 hover:bg-rose-600 text-white'
                            }`}
                          >
                            {subscriptionData?.subscriptionStatus || 'trialing'}
                          </Badge>
                          {subscriptionData?.subscriptionEndsAt && (
                            <span className="text-sm font-medium text-slate-600">
                              ({getDaysLeft(subscriptionData.subscriptionEndsAt)} days left)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                          {subscriptionData?.subscriptionEndsAt 
                            ? `Renews/Expires: ${new Date(subscriptionData.subscriptionEndsAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
                            : 'No renewal date set'}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-150 shadow-none bg-slate-50/50">
                      <CardContent className="pt-6">
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Outstanding Dues</div>
                        <div className="text-2xl font-bold text-rose-600">
                          ₹{Number(subscriptionData?.subscriptionDues || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Pending payments due for billing cycle</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-blue-900">Renew or Pay Subscription</div>
                      <div className="text-sm text-blue-700">Quick checkout via Razorpay to instantly activate or extend your active subscription.</div>
                    </div>
                    <Button onClick={handlePayRenew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2">
                      <CreditCard className="w-4 h-4" /> Pay/Renew Subscription
                    </Button>
                  </div>

                  {/* Sub-properties list */}
                  <div className="space-y-3">
                    <div className="text-lg font-bold text-slate-900">Sub-Properties & Branches</div>
                    <p className="text-sm text-slate-500">Each sub-property is billed independently at the premium per-property flat rate.</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="pl-6">Property Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Billing Status</TableHead>
                            <TableHead>Days Left</TableHead>
                            <TableHead className="text-right pr-6">Dues (INR)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {hotelsList.filter((h: any) => h.parentId === user?.hotelId).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-6 text-slate-400 font-medium">
                                No sub-properties linked to this parent account.
                              </TableCell>
                            </TableRow>
                          ) : (
                            hotelsList.filter((h: any) => h.parentId === user?.hotelId).map((sub: any) => (
                              <TableRow key={sub.id}>
                                <TableCell className="pl-6 font-semibold text-slate-800">{sub.name}</TableCell>
                                <TableCell className="text-slate-500">{sub.address || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={sub.subscriptionStatus === 'active' ? 'default' : 'destructive'}
                                    className={`font-semibold capitalize ${
                                      sub.subscriptionStatus === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                                    }`}
                                  >
                                    {sub.subscriptionStatus || 'trialing'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-600 font-medium">
                                  {sub.subscriptionEndsAt ? `${getDaysLeft(sub.subscriptionEndsAt)} days` : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right pr-6 font-bold text-slate-800">
                                  ₹{Number(sub.subscriptionDues || 0).toLocaleString('en-IN')}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- DIALOGS --- */}

      {/* TEAM MEMBER DIALOG */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Create a new staff or manager account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addTeamMemberMutation.mutate(newTeamMember); }} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newTeamMember.name} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={newTeamMember.role}
                  onChange={e => setNewTeamMember({...newTeamMember, role: e.target.value})}
                >
                  <option value="front_desk">Front Desk</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="management">Management</option>
                  <option value="agent">Agent</option>
                  <option value="staff">Staff (Legacy)</option>
                  <option value="manager">Manager (Legacy)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newTeamMember.email} onChange={e => setNewTeamMember({...newTeamMember, email: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Initial Password</Label>
              <Input type="password" value={newTeamMember.password} onChange={e => setNewTeamMember({...newTeamMember, password: e.target.value})} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addTeamMemberMutation.isPending}>
                {addTeamMemberMutation.isPending ? 'Adding...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT ROOM TYPE DIALOG */}
      <Dialog open={isRoomTypeDialogOpen} onOpenChange={(open) => {
        setIsRoomTypeDialogOpen(open);
        if (!open) {
          setEditingRoomTypeId(null);
          setRoomTypeData({ name: '', price: '', capacity: '', imageUrl: '', images: [], description: '', amenities: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoomTypeId ? 'Edit Room Type' : 'Add Room Type'}</DialogTitle>
            <DialogDescription>Define the features and pricing for this category.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            createRoomTypeMutation.mutate(roomTypeData); 
          }} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Type Name</Label>
                <Input placeholder="e.g. Deluxe Suite" value={roomTypeData.name} onChange={e => setRoomTypeData({...roomTypeData, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Base Rate (₹)</Label>
                  <Input type="number" value={roomTypeData.price} onChange={e => setRoomTypeData({...roomTypeData, price: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" value={roomTypeData.capacity} onChange={e => setRoomTypeData({...roomTypeData, capacity: e.target.value})} required />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe the room features..."
                value={roomTypeData.description}
                onChange={e => setRoomTypeData({...roomTypeData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Amenities (Comma separated)</Label>
              <Input 
                placeholder="WiFi, AC, Minibar, Smart TV" 
                value={roomTypeData.amenities}
                onChange={e => setRoomTypeData({...roomTypeData, amenities: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Room Gallery (Multiple Images)</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('room-gallery-upload')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Add Image'}
                </Button>
                <input 
                  type="file" 
                  className="hidden" 
                  id="room-gallery-upload" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {roomTypeData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden group">
                    <img src={img} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setRoomTypeData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                    {idx === 0 && <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-[8px] text-white text-center py-0.5 font-bold uppercase">Main</div>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                 <Input 
                   placeholder="Or paste external image URL" 
                   className="flex-1"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       const val = (e.target as HTMLInputElement).value;
                       if (val) {
                         setRoomTypeData(prev => ({ ...prev, images: [...prev.images, val], imageUrl: prev.imageUrl || val }));
                         (e.target as HTMLInputElement).value = '';
                       }
                     }
                   }}
                 />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRoomTypeDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRoomTypeMutation.isPending}>
                {createRoomTypeMutation.isPending ? 'Saving...' : editingRoomTypeId ? 'Update Room Type' : 'Add Room Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD ROOM DIALOG */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>Assign a room number to a type.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createRoomMutation.mutate({
              number: roomData.number,
              roomTypeId: parseInt(roomData.roomTypeId)
            });
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input placeholder="e.g. 101" value={roomData.number} onChange={e => setRoomData({...roomData, number: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={roomData.roomTypeId}
                onChange={e => setRoomData({...roomData, roomTypeId: e.target.value})}
                required
              >
                <option value="">Select Type</option>
                {roomTypes.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} (₹{t.price})</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRoomDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRoomMutation.isPending}>
                {createRoomMutation.isPending ? 'Adding...' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD MEAL PLAN DIALOG */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal Plan</DialogTitle>
            <DialogDescription>Define a new pricing plan for meals.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createPlanMutation.mutate({
              name: planData.name,
              priceMultiplier: parseFloat(planData.price)
            });
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input placeholder="e.g. Breakfast Included" value={planData.name} onChange={e => setPlanData({...planData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Price Multiplier (e.g. 1.2 for 20% extra)</Label>
              <Input type="number" step="0.1" placeholder="1.0" value={planData.price} onChange={e => setPlanData({...planData, price: e.target.value})} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPlanMutation.isPending}>
                {createPlanMutation.isPending ? 'Adding...' : 'Add Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HOTEL DIALOG */}
      <Dialog open={isHotelDialogOpen} onOpenChange={(open) => {
        setIsHotelDialogOpen(open);
        if (!open) {
          setEditingHotelId(null);
          setHotelData(emptyHotelData);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHotelId ? 'Edit Property Details' : 'Add Property'}</DialogTitle>
            <DialogDescription>Define the details of this property.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            saveHotelMutation.mutate(hotelData);
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input placeholder="e.g. Fyra Resort" value={hotelData.name} onChange={e => setHotelData({...hotelData, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input placeholder="e.g. 123 Luxury Way" value={hotelData.address} onChange={e => setHotelData({...hotelData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input placeholder="e.g. 27AAAAA1111A1Z1" value={hotelData.gstin} onChange={e => setHotelData({...hotelData, gstin: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Billing State Name</Label>
                <Input placeholder="e.g. Maharashtra" value={hotelData.billingStateName} onChange={e => setHotelData({...hotelData, billingStateName: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>State Code</Label>
                <Input placeholder="e.g. 27" value={hotelData.billingStateCode} onChange={e => setHotelData({...hotelData, billingStateCode: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Room GST Rate (%)</Label>
                <Input type="number" step="0.1" value={hotelData.roomGstRate} onChange={e => setHotelData({...hotelData, roomGstRate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Food GST Rate (%)</Label>
                <Input type="number" step="0.1" value={hotelData.foodGstRate} onChange={e => setHotelData({...hotelData, foodGstRate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room SAC Code</Label>
                <Input value={hotelData.roomSacCode} onChange={e => setHotelData({...hotelData, roomSacCode: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Food SAC Code</Label>
                <Input value={hotelData.foodSacCode} onChange={e => setHotelData({...hotelData, foodSacCode: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsHotelDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveHotelMutation.isPending}>
                {saveHotelMutation.isPending ? 'Saving...' : editingHotelId ? 'Save Changes' : 'Create Property'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
