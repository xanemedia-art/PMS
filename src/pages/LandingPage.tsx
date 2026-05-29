import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  CalendarDays, 
  Users, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Presentation,
  CheckCircle2,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [hotelsList, setHotelsList] = useState<{ id: number; name: string; address: string | null }[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [loadingHotels, setLoadingHotels] = useState(true);

  // Fetch hotels list on load to dynamic-link the booking engine
  useEffect(() => {
    async function fetchHotels() {
      try {
        const response = await fetch('/api/public/hotels');
        if (response.ok) {
          const data = await response.json();
          setHotelsList(data);
          if (data.length > 0) {
            setSelectedHotelId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to fetch hotels for public engine:', err);
      } finally {
        setLoadingHotels(false);
      }
    }
    fetchHotels();
  }, []);

  const portals = [
    {
      id: 'onboarding',
      icon: <Building2 className="w-8 h-8 text-indigo-400" />,
      title: "Hotel Onboarding Portal",
      description: "Are you a hotel operator? Sign up your property, configure rooms, and start hosting guest in under 60 seconds.",
      cta: "Register Property",
      link: "/signup",
      highlight: true,
      color: "from-indigo-600/30 to-indigo-500/10",
      borderColor: "border-indigo-500/30 hover:border-indigo-400/60"
    },
    {
      id: 'admin',
      icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
      title: "Staff & Admin Workspace",
      description: "Log in as Hotel Admin, Manager, Frontdesk, or Travel Agent to manage bookings, housekeeping tasks, invoices, and analytics.",
      cta: "Access Workspace",
      link: "/login",
      highlight: false,
      color: "from-slate-900 to-slate-950",
      borderColor: "border-slate-800 hover:border-slate-700"
    },
    {
      id: 'guest',
      icon: <UserCheck className="w-8 h-8 text-blue-400" />,
      title: "Guest Self-Service Portal",
      description: "Already staying with us? Log in using your Room PIN to request room service, chat with the front desk, or request cleaning.",
      cta: "Guest Portal Login",
      link: "/guest/login",
      highlight: false,
      color: "from-slate-900 to-slate-950",
      borderColor: "border-slate-800 hover:border-slate-700"
    },
    {
      id: 'booking-engine',
      icon: <CalendarDays className="w-8 h-8 text-pink-400" />,
      title: "Guest Booking Engine",
      description: "Book a room directly. Review real-time room availability, select standard/meal plans, and confirm reservations instantly.",
      cta: "Launch Booking Engine",
      link: selectedHotelId ? `/book/${selectedHotelId}` : '#',
      isDynamic: true,
      color: "from-slate-900 to-slate-950",
      borderColor: "border-slate-800 hover:border-slate-700"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* Background Radial Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
      
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Xane PMS
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/pitch">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900 gap-2">
                <Presentation className="w-4 h-4 text-indigo-400" />
                <span>Pitch Deck</span>
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                Onboard Property
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-sm font-semibold mb-6"
        >
          <Sparkles className="w-4 h-4" />
          The Next-Generation Hotel Operations Platform
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] mb-6 max-w-4xl"
        >
          One Enterprise Solution.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-indigo-500">
            Four Connected Portals.
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed"
        >
          Automate front desk, guest bookings, meal plans, housekeeping tasks, restaurant room service, and travel agents in one integrated environment.
        </motion.p>

        {/* Pitch Deck Primary Action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full mb-16"
        >
          <Link to="/pitch">
            <Button size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/25 flex items-center gap-3">
              <Presentation className="w-5 h-5" />
              <span>Launch PMS Pitch Deck</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Portals Section */}
      <section className="px-6 max-w-7xl mx-auto pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
            Choose Your Gateway Portal
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Xane PMS synchronizes property data across all four endpoints in real time. Select a portal below to interact.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {portals.map((portal, idx) => (
            <motion.div
              key={portal.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="h-full"
            >
              <Card className={`h-full bg-gradient-to-br ${portal.color} border ${portal.borderColor} transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl text-white group`}>
                <CardHeader className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    {portal.icon}
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                    {portal.title}
                    {portal.highlight && (
                      <span className="text-[10px] uppercase bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold tracking-wider">
                        Recommended
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-base leading-relaxed">
                    {portal.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-4">
                  {portal.isDynamic && (
                    <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-500 font-bold">
                        <span>Select Property Instance</span>
                        {loadingHotels && <span className="animate-pulse text-indigo-400">Loading properties...</span>}
                      </div>

                      {hotelsList.length > 0 ? (
                        <div className="flex gap-2">
                          <select 
                            value={selectedHotelId}
                            onChange={(e) => setSelectedHotelId(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {hotelsList.map((hotel) => (
                              <option key={hotel.id} value={hotel.id}>
                                {hotel.name} ({hotel.address || 'Global'})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic py-1 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-slate-600" />
                          <span>No hotels onboarded. Register a property first!</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="px-8 pb-8 pt-4">
                  {portal.isDynamic && hotelsList.length === 0 ? (
                    <Button 
                      disabled
                      className="w-full h-12 bg-slate-900 border border-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>Onboard Hotel First</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Link 
                      to={portal.isDynamic ? `/book/${selectedHotelId}` : portal.link} 
                      className="w-full"
                    >
                      <Button 
                        className={`w-full h-12 font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                          portal.highlight 
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 group-hover:text-white'
                        }`}
                      >
                        <span>{portal.cta}</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            <span className="font-extrabold text-slate-100">Xane PMS</span>
          </div>
          <div className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Xane Media Group. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-500 font-semibold">
            <Link to="/pitch" className="hover:text-indigo-400 transition-colors">Pitch Deck</Link>
            <Link to="/signup" className="hover:text-indigo-400 transition-colors">Onboarding</Link>
            <Link to="/login" className="hover:text-indigo-400 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
