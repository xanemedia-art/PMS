import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoomCard from '../components/booking-engine/RoomCard';
import { Calendar as CalendarIcon, Tag, BedDouble, ChevronRight, MapPin, Star, ShieldCheck, Mail, User, Phone, Users, Coffee, XCircle, Hotel } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface RoomType {
  id: string;
  roomTypeId: number;
  planId: number | null;
  name: string;
  capacity: number;
  price: number;
  availableCount: number;
  imageUrl: string | null;
  images?: string[];
  description?: string;
  amenities?: string[];
}

interface Plan {
  id: number;
  name: string;
  priceMultiplier: number;
}

interface HotelInfo {
  name: string;
  address: string | null;
}

export default function BookingEnginePage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  const [checkIn, setCheckIn] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const navigate = useNavigate();
  const [properties, setProperties] = useState<{ id: number; name: string; address: string | null }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/public/hotels')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProperties(data);
        }
      })
      .catch(err => console.error("Failed to fetch hotels", err));
  }, []);

  useEffect(() => {
    if (hotelId) {
      setSelectedPropertyId(parseInt(hotelId));
    }
  }, [hotelId]);
  
  const [loading, setLoading] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<{ [key: string]: { count: number, planId: number | null, pax: number } }>({});
  
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Lightbox & Details State
  const [lightboxData, setLightboxData] = useState<{ images: string[], index: number } | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  useEffect(() => {
    const fetchHotel = () => {
      fetch(`/api/public/hotel/${hotelId}`)
        .then(res => res.json())
        .then(data => {
          if (data.hotel) setHotel(data.hotel);
          if (data.plans) setPlans(data.plans);
        })
        .catch(err => console.error("Failed to fetch hotel", err));
    };

    fetchHotel();
    const interval = setInterval(fetchHotel, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [hotelId]);

  const searchAvailability = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/hotel/${hotelId}/availability?checkInDate=${checkIn}&checkOutDate=${checkOut}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoomTypes(data.map((item: any) => ({
          ...item,
          id: item.id.toString(), // Unique ID from backend (e.g. 1-none or 1-2)
          price: item.price
        })));
        setSelectedRooms({});
      }
    } catch (error) {
      console.error("Availability search failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotelId) {
      searchAvailability();
    }
  }, [hotelId, checkIn, checkOut]);

  const handleAddRoom = (roomId: string) => {
    const rt = roomTypes.find(r => r.id === roomId);
    if (!rt) return;

    setSelectedRooms(prev => ({ 
      ...prev, 
      [roomId]: { 
        count: (prev[roomId]?.count || 0) + 1, 
        planId: plans[0]?.id || null, 
        pax: prev[roomId]?.pax || rt.capacity
      } 
    }));
  };

  const handleRemoveRoom = (roomId: string) => {
    setSelectedRooms(prev => {
      const current = prev[roomId];
      if (!current) return prev;
      if (current.count <= 1) {
        const { [roomId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [roomId]: { ...current, count: current.count - 1 }
      };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    const nightsCount = Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    Object.keys(selectedRooms).forEach(roomId => {
      const rt = roomTypes.find(r => r.id === roomId);
      if (rt) {
        const plan = plans.find(p => p.id === selectedRooms[roomId].planId);
        const multiplier = plan?.priceMultiplier || 1.0;
        const extraBeds = Math.max(0, (selectedRooms[roomId].pax - rt.capacity));
        total += ((rt.price * multiplier) + (extraBeds * 500)) * selectedRooms[roomId].count * nightsCount;
      }
    });
    return total;
  };

  const handleBook = async () => {
    if (!guestName || !guestEmail || !guestPhone) {
      alert("Please fill in all contact details in the reservation form.");
      return;
    }
    setLoading(true);
    try {
      for (const roomId of Object.keys(selectedRooms)) {
        const rt = roomTypes.find(r => r.id === roomId);
        if (!rt) continue;
        
        const extraBeds = Math.max(0, (selectedRooms[roomId].pax - rt.capacity));
        
        const res = await fetch(`/api/public/hotel/${hotelId}/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomTypeId: rt.roomTypeId,
            roomCount: selectedRooms[roomId].count,
            planId: selectedRooms[roomId].planId,
            guestName,
            guestEmail,
            guestPhone,
            pax: selectedRooms[roomId].pax,
            extraBeddings: extraBeds,
            notes: specialRequests,
            checkInDate: checkIn,
            checkOutDate: checkOut
          })
        });
        
        if (!res.ok) throw new Error('Booking failed');
      }
      setBookingSuccess(true);
    } catch (err) {
      alert("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nightsNum = Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  const hasSelections = Object.keys(selectedRooms).length > 0;

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900">Booking Confirmed!</h2>
          <p className="text-slate-500 leading-relaxed">
            Your reservation at <span className="font-bold text-slate-900">{hotel?.name}</span> has been successfully placed. A confirmation email has been sent to <span className="font-medium text-blue-600">{guestEmail}</span>.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-colors shadow-lg"
          >
            Make Another Booking
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Lightbox Slideshow */}
      <AnimatePresence>
        {lightboxData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxData(null)}
          >
            <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
               <button 
                 className="absolute top-0 right-0 p-4 text-white/60 hover:text-white transition-colors"
                 onClick={() => setLightboxData(null)}
               >
                 <XCircle size={32} />
               </button>
               
               <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <motion.img 
                    key={lightboxData.index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    src={lightboxData.images[lightboxData.index]} 
                    className="w-full h-full object-cover"
                  />
                  
                  {lightboxData.images.length > 1 && (
                    <>
                      <button 
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center transition-all"
                        onClick={() => setLightboxData(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null)}
                      >
                         <ChevronRight className="rotate-180" />
                      </button>
                      <button 
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center transition-all"
                        onClick={() => setLightboxData(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null)}
                      >
                         <ChevronRight />
                      </button>
                    </>
                  )}
               </div>
               
               <div className="flex gap-2 mt-6">
                  {lightboxData.images.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setLightboxData(prev => prev ? { ...prev, index: idx } : null)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === lightboxData.index ? 'bg-blue-500 w-8' : 'bg-white/20 hover:bg-white/40'}`}
                    />
                  ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Details Modal */}
      <AnimatePresence>
        {detailsData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDetailsData(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-64">
                <img src={detailsData.images?.[0] || detailsData.imageUrl || ''} className="w-full h-full object-cover" />
                <button onClick={() => setDetailsData(null)} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full transition-all">
                  <XCircle size={24} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <h2 className="text-3xl font-black text-white">{detailsData.name}</h2>
                </div>
              </div>
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">About the Room</h4>
                  <p className="text-slate-500 leading-relaxed italic font-medium">
                    {detailsData.description || `Experience absolute luxury in our ${detailsData.name.toLowerCase()}. Meticulously designed for your comfort and elegance.`}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">Amenities & Features</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(detailsData.amenities?.length ? detailsData.amenities : ['King Size Bed', 'Ocean View', 'Mini Bar', 'Smart TV', 'Room Service', 'WiFi']).map((a: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-slate-700 font-bold">
                        <div className="p-1 bg-green-50 text-green-500 rounded"><ShieldCheck size={14} /></div>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-3 text-slate-400 font-bold">
                    <Users size={20} />
                    Up to {detailsData.capacity} Guests
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">Starting from</span>
                    <span className="text-3xl font-black text-slate-900">₹{detailsData.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Hotel size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">{hotel?.name || 'XANE LUXURY'}</h1>
              <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                <MapPin size={10} className="mr-1" />
                {hotel?.address || 'Premium Collection'}
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-1 text-amber-500">
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
              <Star size={14} fill="currentColor" />
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
              <ShieldCheck size={18} className="text-blue-500" />
              Official Website
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <CalendarIcon size={18} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Your Perfect Stay</h2>
              </div>

              <div className="space-y-4 mb-10">
                <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-widest">Select Property</Label>
                <div className="grid grid-cols-3 gap-3">
                  {properties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => navigate(`/book/${prop.id}`)}
                      className={`relative py-4 px-2 rounded-2xl font-black text-xs transition-all duration-300 border-2 ${
                        selectedPropertyId === prop.id 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200 hover:text-slate-600'
                      }`}
                    >
                      {prop.name}
                      {selectedPropertyId === prop.id && (
                        <motion.div 
                          layoutId="activeProperty"
                          className="absolute inset-0 bg-slate-900 rounded-2xl -z-10"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-widest">Check-In Date</Label>
                  <div className="relative group">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <input 
                      type="date" 
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full bg-slate-50 border-none h-16 pl-12 pr-4 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black text-slate-400 ml-1 tracking-widest">Check-Out Date</Label>
                  <div className="relative group">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <input 
                      type="date" 
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-slate-50 border-none h-16 pl-12 pr-4 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all outline-none" 
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900">Available Sanctuary</h2>
                  <p className="text-slate-400 font-medium tracking-wide">Choose your preferred room type</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-500">
                  {roomTypes.length} Options Found
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {loading ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                     <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                     <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Syncing Inventory...</p>
                  </div>
                ) : roomTypes.length === 0 ? (
                  <div className="col-span-full py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
                     <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                        <BedDouble size={32} />
                     </div>
                     <p className="text-slate-500 font-bold">No rooms available for these dates.</p>
                  </div>
                ) : roomTypes.map(rt => (
                  <RoomCard 
                    key={rt.id} 
                    {...rt} 
                    onAddRoom={handleAddRoom}
                    onViewDetails={setDetailsData}
                    onImageClick={(data) => setLightboxData({ ...data, index: 0 })}
                    selectedCount={selectedRooms[rt.id]?.count || 0}
                  />
                ))}
              </div>
            </section>
          </div>          <aside className="space-y-8 sticky top-28">
            <section className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 text-white overflow-hidden relative min-h-[400px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[100px] opacity-20" />
              
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <Tag size={24} className="text-blue-500" />
                Reservation Summary
              </h3>
              
              <div className="space-y-6 mb-10">
                <AnimatePresence mode="popLayout">
                  {!hasSelections ? (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="py-10 text-center space-y-4"
                    >
                      <p className="text-slate-500 font-medium font-sans">Your sanctuary is empty.</p>
                    </motion.div>
                  ) : (
                    Object.keys(selectedRooms).map(roomId => {
                      const rt = roomTypes.find(r => r.id === roomId);
                      if (!rt) return null;
                      const plan = plans.find(p => p.id === selectedRooms[roomId].planId);
                      const unitPrice = rt.price * (plan?.priceMultiplier || 1.0);

                      return (
                        <motion.div 
                          key={roomId} 
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          exit={{ opacity: 0, x: -20 }} 
                          className="space-y-4"
                        >
                          <div className="flex justify-between items-start group">
                            <div className="flex-1">
                              <p className="font-bold text-lg group-hover:text-blue-400 transition-colors font-sans">{rt.name}</p>
                              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">
                                 {selectedRooms[roomId].count} {selectedRooms[roomId].count > 1 ? 'Rooms' : 'Room'} × {nightsNum} Night(s)
                              </p>
                            </div>
                            <div className="text-right">
                               <p className="font-black text-lg font-sans">₹{(unitPrice * selectedRooms[roomId].count * nightsNum).toLocaleString('en-IN')}</p>
                               <button 
                                 onClick={() => handleRemoveRoom(roomId)}
                                 className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1 hover:underline"
                               >
                                  Remove
                               </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                             <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Meal Plan</Label>
                                <select 
                                  value={selectedRooms[roomId].planId || ''} 
                                  onChange={(e) => setSelectedRooms(prev => ({ ...prev, [roomId]: { ...prev[roomId], planId: parseInt(e.target.value) } }))}
                                  className="w-full bg-slate-800 border-none h-11 px-4 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                >
                                   {plans.map(p => (
                                     <option key={p.id} value={p.id}>
                                       {p.name} {p.priceMultiplier > 1 ? `(+${((p.priceMultiplier - 1) * 100).toFixed(0)}%)` : '(Base)'}
                                     </option>
                                   ))}
                                </select>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Guests</Label>
                                   <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl">
                                      <button onClick={() => {
                                        if (selectedRooms[roomId].pax > 1) {
                                           setSelectedRooms(prev => ({ ...prev, [roomId]: { ...prev[roomId], pax: prev[roomId].pax - 1 } }));
                                        }
                                      }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors">
                                         <ChevronRight size={14} className="rotate-180" />
                                      </button>
                                      <span className="flex-1 text-center font-black">{selectedRooms[roomId].pax}</span>
                                      <button onClick={() => {
                                         setSelectedRooms(prev => ({ ...prev, [roomId]: { ...prev[roomId], pax: prev[roomId].pax + 1 } }));
                                      }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors">
                                         <ChevronRight size={14} />
                                      </button>
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Extra Bed</Label>
                                   <div className="h-12 bg-slate-800/50 flex items-center justify-center rounded-xl font-bold text-xs text-slate-300">
                                      {Math.max(0, (selectedRooms[roomId].pax - rt.capacity))}
                                   </div>
                                </div>
                             </div>
                          </div>
                          
                          <div className="h-px bg-slate-800/50 w-full" />
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

              {hasSelections && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="pt-8 border-t border-slate-800 space-y-8"
                >
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Total Value</p>
                      <p className="text-5xl font-black tracking-tighter">₹{calculateTotal().toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-slate-800/50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">Guest Information</h4>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Full Name</Label>
                          <div className="relative">
                             <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                             <input 
                               value={guestName} 
                               onChange={e => setGuestName(e.target.value)} 
                               placeholder="Enter your name" 
                               className="w-full bg-slate-800 h-12 pl-12 pr-4 rounded-xl font-bold text-white outline-none border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                             />
                          </div>
                       </div>
                       <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Email Address</Label>
                             <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input 
                                  type="email" 
                                  value={guestEmail} 
                                  onChange={e => setGuestEmail(e.target.value)} 
                                  placeholder="email@example.com" 
                                  className="w-full bg-slate-800 h-12 pl-12 pr-4 rounded-xl font-bold text-white outline-none border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                                />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Phone Number</Label>
                             <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input 
                                  value={guestPhone} 
                                  onChange={e => setGuestPhone(e.target.value)} 
                                  placeholder="+91 ..." 
                                  className="w-full bg-slate-800 h-12 pl-12 pr-4 rounded-xl font-bold text-white outline-none border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                                />
                             </div>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Special Requests</Label>
                          <textarea 
                            value={specialRequests} 
                            onChange={e => setSpecialRequests(e.target.value)} 
                            placeholder="Any special needs?" 
                            className="w-full bg-slate-800 min-h-[100px] p-4 rounded-xl font-bold text-white outline-none border-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-sm" 
                          />
                       </div>
                    </div>

                    <button 
                      onClick={handleBook}
                      disabled={loading || !guestName || !guestEmail || !guestPhone}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-[1.5rem] font-black text-lg transition-all shadow-xl active:scale-95 mt-4"
                    >
                      {loading ? 'Confirming Sanctuary...' : 'Secure My Sanctuary Now'}
                    </button>
                  </div>
                </motion.div>
              )}
            </section>
          </aside>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                <Hotel size={18} />
             </div>
             <p className="font-black text-slate-900 uppercase tracking-widest">XANE PMS LUXURY EDITION</p>
          </div>
          <p className="text-slate-400 text-sm font-medium tracking-wide">© 2026 XANE MEDIA GROUP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
