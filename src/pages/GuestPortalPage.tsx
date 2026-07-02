import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Wifi, 
  Sparkles, 
  MessageSquare, 
  LogOut, 
  Send, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Clock, 
  Utensils, 
  ClipboardList, 
  CheckCircle2, 
  FileText, 
  Trash2, 
  ChevronRight,
  Edit
} from 'lucide-react';

export default function GuestPortalPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'roomservice' | 'housekeeping' | 'chat' | 'bill'>('home');
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cart / Room Service state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);

  // Bill state
  const [billDetails, setBillDetails] = useState<any>(null);
  const [billLoading, setBillLoading] = useState(false);

  // Housekeeping state
  const [housekeepingNotes, setHousekeepingNotes] = useState('');
  const [housekeepingSuccess, setHousekeepingSuccess] = useState(false);

  // Chat state
  const [chats, setChats] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getGuestToken = () => localStorage.getItem('guestToken');

  // Verify auth on mount
  useEffect(() => {
    const token = getGuestToken();
    const infoStr = localStorage.getItem('guestInfo');
    if (!token || !infoStr) {
      navigate('/guest/login');
      return;
    }
    setGuestInfo(JSON.parse(infoStr));
  }, [navigate]);

  // Fetch Booking Details & Menu & Guest Orders
  useEffect(() => {
    const token = getGuestToken();
    if (!token) return;

    const fetchData = async () => {
      try {
        // Booking
        const bookingRes = await fetch('/api/guest/booking', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingRes.ok) {
          const bData = await bookingRes.json();
          setBookingDetails(bData);
        }

        // Menu (scoped to guest menu)
        const menuRes = await fetch('/api/guest/menu', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (menuRes.ok) {
          const mData = await menuRes.json();
          setMenuItems(mData);
        }

        // Orders
        const ordersRes = await fetch('/api/guest/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          setGuestOrders(oData);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [guestInfo]);

  // Poll chats & orders
  useEffect(() => {
    const token = getGuestToken();
    if (!token) return;

    const refreshData = async () => {
      if (activeTab === 'chat') {
        try {
          const res = await fetch('/api/guest/chat', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const chatLogs = await res.json();
            setChats(chatLogs.reverse());
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (activeTab === 'roomservice') {
        try {
          const res = await fetch('/api/guest/orders', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const oData = await res.json();
            setGuestOrders(oData);
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (activeTab === 'bill') {
        try {
          if (!billDetails) {
            setBillLoading(true);
          }
          const res = await fetch('/api/guest/bill', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const bData = await res.json();
            setBillDetails(bData);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setBillLoading(false);
        }
      }
    };

    refreshData();
    const interval = setInterval(refreshData, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats]);

  const handleLogout = () => {
    localStorage.removeItem('guestToken');
    localStorage.removeItem('guestInfo');
    navigate('/guest/login');
  };

  // Cart operations
  const updateCartQty = (id: number, delta: number) => {
    setCart(prev => {
      const qty = (prev[id] || 0) + delta;
      const updated = { ...prev };
      if (qty <= 0) delete updated[id];
      else updated[id] = qty;
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((sum, [idStr, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(idStr));
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const handlePlaceOrder = async () => {
    const token = getGuestToken();
    const total = getCartTotal();
    if (!token || total === 0) return;

    const orderItems = Object.entries(cart).map(([idStr, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(idStr));
      return {
        name: item?.name,
        quantity: qty,
        price: item?.price
      };
    });

    try {
      const res = await fetch('/api/guest/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: orderItems, totalAmount: total })
      });

      if (res.ok) {
        setCart({});
        setOrderSuccess(true);
        // Refresh orders
        const ordersRes = await fetch('/api/guest/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          setGuestOrders(oData);
        }
        setTimeout(() => setOrderSuccess(false), 5000);
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (err) {
      alert('Error placing order.');
    }
  };

  // Edit Guest Order
  const handleOpenEditOrder = (order: any) => {
    setEditingOrder(order);
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    setEditingItems(items);
  };

  const handleSaveEditedOrder = async () => {
    if (!editingOrder) return;
    const token = getGuestToken();
    if (!token) return;

    if (editingItems.length === 0) {
      handleCancelOrder(editingOrder.id);
      return;
    }

    const total = editingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      const res = await fetch(`/api/guest/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: editingItems, totalAmount: total })
      });

      if (res.ok) {
        setEditingOrder(null);
        // Refresh orders
        const ordersRes = await fetch('/api/guest/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          setGuestOrders(oData);
        }
      } else {
        alert('Failed to update order');
      }
    } catch (err) {
      alert('Error updating order');
    }
  };

  // Cancel Guest Order
  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    const token = getGuestToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/guest/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setEditingOrder(null);
        // Refresh orders
        const ordersRes = await fetch('/api/guest/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          setGuestOrders(oData);
        }
      } else {
        alert('Failed to cancel order');
      }
    } catch (err) {
      alert('Error cancelling order');
    }
  };

  // Housekeeping Submit
  const handleHousekeepingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getGuestToken();
    if (!token) return;

    try {
      const res = await fetch('/api/guest/housekeeping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: housekeepingNotes })
      });

      if (res.ok) {
        setHousekeepingNotes('');
        setHousekeepingSuccess(true);
        setTimeout(() => setHousekeepingSuccess(false), 5000);
      } else {
        alert('Failed to submit housekeeping request.');
      }
    } catch (err) {
      alert('Error submitting request.');
    }
  };

  // Chat Send
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getGuestToken();
    if (!token || messageText.trim() === '') return;

    try {
      const res = await fetch('/api/guest/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: messageText })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setChats(prev => [...prev, newMsg]);
        setMessageText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex justify-center items-center text-[#1E2022] font-sans">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C5A880] mx-auto" />
          <p className="text-[#334155] italic font-medium tracking-wide">Entering Portal...</p>
        </div>
      </div>
    );
  }

  const hotelName = bookingDetails?.hotel?.name || 'Grand Luxury Hotel';
  const orderStatusColors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200/50',
    preparing: 'bg-blue-50 text-blue-700 border-blue-200/50',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    cancelled: 'bg-stone-100 text-stone-600 border-stone-200'
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E2022] flex flex-col font-sans max-w-md mx-auto relative shadow-2xl border-x border-[#EAE6DF]">
      
      {/* Header */}
      <header className="p-4 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-[#EAE6DF]">
        <div className="flex items-center gap-3">
          <div className="bg-[#C5A880]/10 p-2.5 rounded-2xl text-[#C5A880] border border-[#C5A880]/20">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight text-[#1E2022] uppercase">{hotelName}</h2>
            <p className="text-[11px] text-[#C5A880] font-semibold tracking-wider">Room {guestInfo?.roomNumber}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#334155] hover:text-red-650 hover:bg-red-50 rounded-xl">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Welcome banner */}
            <div className="bg-[#334155] p-6 rounded-3xl shadow-md relative overflow-hidden text-white border border-[#C5A880]/20">
              <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-4 translate-y-4">
                <Wifi className="w-48 h-48" />
              </div>
              <p className="text-[#C5A880] text-xs font-bold uppercase tracking-widest">Welcome Guest</p>
              <h1 className="text-2xl font-bold mt-1 tracking-tight text-[#FAF8F5]">Hello, {guestInfo?.guestName}</h1>
              <p className="text-[#FAF8F5]/80 text-xs mt-2 font-medium">Check-out: {bookingDetails?.booking?.checkOutDate}</p>
            </div>

            {/* WiFi Connection Widget */}
            <Card className="bg-white border-[#EAE6DF] shadow-sm rounded-3xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#C5A880]/15 text-[#C5A880] border border-[#C5A880]/25 rounded-2xl">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#1E2022]">Complimentary High-Speed Wi-Fi</h3>
                    <p className="text-xs text-[#334155]">Connect throughout the property</p>
                  </div>
                </div>
                
                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EAE6DF] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#334155] font-semibold">NETWORK</span>
                    <span className="font-mono font-bold text-[#C5A880]">Xane_Guest_WiFi</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-[#EAE6DF] pt-2">
                    <span className="text-[#334155] font-semibold">PASSWORD</span>
                    <span className="font-mono font-bold text-[#C5A880]">StayAtXane2026</span>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText('StayAtXane2026');
                    alert('Wi-Fi Password Copied to Clipboard!');
                  }}
                  className="w-full bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 text-[#334155] border border-[#EAE6DF] hover:border-[#C5A880] font-bold rounded-2xl text-xs h-11 transition-all"
                >
                  Copy WiFi Password
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-extrabold text-[#C5A880] tracking-widest ml-1">Premium Services</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('roomservice')}
                  className="bg-white p-5 rounded-3xl border border-[#EAE6DF] hover:border-[#C5A880] text-left space-y-3 shadow-sm hover:shadow transition-all"
                >
                  <div className="p-3 bg-[#C5A880]/10 text-[#C5A880] w-12 h-12 rounded-2xl flex items-center justify-center border border-[#C5A880]/20">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1E2022]">In-Room Dining</h4>
                    <p className="text-[10px] text-[#334155] mt-1 font-medium leading-relaxed">Order gourmet cuisine & beverages</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('housekeeping')}
                  className="bg-white p-5 rounded-3xl border border-[#EAE6DF] hover:border-[#C5A880] text-left space-y-3 shadow-sm hover:shadow transition-all"
                >
                  <div className="p-3 bg-[#C5A880]/10 text-[#C5A880] w-12 h-12 rounded-2xl flex items-center justify-center border border-[#C5A880]/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1E2022]">Housekeeping</h4>
                    <p className="text-[10px] text-[#334155] mt-1 font-medium leading-relaxed">Request amenities or room cleaning</p>
                  </div>
                </button>
              </div>

              <button 
                onClick={() => setActiveTab('chat')}
                className="w-full bg-white p-4 rounded-3xl border border-[#EAE6DF] hover:border-[#C5A880] flex items-center justify-between text-left shadow-sm hover:shadow transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#C5A880]/10 text-[#C5A880] rounded-2xl border border-[#C5A880]/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1E2022]">Live Chat Front Desk</h4>
                    <p className="text-[10px] text-[#334155] font-medium">Text us directly for instant assistance</p>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 bg-[#C5A880] rounded-full animate-ping mr-2" />
              </button>

              <button 
                onClick={() => setActiveTab('bill')}
                className="w-full bg-white p-4 rounded-3xl border border-[#EAE6DF] hover:border-[#C5A880] flex items-center justify-between text-left shadow-sm hover:shadow transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#C5A880]/10 text-[#C5A880] rounded-2xl border border-[#C5A880]/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1E2022]">My Bill & Statement</h4>
                    <p className="text-[10px] text-[#334155] font-medium">Real-time room charges and food bills</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C5A880]" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ROOM SERVICE (FOOD) */}
        {activeTab === 'roomservice' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#1E2022]">Room Service Menu</h1>
                <p className="text-xs text-[#334155] mt-1 font-medium">Prepared fresh by our chefs</p>
              </div>
              <Badge className="bg-[#C5A880]/15 text-[#C5A880] hover:bg-[#C5A880]/20 border border-[#C5A880]/20 font-bold px-3 py-1 text-[10px] tracking-wide rounded-full">
                15-30 Min Delivery
              </Badge>
            </div>

            {orderSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Order placed successfully! Sending to the kitchen.
              </div>
            )}

            {/* Menu Sections */}
            <div className="space-y-5">
              {['Starters', 'Mains', 'Drinks', 'Desserts'].map(cat => {
                const items = menuItems.filter(m => m.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-[#C5A880] tracking-widest ml-1">{cat}</h3>
                    <div className="space-y-3">
                      {items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-3xl border border-[#EAE6DF] flex justify-between items-center gap-4 shadow-sm">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-[#1E2022] truncate">{item.name}</h4>
                            <p className="text-[11px] text-[#334155] line-clamp-2 mt-1 leading-relaxed font-medium">{item.description}</p>
                            <p className="text-xs font-bold text-[#C5A880] mt-2">₹{Number(item.price).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE6DF] shrink-0">
                            {cart[item.id] ? (
                              <>
                                <button onClick={() => updateCartQty(item.id, -1)} className="p-1.5 text-[#334155] hover:text-[#C5A880] transition-colors">
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold text-[#1E2022] px-1.5">{cart[item.id]}</span>
                                <button onClick={() => updateCartQty(item.id, 1)} className="p-1.5 text-[#334155] hover:text-[#C5A880] transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => updateCartQty(item.id, 1)}
                                className="px-3.5 py-1.5 text-[11px] font-bold uppercase text-[#C5A880] hover:bg-white rounded-lg transition-all"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* List of active and past orders placed by the guest */}
            <div className="space-y-4 pt-6 border-t border-[#EAE6DF]">
              <h3 className="text-sm uppercase font-extrabold text-[#C5A880] tracking-widest ml-1">My Orders Status</h3>
              {guestOrders.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#334155] italic bg-white rounded-3xl border border-[#EAE6DF] shadow-sm">
                  You haven't placed any room service orders yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {guestOrders.map((order: any) => {
                    const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                    return (
                      <div key={order.id} className="bg-white p-4 rounded-3xl border border-[#EAE6DF] shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1E2022]">Order KOT #{order.id}</span>
                            <span className="text-[10px] text-[#334155] font-medium">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <Badge variant="outline" className={`font-bold capitalize text-[10px] px-2 py-0.5 rounded-full ${orderStatusColors[order.status as keyof typeof orderStatusColors] || ''}`}>
                            {order.status}
                          </Badge>
                        </div>

                        <ul className="space-y-1 text-xs text-[#334155] divide-y divide-[#FAF8F5] pt-1">
                          {parsedItems.map((itm: any, idx: number) => (
                            <li key={idx} className="flex justify-between py-1 font-medium">
                              <span>{itm.name} <strong className="text-[#C5A880]">x{itm.quantity}</strong></span>
                              <span className="font-mono">₹{(itm.price * itm.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex justify-between items-center pt-2 border-t border-[#EAE6DF] text-xs">
                          <div>
                            <span className="text-[10px] text-[#334155] uppercase font-bold">Total</span>
                            <p className="font-mono font-bold text-[#1E2022] text-sm">₹{Number(order.totalAmount).toFixed(2)}</p>
                          </div>

                          {order.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-[#C5A880]/30 text-[#C5A880] hover:bg-[#C5A880]/5 font-bold text-[11px] px-3 py-1 h-8 rounded-xl"
                                onClick={() => handleOpenEditOrder(order)}
                              >
                                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-[11px] px-3 py-1 h-8 rounded-xl"
                                onClick={() => handleCancelOrder(order.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart checkout footer */}
            {getCartTotal() > 0 && (
              <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-[#EAE6DF] z-40 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs text-[#334155] font-semibold">Cart Total</span>
                    <h3 className="text-base font-mono font-bold text-[#1E2022]">₹{getCartTotal().toFixed(2)}</h3>
                  </div>
                  <Button 
                    onClick={handlePlaceOrder} 
                    className="bg-[#C5A880] hover:bg-[#b0946d] text-white font-bold rounded-2xl px-6 flex items-center gap-2 h-11 transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" /> Place Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HOUSEKEEPING */}
        {activeTab === 'housekeeping' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#1E2022]">Housekeeping Services</h1>
              <p className="text-xs text-[#334155] mt-1 font-medium">Request instant service for your comfort</p>
            </div>

            {housekeepingSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Service request submitted! We will attend shortly.
              </div>
            )}

            {/* Presets */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-[#C5A880] tracking-widest ml-1">Quick Presets</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fresh Towels', icon: Sparkles },
                  { label: 'Clean My Room', icon: Clock },
                  { label: 'Bottle of Water', icon: Wifi },
                  { label: 'Extra Pillows', icon: ClipboardList }
                ].map(preset => (
                  <button 
                    key={preset.label}
                    type="button"
                    onClick={() => setHousekeepingNotes(preset.label)}
                    className="bg-white p-4 rounded-3xl border border-[#EAE6DF] hover:border-[#C5A880] text-left font-bold text-xs text-[#334155] shadow-sm hover:shadow transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleHousekeepingSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#334155] font-extrabold uppercase tracking-widest text-[10px] ml-1">Custom Notes / Request Details</Label>
                <textarea 
                  rows={4}
                  placeholder="e.g. Please bring two fresh towels and water bottles by 2:00 PM."
                  value={housekeepingNotes}
                  onChange={(e) => setHousekeepingNotes(e.target.value)}
                  required
                  className="w-full bg-white border border-[#EAE6DF] focus:ring-1 focus:ring-[#C5A880] focus:border-[#C5A880] outline-none rounded-2xl p-4 text-sm placeholder-slate-405 text-[#1E2022] shadow-sm transition-all"
                />
              </div>
              <Button type="submit" className="w-full bg-[#334155] hover:bg-[#1E2022] text-[#FAF8F5] font-bold h-11 rounded-2xl shadow-sm transition-all">
                Submit Request
              </Button>
            </form>
          </div>
        )}

        {/* TAB 4: CHAT */}
        {activeTab === 'chat' && (
          <div className="h-[70vh] flex flex-col justify-between animate-in fade-in duration-300 -mx-4 -my-4 p-4 bg-[#FAF8F5]">
            {/* Chat list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
              {chats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-white p-5 rounded-3xl border border-[#EAE6DF] text-[#C5A880] mb-3 shadow-sm">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-sm text-[#1E2022]">Front Desk Live Chat</h3>
                  <p className="text-xs text-[#334155] max-w-[200px] mt-1 font-medium leading-relaxed">Send a message to start chatting with hotel reception.</p>
                </div>
              ) : (
                chats.map((chat) => {
                  const isGuest = chat.sender === 'guest';
                  return (
                    <div key={chat.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-3 rounded-3xl text-xs leading-relaxed ${
                        isGuest 
                          ? 'bg-[#C5A880] text-white rounded-br-none shadow-sm' 
                          : 'bg-white text-[#1E2022] rounded-bl-none border border-[#EAE6DF] shadow-sm'
                      }`}>
                        <p className="font-semibold">{chat.message}</p>
                        <span className={`block text-[8px] text-right mt-1.5 ${isGuest ? 'text-white/80' : 'text-slate-400'}`}>
                          {new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex gap-2 border-t border-[#EAE6DF] pt-3 bg-[#FAF8F5]">
              <Input 
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
                className="bg-white border-[#EAE6DF] focus-visible:ring-[#C5A880] h-11 rounded-2xl text-xs text-[#1E2022]"
              />
              <Button type="submit" className="h-11 w-11 p-0 bg-[#C5A880] hover:bg-[#b0946d] text-white rounded-2xl shadow-sm flex items-center justify-center shrink-0 transition-all">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {/* TAB 5: MY BILL (STATEMENT) */}
        {activeTab === 'bill' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#1E2022]">My Statement of Account</h1>
              <p className="text-xs text-[#334155] mt-1 font-medium">Real-time running room statement & dues</p>
            </div>

            {billLoading && !billDetails ? (
              <div className="text-center py-10 text-xs text-[#334155] italic">Loading bill statement...</div>
            ) : !billDetails ? (
              <div className="text-center py-10 text-xs text-[#334155] italic bg-white rounded-3xl border border-[#EAE6DF]">
                Unable to load bill details.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Invoice Meta */}
                <div className="bg-white p-5 rounded-3xl border border-[#EAE6DF] shadow-sm space-y-3">
                  <div className="border-b border-[#FAF8F5] pb-2 flex justify-between items-center">
                    <span className="text-[10px] text-[#C5A880] font-extrabold uppercase tracking-wider">Stay Info</span>
                    <Badge className="bg-[#334155] text-white text-[9px] hover:bg-[#334155]/95">
                      {billDetails.booking?.status?.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[#334155] font-semibold uppercase">Guest</span>
                      <p className="font-bold text-[#1E2022] mt-0.5">{billDetails.booking?.guestName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#334155] font-semibold uppercase">Phone</span>
                      <p className="font-mono text-[#1E2022] mt-0.5">{billDetails.booking?.guestPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#334155] font-semibold uppercase">Check-In</span>
                      <p className="font-bold text-[#1E2022] mt-0.5">{billDetails.booking?.checkInDate}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#334155] font-semibold uppercase">Check-Out</span>
                      <p className="font-bold text-[#1E2022] mt-0.5">{billDetails.booking?.checkOutDate}</p>
                    </div>
                  </div>
                </div>

                {/* Bill Line Items */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#C5A880] tracking-widest ml-1">Charged Items</h3>
                  <div className="space-y-3">
                    {billDetails.items?.map((item: any, idx: number) => {
                      const finalItemAmount = item.taxableValue + item.taxAmount;
                      return (
                        <div key={idx} className="bg-white p-4 rounded-3xl border border-[#EAE6DF] shadow-sm space-y-2">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-[9px] border-[#C5A880]/30 text-[#C5A880] bg-[#C5A880]/5 uppercase font-bold py-0 rounded-md">
                                {item.type}
                              </Badge>
                              <p className="font-bold text-xs text-[#1E2022] mt-1 leading-relaxed">{item.description}</p>
                            </div>
                            <span className="font-mono font-bold text-xs text-[#1E2022] shrink-0">
                              ₹{finalItemAmount.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-[#334155] border-t border-[#FAF8F5] pt-1.5 font-medium">
                            <span>Qty: {item.quantity} @ ₹{item.rate.toFixed(2)}</span>
                            <span>Taxable: ₹{item.taxableValue.toFixed(2)} + GST ({item.gstRate}%): ₹{item.taxAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Running Totals Panel */}
                <Card className="border-[#C5A880]/20 bg-white shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="bg-[#C5A880]/5 border-b border-[#EAE6DF] py-3.5">
                    <CardTitle className="text-xs uppercase font-extrabold text-[#C5A880] tracking-wider">Statement Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3 text-xs font-medium">
                    <div className="flex justify-between text-[#334155]">
                      <span>Taxable Value (Subtotal)</span>
                      <span className="font-mono">₹{billDetails.totals?.taxable.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#334155]">
                      <span>Estimated GST</span>
                      <span className="font-mono">₹{billDetails.totals?.tax.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-[#1E2022] font-black text-sm pt-2 border-t border-[#EAE6DF]">
                      <span className="uppercase text-xs tracking-wider">Estimated Total Balance</span>
                      <span className="font-mono text-base text-[#C5A880]">₹{billDetails.totals?.amount.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-xs sm:max-w-md rounded-3xl bg-white border-[#EAE6DF]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1E2022]">Edit Order Ticket #{editingOrder?.id}</DialogTitle>
            <DialogDescription className="text-xs text-[#334155]">
              Adjust item quantities or remove items from your pending KOT order.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {editingItems.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-3 py-2 border-b last:border-0 border-[#FAF8F5] text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1E2022] truncate">{item.name}</p>
                  <p className="text-[10px] text-[#C5A880] font-mono">₹{Number(item.price).toFixed(2)} each</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-lg border-[#EAE6DF] hover:bg-[#FAF8F5]"
                    onClick={() => {
                      setEditingItems(prev => {
                        const updated = [...prev];
                        if (updated[idx].quantity > 1) {
                          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 };
                        }
                        return updated;
                      });
                    }}
                  >
                    <Minus className="w-3 h-3 text-[#334155]" />
                  </Button>
                  <span className="font-bold w-5 text-center text-[#1E2022]">{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-lg border-[#EAE6DF] hover:bg-[#FAF8F5]"
                    onClick={() => {
                      setEditingItems(prev => {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
                        return updated;
                      });
                    }}
                  >
                    <Plus className="w-3 h-3 text-[#334155]" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    onClick={() => {
                      setEditingItems(prev => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {editingItems.length === 0 && (
              <p className="text-xs text-[#334155] italic text-center py-4">No items remaining. Save will cancel order.</p>
            )}
          </div>

          <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-[#EAE6DF]">
            <span className="text-[#334155] uppercase text-[10px]">Updated Total</span>
            <span className="font-mono text-sm text-[#C5A880]">
              ₹{editingItems.reduce((sum, itm) => sum + itm.price * itm.quantity, 0).toFixed(2)}
            </span>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setEditingOrder(null)} className="rounded-xl text-xs h-9">
              Close
            </Button>
            <Button size="sm" onClick={handleSaveEditedOrder} className="bg-[#C5A880] hover:bg-[#b0946d] text-white font-bold rounded-xl text-xs h-9">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#EAE6DF] px-2 py-1.5 flex justify-around items-center z-40 shadow-lg">
        {[
          { id: 'home', label: 'WiFi', icon: Wifi },
          { id: 'roomservice', label: 'Food', icon: Utensils },
          { id: 'housekeeping', label: 'Service', icon: Sparkles },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'bill', label: 'My Bill', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center p-1.5 transition-all outline-none ${
                isActive 
                  ? 'text-[#C5A880] scale-105 font-bold' 
                  : 'text-[#334155] hover:text-[#C5A880]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-1 uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
