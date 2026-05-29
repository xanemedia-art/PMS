import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Trash2, 
  Edit3, 
  Plus, 
  Lock, 
  Mail, 
  ShieldAlert, 
  Check, 
  X, 
  Settings, 
  Users, 
  Calendar, 
  BedDouble, 
  LogOut, 
  Activity, 
  MapPin, 
  ShieldCheck,
  Globe,
  DollarSign,
  Layers,
  ExternalLink,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

// List of all features with their display labels in English
const FEATURE_LIST = [
  { key: 'bookings', label: 'Core Bookings & Rooms' },
  { key: 'housekeeping', label: 'Housekeeping Operations' },
  { key: 'restaurant', label: 'Restaurant & Room Service' },
  { key: 'expenses', label: 'Expense Tracking' },
  { key: 'agents', label: 'Travel Agents' }
];

// Reusable custom CSS-rendered Xane Media Logo component (matching the image)
const XaneMediaLogo = () => (
  <div className="xane-logo-container select-none py-3">
    <div className="flex flex-col items-center">
      <div className="flex items-baseline relative">
        {/* White text with bright red shadow offsets mimicking the double-shadow brand look */}
        <span 
          className="text-white text-5xl font-black italic tracking-wider uppercase"
          style={{
            fontFamily: "'Montserrat', 'Arial Black', sans-serif",
            textShadow: '3px 3px 0px #ef4444, 4px 4px 0px #ef4444',
            transform: 'skewX(-6deg)'
          }}
        >
          Xane
        </span>
        <span 
          className="text-white text-5xl font-black italic tracking-wider uppercase ml-3.5"
          style={{
            fontFamily: "'Montserrat', 'Arial Black', sans-serif",
            textShadow: '3px 3px 0px #ef4444, 4px 4px 0px #ef4444',
            transform: 'skewX(-6deg) translateY(3px)'
          }}
        >
          Media
        </span>
      </div>
      <span className="text-[7.5px] text-white tracking-[0.45em] font-sans font-bold uppercase mt-4 opacity-90">
        Production & Management Co.
      </span>
      <span className="text-[6.5px] text-white tracking-[0.3em] font-sans font-semibold uppercase mt-2 opacity-60">
        Estd. 2020
      </span>
    </div>
  </div>
);

// Mouse-tracking cursor reactive spotlight luxury card component
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  hoverScale?: boolean;
}

