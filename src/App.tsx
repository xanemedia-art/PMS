/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import RoomsPage from './pages/RoomsPage';
import PlansPage from './pages/PlansPage';
import HousekeepingPage from './pages/HousekeepingPage';
import AgentsPage from './pages/AgentsPage';
import ReportsPage from './pages/ReportsPage';
import ExpensesPage from './pages/ExpensesPage';
import SettingsPage from './pages/SettingsPage';
import BillingPage from './pages/BillingPage';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

import LandingPage from './pages/LandingPage';
import BookingEnginePage from './pages/BookingEnginePage';
import GuestLoginPage from './pages/GuestLoginPage';
import GuestPortalPage from './pages/GuestPortalPage';
import GuestRequestsPage from './pages/GuestRequestsPage';
import RestaurantPage from './pages/RestaurantPage';
import PresentationPage from './pages/PresentationPage';
import SuperAdminPage from './pages/SuperAdminPage';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MainRoutes() {
  const { user, isAuthenticated, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSubscriptionExpired, setIsSubscriptionExpired] = React.useState(false);
  const [dues, setDues] = React.useState(6000);
  const [subStatus, setSubStatus] = React.useState<any>(null);

  // Check subscription status
  React.useEffect(() => {
    if (!isAuthenticated || user?.role === 'super_admin') {
      setIsSubscriptionExpired(false);
      return;
    }

    const checkSub = async () => {
      try {
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 402) {
          setIsSubscriptionExpired(true);
          const data = await res.json();
          setDues(data.subscriptionDues || 6000);
          setSubStatus(data);
        } else if (res.ok) {
          const data = await res.json();
          if (data.subscriptionStatus === 'expired') {
            setIsSubscriptionExpired(true);
            setDues(data.subscriptionDues || 6000);
            setSubStatus(data);
          } else {
            setIsSubscriptionExpired(false);
          }
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };

    checkSub();
    const interval = setInterval(checkSub, 30000);

    // Setup global fetch interceptor for 402 responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 402) {
        setIsSubscriptionExpired(true);
        try {
          const clone = response.clone();
          const errData = await clone.json();
          if (errData.subscriptionDues) {
            setDues(errData.subscriptionDues);
          }
        } catch (e) {}
      }
      return response;
    };

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
    };
  }, [isAuthenticated, token, user]);

  // Load Razorpay dynamically if blocked
  const isBillingRoute = location.pathname === '/settings' && new URLSearchParams(location.search).get('tab') === 'billing';
  const shouldBlock = isSubscriptionExpired && !isBillingRoute;

  React.useEffect(() => {
    if (shouldBlock && !window.hasOwnProperty('Razorpay')) {
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
  }, [shouldBlock]);

  const handlePayBlocker = async () => {
    try {
      const res = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }
      const orderData = await res.json();
      
      const options = {
        key: subStatus?.razorpayKeyId || 'rzp_live_SufeFLg6s8EJfH',
        amount: orderData.amount, // already in paise
        currency: orderData.currency,
        name: 'PMS Subscription',
        description: `Subscription Renewal`,
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
            if (!verifyRes.ok) throw new Error('Payment verification failed');
            alert('Subscription payment successful! Dashboard unlocked.');
            setIsSubscriptionExpired(false);
            window.location.reload();
          } catch (err: any) {
            alert('Verification failed: ' + err.message);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#C5A880'
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert('Payment initialization failed: ' + err.message);
    }
  };
  
  return (
    <div className="relative min-h-screen">
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/book/:hotelId" element={<BookingEnginePage />} />
        <Route path="/h/:slug/book" element={<BookingEnginePage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/h/:slug/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/guest/login" element={<GuestLoginPage />} />
        <Route path="/guest" element={<GuestPortalPage />} />
        <Route path="/h/:slug/guest/login" element={<GuestLoginPage />} />
        <Route path="/h/:slug/guest" element={<GuestPortalPage />} />
        <Route path="/pitch" element={<PresentationPage />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={user?.role === 'agent' ? <Navigate to="/agent" replace /> : <DashboardPage />} />
          <Route path="/agent" element={<BookingsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/housekeeping" element={<HousekeepingPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guest-requests" element={<GuestRequestsPage />} />
          <Route path="/restaurant" element={<RestaurantPage />} />
        </Route>
      </Routes>

      {shouldBlock && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Subscription Expired</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your Property Management System subscription has expired. Please clear the pending dues to unlock dashboard access.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Outstanding Dues</span>
                <span className="text-base font-mono font-bold text-rose-500">
                  ₹{Number(dues).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                <span className="text-slate-400 font-semibold">Associated Property</span>
                <span className="text-white font-bold text-xs truncate max-w-[200px]">
                  {subStatus?.name || 'Property Branch'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handlePayBlocker}
                className="w-full bg-[#C5A880] hover:bg-[#b0946d] text-white font-extrabold h-11 rounded-xl shadow-lg shadow-[#C5A880]/15 flex items-center justify-center gap-2 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Pay & Renew Now
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/settings?tab=billing')}
                className="w-full bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-300 font-bold h-11 rounded-xl transition-all"
              >
                Access Billing Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainRoutes />
      </Router>
    </AuthProvider>
  );
}

