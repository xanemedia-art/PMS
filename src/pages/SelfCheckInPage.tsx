import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Calendar, User, Users, Phone, Mail, ShieldCheck, 
  MapPin, CheckCircle2, ChevronRight, ArrowLeft, FileText, 
  Car, Clock, Sparkles, Plus, Trash2, QrCode, Download, ExternalLink, BedDouble
} from 'lucide-react';
import { format } from 'date-fns';
import { getQrCodePngUrl } from '../utils/qrCode';

interface Member {
  id?: string;
  name: string;
  age: string | number;
  gender: string;
  relationship: string;
}

export default function SelfCheckInPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [hotelData, setHotelData] = useState<any>(null);

  // Stepped Form State
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Form Fields
  const [members, setMembers] = useState<Member[]>([]);
  const [formalities, setFormalities] = useState({
    idProofType: 'Aadhaar Card',
    idProofNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    purposeOfVisit: 'Tourism / Leisure',
    vehicleNumber: '',
    emergencyContact: '',
    declarationAccepted: false
  });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/public/checkin/${token}`)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Check-in link not found or expired');
        }
        return res.json();
      })
      .then(data => {
        setBookingData(data.booking);
        setHotelData(data.hotel);
        if (data.booking.guestMembers && Array.isArray(data.booking.guestMembers)) {
          setMembers(data.booking.guestMembers);
        } else {
          setMembers([]);
        }
        if (data.booking.checkInDetails) {
          setFormalities(prev => ({
            ...prev,
            ...data.booking.checkInDetails,
            declarationAccepted: true
          }));
        }
        if (data.booking.selfCheckInCompleted) {
          setIsCompleted(true);
        }
      })
      .catch(err => {
        console.error('Failed to load check-in:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAddMember = () => {
    setMembers(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', age: '', gender: 'Male', relationship: 'Family Member' }
    ]);
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx: number, field: keyof Member, value: any) => {
    setMembers(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmitCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formalities.declarationAccepted) {
      alert("Please confirm the guest declaration and hotel policies.");
      return;
    }
    if (!formalities.idProofNumber.trim()) {
      alert("Please provide your ID document number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestMembers: members,
          checkInDetails: formalities
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit check-in formalities');
      }

      setIsCompleted(true);
    } catch (err: any) {
      alert(err.message || 'Check-in submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold tracking-widest text-sm uppercase animate-pulse">
          Loading Reservation & Formalities...
        </p>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black">Link Expired or Invalid</h2>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            {error || 'We could not retrieve this reservation. Please ask hotel front desk or reception for a fresh check-in link.'}
          </p>
          <div className="pt-2">
            <Link 
              to="/book" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all"
            >
              Go to Booking Engine
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Self Check-in Completed Digital Boarding Pass
  if (isCompleted) {
    const checkInPassUrl = `${window.location.origin}/checkin/${token}`;
    const qrPng = getQrCodePngUrl(checkInPassUrl, 320);

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 md:p-10 flex flex-col items-center justify-center selection:bg-amber-500/30">
        <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800/80 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-300">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-transparent p-8 border-b border-slate-800 flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold mb-3">
                <CheckCircle2 size={14} /> Express Check-In Verified
              </div>
              <h1 className="text-2xl font-black tracking-tight">{hotelData?.name || 'Luxury Hotel'}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-medium">
                <MapPin size={12} className="text-amber-400 shrink-0" /> {hotelData?.address || 'Premium Resort & Suites'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Pass ID</span>
              <span className="font-mono text-base font-black text-amber-400">#B-{bookingData.id}</span>
            </div>
          </div>

          {/* Pass Body */}
          <div className="p-8 space-y-6">
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/60 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800/60">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Lead Guest</span>
                  <p className="text-base font-black text-white">{bookingData.guestName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Room Category</span>
                  <p className="text-sm font-bold text-amber-300">{bookingData.roomTypeName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Check-In</span>
                  <p className="font-bold text-slate-200 mt-0.5">
                    {format(new Date(bookingData.checkInDate), 'EEE, MMM dd, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Check-Out</span>
                  <p className="font-bold text-slate-200 mt-0.5">
                    {format(new Date(bookingData.checkOutDate), 'EEE, MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {members.length > 0 && (
                <div className="pt-3 border-t border-slate-800/60">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Accompanying Guests ({members.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300">
                        {m.name || `Member ${idx + 1}`} {m.relationship ? `(${m.relationship})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reception QR Code Box */}
            <div className="bg-gradient-to-b from-slate-950 to-slate-900 p-6 rounded-3xl border border-slate-800 text-center space-y-3 shadow-inner">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Scan At Frontdesk For Instant Room Key
              </p>
              <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-2xl flex items-center justify-center">
                <img src={qrPng} alt="Self Check-In QR" className="w-full h-full object-contain" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Show this digital boarding pass upon arrival at reception for 5-second express key pickup.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                <Download size={14} /> Save / Print Pass
              </button>
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${hotelData?.name || 'Hotel'} - Express Check-In Pass`,
                      text: `Here is my verified express check-in pass for ${hotelData?.name || 'the hotel'}.`,
                      url: window.location.href
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copied to clipboard!");
                  }
                }}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <ExternalLink size={14} /> Share Pass
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multi-Step Check-In Wizard
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30">
      
      {/* Top Brand Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center font-black">
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white">{hotelData?.name || 'Xane Luxury Hotels'}</h1>
              <p className="text-[10px] text-slate-400 font-semibold">Official Guest Express Check-In</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            #B-{bookingData.id}
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
          <span>Step {step} of 3</span>
          <span className="text-amber-400">
            {step === 1 ? 'Stay & Primary Guest' : step === 2 ? 'Accompanying Members' : 'Verification Formalities'}
          </span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmitCheckIn} className="space-y-8">

          {/* STEP 1: PRE-FILLED STAY & GUEST DETAILS */}
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Review Stay Information</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  We pre-filled your reservation details below. Please verify and continue.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Primary Guest</span>
                    <p className="text-lg font-bold text-white flex items-center gap-2">
                      <User size={16} className="text-amber-400" /> {bookingData.guestName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contact Number</span>
                    <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Phone size={14} className="text-amber-400" /> {bookingData.guestPhone || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Check-In Date</span>
                    <p className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Calendar size={13} className="text-amber-400" />
                      {format(new Date(bookingData.checkInDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Check-Out Date</span>
                    <p className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Calendar size={13} className="text-amber-400" />
                      {format(new Date(bookingData.checkOutDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Room Category</span>
                    <p className="font-bold text-amber-300 flex items-center gap-1.5 truncate">
                      <BedDouble size={13} className="text-amber-400 shrink-0" />
                      {bookingData.roomTypeName}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Settlement Status:</span>
                  <span className={`font-bold capitalize px-3 py-1 rounded-full text-[11px] ${
                    bookingData.paymentStatus === 'paid' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {bookingData.paymentStatus === 'paid' ? 'Paid in Full' : 'Pay at Checkout'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  Continue to Members <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: ACCOMPANYING MEMBERS */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Accompanying Guests</h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Add or verify details of all members staying with {bookingData.guestName}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> Add Member
                </button>
              </div>

              {members.length === 0 ? (
                <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                    <Users size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-300">Traveling solo or haven't added members yet?</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                    If anyone else is staying in your room, click below to add their details so reception can prepare your stay.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors"
                  >
                    <Plus size={14} /> Add Member Details
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={14} /> Member {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Full Name</label>
                          <input
                            type="text"
                            placeholder="Member's Full Name"
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 h-10 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Age</label>
                          <input
                            type="number"
                            placeholder="Age"
                            value={member.age}
                            onChange={(e) => handleMemberChange(idx, 'age', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 h-10 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Gender</label>
                          <select
                            value={member.gender}
                            onChange={(e) => handleMemberChange(idx, 'gender', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 h-10 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Relationship to Primary Guest</label>
                        <select
                          value={member.relationship}
                          onChange={(e) => handleMemberChange(idx, 'relationship', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 h-10 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="Spouse">Spouse / Partner</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Family Member">Family Member</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-slate-800 hover:bg-slate-900 text-slate-400 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  Proceed to Verification <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ESSENTIAL FORMALITIES */}
          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Identification & Legal Formalities</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Required by hospitality regulations. Complete once to enjoy express 5-second check-in.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                
                {/* ID Proof */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} /> Government ID Proof
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400">ID Document Type</label>
                      <select
                        value={formalities.idProofType}
                        onChange={(e) => setFormalities({ ...formalities, idProofType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        required
                      >
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="Passport">Passport</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="Other Official ID">Other Government ID</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Document / ID Number</label>
                      <input
                        type="text"
                        placeholder="e.g. XXXX-XXXX-XXXX or Passport No."
                        value={formalities.idProofNumber}
                        onChange={(e) => setFormalities({ ...formalities, idProofNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Residential Address */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                    <MapPin size={16} /> Residential Address
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Street / Area Address</label>
                      <input
                        type="text"
                        placeholder="Flat / House / Street Name"
                        value={formalities.address}
                        onChange={(e) => setFormalities({ ...formalities, address: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400">City</label>
                        <input
                          type="text"
                          placeholder="City"
                          value={formalities.city}
                          onChange={(e) => setFormalities({ ...formalities, city: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400">State</label>
                        <input
                          type="text"
                          placeholder="State"
                          value={formalities.state}
                          onChange={(e) => setFormalities({ ...formalities, state: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Country</label>
                        <input
                          type="text"
                          placeholder="Country"
                          value={formalities.country}
                          onChange={(e) => setFormalities({ ...formalities, country: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purpose of Stay & Vehicle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Purpose of Visit</label>
                    <select
                      value={formalities.purposeOfVisit}
                      onChange={(e) => setFormalities({ ...formalities, purposeOfVisit: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Tourism / Leisure">Tourism / Leisure</option>
                      <option value="Business / Work">Business / Work</option>
                      <option value="Transit / Layover">Transit / Layover</option>
                      <option value="Family Event / Wedding">Family Event / Wedding</option>
                      <option value="Medical">Medical</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Vehicle Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. DL 01 AB 1234"
                      value={formalities.vehicleNumber}
                      onChange={(e) => setFormalities({ ...formalities, vehicleNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 h-11 px-3 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Declaration Agreement */}
                <div className="pt-4 border-t border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formalities.declarationAccepted}
                      onChange={(e) => setFormalities({ ...formalities, declarationAccepted: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
                      required
                    />
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                      I declare that all the information provided above is correct. I and my accompanying guests agree to follow the standard hotel stay guidelines, identity verification protocols, and check-out regulations.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-slate-800 hover:bg-slate-900 text-slate-400 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formalities.declarationAccepted || !formalities.idProofNumber.trim()}
                  className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black rounded-2xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? (
                    <>Verifying & Confirming...</>
                  ) : (
                    <>Complete Self Check-In <CheckCircle2 size={16} /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </form>
      </main>
    </div>
  );
}
