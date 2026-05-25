import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Check, 
  Trash2, 
  Wifi, 
  Utensils, 
  MessageSquare, 
  Plus, 
  Minus, 
  DollarSign, 
  ClipboardList, 
  Settings, 
  Shield, 
  Smartphone, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle,
  Building,
  TrendingUp,
  Mail,
  User,
  Star,
  Quote,
  LayoutDashboard,
  CalendarDays,
  Coffee,
  UserRoundCog,
  Wallet,
  Menu,
  ExternalLink,
  Users,
  Percent,
  Layers,
  Globe,
  Award
} from 'lucide-react';

// Interfaces for our interactive simulation states
interface SimOrder {
  id: string;
  room: string;
  items: string[];
  total: number;
  time: string;
  status: 'pending' | 'preparing' | 'ready';
}

interface ChatMessage {
  sender: 'guest' | 'staff';
  text: string;
  time: string;
}

interface Review {
  id: number;
  name: string;
  role: string;
  property: string;
  rating: number;
  avatarText: string;
  comment: string;
  tags: string[];
}

interface Competitor {
  name: string;
  directBooking: string;
  kotDining: string;
  agentConsole: string;
  guestApp: string;
  setupTime: string;
  bloat: string;
}

export default function PresentationPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- SIMULATION STATES FOR SLIDES ---
  
  // Slide 2: Challenge Silo toggle
  const [activeChallengeSilo, setActiveChallengeSilo] = useState<string>('desk');

  // Slide 3: Ecosystem merger state
  const [ecosystemActiveNode, setEcosystemActiveNode] = useState<string>('pms');

  // Slide 4: Live Stats Simulation
  const [occupancyCount, setOccupancyCount] = useState(12);
  const totalRooms = 15;
  const [todayRevenue, setTodayRevenue] = useState(1850);
  const [kotPendingCount, setKotPendingCount] = useState(3);

  // Slide 5: Direct Booking Engine Simulation
  const [bookingName, setBookingName] = useState('');
  const [bookingRoomType, setBookingRoomType] = useState('deluxe');
  const [bookingNights, setBookingNights] = useState('2');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // Slide 5/6 Shared Calendar data
  const [calendarVacancies, setCalendarVacancies] = useState<number[]>([3, 5, 2, 4, 3, 1, 6]);
  const [calendarOccupied, setCalendarOccupied] = useState<number[]>([12, 10, 13, 11, 12, 14, 9]);

  // Slide 6: Travel Agent Portal Simulation
  const [agentCommissionRate, setAgentCommissionRate] = useState(10); // percentage
  const [agentBookings, setAgentBookings] = useState<{ id: string; guest: string; value: number; comm: number }[]>([
    { id: 'AG-902', guest: 'Robert Chen', value: 450, comm: 45 },
    { id: 'AG-901', guest: 'Alice Winters', value: 800, comm: 80 }
  ]);
  const [newAgentGuest, setNewAgentGuest] = useState('');
  const [newAgentValue, setNewAgentValue] = useState('');

  // Slide 7 & 8: Guest Portal and KOT
  const [wifiConnected, setWifiConnected] = useState(false);
  const [guestCart, setGuestCart] = useState<{ name: string; price: number; quantity: number }[]>([]);
  const [guestPinCode] = useState('4859');
  const [guestPinInput, setGuestPinInput] = useState('');
  const [guestIsLoggedIn, setGuestIsLoggedIn] = useState(false);
  const [pinError, setPinError] = useState('');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'staff', text: 'Welcome to Room 104! How can we assist you today?', time: '12:00 PM' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTypingReply, setIsTypingReply] = useState(false);

  // Kitchen Order Tickets (KOT)
  const [kotOrders, setKotOrders] = useState<SimOrder[]>([
    { id: 'KOT-849', room: '202', items: ['1x Classic Beef Burger', '1x Iced Latte'], total: 21, time: '5m ago', status: 'pending' },
    { id: 'KOT-848', room: '110', items: ['2x Club Sandwich', '2x Fresh Watermelon Juice'], total: 32, time: '12m ago', status: 'preparing' },
    { id: 'KOT-847', room: '304', items: ['1x Margherita Pizza'], total: 14, time: '20m ago', status: 'ready' }
  ]);

  // Slide 9: Housekeeping Status Grid
  const [roomStatuses, setRoomStatuses] = useState<('clean' | 'cleaning' | 'dirty')[]>([
    'clean', 'dirty', 'cleaning', 'clean', 'dirty', 'clean', 'cleaning', 'dirty', 'clean'
  ]);

  // Slide 10: Live Expense Logs
  const [expenses, setExpenses] = useState<{ category: string; amount: number; description: string }[]>([
    { category: 'Supplies', amount: 120, description: 'Toiletries Restock' },
    { category: 'Utilities', amount: 450, description: 'Electricity Bill' },
    { category: 'Maintenance', amount: 80, description: 'AC Filter Cleaning' }
  ]);
  const [newExpCategory, setNewExpCategory] = useState('Supplies');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  // Slide 11: Customer Reviews State
  const [customerReviews, setCustomerReviews] = useState<Review[]>([
    {
      id: 1,
      name: 'Faraz Hashmi',
      role: 'Owner',
      property: 'Fyra Group',
      rating: 5,
      avatarText: 'FH',
      comment: 'The operations for our hotels was still done using Excel sheets, and physical book. Thanks to Shalimar Sharma for coming up with this solution, the UI seems really easy to navigate through and surely will be using this app for future purposes.',
      tags: ['Saves Time', 'Excel Replacement']
    },
    {
      id: 2,
      name: 'Savya Sachi Sharma',
      role: 'Owner',
      property: 'Zen Retreat - Manali',
      rating: 5,
      avatarText: 'SS',
      comment: 'Managing bookings and room service operations across multiple locations used to be a nightmare of phone calls and messy spreadsheets. Xane PMS consolidated everything. Connecting the guest portal dining orders directly to kitchen KOT dispatch and the automated room release on booking deletion has made our workflows incredibly smooth!',
      tags: ['Smooth Operations', 'Live KOT Integration']
    }
  ]);
  const [showAddReviewForm, setShowAddReviewForm] = useState(false);
  const [newRevName, setNewRevName] = useState('');
  const [newRevProperty, setNewRevProperty] = useState('');
  const [newRevComment, setNewRevComment] = useState('');
  const [newRevRating, setNewRevRating] = useState(5);

  // Slide 12: Competition Analysis
  const [competitorMatchup, setCompetitorMatchup] = useState<string>('cloudbeds');

  // Slide 13: Deletion Confirmation Demo
  const [demoRecords, setDemoRecords] = useState<{ id: string; name: string; type: string }[]>([
    { id: 'BK-501', name: 'John Doe (Rm 102)', type: 'Booking' },
    { id: 'BK-502', name: 'Sarah Connor (Rm 205)', type: 'Booking' },
    { id: 'EXP-109', name: '$200 Laundry Detergent', type: 'Expense' }
  ]);
  const [confirmModalData, setConfirmModalData] = useState<{ id: string; name: string } | null>(null);

  // Slide 14: Call to Action Form
  const [leadEmail, setLeadEmail] = useState('');
  const [leadProperty, setLeadProperty] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  // Keyboard navigation controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (e.key === 'Space' && (e.target as HTMLElement).tagName === 'INPUT') return;
        if (e.key === 'Space' && (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if (e.key === 'Space' && (e.target as HTMLElement).tagName === 'SELECT') return;
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const slideCount = 17;

  const nextSlide = () => {
    if (currentSlide < slideCount - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // Helper for Slide 5: Direct Booking Engine Simulator
  const handleDirectBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingName) return;
    
    // Decrement vacant rooms on calendar for today (index 0)
    setCalendarVacancies(prev => prev.map((v, i) => i === 0 ? Math.max(0, v - 1) : v));
    setCalendarOccupied(prev => prev.map((o, i) => i === 0 ? o + 1 : o));
    
    // Increment admin stats
    setOccupancyCount(prev => Math.min(totalRooms, prev + 1));
    const roomCharge = bookingRoomType === 'deluxe' ? 180 : 350;
    setTodayRevenue(prev => prev + roomCharge * parseInt(bookingNights));
    
    setBookingSuccessMsg(`Direct Booking confirmed for ${bookingName}! Synced in Admin Grid.`);
    setBookingName('');
    setTimeout(() => setBookingSuccessMsg(''), 5000);
  };

  // Helper for Slide 6: Travel Agent booking
  const handleAgentBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentGuest || !newAgentValue) return;
    const val = parseFloat(newAgentValue);
    if (isNaN(val)) return;
    const comm = parseFloat(((val * agentCommissionRate) / 100).toFixed(2));
    
    const newBook = {
      id: `AG-${Math.floor(900 + Math.random() * 99)}`,
      guest: newAgentGuest,
      value: val,
      comm: comm
    };
    
    setAgentBookings(prev => [newBook, ...prev]);
    
    // Increment overall statistics
    setOccupancyCount(prev => Math.min(totalRooms, prev + 1));
    setTodayRevenue(prev => prev + val);
    
    setNewAgentGuest('');
    setNewAgentValue('');
  };

  // Helper functions for Slide 7 (Guest Portal Phone)
  const handleGuestLogin = () => {
    if (guestPinInput === guestPinCode) {
      setGuestIsLoggedIn(true);
      setPinError('');
    } else {
      setPinError('Invalid PIN. Use default: 4859');
    }
  };

  const addFoodToCart = (name: string, price: number) => {
    setGuestCart(prev => {
      const existing = prev.find(item => item.name === name);
      if (existing) {
        return prev.map(item => item.name === name ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { name, price, quantity: 1 }];
    });
  };

  const submitRoomServiceOrder = () => {
    if (guestCart.length === 0) return;
    
    const itemsText = guestCart.map(i => `${i.quantity}x ${i.name}`);
    const orderTotal = guestCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newKot: SimOrder = {
      id: `KOT-${Math.floor(100 + Math.random() * 900)}`,
      room: '104',
      items: itemsText,
      total: orderTotal,
      time: 'Just now',
      status: 'pending'
    };

    setKotOrders(prev => [newKot, ...prev]);
    setKotPendingCount(prev => prev + 1);
    setGuestCart([]);
    alert(`Order sent! KOT is generated and routed to kitchen screen.`);
  };

  const sendGuestChatMessage = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMessage = { sender: 'guest', text: chatInput, time: 'Just now' };
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
    setIsTypingReply(true);

    // Simulate front desk reply
    setTimeout(() => {
      const replies = [
        "Sure, we are sending housekeeping to your room right away.",
        "Your WiFi connection is configured. Please try again now.",
        "Yes, checkout is at 11:00 AM. Let us know if you need assistance with luggage.",
        "We are checking with the chef regarding your order status."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setChatMessages(prev => [...prev, { sender: 'staff', text: randomReply, time: 'Just now' }]);
      setIsTypingReply(false);
    }, 1500);
  };

  // Helper functions for Slide 8 (KOT Desk)
  const updateKotStatus = (id: string, newStatus: 'preparing' | 'ready' | 'delete') => {
    if (newStatus === 'delete') {
      const confirmDelete = window.confirm("Are you sure you want to permanently delete this restaurant ticket?");
      if (confirmDelete) {
        setKotOrders(prev => prev.filter(o => o.id !== id));
        setKotPendingCount(prev => Math.max(0, prev - 1));
      }
      return;
    }
    setKotOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    if (newStatus === 'ready') {
      setKotPendingCount(prev => Math.max(0, prev - 1));
    }
  };

  // Helper function for Slide 9 (Housekeeping)
  const cycleRoomStatus = (index: number) => {
    const nextStatus: Record<'clean' | 'cleaning' | 'dirty', 'clean' | 'cleaning' | 'dirty'> = {
      'clean': 'dirty',
      'dirty': 'cleaning',
      'cleaning': 'clean'
    };
    setRoomStatuses(prev => prev.map((s, idx) => idx === index ? nextStatus[s] : s));
  };

  // Helper functions for Slide 10 (Expenses)
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpAmount || !newExpDesc) return;
    const amt = parseFloat(newExpAmount);
    if (isNaN(amt)) return;
    setExpenses(prev => [...prev, { category: newExpCategory, amount: amt, description: newExpDesc }]);
    setTodayRevenue(prev => Math.max(0, prev - amt / 2)); // simulate changing financials
    setNewExpAmount('');
    setNewExpDesc('');
  };

  // Helper for Slide 11 (Customer Review Submission)
  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevName || !newRevComment) return;
    const init = newRevName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const newRev: Review = {
      id: Date.now(),
      name: newRevName,
      role: 'Property Owner',
      property: newRevProperty || 'Boutique Inn',
      rating: newRevRating,
      avatarText: init || 'G',
      comment: newRevComment,
      tags: ['Feedback Logged']
    };
    setCustomerReviews(prev => [newRev, ...prev]);
    setNewRevName('');
    setNewRevProperty('');
    setNewRevComment('');
    setShowAddReviewForm(false);
  };

  // Helper for Slide 13 (Deletion Confirmation Demo)
  const requestDeleteRecord = (rec: { id: string; name: string }) => {
    setConfirmModalData(rec);
  };

  const confirmDeleteRecord = () => {
    if (!confirmModalData) return;
    setDemoRecords(prev => prev.filter(r => r.id !== confirmModalData.id));
    setConfirmModalData(null);
    alert("Record deleted. UI cleaned successfully!");
  };

  // Helper for Slide 14 (Confetti CTA)
  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !leadProperty) return;
    setFormSubmitted(true);
    setTriggerConfetti(true);
    setTimeout(() => setTriggerConfetti(false), 4000);
  };

  // List of slide metadata representing structure
  const slideNavItems = [
    { name: '1. Cover Page', desc: 'Presentation Intro', icon: LayoutDashboard },
    { name: '2. Hotel Challenges', desc: 'Market Problems', icon: AlertTriangle },
    { name: '3. All-in-One Solution', desc: 'Hotel Ecosystem', icon: Layers },
    { name: '4. Admin Dashboard', desc: 'Core PMS Control', icon: Shield },
    { name: '5. Direct Booking', desc: 'Website Engine', icon: Globe },
    { name: '6. Travel Agent Portal', desc: 'Agent & Commissions', icon: Users },
    { name: '7. Guest Portal', desc: 'Frictionless Mobile', icon: Smartphone },
    { name: '8. KOT Monitor', desc: 'Kitchen Dispatch', icon: Coffee },
    { name: '9. Housekeeping', desc: 'FOH & BOH Sync', icon: UserRoundCog },
    { name: '10. Financial Logs', desc: 'Operating Expenses', icon: Wallet },
    { name: '11. Customer Success', desc: 'Reviews & ROI', icon: MessageSquare },
    { name: '12. Competitor Study', desc: 'Market Comparison', icon: Award },
    { name: '13. Safe Deletions', desc: 'Clean UI & Data', icon: Trash2 },
    { name: '14. Seamless Onboarding', desc: 'Rapid Deployment', icon: Settings },
    { name: '15. Flexible Pricing', desc: 'Discovery & Quotation', icon: DollarSign },
    { name: '16. Startup Stats', desc: 'Growth & Metrics', icon: TrendingUp },
    { name: '17. Connect & Pitch', desc: 'Schedule Demo', icon: Play },
  ];

  // Render slides dynamically
  const renderSlideContent = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/10 text-blue-600 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Live Demo Platform
              </div>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-slate-900">
                Xane PMS
              </h1>
              <p className="text-xl lg:text-2xl font-bold text-slate-700">
                The Unified Property Management & Guest Service Suite
              </p>
              <p className="text-slate-500 max-w-lg text-sm leading-relaxed">
                Empower your boutique hotel or resort. Unify room bookings, housekeeping, restaurant orders, expense tracking, and travel agent portals on a single Postgres database with zero operational bloat.
              </p>
              
              {/* Fake Details Grid */}
              <div className="grid grid-cols-2 gap-3 max-w-md pt-2">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hotels Served</span>
                  <p className="text-xl font-extrabold text-blue-600">5 Hotels</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Direct Booking Uptime</span>
                  <p className="text-xl font-extrabold text-emerald-600">99.99% Cloud</p>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={nextSlide} 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all hover:scale-103"
                >
                  Start Pitch Deck <Play className="w-4 h-4 fill-white" />
                </button>
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold shadow-sm flex items-center gap-2 transition-all"
                >
                  Open Live App <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-md relative overflow-hidden w-full max-w-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent blur-xl"></div>
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">xane-pms v1.2</span>
                </div>
                <div className="space-y-4">
                  <div className="h-5 w-24 bg-slate-100 rounded"></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between h-14">
                      <span className="text-[9px] text-slate-400 font-bold">DIRECT BKGS</span>
                      <span className="text-xs font-extrabold text-blue-600">+18.4%</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between h-14">
                      <span className="text-[9px] text-slate-400 font-bold">STAFF UPTIME</span>
                      <span className="text-xs font-extrabold text-emerald-600">100%</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between h-14">
                      <span className="text-[9px] text-slate-400 font-bold">KOT TICKET TIME</span>
                      <span className="text-xs font-extrabold text-orange-500">6.2 Min</span>
                    </div>
                  </div>
                  <div className="h-28 bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center mx-auto">
                        <Building className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 block">Unified Hotel Engine Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Slide 2: Challenges
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Core Hotel Challenges
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                Hoteliers struggle to maintain margins due to operational gaps, lack of direct booking tools, and third-party fee models.
              </p>
              
              {/* Interactive Selector */}
              <div className="space-y-2 pt-2">
                {[
                  { id: 'desk', label: '1. Administrative Silos', desc: 'Front desk has no visibility into restaurant charges or housekeeping tasks.' },
                  { id: 'booking', label: '2. High OTA Commission fees', desc: 'Properties pay 15% - 25% to OTAs (Booking.com, Expedia) for direct guest check-ins.' },
                  { id: 'agent', label: '3. Delayed Agent payouts', desc: 'Manual tracking of offline travel agent bookings causes late payouts and poor partnerships.' },
                  { id: 'dining', label: '4. Disconnected Room Dining', desc: 'Room service orders are noted on paper tickets, causing food billing loss.' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveChallengeSilo(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all ${activeChallengeSilo === item.id ? 'bg-blue-600/10 border-blue-200 text-blue-700 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-md text-left space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-red-50 text-red-500 rounded-xl border border-red-100">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800">
                      {activeChallengeSilo === 'desk' && 'Administrative Silo Damage'}
                      {activeChallengeSilo === 'booking' && 'The OTA Commission Trap'}
                      {activeChallengeSilo === 'agent' && 'Travel Agent Disengagement'}
                      {activeChallengeSilo === 'dining' && 'Room Dining Revenue Leakage'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {activeChallengeSilo === 'desk' && 'Because housekeeping and restaurant operate in separate systems, room billing gets miskeyed, causing checkouts to delay. Front desk agents manually call rooms to check if guests are checked out.'}
                      {activeChallengeSilo === 'booking' && 'Hotels lose up to 25% of top-line revenue to booking websites. Without an integrated, direct website booking engine, guesthouses cannot bypass these commissions.'}
                      {activeChallengeSilo === 'agent' && 'Travel agents are highly motivated to book rooms, but offline accounting on spreadsheets makes it hard to log commissions accurately. Payout delays discourage agents from booking your property.'}
                      {activeChallengeSilo === 'dining' && 'Room orders that are verbs or papers are easily lost. Kitchen doesn’t know check-in details, and dishes are prepared for guests who have already checked out, leading to food waste and unpaid bills.'}
                    </p>
                  </div>
                </div>

                <div className="bg-red-50/20 border border-red-100 rounded-xl p-3.5 text-xs text-red-800 font-semibold">
                  {activeChallengeSilo === 'desk' && 'Impact: 1.2 Hours wasted per housekeeper daily.'}
                  {activeChallengeSilo === 'booking' && 'Impact: Average hotel loses $3,200/month in OTA fees.'}
                  {activeChallengeSilo === 'agent' && 'Impact: 40% Drop in travel agent room reservations.'}
                  {activeChallengeSilo === 'dining' && 'Impact: 5% of restaurant transactions are never billed.'}
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Slide 3: All-in-One Solution
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                The All-in-One Hotel Solution
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Xane PMS acts as a single cloud-based operations engine. It serves travel agents, guest direct website bookings, staff administration, and kitchen dispatch all in one system.
              </p>
              
              <div className="space-y-2 pt-2 text-xs font-bold text-slate-650">
                {[
                  { id: 'engine', label: '1. Direct Booking Engine', desc: 'Enables guests to reserve directly on your hotel website.' },
                  { id: 'agent', label: '2. Travel Agent Console', desc: 'Secure agent login, bookings tracking, and auto-commission logs.' },
                  { id: 'pms', label: '3. Core Admin Panel', desc: 'Manage room assignments, meal plans, expenses, and staff.' },
                  { id: 'guest', label: '4. Guest Self-Service Portal', desc: 'WiFi, chat, and room service order directly from room PIN.' }
                ].map(node => (
                  <div 
                    key={node.id} 
                    onMouseEnter={() => setEcosystemActiveNode(node.id)}
                    className={`p-2 rounded-lg cursor-pointer transition-all border ${ecosystemActiveNode === node.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent border-transparent'}`}
                  >
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 border border-slate-200 bg-white rounded-2xl shadow-sm w-full max-w-md text-left space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unified Operations Flow</span>
                
                {/* Node Display */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 animate-fade-in min-h-[140px] flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs">
                    {ecosystemActiveNode === 'pms' && <Shield className="w-4 h-4" />}
                    {ecosystemActiveNode === 'engine' && <Globe className="w-4 h-4" />}
                    {ecosystemActiveNode === 'agent' && <Users className="w-4 h-4" />}
                    {ecosystemActiveNode === 'guest' && <Smartphone className="w-4 h-4" />}
                    <span>
                      {ecosystemActiveNode === 'pms' && 'Admin Panel Operations'}
                      {ecosystemActiveNode === 'engine' && 'Direct Booking Engine'}
                      {ecosystemActiveNode === 'agent' && 'Travel Agent Module'}
                      {ecosystemActiveNode === 'guest' && 'Guest Portal Experience'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {ecosystemActiveNode === 'pms' && 'Gives hoteliers total control. Assign rooms, update meal plans, track housekeeping cleaner logs, and audit property-wide expenses. No double-bookings, ever.'}
                    {ecosystemActiveNode === 'engine' && 'Embeds directly on your resort website. Guests view real-time vacancies, choose room types, and confirm bookings. Bookings populate the PMS grid in milliseconds.'}
                    {ecosystemActiveNode === 'agent' && 'Incentivize local travel agents. Agents get unique credentials to book rooms directly. Xane calculates their commission instantly, eliminating payment delays.'}
                    {ecosystemActiveNode === 'guest' && 'Frictionless guest self-service. Checked-in guests log in securely with a 4-digit PIN. Toggles Wi-Fi, triggers front-desk chat, or routes food orders directly to kitchen KOTs.'}
                  </p>
                </div>

                {/* Database Synced indicator */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Single Shared PostgreSQL DB (Supabase)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Synced</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Slide 4: Admin Dashboard
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Core Admin Dashboard
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                The command console for hoteliers. Syncs with bookings, housekeeping grids, dining queues, and ledgers in real-time, giving managers a bird's eye view.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-semibold text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block">Occupancy Rate</span>
                  <span className="text-sm font-extrabold text-blue-600">
                    {((occupancyCount / totalRooms) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold block">Active Bookings</span>
                  <span className="text-sm font-extrabold text-emerald-600">{occupancyCount} active</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-lg space-y-5 text-left">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-700">PMS Live Overview Ticker</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Sync
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Occupancy Card */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block">Occupied Rooms</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-bold text-slate-800">{occupancyCount}</span>
                      <span className="text-[10px] text-slate-400">/ {totalRooms}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button 
                        onClick={() => setOccupancyCount(prev => Math.max(0, prev - 1))}
                        className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-550"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={() => setOccupancyCount(prev => Math.min(totalRooms, prev + 1))}
                        className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Revenue Card */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block">Today Revenue</span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      ${todayRevenue}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button 
                        onClick={() => setTodayRevenue(prev => Math.max(0, prev - 100))}
                        className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-550"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={() => setTodayRevenue(prev => prev + 150)}
                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* KOT Tickets Card */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block">Pending KOTs</span>
                    <div className="text-xl font-bold text-orange-500 mt-1">
                      {kotPendingCount}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button 
                        onClick={() => setKotPendingCount(prev => Math.max(0, prev - 1))}
                        className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-550"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={() => setKotPendingCount(prev => prev + 1)}
                        className="p-1 rounded bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-800 flex justify-between font-semibold">
                  <span>Occupancy rate calculation: <strong>{((occupancyCount / totalRooms) * 100).toFixed(1)}%</strong></span>
                  <span className="font-mono text-[9px] text-slate-400">Reactive State</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4: // Slide 5: Direct Booking Engine
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Direct Booking Engine
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                By enabling guests to book directly on the resort website, hotels eliminate costly commission percentages paid to booking intermediaries.
              </p>
              
              <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs">
                <span className="font-bold block mb-0.5">Revenue Impact</span>
                <p className="text-[10px] text-emerald-600/90 font-medium">
                  Direct bookings bypass OTA commission fees entirely, saving an average of 18.4% per booking.
                </p>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-md text-left space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">Simulated Booking Form (Website Side)</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Client Booking</span>
                </div>

                {bookingSuccessMsg ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold text-center animate-fade-in">
                    {bookingSuccessMsg}
                  </div>
                ) : (
                  <form onSubmit={handleDirectBooking} className="space-y-3 text-xs font-semibold text-slate-650">
                    <div className="space-y-1">
                      <label>Guest Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="John Doe"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label>Room Category</label>
                        <select 
                          value={bookingRoomType} 
                          onChange={(e) => setBookingRoomType(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none"
                        >
                          <option value="deluxe">Deluxe Room ($180/n)</option>
                          <option value="suite">Luxury Suite ($350/n)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label>Nights of Stay</label>
                        <select 
                          value={bookingNights} 
                          onChange={(e) => setBookingNights(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none"
                        >
                          <option value="1">1 Night</option>
                          <option value="2">2 Nights</option>
                          <option value="3">3 Nights</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                    >
                      Book Room Directly
                    </button>
                  </form>
                )}

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>PMS ROOM CAPACITY TONIGHT</span>
                    <span>ROOMS VACANT: {calendarVacancies[0]}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${(calendarOccupied[0] / totalRooms) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5: // Slide 6: Travel Agent Portal
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Travel Agent Portal
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                Empower agents to book directly into your PMS. The system calculates and logs commission totals automatically to build transparent, profitable partnerships.
              </p>
              
              <div className="space-y-2 pt-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <span>Commission Rate:</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setAgentCommissionRate(r => Math.max(5, r - 1))} className="p-0.5 bg-white border border-slate-200 rounded">-</button>
                    <span className="font-mono text-slate-800 font-bold">{agentCommissionRate}%</span>
                    <button onClick={() => setAgentCommissionRate(r => Math.min(20, r + 1))} className="p-0.5 bg-white border border-slate-200 rounded">+</button>
                  </div>
                </div>
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-[11px] font-bold">
                  Total Agent Commissions: ${agentBookings.reduce((s, b) => s + b.comm, 0).toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-xl text-left space-y-4">
                <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-2">Travel Agent Bookings Log</span>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-100">
                        <th className="py-1">Booking ID</th>
                        <th className="py-1">Guest</th>
                        <th className="py-1 text-center">Value</th>
                        <th className="py-1 text-right">Commission ({agentCommissionRate}%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                      {agentBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 font-mono text-slate-400 font-bold">{b.id}</td>
                          <td className="py-1.5 font-bold text-slate-800">{b.guest}</td>
                          <td className="py-1.5 text-center font-mono">${b.value}</td>
                          <td className="py-1.5 text-right font-mono text-indigo-600 font-bold">${b.comm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Agent Booking Form */}
                <form onSubmit={handleAgentBooking} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <input 
                    type="text" 
                    required
                    placeholder="Guest Name"
                    value={newAgentGuest}
                    onChange={(e) => setNewAgentGuest(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
                  />
                  <input 
                    type="number" 
                    required
                    placeholder="Booking Value $"
                    value={newAgentValue}
                    onChange={(e) => setNewAgentValue(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none font-mono"
                  />
                  <button 
                    type="submit"
                    className="py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                  >
                    Log Agent Booking
                  </button>
                </form>
              </div>
            </div>
          </div>
        );

      case 6: // Slide 7: Guest Mobile Portal
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Friction-Free Guest Portal
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Checked-in guests log in securely using their room number and a temporary PIN. Guests gain instant mobile room keys, order room service, or message front desk.
              </p>
              <div className="space-y-2.5 font-semibold text-slate-600 text-xs">
                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>One-click high-speed WiFi activation.</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>Room service menus with dynamic pricing.</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>Direct front desk chat messaging.</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              {/* Simulated Mobile Device Frame */}
              <div className="w-[310px] h-[520px] rounded-[35px] border-[8px] border-slate-800 bg-slate-950 relative shadow-lg flex flex-col overflow-hidden ring-4 ring-slate-800/25">
                {/* Speaker Grill */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-850 rounded-full flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-slate-700 rounded-full"></div>
                </div>

                {/* Mobile screen container */}
                <div className="flex-1 flex flex-col pt-6 text-left">
                  {!guestIsLoggedIn ? (
                    /* Login Simulator Screen */
                    <div className="p-4 flex-1 flex flex-col justify-center space-y-3.5 bg-slate-950">
                      <div className="text-center space-y-1">
                        <h4 className="text-base font-bold text-white">Xane Guest Portal</h4>
                        <p className="text-[10px] text-slate-500">Scan QR Code or Enter PIN</p>
                      </div>

                      <div className="space-y-2.5 pt-2 text-slate-400">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider">Room Number</label>
                          <input 
                            type="text" 
                            placeholder="104" 
                            disabled 
                            className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-xl text-xs cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider">4-Digit Room PIN (Default: 4859)</label>
                          <input 
                            type="password" 
                            placeholder="Enter PIN"
                            value={guestPinInput}
                            onChange={(e) => setGuestPinInput(e.target.value)}
                            className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono" 
                          />
                        </div>
                        {pinError && <p className="text-[9px] text-red-400 font-bold">{pinError}</p>}
                        <button 
                          onClick={handleGuestLogin} 
                          className="w-full py-2 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Access Portal
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Logged In Guest Portal Screen */
                    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 text-slate-300">
                      {/* Portal Header */}
                      <div className="p-3 bg-slate-900 border-b border-slate-850 flex justify-between items-center">
                        <div>
                          <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider">Checked In</span>
                          <h4 className="text-xs font-bold text-white">Room 104</h4>
                        </div>
                        <button 
                          onClick={() => { setGuestIsLoggedIn(false); setGuestPinInput(''); }} 
                          className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded hover:text-slate-300"
                        >
                          Exit
                        </button>
                      </div>

                      {/* Main Mobile Screen Scrollable content */}
                      <div className="p-3 space-y-3.5 flex-1 text-slate-300 text-xs overflow-y-auto">
                        
                        {/* WiFi Widget */}
                        <div className="p-2.5 bg-slate-900 border border-slate-855 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border ${wifiConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-750 text-slate-500'}`}>
                              <Wifi className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 text-[11px]">Free WiFi</p>
                              <p className="text-[8px] text-slate-500">{wifiConnected ? 'Connected (150 Mbps)' : 'Disconnected'}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setWifiConnected(!wifiConnected)} 
                            className={`px-2 py-0.5 rounded font-bold text-[9px] transition-all ${wifiConnected ? 'bg-slate-800 text-slate-450' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                          >
                            {wifiConnected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>

                        {/* Room Service Widget */}
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Order Room Dining</span>
                          <div className="space-y-1">
                            <div className="p-2 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between">
                              <div>
                                <h5 className="font-bold text-slate-200 text-[11px]">Cheese Pizza</h5>
                                <p className="text-[8px] text-slate-500">$12.00 • Room Delivery</p>
                              </div>
                              <button 
                                onClick={() => addFoodToCart('Cheese Pizza', 12)} 
                                className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="p-2 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between">
                              <div>
                                <h5 className="font-bold text-slate-200 text-[11px]">Iced Latte</h5>
                                <p className="text-[8px] text-slate-500">$5.00 • Hot / Cold</p>
                              </div>
                              <button 
                                onClick={() => addFoodToCart('Iced Latte', 5)} 
                                className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {guestCart.length > 0 && (
                            <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/25 rounded-xl space-y-1.5 mt-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-indigo-400">Total:</span>
                                <span className="font-bold text-slate-200 font-mono">
                                  ${guestCart.reduce((sum, item) => sum + item.price * item.quantity, 0)}.00
                                </span>
                              </div>
                              <button 
                                onClick={submitRoomServiceOrder} 
                                className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[9px]"
                              >
                                Confirm Order to Room
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Guest Chat Widget */}
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Lobby Live Chat</span>
                          <div className="border border-slate-850 rounded-xl bg-slate-900/10 overflow-hidden flex flex-col h-32">
                            <div className="flex-1 p-2 space-y-1.5 overflow-y-auto flex flex-col">
                              {chatMessages.map((msg, idx) => (
                                <div 
                                  key={idx} 
                                  className={`max-w-[80%] p-2 rounded-xl text-[9px] leading-tight ${msg.sender === 'guest' ? 'bg-indigo-600 text-white self-end rounded-tr-none' : 'bg-slate-850 text-slate-300 self-start rounded-tl-none'}`}
                                >
                                  {msg.text}
                                </div>
                              ))}
                              {isTypingReply && (
                                <div className="text-[8px] text-slate-550 self-start italic">Staff is typing...</div>
                              )}
                            </div>
                            <div className="p-1 border-t border-slate-850 bg-slate-900 flex gap-1">
                              <input 
                                type="text" 
                                placeholder="Type a message..." 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendGuestChatMessage()}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[9px] text-slate-200 focus:outline-none"
                              />
                              <button 
                                onClick={sendGuestChatMessage} 
                                className="p-1 rounded bg-indigo-600 text-white"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>

                {/* Home Indicator */}
                <div className="h-5 w-full flex items-center justify-center bg-slate-950">
                  <div className="w-20 h-0.5 bg-slate-800 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 7: // Slide 8: Kitchen Order Ticket Monitor
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Integrated KOT Engine
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                Zero lag in room service. When guests place orders on Slide 7, Kitchen Order Tickets (KOT) populate instantly here. Kitchen staff process orders without paper tickets or billing logs.
              </p>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <h4 className="font-bold text-blue-600 text-xs">Synchronized Kitchen Flow</h4>
                <p className="text-[10px] text-slate-400">
                  Kitchen actions update room invoices and inventory ledgers simultaneously.
                </p>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-xl text-left space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">Kitchen Display Terminal</span>
                  <div className="flex gap-1.5 font-bold text-[9px]">
                    <span className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-orange-500 rounded-full">
                      {kotOrders.filter(o => o.status === 'pending').length} New
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full font-bold">
                      {kotOrders.filter(o => o.status === 'preparing').length} Preparing
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-0.5">
                  {kotOrders.length === 0 ? (
                    <div className="col-span-2 py-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No active tickets. Place a room service order on Slide 7!
                    </div>
                  ) : (
                    kotOrders.map((order) => (
                      <div 
                        key={order.id} 
                        className={`p-3 border rounded-xl flex flex-col justify-between space-y-2.5 transition-all ${order.status === 'ready' ? 'bg-slate-50 border-slate-200 opacity-60' : order.status === 'preparing' ? 'bg-blue-50/10 border-blue-200/50' : 'bg-white border-slate-200 shadow-sm'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 font-bold">{order.id}</span>
                            <h4 className="text-xs font-bold text-slate-800">Room {order.room}</h4>
                          </div>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : order.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="space-y-0.5 flex-1">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="text-[11px] text-slate-650 font-medium">{item}</p>
                          ))}
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-500 font-bold">${order.total}.00</span>
                          <div className="flex gap-1">
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => updateKotStatus(order.id, 'preparing')} 
                                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold"
                              >
                                Accept
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button 
                                onClick={() => updateKotStatus(order.id, 'ready')} 
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold"
                              >
                                Done
                              </button>
                            )}
                            <button 
                              onClick={() => updateKotStatus(order.id, 'delete')} 
                              className="p-1 border border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded transition-colors"
                              title="Delete Order (Simulate Cleanup)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 8: // Slide 9: Housekeeping Operations
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Back-of-House Housekeeping
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect housekeepers with desk agents. Rooms cycle states instantly. Desk agents immediately see when rooms are cleared and vacant.
              </p>
              <div className="space-y-2 text-slate-500 text-xs font-semibold">
                <div className="flex gap-2.5 items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span><strong>Clean:</strong> Ready for client check-in</span>
                </div>
                <div className="flex gap-2.5 items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span><strong>Cleaning:</strong> Staff is currently working inside</span>
                </div>
                <div className="flex gap-2.5 items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span><strong>Dirty:</strong> Requires attention</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-md text-left space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">Staff Room Matrix</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Click rooms to cycle</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {roomStatuses.map((status, idx) => {
                    const roomNum = 101 + idx;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => cycleRoomStatus(idx)}
                        className={`p-3 rounded-xl border cursor-pointer select-none transition-all hover:scale-102 flex flex-col justify-between h-16 ${status === 'clean' ? 'bg-emerald-50/20 border-emerald-200 text-emerald-700 hover:bg-emerald-50/40' : status === 'cleaning' ? 'bg-amber-50/20 border-amber-200 text-amber-700 hover:bg-amber-50/40' : 'bg-red-50/20 border-red-200 text-red-700 hover:bg-red-50/40'}`}
                      >
                        <span className="text-[10px] font-bold text-slate-500">Rm {roomNum}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'clean' ? 'bg-emerald-500' : status === 'cleaning' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                          <span className="text-[9px] uppercase font-bold tracking-wide">{status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px] font-bold text-slate-700">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[8px] text-slate-400 uppercase block">Clean</span>
                    <span className="text-sm font-extrabold text-emerald-600">{roomStatuses.filter(s => s === 'clean').length}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[8px] text-slate-400 uppercase block">Cleaning</span>
                    <span className="text-sm font-extrabold text-amber-500">{roomStatuses.filter(s => s === 'cleaning').length}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[8px] text-slate-400 uppercase block">Dirty</span>
                    <span className="text-sm font-extrabold text-red-500">{roomStatuses.filter(s => s === 'dirty').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 9: // Slide 10: Financial Controls
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Operating Expense Logs
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Guard hotel profits. Managers log inventory supplies, utility bills, and wages. Instantly balance expenses with booking revenue on a unified ledger.
              </p>
              <div className="p-3.5 bg-blue-50 border border-blue-150 rounded-xl text-blue-800 text-xs">
                <span className="font-bold block mb-0.5">Leakage Prevention</span>
                <p className="text-[10px] text-blue-600/90 font-medium">
                  Every small property supply or ingredient restock is accounted for instantly.
                </p>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-lg text-left space-y-4">
                <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-2">Active Expense Ledger</span>

                {/* Expense Chart */}
                <div className="space-y-2 bg-slate-50 p-3 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Expense Ratios</span>
                  <div className="space-y-2">
                    {['Supplies', 'Utilities', 'Maintenance'].map((cat) => {
                      const totalAmt = expenses.filter(e => e.category === cat).reduce((sum, item) => sum + item.amount, 0);
                      const maxVal = 700;
                      const percentage = Math.min(100, (totalAmt / maxVal) * 100);
                      return (
                        <div key={cat} className="space-y-0.5 text-[11px] font-semibold text-slate-650">
                          <div className="flex justify-between">
                            <span>{cat}</span>
                            <span className="font-mono text-slate-800">${totalAmt}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${cat === 'Supplies' ? 'bg-blue-500' : cat === 'Utilities' ? 'bg-purple-500' : 'bg-emerald-500'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Expense Form */}
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-semibold">
                  <select 
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value)}
                    className="sm:col-span-1 bg-white border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Supplies">Supplies</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Maintenance">Maint.</option>
                  </select>
                  <input 
                    type="number" 
                    placeholder="Amount $"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    className="sm:col-span-1 bg-white border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input 
                    type="text" 
                    placeholder="Soap stock..."
                    value={newExpDesc}
                    onChange={(e) => setNewExpDesc(e.target.value)}
                    className="sm:col-span-2 bg-white border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    type="submit"
                    className="sm:col-span-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                  >
                    Log Expense Record
                  </button>
                </form>
              </div>
            </div>
          </div>
        );

      case 10: // Slide 11: Customer Reviews
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Customer Reviews & Testimonials
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                See what boutique hotels say about Xane PMS. Verified customer feedback demonstrates significant operational improvement and cost efficiencies.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Highlights:</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                  <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-100">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span>Average 5★ Rating</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1.5 rounded border border-slate-100">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>95% Order Accuracy</span>
                  </div>
                </div>
              </div>

              {!showAddReviewForm ? (
                <button 
                  onClick={() => setShowAddReviewForm(true)} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/10"
                >
                  Add Custom Partner Feedback
                </button>
              ) : (
                <button 
                  onClick={() => setShowAddReviewForm(false)} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all border border-slate-200"
                >
                  Cancel Form
                </button>
              )}
            </div>
            
            <div className="lg:col-span-7 flex justify-center">
              <div className="w-full max-w-xl space-y-3 relative">
                
                {showAddReviewForm ? (
                  /* Form to Add Mock Review */
                  <div className="p-5 border border-slate-200 bg-white rounded-2xl shadow-sm text-left space-y-3 animate-fade-in">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Log New Partner Review</h4>
                    <form onSubmit={handleAddReview} className="space-y-2.5 text-xs font-semibold">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-slate-400">Full Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Samantha Reed" 
                            value={newRevName} 
                            onChange={(e) => setNewRevName(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-750 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-400">Property / Rooms</label>
                          <input 
                            type="text" 
                            placeholder="Grand View Resort (40 Rooms)" 
                            value={newRevProperty} 
                            onChange={(e) => setNewRevProperty(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-750 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">Comment</label>
                        <textarea 
                          required 
                          rows={3}
                          placeholder="How has the PMS improved your hotel workflows?" 
                          value={newRevComment} 
                          onChange={(e) => setNewRevComment(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-750 focus:outline-none font-sans"
                        />
                      </div>
                      <div className="flex justify-between items-center pt-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-450">Rating:</span>
                          <select 
                            value={newRevRating} 
                            onChange={(e) => setNewRevRating(Number(e.target.value))} 
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
                          >
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                          </select>
                        </div>
                        <button 
                          type="submit" 
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md shadow-blue-500/10"
                        >
                          Log Feedback
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Review cards scroll area */
                  <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                    {customerReviews.map((rev) => (
                      <div key={rev.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-left space-y-3 relative hover:border-blue-200 transition-all">
                        <div className="absolute top-4 right-4 flex gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-xs text-blue-600">
                            {rev.avatarText}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{rev.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">{rev.role} • {rev.property}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-655 font-medium leading-relaxed italic flex gap-1.5">
                          <Quote className="w-4 h-4 text-slate-200 shrink-0" />
                          "{rev.comment}"
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rev.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 11: // Slide 12: Competition Study
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Market Competition Study
              </h2>
              <p className="text-sm text-slate-655 leading-relaxed">
                Traditional PMS platforms are bloated with unused tabs, charge steep setup fees, and require guests to install separate apps for room service.
              </p>
              
              {/* Selector */}
              <div className="space-y-2">
                {[
                  { id: 'cloudbeds', label: 'vs. Cloudbeds (Modern SaaS)' },
                  { id: 'opera', label: 'vs. Opera PMS (Oracle Enterprise)' },
                  { id: 'ezee', label: 'vs. eZee Absolute (Traditional PMS)' }
                ].map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => setCompetitorMatchup(comp.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all ${competitorMatchup === comp.id ? 'bg-blue-600/10 border-blue-200 text-blue-700 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {comp.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-md text-left space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Competitive Comparison Matrix</span>

                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3 text-xs">
                  <div className="font-bold text-slate-400">Feature Check</div>
                  <div className="font-black text-blue-600 text-center">Xane PMS</div>
                  <div className="font-bold text-slate-600 text-center uppercase font-mono">
                    {competitorMatchup === 'cloudbeds' && 'Cloudbeds'}
                    {competitorMatchup === 'opera' && 'Oracle Opera'}
                    {competitorMatchup === 'ezee' && 'eZee Absolute'}
                  </div>

                  <div className="py-1 font-semibold text-slate-600">Built-in Website Booking</div>
                  <div className="py-1 text-emerald-600 font-extrabold text-center">✅ Free (Included)</div>
                  <div className="py-1 text-red-500 font-bold text-center">
                    {competitorMatchup === 'cloudbeds' && '❌ Extra Fee ($)'}
                    {competitorMatchup === 'opera' && '❌ 3rd Party Add-on'}
                    {competitorMatchup === 'ezee' && '❌ Extra Module ($)'}
                  </div>

                  <div className="py-1 font-semibold text-slate-600">Built-in Agent Console</div>
                  <div className="py-1 text-emerald-600 font-extrabold text-center">✅ Native</div>
                  <div className="py-1 text-red-500 font-bold text-center">
                    {competitorMatchup === 'cloudbeds' && '❌ Manual Sheets'}
                    {competitorMatchup === 'opera' && '❌ Complex Setup'}
                    {competitorMatchup === 'ezee' && '❌ Separated'}
                  </div>

                  <div className="py-1 font-semibold text-slate-600">Guest Order KOT</div>
                  <div className="py-1 text-emerald-600 font-extrabold text-center">✅ Integrated (Free)</div>
                  <div className="py-1 text-red-500 font-bold text-center">
                    {competitorMatchup === 'cloudbeds' && '❌ 3rd Party POS'}
                    {competitorMatchup === 'opera' && '❌ Micros POS ($$$)'}
                    {competitorMatchup === 'ezee' && '❌ Burdensome Integration'}
                  </div>

                  <div className="py-1 font-semibold text-slate-600">Guest Portal App install</div>
                  <div className="py-1 text-emerald-600 font-extrabold text-center">✅ No (QR browser PIN)</div>
                  <div className="py-1 text-red-500 font-bold text-center">
                    {competitorMatchup === 'cloudbeds' && '❌ Needs App Download'}
                    {competitorMatchup === 'opera' && '❌ No Mobile Portal'}
                    {competitorMatchup === 'ezee' && '❌ Clunky Guest Web'}
                  </div>

                  <div className="py-1 font-semibold text-slate-600">Setup Duration</div>
                  <div className="py-1 text-emerald-600 font-extrabold text-center">✅ Under 24 Hrs</div>
                  <div className="py-1 text-red-500 font-bold text-center">
                    {competitorMatchup === 'cloudbeds' && '❌ 2 - 3 Weeks'}
                    {competitorMatchup === 'opera' && '❌ 2 - 6 Months'}
                    {competitorMatchup === 'ezee' && '❌ 7 - 14 Days'}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 font-semibold leading-relaxed">
                  <strong>Why Xane Wins:</strong> By consolidating KOT orders, agent commission metrics, and hotel direct bookings into one light PostgreSQL core, Xane PMS saves properties up to $600/month in licensing fees compared to competitors.
                </div>
              </div>
            </div>
          </div>
        );

      case 12: // Slide 13: Deletion Confirmation Demo
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Clean Interface, Safe Deletions
              </h2>
              <p className="text-sm text-slate-655 leading-relaxed">
                Keep operations clean. Avoid old databases and cluttered lists. Xane PMS features simple delete buttons across lists, secured with mandatory confirmations to prevent mistakes.
              </p>
              <div className="space-y-3 font-semibold text-slate-600 text-xs">
                <div className="flex gap-2.5 items-start">
                  <div className="p-1 rounded bg-blue-50 border border-blue-100 text-blue-500 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Zero Accidental Deletes:</strong> Double-check modals guard bookings, KOT tickets, expenses, and key settings.</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="p-1 rounded bg-blue-50 border border-blue-100 text-blue-500 mt-0.5">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Role-Restricted:</strong> Deletion rights are restricted solely to Admins and Managers.</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-md text-left space-y-4 relative">
                <span className="text-xs font-bold text-slate-700 block">Clean Interface Console</span>
                
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 text-xs font-semibold">
                  {demoRecords.length === 0 ? (
                    <div className="p-6 text-center text-slate-450">
                      All demo records deleted! Click Reset below.
                      <button 
                        onClick={() => setDemoRecords([
                          { id: 'BK-501', name: 'John Doe (Rm 102)', type: 'Booking' },
                          { id: 'BK-502', name: 'Sarah Connor (Rm 205)', type: 'Booking' },
                          { id: 'EXP-109', name: '$200 Laundry Detergent', type: 'Expense' }
                        ])}
                        className="block mx-auto mt-1.5 text-blue-600 hover:underline"
                      >
                        Reset List
                      </button>
                    </div>
                  ) : (
                    demoRecords.map((rec) => (
                      <div key={rec.id} className="p-3 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${rec.type === 'Booking' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {rec.type}
                          </span>
                          <span className="font-mono text-slate-400 ml-2">{rec.id}</span>
                          <h5 className="font-bold text-slate-800">{rec.name}</h5>
                        </div>
                        <button 
                          onClick={() => requestDeleteRecord(rec)}
                          className="p-1.5 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-650 hover:border-red-200 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Custom Confirmation Modal Simulation inside slide */}
                {confirmModalData && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4 animate-fade-in z-20">
                    <div className="p-5 border border-slate-200 bg-white rounded-xl max-w-xs w-full space-y-3.5 shadow-lg">
                      <div className="flex gap-3 items-start">
                        <div className="p-1.5 bg-red-50 text-red-500 rounded-lg border border-red-100 shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-xs text-slate-800">Confirm Deletion</h4>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Are you sure you want to permanently delete **{confirmModalData.name} ({confirmModalData.id})**? This cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5 text-[10px] font-bold">
                        <button 
                          onClick={() => setConfirmModalData(null)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-550 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={confirmDeleteRecord}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-sm"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 13: // Slide 14: Seamless Onboarding
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Seamless Client Onboarding
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                Deploying Xane PMS for a new property takes under 24 hours. Our multi-tenant architecture ensures each client receives an isolated, secure environment.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-lg shrink-0 border border-blue-100">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">1. Instant Database Provisioning</h4>
                    <p className="text-[10px] text-slate-500 mt-1">We create a dedicated Supabase Postgres instance for each client, ensuring complete data isolation and security.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg shrink-0 border border-emerald-100">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">2. Quick Environment Setup</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Simply configure the secure <code>.env</code> file with the property's unique URLs and API keys.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-purple-50 text-purple-500 rounded-lg shrink-0 border border-purple-100">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">3. Vercel Cloud Deployment</h4>
                    <p className="text-[10px] text-slate-500 mt-1">The frontend and direct booking engine are instantly pushed to Vercel, providing a blazing-fast global edge network.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-5 rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 font-mono text-xs shadow-xl w-full max-w-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                  <RefreshCw className="w-24 h-24 animate-spin-slow text-blue-400" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-semibold tracking-wider opacity-70 ml-2">.env — Configuration</span>
                </div>
                <div className="space-y-2 opacity-90 leading-relaxed text-[11px]">
                  <p><span className="text-purple-400">DATABASE_URL</span>=<span className="text-emerald-300">"postgresql://postgres:pwd@db.supabase.co:5432/postgres"</span></p>
                  <p><span className="text-purple-400">HOTEL_NAME</span>=<span className="text-emerald-300">"New Client Resort & Spa"</span></p>
                  <p><span className="text-purple-400">VERCEL_PROJECT_ID</span>=<span className="text-emerald-300">"prj_7x9A1..."</span></p>
                  <p><span className="text-purple-400">NODE_ENV</span>=<span className="text-emerald-300">"production"</span></p>
                </div>
                <div className="mt-6 border-t border-slate-700/50 pt-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                    <Check className="w-3.5 h-3.5" /> <span>Deploying to Vercel Edge Network...</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-blue-500 rounded-full relative">
                      <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] opacity-60 flex justify-between font-sans font-medium">
                    <span>Provisioning Supabase... DONE</span>
                    <span>75%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 14: // Slide 15: Pricing & Discovery
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-12 space-y-6 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Flexible & Tailored Pricing
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                Every property has unique operational needs, room capacities, and feature requirements. We believe in customized value-based pricing, which is why our charges differ from client to client based on exact requirements.
              </p>
            </div>
            
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">1. Discovery Call</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                    We schedule a consultation to understand your exact bottlenecks, current software stack, and property size.
                  </p>
                </div>
              </div>
              
              <div className="p-6 rounded-2xl border border-blue-200 bg-blue-50 shadow-md flex flex-col items-center text-center space-y-4 relative scale-105 z-10">
                <div className="absolute -top-3 px-3 py-1 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  Required Step
                </div>
                <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">2. Requirements Mapping</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-2">
                    Do you need the Travel Agent portal? KOT integration? We define the exact scope of modules needed to run smoothly.
                  </p>
                </div>
              </div>
              
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">3. Clear Quotation</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                    We provide a transparent, upfront quotation with no hidden fees or surprise OTA-like percentage cuts on bookings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 15: // Slide 16: Startup Stats
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-5 space-y-6 text-left">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Traction & Growth
              </h2>
              <p className="text-sm text-slate-650 leading-relaxed">
                We've built Xane PMS with extreme capital efficiency. Through robust modern cloud architecture, our core running costs are virtually zero.
              </p>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Development Cost</span>
                  <span className="text-2xl font-black text-emerald-600">₹0</span>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Running Cost</span>
                  <span className="text-2xl font-black text-blue-600">₹0</span>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-7 flex justify-center">
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xl w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-800">Latest Client Onboarded</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">Sat, 23 May</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200">
                      FH
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800">Faraz Hashmi</h4>
                      <p className="text-xs text-slate-500 font-medium">Fyra Group</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount Paid</span>
                      <span className="font-black text-emerald-600 text-xl">₹54,000</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold italic text-right -mt-2">Upfront Yearly Cost</div>
                    
                    <div className="border-t border-slate-200/60 pt-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          Opted in for <span className="font-bold text-slate-800">Complete Social Media Optimization</span>. Quote includes an additional <span className="font-bold text-purple-600 bg-purple-50 px-1 rounded">10% fixed commission</span> on every sale for 1 year.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 16: // Slide 17: Call to Action / Pitch Wrap-up
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full max-w-5xl mx-auto py-4">
            <div className="lg:col-span-6 space-y-6 text-left">
              <h2 className="text-3xl lg:text-5xl font-black text-slate-950">
                Elevate Hospitality Operations
              </h2>
              <p className="text-base lg:text-lg text-slate-655 leading-relaxed">
                Connect your team, delight guests, and prevent operational leakages. Deploy Xane PMS for your property in under 24 hours.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600">
                  <Check className="w-3.5 h-3.5" /> 24-Hour Setup
                </div>
                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-600">
                  <Check className="w-3.5 h-3.5" /> Staff Training
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-600">
                  <Check className="w-3.5 h-3.5" /> Cloud Sync
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 flex justify-center relative">
              {/* Confetti Animation Elements */}
              {triggerConfetti && (
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full relative">
                    {Array.from({ length: 40 }).map((_, i) => {
                      const leftPos = Math.random() * 100;
                      const size = 6 + Math.random() * 12;
                      const delay = Math.random() * 2;
                      const color = ['bg-blue-500', 'bg-emerald-400', 'bg-yellow-400', 'bg-purple-500', 'bg-red-400'][Math.floor(Math.random() * 5)];
                      return (
                        <div 
                          key={i} 
                          className={`absolute ${color} rounded-full opacity-75 animate-bounce`}
                          style={{
                            left: `${leftPos}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${size}px`,
                            height: `${size}px`,
                            animationDelay: `${delay}s`,
                            animationDuration: `${1.5 + Math.random() * 2.5}s`
                          }}
                        ></div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-md w-full max-w-md text-left space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-lg"></div>
                
                {!formSubmitted ? (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                        Schedule a Demo <TrendingUp className="w-4 h-4 text-blue-500" />
                      </h3>
                      <p className="text-xs text-slate-400">We'll prepare a custom sandbox configuration for your hotel.</p>
                    </div>

                    <form onSubmit={handleLeadSubmit} className="space-y-3.5 text-xs font-semibold text-slate-650">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Full Name / Hotel
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="Grand View Resort"
                          value={leadProperty}
                          onChange={(e) => setLeadProperty(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <input 
                          type="email" 
                          required
                          placeholder="contact@resort.com"
                          value={leadEmail}
                          onChange={(e) => setLeadEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md shadow-blue-500/10"
                      >
                        Request Demo Sandbox Access
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-800">Request Received!</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Thank you! We've scheduled a demonstration proposal for **{leadProperty}**. We will follow up at **{leadEmail}** shortly.
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormSubmitted(false)}
                      className="text-xs text-slate-400 hover:text-slate-550 underline"
                    >
                      Fill another request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden select-none">
      
      {/* Sidebar - Matches App Layout sidebar (dark, sleek, slate-900) */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-5 text-slate-350 shrink-0">
        <div className="w-full px-5 mb-5 shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-white mb-0.5">Xane PMS</h1>
          <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Live Pitch Workspace</p>
        </div>

        <nav className="w-full flex-1 px-3 space-y-0.5 overflow-y-auto pr-1 select-none">
          {slideNavItems.map((item, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-semibold ${
                  isActive 
                    ? 'bg-blue-600/15 text-blue-400 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <div className="text-left">
                  <p className="truncate font-semibold text-[11px]">{item.name}</p>
                  <p className={`text-[8px] uppercase font-bold truncate tracking-wide ${isActive ? 'text-blue-500/80' : 'text-slate-550'}`}>{item.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="w-full px-3 mt-auto shrink-0 pt-4">
          <div className="p-3 bg-slate-800 rounded-lg text-xs mb-3 font-semibold text-slate-450 border border-slate-750">
            <p className="text-slate-300 font-bold">Xane Pitch Deck</p>
            <p className="text-[9px] text-slate-500 mt-0.5 font-mono">Presenting 14 slides</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-3 py-2 w-full rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-850 hover:text-white"
          >
            Exit Workspace
          </button>
        </div>
      </aside>

      {/* Main Content Workspace - matches the App Layout layout (light, gray-50 bg, white header) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full bg-gray-50 text-slate-900">
        
        {/* Workspace Header */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold tracking-tight text-gray-800">
              Interactive Pitch Deck Workspace
            </h2>
            <span className="text-[10px] px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full font-bold uppercase">
              Presenter Mode
            </span>
          </div>

          {/* Progress Indicators in Header */}
          <div className="hidden md:flex items-center gap-1 text-slate-550 text-xs font-semibold">
            {Array.from({ length: slideCount }).map((_, idx) => (
              <div 
                key={idx} 
                onClick={() => setCurrentSlide(idx)}
                className={`w-3.5 h-1 rounded-full cursor-pointer transition-all ${idx === currentSlide ? 'bg-blue-600 w-7' : idx < currentSlide ? 'bg-slate-300' : 'bg-slate-200'}`}
                title={`Go to Slide ${idx + 1}`}
              ></div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono font-bold mr-1">
              SLIDE {currentSlide + 1} / {slideCount}
            </span>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-xs px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-semibold shadow-sm transition-all"
            >
              Exit to Dashboard
            </button>
          </div>
        </header>

        {/* Slide viewport */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto h-full flex items-center justify-center">
            {renderSlideContent()}
          </div>
        </div>

        {/* Footer controls */}
        <footer className="h-14 border-t border-gray-200 bg-white flex justify-between items-center px-6 z-10 shrink-0 text-xs select-none">
          <span className="text-slate-400 font-semibold">
            Keys: <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[9px]">←</kbd> / <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[9px]">→</kbd> / <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[9px]">Space</kbd>
          </span>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`p-1.5 rounded-lg border transition-all ${currentSlide === 0 ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button 
              onClick={nextSlide}
              disabled={currentSlide === slideCount - 1}
              className={`p-1.5 rounded-lg border transition-all ${currentSlide === slideCount - 1 ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="font-extrabold text-blue-650 uppercase font-mono tracking-wider">
            {slideNavItems[currentSlide].name.split('. ')[1]}
          </span>
        </footer>

      </main>

    </div>
  );
}