function GlassCard({ 
  children, 
  className = '', 
  glowColor = 'rgba(239, 68, 68, 0.08)', // Crimson red accent spotlight
  hoverScale = true,
  ...props 
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      className={`relative border border-white/[0.04] bg-[#050505] transition-all duration-500 overflow-hidden shadow-2xl rounded-none ${className}`}
      style={{
        boxShadow: isFocused 
          ? '0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 0 15px rgba(239, 68, 68, 0.04)' 
          : '0 15px 35px -20px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.02)',
        transform: isFocused && hoverScale ? 'translateY(-2px)' : 'translateY(0px)'
      }}
      {...props}
    >
      {/* Spotlight overlay tracking the cursor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0"
        style={{
          background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 60%)`
        }}
      />
      {/* Outer border spotlight glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10"
        style={{
          border: '1px solid transparent',
          background: `radial-gradient(300px circle at ${coords.x}px ${coords.y}px, rgba(239, 68, 68, 0.2), transparent 45%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}

// Custom input component matching DynaPuff
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

function GlassInput({ label, icon, className = '', ...props }: GlassInputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-[11px] uppercase tracking-widest font-extrabold text-slate-450 block ml-1">
          {label}
        </label>
      )}
      <div className="relative group/input">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-rose-500 transition-colors">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-[#080808] border border-white/[0.04] rounded-none py-3 text-sm text-white placeholder-slate-650 transition-all duration-300 focus:outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 ${
            icon ? 'pl-11 pr-4' : 'px-4'
          } ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}

// Custom select field matching DynaPuff
interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
}

function GlassSelect({ label, icon, children, className = '', ...props }: GlassSelectProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-[11px] uppercase tracking-widest font-extrabold text-slate-450 block ml-1">
          {label}
        </label>
      )}
      <div className="relative group/select">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/select:text-rose-500 transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <select
          className={`w-full bg-[#080808] border border-white/[0.04] rounded-none py-3 text-sm text-white transition-all duration-300 focus:outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 appearance-none ${
            icon ? 'pl-11 pr-10' : 'px-4 pr-10'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
          <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { user, login, logout, token } = useAuth();
  const navigate = useNavigate();
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard states
  const [hotelsList, setHotelsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [error, setError] = useState('');

  // Modals states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<any>(null);

  // Form states for adding hotel
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelAddress, setNewHotelAddress] = useState('');
  const [newHotelSlug, setNewHotelSlug] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for editing hotel
  const [editHotelName, setEditHotelName] = useState('');
  const [editHotelAddress, setEditHotelAddress] = useState('');
  const [editHotelSlug, setEditHotelSlug] = useState('');
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editSubscriptionStatus, setEditSubscriptionStatus] = useState('trialing');
  const [editSubscriptionEndsAt, setEditSubscriptionEndsAt] = useState('');
  const [editSubscriptionDues, setEditSubscriptionDues] = useState(0);
  const [editSubscriptionPrice, setEditSubscriptionPrice] = useState(6000);

  // Credential Reset states (English Minimalist UI with DynaPuff font)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetHotel, setResetHotel] = useState<any>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Portal links clipboard state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch hotels on load
  const fetchHotels = async () => {
    if (user?.role !== 'super_admin' || !token) return;
    try {
      setLoadingHotels(true);
      const res = await fetch('/api/super-admin/hotels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch hotels data.');
      const data = await res.json();
      setHotelsList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoadingHotels(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchHotels();
    }
  }, [user, token]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }
      // Save details in context
      login(data.token, data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle Onboard New Hotel
  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName || !newAdminName || !newAdminEmail || !newAdminPassword) {
      alert('Please fill in all required fields.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/super-admin/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newHotelName,
          address: newHotelAddress,
          adminName: newAdminName,
          adminEmail: newAdminEmail,
          adminPassword: newAdminPassword,
          slug: newHotelSlug
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to onboard hotel.');
      
      alert('Hotel onboarded successfully!');
      setIsAddModalOpen(false);
      // Reset form
      setNewHotelName('');
      setNewHotelAddress('');
      setNewHotelSlug('');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      // Refresh list
      fetchHotels();
    } catch (err: any) {
      alert(err.message || 'Failed to onboard property.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (hotel: any) => {
    setEditingHotel(hotel);
    setEditHotelName(hotel.name);
    setEditHotelAddress(hotel.address || '');
    setEditFeatures(hotel.features ? hotel.features.split(',') : []);
    setEditSubscriptionStatus(hotel.subscriptionStatus || 'trialing');
    setEditSubscriptionEndsAt(
      hotel.subscriptionEndsAt 
        ? new Date(hotel.subscriptionEndsAt).toISOString().split('T')[0] 
        : ''
    );
    setEditSubscriptionDues(hotel.subscriptionDues || 0);
    setEditSubscriptionPrice(hotel.subscriptionPrice !== undefined && hotel.subscriptionPrice !== null ? hotel.subscriptionPrice : 6000);
    setEditHotelSlug(hotel.slug || '');
    setIsEditModalOpen(true);
  };

  // Toggle feature in list
  const handleToggleFeature = (featureKey: string) => {
    if (editFeatures.includes(featureKey)) {
      setEditFeatures(editFeatures.filter(f => f !== featureKey));
    } else {
      setEditFeatures([...editFeatures, featureKey]);
    }
  };

  // Handle Edit Hotel Update
  const handleEditHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHotelName) {
      alert('Hotel name is required.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/hotels/${editingHotel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editHotelName,
          address: editHotelAddress,
          features: editFeatures.join(','),
          subscriptionStatus: editSubscriptionStatus,
          subscriptionEndsAt: editSubscriptionEndsAt || null,
          subscriptionDues: parseFloat(editSubscriptionDues as any) || 0,
          subscriptionPrice: parseFloat(editSubscriptionPrice as any) || 6000,
          slug: editHotelSlug
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update details.');

      alert('Hotel details updated successfully!');
      setIsEditModalOpen(false);
      fetchHotels();
    } catch (err: any) {
      alert(err.message || 'Failed to save changes.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Hotel
  const handleDeleteHotel = async (hotelId: number, hotelName: string) => {
    const confirmation = prompt(`WARNING: Deleting "${hotelName}" will cascade-delete ALL users, rooms, bookings, menu items, and invoices. This action CANNOT be undone.\n\nType the hotel name exactly to confirm:`);
    if (confirmation !== hotelName) {
      alert('Confirmation name did not match. Deletion cancelled.');
      return;
    }
    
    try {
      const res = await fetch(`/api/super-admin/hotels/${hotelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete hotel workspace.');
      
      alert('Hotel and all associated data purged successfully.');
      fetchHotels();
    } catch (err: any) {
      alert(err.message || 'Failed to delete workspace.');
    }
  };

  // Open credentials reset modal
  const openResetModal = (hotel: any) => {
    setResetHotel(hotel);
    setResetEmail('');
    setResetPassword('');
    setIsResetModalOpen(true);
  };

  // Handle Reset Credentials (English translation & endpoints mapping)
  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetHotel) return;
    if (!resetEmail && !resetPassword) {
      alert('Please enter either an email address or a password.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`/api/super-admin/hotels/${resetHotel.id}/reset-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: resetEmail || undefined,
          password: resetPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset credentials.');

      alert('Credentials updated successfully for hotel: ' + resetHotel.name);
      setIsResetModalOpen(false);
      setResetEmail('');
      setResetPassword('');
      fetchHotels();
    } catch (err: any) {
      alert(err.message || 'Failed to save changes.');
    } finally {
      setResetLoading(false);
    }
  };

  // Copy link helper
  const handleCopyLink = (path: string, id: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Calculate cumulative stats
  const totalRooms = hotelsList.reduce((acc, h) => acc + (h.stats?.roomsCount || 0), 0);
  const totalBookings = hotelsList.reduce((acc, h) => acc + (h.stats?.bookingsCount || 0), 0);

  // Filter list by search query
  const filteredHotelsList = hotelsList.filter(hotel => 
    hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (hotel.address && hotel.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (hotel.slug && hotel.slug.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Inject luxury DynaPuff fonts and black configurations
  const styleInject = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&family=Montserrat:ital,wght@0,300;0,700;0,900;1,900&display=swap');
      
      /* Force DynaPuff font style globally across the super admin */
      body, html {
        font-family: 'DynaPuff', cursive !important;
        background-color: #000000 !important;
      }
      .cursive-title {
        font-family: 'DynaPuff', cursive !important;
        font-weight: 700;
      }
      /* Custom elegant scrollbar for tables */
      .glass-scroll::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      .glass-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .glass-scroll::-webkit-scrollbar-thumb {
        background: rgba(239, 68, 68, 0.2);
        border-radius: 0px;
      }
      .glass-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(239, 68, 68, 0.5);
      }
      input, select, textarea, button {
        font-family: 'DynaPuff', cursive !important;
      }
    `}</style>
  );

  // RENDER LOGIN SCREEN (IF NOT SUPER_ADMIN)
  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
        {styleInject}

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center mb-6">
            {/* Custom pure CSS replica of the brand's logo */}
            <XaneMediaLogo />
          </div>

          <GlassCard className="p-8 relative border border-white/[0.04]" glowColor="rgba(239, 68, 68, 0.15)">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white cursive-title">
                Console Authentication
              </h2>
              <p className="text-slate-400 text-xs mt-1.5 font-bold uppercase tracking-widest">Restricted Access</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-450 rounded-none text-xs flex items-center gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{loginError}</span>
                </motion.div>
              )}
              
              <GlassInput 
                label="Authorized Email Address"
                icon={<Mail className="w-4 h-4 text-rose-500" />}
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@xane.com" 
                required
              />

              <div className="space-y-1.5 relative">
                <GlassInput 
                  label="Secure Password"
                  icon={<Lock className="w-4 h-4 text-rose-500" />}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" 
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 bottom-3 text-slate-500 hover:text-rose-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button 
                type="submit" 
                disabled={loggingIn}
                className="w-full h-12 bg-transparent hover:bg-white text-white hover:text-black font-extrabold rounded-none border border-white flex items-center justify-center gap-2 mt-6 active:scale-[0.98] transition-all text-base"
              >
                {loggingIn ? (
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="cursive-title text-lg font-bold">Access Terminal</span>
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                  </>
                )}
              </Button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // RENDER SUPER-ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-black text-slate-100 p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden">
      {styleInject}

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header bar - borderless, mixing logo into the page */}
        <header className="flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-white/[0.04] pb-6">
          <div className="flex items-center gap-4">
            <XaneMediaLogo />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 lg:flex-none h-11 bg-transparent hover:bg-white text-white hover:text-black font-extrabold rounded-none border border-white flex items-center justify-center gap-2 px-6 text-sm active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 text-rose-500" />
              <span className="cursive-title text-base font-bold">Onboard Property</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { logout(); navigate('/'); }}
              className="h-11 border-white/[0.08] bg-transparent text-slate-350 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-2 rounded-none px-4 text-sm active:scale-[0.98] transition-all"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span className="cursive-title text-base font-bold">Exit Console</span>
            </Button>
          </div>
        </header>

        {/* Global Statistics Cards */}
        <section className="grid sm:grid-cols-3 gap-5">
          <GlassCard className="p-6" glowColor="rgba(239, 68, 68, 0.1)" hoverScale={true}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block">Total Properties</span>
              <div className="w-9 h-9 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-rose-500" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white tracking-tight cursive-title">{hotelsList.length}</div>
            <p className="text-xs text-slate-500 mt-2 font-semibold">Active isolated spaces running on Supabase Cloud</p>
          </GlassCard>

          <GlassCard className="p-6" glowColor="rgba(239, 68, 68, 0.1)" hoverScale={true}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block">Total Rooms</span>
              <div className="w-9 h-9 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <BedDouble className="w-4.5 h-4.5 text-rose-500" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white tracking-tight cursive-title">
              {loadingHotels ? (
                <span className="inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : totalRooms}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-semibold">Physical rooms allocated globally</p>
          </GlassCard>

          <GlassCard className="p-6" glowColor="rgba(239, 68, 68, 0.1)" hoverScale={true}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block">Cumulative Bookings</span>
              <div className="w-9 h-9 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Calendar className="w-4.5 h-4.5 text-rose-500" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white tracking-tight cursive-title">
              {loadingHotels ? (
                <span className="inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : totalBookings}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-semibold">Total reservation logs tracked across tenants</p>
          </GlassCard>
        </section>

        {/* Main Properties Section */}
        <GlassCard className="overflow-hidden" glowColor="rgba(239, 68, 68, 0.05)" hoverScale={false}>
          {/* Section Header Controls */}
          <div className="p-6 border-b border-white/[0.04] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white/[0.002]">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5 cursive-title">
                Onboarded Properties 
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </h2>
              <p className="text-xs text-slate-450 mt-1 font-semibold uppercase tracking-wider">Configure dynamic rates, unique sub-URL slugs, and modular access</p>
            </div>
            
            {/* Live search input */}
            <div className="relative w-full md:w-80 group/search">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 group-focus-within/search:text-white transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search properties, address, slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050505] border border-white/[0.04] rounded-none pl-10 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/40 focus:ring-4 focus:ring-rose-500/2 transition-all font-sans"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto w-full glass-scroll">
            {loadingHotels ? (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <span className="w-8 h-8 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-450 animate-pulse">Loading property sandboxes...</span>
              </div>
            ) : error ? (
              <div className="py-24 text-center text-rose-500 flex flex-col items-center justify-center gap-2.5">
                <ShieldAlert className="w-8 h-8 text-rose-500 animate-bounce" />
                <span className="text-lg font-bold cursive-title">{error}</span>
              </div>
            ) : filteredHotelsList.length === 0 ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <Building2 className="w-12 h-12 text-slate-800" />
                <span className="font-bold text-slate-450 uppercase tracking-widest text-xs">No matching entries found</span>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.03] bg-white/[0.002] text-slate-400 font-bold uppercase tracking-widest text-[9.5px]">
                    <th className="p-5 pl-6">Property Details</th>
                    <th className="p-5">Database Statistics</th>
                    <th className="p-5">Subscription Package</th>
                    <th className="p-5">Feature Modules</th>
                    <th className="p-5 pr-6 text-right">Control Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {filteredHotelsList.map((hotel) => {
                    const activeFeatures = hotel.features ? hotel.features.split(',') : [];
                    return (
                      <tr key={hotel.id} className="hover:bg-white/[0.01] transition-colors group/row">
                        <td className="p-5 pl-6">
                          <div className="font-bold text-white text-lg group-hover/row:text-rose-400 transition-colors cursive-title flex items-center gap-2">
                            {hotel.name}
                            <span className="text-[10px] bg-white/[0.04] text-slate-450 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide font-sans">
                              ID: {hotel.id}
                            </span>
                          </div>
                          
                          <div className="text-slate-400 text-sm mt-1.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                            <span className="font-semibold">{hotel.address || 'No address specified'}</span>
                          </div>

                          <div className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-wide font-sans">
                            Created: {new Date(hotel.createdAt).toLocaleDateString()}
                          </div>

                          {hotel.slug && (
                            <div className="mt-3.5 flex flex-col gap-1.5 text-xs max-w-xs font-sans">
                              <span className="text-[9px] uppercase font-extrabold text-rose-500 tracking-wider">Tenant URLs:</span>
                              
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-black border border-white/[0.03] px-2.5 py-1.5 rounded-none flex items-center justify-between font-mono text-[10px]">
                                  <span className="text-slate-400 truncate">Book: /h/{hotel.slug}/book</span>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button 
                                      onClick={() => handleCopyLink(`/h/${hotel.slug}/book`, `${hotel.id}-book`)}
                                      className="text-slate-500 hover:text-rose-500 p-0.5 rounded transition-colors"
                                      title="Copy Booking URL"
                                    >
                                      {copiedLink === `${hotel.id}-book` ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    <a href={`/h/${hotel.slug}/book`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-rose-500 p-0.5">
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-black border border-white/[0.03] px-2.5 py-1.5 rounded-none flex items-center justify-between font-mono text-[10px]">
                                  <span className="text-slate-400 truncate">Login: /h/{hotel.slug}/login</span>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button 
                                      onClick={() => handleCopyLink(`/h/${hotel.slug}/login`, `${hotel.id}-login`)}
                                      className="text-slate-500 hover:text-rose-500 p-0.5 rounded transition-colors"
                                      title="Copy Login URL"
                                    >
                                      {copiedLink === `${hotel.id}-login` ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    <a href={`/h/${hotel.slug}/login`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-rose-500 p-0.5">
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        
                        <td className="p-5">
                          <div className="space-y-2 text-xs font-semibold text-slate-350">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-none bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                                <BedDouble className="w-3.5 h-3.5 text-rose-500" />
                              </div>
                              <span>{hotel.stats?.roomsCount || 0} Rooms Allocated</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-none bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                                <Users className="w-3.5 h-3.5 text-rose-500" />
                              </div>
                              <span>{hotel.stats?.usersCount || 0} Staff & Agents</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-none bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                              </div>
                              <span>{hotel.stats?.bookingsCount || 0} Reservation Volume</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-5">
                          <div className="space-y-2 text-xs font-semibold">
                            <div>
                              <span className={`px-2.5 py-0.5 rounded-none text-[9.5px] font-extrabold border uppercase tracking-widest inline-block ${
                                hotel.subscriptionStatus === 'active' 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450 shadow-[0_0_12px_rgba(16,185,129,0.08)]' 
                                  : hotel.subscriptionStatus === 'trialing'
                                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-450 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-450 shadow-[0_0_12px_rgba(239,68,68,0.08)]'
                              }`}>
                                {hotel.subscriptionStatus || 'expired'}
                              </span>
                            </div>
                            
                            <div className="text-slate-400 font-bold text-xs flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                              Rate: <span className="text-white font-extrabold text-sm">₹{(hotel.subscriptionPrice !== null && hotel.subscriptionPrice !== undefined) ? hotel.subscriptionPrice.toLocaleString() : '6,000'}</span> / month
                            </div>
                            
                            {hotel.subscriptionDues > 0 && (
                              <div className="text-rose-400 font-extrabold flex items-center gap-1 text-[11px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-none w-max">
                                <span>Outstanding: ₹{hotel.subscriptionDues.toLocaleString()}</span>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
                              Ends: {hotel.subscriptionEndsAt ? new Date(hotel.subscriptionEndsAt).toLocaleDateString() : 'Continuous Trial'}
                            </div>
                          </div>
                        </td>

                        <td className="p-5">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {FEATURE_LIST.map((f) => {
                              const isActive = activeFeatures.includes(f.key);
                              return (
                                <span 
                                  key={f.key} 
                                  className={`px-2.5 py-0.5 rounded-none text-[10.5px] font-extrabold border transition-all ${
                                    isActive 
                                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-450 shadow-[0_0_10px_rgba(239,68,68,0.04)]' 
                                      : 'bg-white/[0.005] border-white/[0.01] text-slate-700 line-through font-normal'
                                  }`}
                                >
                                  {f.label.replace('Core ', '').split(' ')[0]}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="p-5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditModal(hotel)}
                              className="border-white/[0.08] bg-transparent text-slate-200 hover:text-black hover:bg-white hover:border-white h-9 rounded-none flex items-center gap-1.5 px-3.5 text-xs font-bold transition-all shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-rose-500" />
                              <span className="cursive-title font-bold text-sm">Manage</span>
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openResetModal(hotel)}
                              className="border-white/[0.08] bg-transparent text-slate-250 hover:text-black hover:bg-white hover:border-white h-9 w-9 rounded-none flex items-center justify-center p-0 shadow-sm transition-all"
                              title="Reset Admin Credentials"
                            >
                              <Key className="w-4 h-4 text-rose-500" />
                            </Button>
                            
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                              className="border-rose-950/40 bg-rose-550/5 text-rose-550 hover:text-white hover:bg-rose-600 hover:border-rose-550/50 h-9 w-9 rounded-none flex items-center justify-center p-0 shadow-sm transition-all"
                              title="Purge Workspace"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>

      </div>

      {/* MODAL 1: ADD PROPERTY ONBOARDING - SMALL & RED-BLACK SHARP GRADIENT */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-gradient-to-br from-[#200202] via-[#090101] to-black border border-red-650 rounded-none w-full max-w-xs shadow-2xl text-slate-100 overflow-hidden"
            >
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-500" />
                  <h3 className="text-base font-bold text-white cursive-title">Onboard Workspace</h3>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white rounded-none p-1 hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddHotel} className="p-4 space-y-4">
                
                <GlassInput 
                  label="Hotel Name"
                  type="text" 
                  value={newHotelName}
                  onChange={(e) => setNewHotelName(e.target.value)}
                  placeholder="Grand Horizon Resort"
                  required
                />
                
                <GlassInput 
                  label="Address"
                  type="text" 
                  value={newHotelAddress}
                  onChange={(e) => setNewHotelAddress(e.target.value)}
                  placeholder="Malibu Beach, CA"
                />

                <div className="space-y-1">
                  <GlassInput 
                    label="Unique Sub-URL Slug (Optional)"
                    type="text" 
                    value={newHotelSlug}
                    onChange={(e) => setNewHotelSlug(e.target.value)}
                    placeholder="grand-horizon"
                  />
                  <div className="text-[10px] text-slate-500 font-semibold px-0.5 leading-relaxed font-sans">
                    URL: <span className="font-mono text-rose-455">/h/{newHotelSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'hotel'}/book</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.05] pt-3.5">
                  <h4 className="text-xs uppercase font-extrabold text-rose-500 tracking-wider mb-3 flex items-center gap-1.5 cursive-title">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    Provision Workspace Administrator
                  </h4>
                  
                  <div className="space-y-3">
                    <GlassInput 
                      label="Administrator Full Name"
                      type="text" 
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="John Miller"
                      required
                    />

                    <GlassInput 
                      label="Admin Email Address"
                      type="email" 
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="admin@horizon.com"
                      required
                    />
                    
                    <GlassInput 
                      label="Provision Password"
                      type="password" 
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.05]">
                  <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-9 border border-white/[0.08] bg-transparent text-slate-400 hover:text-white rounded-none text-xs font-bold px-3 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading}
                    className="h-9 bg-transparent hover:bg-white text-white hover:text-black font-extrabold rounded-none border border-white text-xs px-4 active:scale-[0.98] transition-all"
                  >
                    {actionLoading ? 'Provisioning...' : 'Provision Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT PROPERTY - SMALL & RED-BLACK SHARP GRADIENT */}
      <AnimatePresence>
        {isEditModalOpen && editingHotel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-gradient-to-br from-[#200202] via-[#090101] to-black border border-red-650 rounded-none w-full max-w-xs shadow-2xl text-slate-100 overflow-hidden"
            >
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-rose-500" />
                  <h3 className="text-base font-bold text-white cursive-title">Manage Workspace</h3>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white rounded-none p-1 hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="glass-scroll max-h-[70vh] overflow-y-auto">
                <form onSubmit={handleEditHotel} className="p-4 space-y-4">
                  
                  <GlassInput 
                    label="Hotel Name"
                    type="text" 
                    value={editHotelName}
                    onChange={(e) => setEditHotelName(e.target.value)}
                    required
                  />
                  
                  <GlassInput 
                    label="Address"
                    type="text" 
                    value={editHotelAddress}
                    onChange={(e) => setEditHotelAddress(e.target.value)}
                  />

                  <div className="space-y-1">
                    <GlassInput 
                      label="Unique Sub-URL Slug"
                      type="text" 
                      value={editHotelSlug}
                      onChange={(e) => setEditHotelSlug(e.target.value)}
                      required
                    />
                    <div className="text-[9.5px] text-amber-500 font-bold px-0.5 leading-relaxed font-sans">
                      URL: <span className="font-mono text-rose-455">/h/{editHotelSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'hotel'}/book</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.05] pt-3.5">
                    <h4 className="text-xs uppercase font-extrabold text-rose-500 tracking-wider mb-3 flex items-center gap-1.5 cursive-title">
                      <Layers className="w-3.5 h-3.5" />
                      Feature Toggles & Modules
                    </h4>
                    
                    <div className="space-y-2">
                      {FEATURE_LIST.map((f) => {
                        const isChecked = editFeatures.includes(f.key);
                        return (
                          <div 
                            key={f.key}
                            onClick={() => handleToggleFeature(f.key)}
                            className={`flex items-center justify-between p-2.5 rounded-none border cursor-pointer select-none transition-all duration-300 ${
                              isChecked 
                                ? 'bg-rose-500/10 border-rose-500/30 text-white' 
                                : 'bg-black/60 border-white/[0.02] text-slate-500 hover:border-white/[0.06]'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">{f.label}</div>
                            </div>
                            
                            <div className={`w-4 h-4 rounded-none border flex items-center justify-center transition-all duration-300 ${
                              isChecked ? 'bg-rose-500 border-rose-500' : 'border-white/[0.08] bg-black'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.05] pt-3.5">
                    <h4 className="text-xs uppercase font-extrabold text-rose-500 tracking-wider mb-3 flex items-center gap-1.5 cursive-title">
                      <DollarSign className="w-3.5 h-3.5" />
                      Subscription Controls
                    </h4>
                    
                    <div className="space-y-3">
                      <GlassSelect 
                        label="Subscription Status"
                        value={editSubscriptionStatus}
                        onChange={(e) => setEditSubscriptionStatus(e.target.value)}
                      >
                        <option value="trialing">Trialing</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                      </GlassSelect>

                      <GlassInput 
                        label="Subscription Ends At"
                        type="date" 
                        value={editSubscriptionEndsAt}
                        onChange={(e) => setEditSubscriptionEndsAt(e.target.value)}
                      />

                      <GlassInput 
                        label="Outstanding Dues (₹)"
                        type="number" 
                        value={editSubscriptionDues}
                        onChange={(e) => setEditSubscriptionDues(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />

                      <GlassInput 
                        label="Custom Monthly Pricing (₹)"
                        type="number" 
                        value={editSubscriptionPrice}
                        onChange={(e) => setEditSubscriptionPrice(parseFloat(e.target.value) || 0)}
                        placeholder="6000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.05]">
                    <button 
                      type="button" 
                      onClick={() => setIsEditModalOpen(false)}
                      className="h-9 border border-white/[0.08] bg-transparent text-slate-400 hover:text-white rounded-none text-xs font-bold px-3 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={actionLoading}
                      className="h-9 bg-transparent hover:bg-white text-white hover:text-black font-extrabold rounded-none border border-white text-xs px-4 active:scale-[0.98] transition-all"
                    >
                      {actionLoading ? 'Saving...' : 'Save Workspace'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: CREDENTIALS RESET - SMALL & RED-BLACK SHARP GRADIENT */}
      <AnimatePresence>
        {isResetModalOpen && resetHotel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-gradient-to-br from-[#200202] via-[#090101] to-black border border-red-650 rounded-none w-full max-w-xs shadow-2xl text-slate-100 overflow-hidden"
            >
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-rose-500" />
                  <h3 className="text-base font-bold text-white cursive-title">Reset Credentials</h3>
                </div>
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="text-slate-400 hover:text-white rounded-none p-1 hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleResetCredentials} className="p-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 block ml-0.5">SELECTED WORKSPACE</span>
                  <div className="font-bold text-white text-sm bg-black border border-white/[0.04] rounded-none px-3.5 py-2 flex items-center justify-between">
                    <span>{resetHotel.name}</span>
                    <span className="text-[10px] bg-rose-500 text-white font-mono px-2 py-0.5 rounded-none uppercase font-sans">ID: {resetHotel.id}</span>
                  </div>
                </div>

                {/* E-mail Input */}
                <GlassInput 
                  label="New Email Address"
                  icon={<Mail className="w-4 h-4 text-rose-500 pointer-events-none" />}
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="new.admin@hotel.com"
                />

                {/* Password Input */}
                <GlassInput 
                  label="New Admin Password"
                  icon={<Lock className="w-4 h-4 text-rose-500 pointer-events-none" />}
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="enter a secure password"
                />

                {/* Safety Notice */}
                <div className="bg-black/80 border border-white/[0.03] rounded-none p-3.5 text-[10.5px] text-slate-500 leading-normal space-y-1 shadow-inner font-sans">
                  <div className="flex items-center gap-1.5 text-rose-500 font-extrabold tracking-wide uppercase text-[9.5px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>SECURITY WARNING</span>
                  </div>
                  <p className="font-semibold text-slate-450 leading-relaxed">
                    Warning: Changing credentials will immediately update the database. Active sessions will remain valid until token expiration.
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.05]">
                  <button 
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="h-9 border border-white/[0.08] bg-transparent text-slate-400 hover:text-white rounded-none text-xs font-bold px-3 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={resetLoading}
                    className="h-9 bg-transparent hover:bg-white text-white hover:text-black font-extrabold rounded-none border border-white text-xs px-4 active:scale-[0.98] transition-all"
                  >
                    {resetLoading ? 'Saving...' : 'Apply Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
