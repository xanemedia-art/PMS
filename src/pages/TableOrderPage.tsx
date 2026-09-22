import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Coffee, Search, Plus, Minus, ShoppingBag, CheckCircle2, AlertCircle, 
  BedDouble, Key, ShieldCheck, Sparkles, X, ChevronRight, UtensilsCrossed, Bell
} from 'lucide-react';

interface MenuItem {
  id: number;
  hotelId: number;
  name: string;
  category: string;
  price: number;
  description?: string | null;
  isAvailable: boolean;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isCustom?: boolean;
}

export default function TableOrderPage() {
  const { slug, hotelId: paramHotelId, tableNumber: paramTableNumber } = useParams<{ slug?: string; hotelId?: string; tableNumber?: string }>();
  const [searchParams] = useSearchParams();

  const [resolvedHotelId, setResolvedHotelId] = useState<number | null>(paramHotelId ? parseInt(paramHotelId) : null);
  const [tableNumber, setTableNumber] = useState<string>(paramTableNumber || searchParams.get('table') || 'T-01');

  const [hotelInfo, setHotelInfo] = useState<any>(null);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Charge to Room Modal
  const [isChargeToRoomOpen, setIsChargeToRoomOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [guestPin, setGuestPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Success State
  const [orderSuccess, setOrderSuccess] = useState<{ message: string; type: 'table' | 'room' } | null>(null);

  // 1. Resolve slug to hotelId if needed
  useEffect(() => {
    if (slug) {
      fetch(`/api/public/hotel/s/${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.hotel) {
            setResolvedHotelId(data.hotel.id);
            setHotelInfo(data.hotel);
          }
        })
        .catch(err => console.error('Slug resolution failed:', err));
    }
  }, [slug]);

  // 2. Fetch table details, current bill, and live menu
  useEffect(() => {
    const targetHotelId = resolvedHotelId || (paramHotelId ? parseInt(paramHotelId) : 1);
    if (!targetHotelId || !tableNumber) return;

    setLoading(true);
    fetch(`/api/restaurant/public/table/${targetHotelId}/${encodeURIComponent(tableNumber)}`)
      .then(res => res.json())
      .then(data => {
        if (data.hotel) setHotelInfo(data.hotel);
        if (data.table) setTableInfo(data.table);
        if (Array.isArray(data.menu)) setMenu(data.menu);
      })
      .catch(err => console.error('Table fetch error:', err))
      .finally(() => setLoading(false));
  }, [resolvedHotelId, paramHotelId, tableNumber]);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map(m => m.category))).filter(Boolean);
    return ['All', ...cats];
  }, [menu]);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [menu, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.id === item.id);
      if (existing) {
        return prev.map(ci => ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => {
      return prev.map(ci => {
        if (ci.id === itemId) {
          const newQty = ci.quantity + delta;
          return newQty > 0 ? { ...ci, quantity: newQty } : null;
        }
        return ci;
      }).filter(Boolean) as CartItem[];
    });
  };

  const cartTotalCount = useMemo(() => cart.reduce((acc, ci) => acc + ci.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((acc, ci) => acc + (ci.price * ci.quantity), 0), [cart]);
  const foodGstRate = hotelInfo?.foodGstRate || 5.0;
  const foodGstAmount = useMemo(() => Math.round(cartSubtotal * (foodGstRate / 100)), [cartSubtotal, foodGstRate]);
  const cartGrandTotal = useMemo(() => cartSubtotal + foodGstAmount, [cartSubtotal, foodGstAmount]);

  // Regular Dine-In Order (Pay at Table)
  const handlePlaceTableOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const targetHotelId = resolvedHotelId || (paramHotelId ? parseInt(paramHotelId) : 1);
      const res = await fetch('/api/restaurant/public/table/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: targetHotelId,
          tableNumber,
          items: cart,
          totalAmount: cartGrandTotal,
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          notes: specialInstructions.trim() || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to place order');
      }

      setCart([]);
      setIsCartOpen(false);
      setOrderSuccess({
        message: `Your order for Table ${tableNumber} has been received by our kitchen! A server will bring your bill to the table.`,
        type: 'table'
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Charge to Room (Authenticated by Room Number + Guest PIN)
  const handleChargeToRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!roomNumber.trim() || !guestPin.trim()) {
      setAuthError('Please enter both your Room Number and Guest PIN.');
      return;
    }

    setSubmitting(true);
    try {
      const targetHotelId = resolvedHotelId || (paramHotelId ? parseInt(paramHotelId) : 1);
      const res = await fetch('/api/restaurant/public/table/charge-to-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: targetHotelId,
          tableNumber,
          roomNumber: roomNumber.trim(),
          guestPin: guestPin.trim(),
          items: cart,
          totalAmount: cartGrandTotal
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to charge to room');
      }

      setCart([]);
      setIsCartOpen(false);
      setIsChargeToRoomOpen(false);
      setRoomNumber('');
      setGuestPin('');
      setOrderSuccess({
        message: `Order confirmed! ₹${cartGrandTotal} has been successfully charged to Room ${roomNumber.trim()}. Enjoy your meal!`,
        type: 'room'
      });
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                {hotelInfo?.name || 'Hotel Dining'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider px-2 py-0 border-none">
                  {tableNumber}
                </Badge>
                <span className="text-[11px] text-slate-400 font-medium">Digital Table Menu</span>
              </div>
            </div>
          </div>

          {/* Quick Cart Trigger */}
          {cart.length > 0 && (
            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl h-10 px-4 shadow-lg shadow-amber-500/20 gap-2 flex items-center animate-in zoom-in duration-200"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{cartTotalCount} items</span>
              <span className="bg-slate-950/20 px-2 py-0.5 rounded-lg text-xs font-mono">
                ₹{cartGrandTotal}
              </span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1 pb-28">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search appetizers, chef mains, cocktails, desserts..."
            className="pl-11 pr-10 bg-slate-900/80 border-slate-800 text-white placeholder:text-slate-500 h-12 rounded-2xl focus-visible:ring-amber-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-2 animate-pulse">
            <Coffee className="w-8 h-8 mx-auto text-amber-500/50" />
            <p className="text-sm font-medium">Preparing fresh menu items...</p>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900/40 rounded-3xl border border-slate-850 p-8">
            <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No matching dishes found</p>
            <p className="text-xs text-slate-500">Try changing your search term or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMenu.map((item) => {
              const inCart = cart.find(ci => ci.id === item.id);
              return (
                <Card 
                  key={item.id} 
                  className="bg-slate-900/90 border-slate-800/80 hover:border-slate-750 transition-all rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-white text-base leading-snug">
                          {item.name}
                        </h3>
                        <span className="font-mono font-black text-amber-400 text-base shrink-0">
                          ₹{item.price}
                        </span>
                      </div>
                      <Badge className="bg-slate-800 text-slate-400 text-[10px] font-semibold border-none">
                        {item.category}
                      </Badge>
                      {item.description && (
                        <p className="text-xs text-slate-400 leading-relaxed pt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-850">
                      <span className="text-[11px] text-slate-500 font-medium">Chef Preparation</span>
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-850 hover:bg-slate-800 flex items-center justify-center text-slate-300"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono font-black text-xs text-amber-400">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-slate-950 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(item)}
                          size="sm"
                          className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-bold rounded-xl h-8 px-3 text-xs gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 font-bold border border-amber-300/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-black text-slate-900/80">
                  {cartTotalCount} Item(s) in Order
                </p>
                <p className="text-base font-black font-mono">
                  ₹{cartGrandTotal} <span className="text-[10px] font-normal opacity-75">(incl. GST)</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold rounded-xl h-10 px-5 gap-2 text-xs shadow-md"
            >
              Review & Order
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cart & Settlement Drawer Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              Table Order: {tableNumber}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Review your items and select how you would like to settle the bill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Items List */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-950/80 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.name}</p>
                    <p className="text-xs text-amber-400 font-mono">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-slate-950 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Requests */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Special Requests / Allergies</label>
              <Input
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Less spicy, dressing on side..."
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs h-10 rounded-xl"
              />
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Food Subtotal</span>
                <span className="font-mono text-white">₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Restaurant GST ({foodGstRate}%)</span>
                <span className="font-mono text-white">₹{foodGstAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-slate-850 pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-amber-400 text-base">₹{cartGrandTotal}</span>
              </div>
            </div>

            {/* Settlement Selection Buttons */}
            <div className="space-y-2.5 pt-2">
              <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 text-center">
                Select Order & Settlement Option
              </p>

              {/* Option A: Charge to Room */}
              <Button
                onClick={() => setIsChargeToRoomOpen(true)}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold h-12 rounded-xl flex items-center justify-between px-4 shadow-lg shadow-blue-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <BedDouble className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs font-black">Charge to My Room</p>
                    <p className="text-[10px] text-blue-200 font-normal">Hotel guests • Enter Room & PIN</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Option B: Pay at Table */}
              <Button
                onClick={handlePlaceTableOrder}
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold h-12 rounded-xl flex items-center justify-between px-4 shadow-lg shadow-amber-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <UtensilsCrossed className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs font-black">Order & Pay at Table</p>
                    <p className="text-[10px] text-slate-900/70 font-normal">Pay server by Cash, Card, or UPI</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Charge to Room PIN Authentication Modal */}
      <Dialog open={isChargeToRoomOpen} onOpenChange={setIsChargeToRoomOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white p-6 rounded-3xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-center">Charge to Hotel Room</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs text-center">
              Authenticate your stay to add this ₹{cartGrandTotal} order directly to your hotel folio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChargeToRoom} className="space-y-4 py-2">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Assigned Room Number</label>
              <div className="relative">
                <BedDouble className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101, 204"
                  className="pl-10 bg-slate-950 border-slate-800 text-white font-bold h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">4-Digit Guest PIN</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  value={guestPin}
                  onChange={(e) => setGuestPin(e.target.value)}
                  placeholder="PIN given at check-in"
                  className="pl-10 bg-slate-950 border-slate-800 text-white font-mono text-center tracking-widest text-lg h-11 rounded-xl"
                  maxLength={6}
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500">Provided on your keycard jacket or check-in SMS.</p>
            </div>

            <DialogFooter className="pt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChargeToRoomOpen(false)}
                className="w-full sm:w-auto bg-slate-800 border-slate-700 text-slate-300"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                {submitting ? 'Verifying...' : `Confirm & Charge ₹${cartGrandTotal}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Success Modal */}
      <Dialog open={!!orderSuccess} onOpenChange={() => setOrderSuccess(null)}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white p-6 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Order Received!</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {orderSuccess?.message}
            </p>
          </div>
          <Button
            onClick={() => setOrderSuccess(null)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl h-11"
          >
            Order More Items
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
