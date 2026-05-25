import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wifi, Sparkles, MessageSquare, LogOut, Send, Plus, Minus, ShoppingCart, Clock, Utensils, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function GuestPortalPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'roomservice' | 'housekeeping' | 'chat'>('home');
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cart / Room Service state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

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

  // Fetch Booking Details & Menu
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

        // Menu
        const menuRes = await fetch('/api/restaurant/menu');
        if (menuRes.ok) {
          const mData = await menuRes.json();
          setMenuItems(mData);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [guestInfo]);

  // Polling Chats
  useEffect(() => {
    const token = getGuestToken();
    if (!token || activeTab !== 'chat') return;

    const fetchChats = async () => {
      try {
        const res = await fetch('/api/guest/chat', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const chatLogs = await res.json();
          // Chats come descending, reverse for chronological UI
          setChats(chatLogs.reverse());
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchChats();
    const interval = setInterval(fetchChats, 4000);
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
        setTimeout(() => setOrderSuccess(false), 5000);
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (err) {
      alert('Error placing order.');
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
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-white font-sans">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="text-slate-400 italic">Entering Portal...</p>
        </div>
      </div>
    );
  }

  const hotelName = bookingDetails?.hotel?.name || 'Grand Xane Hotel';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto relative shadow-2xl border-x border-slate-900">
      
      {/* Header */}
      <header className="p-4 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400 border border-blue-500/20">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-black text-sm tracking-tight">{hotelName}</h2>
            <p className="text-xs text-slate-400">Room {guestInfo?.roomNumber}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-red-400">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Welcome banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <Wifi className="w-48 h-48" />
              </div>
              <p className="text-blue-100 text-xs font-black uppercase tracking-wider">Current Guest</p>
              <h1 className="text-2xl font-black text-white mt-1">Hello, {guestInfo?.guestName}</h1>
              <p className="text-blue-100 text-xs mt-2 font-medium">Check-out: {bookingDetails?.booking?.checkOutDate}</p>
            </div>

            {/* WiFi Connection Widget */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-2xl">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Complimentary Wi-Fi</h3>
                    <p className="text-xs text-slate-400">High-speed connection</p>
                  </div>
                </div>
                
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold">NETWORK</span>
                    <span className="font-mono font-bold text-blue-400">Xane_Guest_WiFi</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-900 pt-2">
                    <span className="text-slate-500 font-bold">PASSWORD</span>
                    <span className="font-mono font-bold text-blue-400">StayAtXane2026</span>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText('StayAtXane2026');
                    alert('Wi-Fi Password Copied to Clipboard!');
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border-none font-bold rounded-xl text-xs h-10"
                >
                  Copy WiFi Password
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider ml-1">Services</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('roomservice')}
                  className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-blue-500/50 text-left space-y-3 transition"
                >
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 w-10 h-10 rounded-2xl flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Room Service</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Order food & drinks</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('housekeeping')}
                  className="bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-emerald-500/50 text-left space-y-3 transition"
                >
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 w-10 h-10 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Housekeeping</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Towels, pillows, cleaning</p>
                  </div>
                </button>
              </div>

              <button 
                onClick={() => setActiveTab('chat')}
                className="w-full bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">Live Chat Front Desk</h4>
                    <p className="text-[10px] text-slate-500">Need anything? Text us directly</p>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping mr-2" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ROOM SERVICE */}
        {activeTab === 'roomservice' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black">Room Service Menu</h1>
                <p className="text-xs text-slate-500 mt-0.5">Freshly prepared local dishes</p>
              </div>
              <Badge className="bg-blue-600/10 text-blue-400 border-none font-bold">15-30 Min Delivery</Badge>
            </div>

            {orderSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Order placed successfully! Sending to the kitchen.
              </div>
            )}

            {/* Menu Sections */}
            {['Starters', 'Mains', 'Drinks', 'Desserts'].map(cat => {
              const items = menuItems.filter(m => m.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider ml-1">{cat}</h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs truncate">{item.name}</h4>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                          <p className="text-xs font-black text-blue-400 mt-2">₹{Number(item.price).toFixed(2)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          {cart[item.id] ? (
                            <>
                              <button onClick={() => updateCartQty(item.id, -1)} className="p-1.5 text-slate-400 hover:text-white">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-white px-1.5">{cart[item.id]}</span>
                              <button onClick={() => updateCartQty(item.id, 1)} className="p-1.5 text-slate-400 hover:text-white">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => updateCartQty(item.id, 1)}
                              className="px-3 py-1.5 text-[10px] font-black uppercase text-blue-400 hover:bg-slate-900 rounded-lg transition"
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

            {/* Cart checkout footer */}
            {getCartTotal() > 0 && (
              <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-slate-900 border-t border-slate-800 z-40 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs text-slate-500">Cart Total</span>
                    <h3 className="text-base font-black text-white">₹{getCartTotal().toFixed(2)}</h3>
                  </div>
                  <Button onClick={handlePlaceOrder} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 flex items-center gap-2">
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
              <h1 className="text-xl font-black">Housekeeping</h1>
              <p className="text-xs text-slate-500 mt-0.5">Request quick service for your room</p>
            </div>

            {housekeepingSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Service request submitted! We will attend shortly.
              </div>
            )}

            {/* Presets */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider ml-1">Quick Presets</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fresh Towels', icon: Sparkles },
                  { label: 'Clean My Room', icon: Clock },
                  { label: 'Bottle of Water', icon: Wifi },
                  { label: 'Extra Pillows', icon: ClipboardList }
                ].map(preset => (
                  <button 
                    key={preset.label}
                    onClick={() => setHousekeepingNotes(preset.label)}
                    className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/40 text-left font-bold text-xs text-slate-200 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleHousekeepingSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400 font-bold uppercase tracking-wider text-[10px] ml-1">Custom Notes / Request Details</Label>
                <textarea 
                  rows={4}
                  placeholder="e.g. Please bring two fresh towels and water bottles by 2:00 PM."
                  value={housekeepingNotes}
                  onChange={(e) => setHousekeepingNotes(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none rounded-2xl p-4 text-sm placeholder-slate-600"
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/10">
                Submit Request
              </Button>
            </form>
          </div>
        )}

        {/* TAB 4: CHAT */}
        {activeTab === 'chat' && (
          <div className="h-[70vh] flex flex-col justify-between animate-in fade-in duration-300 -mx-4 -my-4 p-4 bg-slate-950">
            {/* Chat list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
              {chats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 text-slate-500 mb-3">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-300">Front Desk Live Chat</h3>
                  <p className="text-xs text-slate-500 max-w-[200px] mt-1">Send a message to start chatting with hotel reception.</p>
                </div>
              ) : (
                chats.map((chat) => {
                  const isGuest = chat.sender === 'guest';
                  return (
                    <div key={chat.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-3 rounded-3xl text-sm ${
                        isGuest 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                      }`}>
                        <p className="font-medium text-xs leading-relaxed">{chat.message}</p>
                        <span className="block text-[8px] text-slate-300/80 text-right mt-1.5">
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
            <form onSubmit={handleSendChat} className="flex gap-2 border-t border-slate-900 pt-3 bg-slate-950">
              <Input 
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
                className="bg-slate-900 border-slate-800 focus-visible:ring-blue-500 h-11 rounded-xl text-xs text-white"
              />
              <Button type="submit" className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

      </main>

      {/* Bottom Tab Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 backdrop-blur-md border-t border-slate-850 px-4 py-2 flex justify-around items-center z-40">
        {[
          { id: 'home', label: 'Home', icon: Wifi },
          { id: 'roomservice', label: 'Food', icon: Utensils },
          { id: 'housekeeping', label: 'Service', icon: Sparkles },
          { id: 'chat', label: 'Chat', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center p-1.5 transition ${isActive ? 'text-blue-500 scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-black mt-1 uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
