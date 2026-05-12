import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Building2, 
  CalendarDays, 
  CreditCard, 
  Users, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rooms, setRooms] = useState(50);
  const pricePerRoom = 400;

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 300], [0, 100]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <CalendarDays className="w-6 h-6 text-indigo-500" />,
      title: "Intelligent Booking Engine",
      description: "Manage reservations with a drag-and-drop Gantt chart. Prevent double bookings and automate availability syncing."
    },
    {
      icon: <Users className="w-6 h-6 text-emerald-500" />,
      title: "B2B Agent Portal",
      description: "Give travel agents a dedicated, secure portal to book rooms directly with custom commission rates."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-500" />,
      title: "Expense & Revenue Tracking",
      description: "Automated invoicing and detailed expense tracking. Generate real-time P&L reports with zero manual effort."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
      title: "Smart Housekeeping",
      description: "Auto-generate daily task lists for cleaning staff based on check-outs and room statuses."
    }
  ];

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold text-xl tracking-tight ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}>
              Xane PMS
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="text-slate-600 hover:text-indigo-600 transition-colors">Pricing</a>
            <Link to="/login">
              <Button variant={isScrolled ? "outline" : "outline"} className={`border-slate-300 ${!isScrolled && 'bg-white/50 backdrop-blur-sm'}`}>
                Sign In
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                Get Started
              </Button>
            </Link>
          </div>

          <button className="md:hidden text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden flex flex-col gap-6 text-lg font-medium">
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <div className="h-px bg-slate-100 my-4" />
          <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
          <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
            <Button className="w-full bg-indigo-600">Get Started</Button>
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-white -z-10" />
        
        <motion.div 
          style={{ opacity: heroOpacity, y: heroY }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            The Next-Gen Property Management System
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6"
          >
            Run your hotel like a <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
              world-class enterprise.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Streamline bookings, manage travel agents, track expenses, and automate housekeeping—all from one beautiful, lightning-fast dashboard.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login">
              <Button size="lg" className="h-14 px-8 text-base bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200/50 w-full sm:w-auto">
                Start Your Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-slate-300 w-full sm:w-auto">
                Book a Demo
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard Mockup Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          className="max-w-6xl mx-auto mt-20 relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur-2xl opacity-20" />
          <div className="relative rounded-2xl border border-slate-200/50 bg-white/50 backdrop-blur-xl shadow-2xl p-2 md:p-4">
            <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-[16/9] flex items-center justify-center relative">
              {/* Abstract Representation of the UI since we don't have an image */}
              <div className="absolute inset-0 grid grid-cols-12 gap-4 p-4 md:p-8 opacity-80">
                <div className="col-span-3 hidden md:block bg-white rounded-lg shadow-sm border border-slate-100" />
                <div className="col-span-12 md:col-span-9 flex flex-col gap-4">
                  <div className="h-16 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center px-4">
                     <div className="w-32 h-4 bg-slate-100 rounded" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-gradient-to-br from-indigo-50 to-white rounded-lg shadow-sm border border-indigo-100 p-4" />
                    <div className="h-24 bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm border border-blue-100 p-4" />
                    <div className="h-24 bg-gradient-to-br from-emerald-50 to-white rounded-lg shadow-sm border border-emerald-100 p-4" />
                  </div>
                  <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-100 p-4">
                     <div className="w-full h-8 bg-slate-50 rounded mb-4" />
                     <div className="w-full h-full bg-slate-50/50 rounded" />
                  </div>
                </div>
              </div>
              <div className="z-10 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <span className="font-semibold text-slate-800">Beautifully crafted interface</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
              Everything you need. <br /> Nothing you don't.
            </h2>
            <p className="text-lg text-slate-600">
              We stripped away the clutter of legacy hotel software to give you a tool that your staff will actually love using.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: idx * 0.1 } }
                }}
              >
                <Card className="p-6 h-full border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 bg-slate-50/50 group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariant}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
                Predictable pricing.<br /> Scales with your property.
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-lg">
                No hidden setup fees. No complex tiers. Just a simple, flat rate based on your actual capacity. Perfect for boutique hotels and large resorts alike.
              </p>
              
              <ul className="space-y-4 mb-8">
                {['Unlimited Staff Accounts', 'Unlimited Travel Agent Logins', 'Free Data Migration', '24/7 Priority Support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Pricing Calculator Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-8 md:p-12 text-white shadow-2xl">
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-semibold mb-2">Estimate Your Monthly Cost</h3>
                  <p className="text-slate-400 text-sm">Drag the slider to adjust your room count</p>
                </div>

                <div className="mb-12">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-slate-300 font-medium">Number of Rooms</span>
                    <span className="text-4xl font-bold text-white">{rooms}</span>
                  </div>
                  
                  {/* Custom Range Slider */}
                  <div className="relative w-full h-2 bg-slate-700 rounded-full">
                    <div 
                      className="absolute h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(rooms / 500) * 100}%` }}
                    />
                    <input 
                      type="range" 
                      min="1" 
                      max="500" 
                      value={rooms}
                      onChange={(e) => setRooms(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="absolute h-6 w-6 bg-white rounded-full shadow-md top-1/2 -translate-y-1/2 border-2 border-indigo-500 pointer-events-none transition-all"
                      style={{ left: `calc(${(rooms / 500) * 100}% - 12px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-3 font-medium">
                    <span>1 Room</span>
                    <span>500+ Rooms</span>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Total Monthly Rate</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl md:text-5xl font-extrabold text-white">₹{(rooms * pricePerRoom).toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">/mo</span>
                    </div>
                    <div className="text-indigo-300 text-sm mt-1">₹{pricePerRoom} per room</div>
                  </div>
                  
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button className="w-full h-14 px-8 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-lg border-none">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white text-center px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpVariant}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Ready to upgrade your hotel's operations?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Join the hotels already using Xane PMS to save time and increase revenue.
          </p>
          <Link to="/login">
            <Button size="lg" className="h-14 px-10 text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200">
              Create Your Account Now
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-900">Xane PMS</span>
          </div>
          <div className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Xane Media. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-indigo-600">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600">Terms of Service</a>
            <a href="#" className="hover:text-indigo-600">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
