import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, BedDouble, ClipboardList, UserRoundCog, Users, BarChart3, Settings, LogOut, Wallet, Menu, X, Coffee, MessageSquare, Lock, CreditCard, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function NotificationBell({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef<boolean>(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);

      // Check for new notifications to show toast
      if (Array.isArray(data)) {
        const newToasts: any[] = [];
        data.forEach((notif: any) => {
          if (!seenIdsRef.current.has(notif.id)) {
            seenIdsRef.current.add(notif.id);
            if (!isFirstFetchRef.current) {
              newToasts.push(notif);
            }
          }
        });

        if (newToasts.length > 0) {
          setToasts(prev => [...prev, ...newToasts]);
          // Auto remove toasts after 6 seconds
          newToasts.forEach((notif) => {
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== notif.id));
            }, 6000);
          });
        }
        isFirstFetchRef.current = false;
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [token]);

  const handleNotificationClick = (notif: any) => {
    setIsOpen(false);
    setToasts(prev => prev.filter(t => t.id !== notif.id));

    // Redirect based on type
    if (notif.type === 'chat') {
      navigate('/guest-requests');
    } else if (notif.type === 'order') {
      navigate('/restaurant');
    } else if (notif.type === 'housekeeping') {
      navigate('/housekeeping');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'order':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'housekeeping':
        return <UserRoundCog className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-full transition-colors focus:outline-none flex items-center justify-center"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-35" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-600" /> Active Requests ({notifications.length})
              </span>
              {notifications.length > 0 && (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Live</span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No active guest requests.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex gap-3 items-start text-left"
                  >
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700">{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-normal break-words">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating Toast Popups container */}
      <div className="fixed bottom-6 right-6 z-[9999] space-y-3 w-80 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => handleNotificationClick(toast)}
            className="p-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl shadow-2xl flex gap-3 items-start cursor-pointer pointer-events-auto transform translate-y-0 transition-transform duration-300 animate-in slide-in-from-bottom-5 fade-in duration-300"
          >
            <div className="p-2 bg-slate-850 rounded-xl text-white mt-0.5">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase text-indigo-400 tracking-wider">New Request</p>
              <p className="text-sm font-bold mt-0.5">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-1 font-medium">{toast.message}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors align-self-start"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hotelsList, setHotelsList] = useState<{ id: number; name: string; parentId: number | null }[]>([]);

  // Subscription Billing State
  const [subscription, setSubscription] = useState<{
    subscriptionStatus: string;
    subscriptionEndsAt: string | null;
    subscriptionDues: number;
    razorpayKeyId: string;
    name: string;
  } | null>(null);

  const [loadingSub, setLoadingSub] = useState(true);
  const [paying, setPaying] = useState(false);

  // Fetch hotels list and subscription status on load
  useEffect(() => {
    if (token) {
      fetch('/api/settings/hotels', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setHotelsList(data);
          }
        })
        .catch(err => console.error("Failed to fetch hotels list", err));

      if (user && user.role !== 'super_admin') {
        setLoadingSub(true);
        fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            if (res.status === 402) {
              return res.json().then(data => {
                setSubscription({
                  subscriptionStatus: 'expired',
                  subscriptionEndsAt: null,
                  subscriptionDues: data.dues !== undefined && data.dues !== null ? data.dues : 6000.0,
                  razorpayKeyId: 'rzp_live_SufeFLg6s8EJfH',
                  name: user.name
                });
                setLoadingSub(false);
              });
            }
            return res.json();
          })
          .then(data => {
            if (data && !data.error) {
              setSubscription(data);
            }
            setLoadingSub(false);
          })
          .catch(err => {
            console.error("Failed to fetch subscription status", err);
            setLoadingSub(false);
          });
      } else {
        setLoadingSub(false);
      }
    }
  }, [token, user]);

  const handlePaySubscription = async () => {
    setPaying(true);
    try {
      // 1. Create Razorpay order on backend
      const orderRes = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderRes.json();

      // 2. Load Razorpay script dynamically
      const loadScript = (src: string) => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const isScriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!isScriptLoaded) {
        alert('Razorpay payment gateway failed to load. Check your internet connection.');
        setPaying(false);
        return;
      }

      // 3. Configure Razorpay options
      const options = {
        key: subscription?.razorpayKeyId || 'rzp_live_SufeFLg6s8EJfH',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Xane PMS',
        description: `PMS Subscription renewal for ${subscription?.name || 'Hotel'}`,
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
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (!verifyRes.ok) {
              throw new Error('Payment verification failed');
            }

            alert('✓ Payment Successful! Your PMS is unlocked.');
            window.location.reload();
          } catch (err: any) {
            alert(err.message || 'Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: '#0f172a'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      alert(err.message || 'Failed to initialize payment');
    } finally {
      setPaying(false);
    }
  };

  const handleSwitchHotel = async (hotelId: number) => {
    try {
      const res = await fetch('/api/auth/switch-hotel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ hotelId })
      });
      const data = await res.json();
      if (data.token && data.user) {
        login(data.token, data.user);
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch hotel", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'], feature: 'bookings' },
    { 
      name: user?.role === 'agent' ? 'Agent Portal' : 'Bookings', 
      path: user?.role === 'agent' ? '/agent' : '/bookings', 
      icon: CalendarDays, 
      roles: ['admin', 'manager', 'staff', 'agent'],
      feature: 'bookings'
    },
    { name: 'Rooms', path: '/rooms', icon: BedDouble, roles: ['admin', 'manager', 'staff'], feature: 'bookings' },
    { name: 'Restaurant', path: '/restaurant', icon: Coffee, roles: ['admin', 'manager', 'staff'], feature: 'restaurant' },
    { name: 'Guest Requests', path: '/guest-requests', icon: MessageSquare, roles: ['admin', 'manager', 'staff'], feature: 'housekeeping' },
    { name: 'Housekeeping', path: '/housekeeping', icon: UserRoundCog, roles: ['admin', 'manager', 'staff'], feature: 'housekeeping' },
    { name: 'Agents', path: '/agents', icon: Users, roles: ['admin', 'manager'], feature: 'agents' },
    { name: 'Expenses', path: '/expenses', icon: Wallet, roles: ['admin', 'manager', 'staff'], feature: 'expenses' },
    { name: 'Billing', path: '/billing', icon: CreditCard, roles: ['admin', 'manager', 'staff'], feature: 'bookings' },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager'], feature: 'bookings' },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'manager'], feature: 'bookings' },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!user) return false;
    
    const userRole = user.role;
    let allowed = false;

    if (userRole === 'super_admin') {
      allowed = true;
    } else {
      // 1. management role can access anything allowed for admin or manager
      if (userRole === 'management' && (item.roles.includes('admin') || item.roles.includes('manager'))) {
        allowed = true;
      }
      // 2. front_desk role can access anything allowed for staff
      else if (userRole === 'front_desk' && item.roles.includes('staff')) {
        allowed = true;
      }
      // 3. housekeeping role can only access Guest Requests and Housekeeping
      else if (userRole === 'housekeeping' && ['/housekeeping', '/guest-requests'].includes(item.path)) {
        allowed = true;
      }
      // 4. restaurant role can only access Restaurant and Guest Requests
      else if (userRole === 'restaurant' && ['/restaurant', '/guest-requests'].includes(item.path)) {
        allowed = true;
      }
      // 5. Standard exact match for others
      else if (item.roles.includes(userRole)) {
        allowed = true;
      }
    }

    if (!allowed) return false;

    if (item.feature) {
      const activeFeatures = user.features ? user.features.split(',') : [];
      return activeFeatures.includes(item.feature);
    }
    return true;
  });

  if (loadingSub) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isExpired = subscription && subscription.subscriptionStatus === 'expired';

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 text-slate-300 transform transition-transform duration-200 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="w-full px-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Xane PMS</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">{user?.role} Portal</p>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="w-full flex-1 px-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={isExpired ? '#' : item.path}
              onClick={(e) => {
                if (isExpired) {
                  e.preventDefault();
                  alert('Your PMS workspace is locked. Please pay subscription dues to restore access.');
                }
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive && !isExpired
                    ? 'bg-blue-600/10 text-blue-400 font-semibold' 
                    : 'hover:bg-slate-800 hover:text-white'
                } ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="w-full px-4 mt-auto">
          <div className="p-3 bg-slate-800 rounded-lg mb-4">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors text-sm font-medium hover:bg-slate-800 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-8 shadow-sm z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold tracking-tight text-gray-800 truncate">
              {user?.role === 'super_admin' ? 'Super-Admin Workspace' : user?.role === 'agent' ? 'Agent Workspace' : 'Admin Workspace'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            {user && user.role !== 'agent' && user.role !== 'super_admin' && (
              <NotificationBell token={token} />
            )}

            {/* Property Switcher */}
            {hotelsList.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Property:</span>
                <select
                  value={user?.hotelId || ''}
                  onChange={(e) => handleSwitchHotel(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {hotelsList.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {isExpired ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 bg-slate-950 text-white rounded-3xl p-8 border border-slate-850 relative overflow-hidden shadow-2xl">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                
                <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-sm animate-pulse z-10">
                  <Lock className="w-8 h-8" />
                </div>
                
                <div className="space-y-2 z-10 max-w-md">
                  <h3 className="text-3xl font-extrabold tracking-tight text-white">Workspace Suspended</h3>
                  <p className="text-slate-450 text-sm">
                    Access to your PMS workspace for <span className="text-white font-semibold">{subscription?.name || 'your property'}</span> has been temporarily suspended due to outstanding dues or expired trial.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 z-10 shadow-lg">
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                    <span className="text-slate-400">Monthly Plan</span>
                    <span className="font-semibold text-slate-200">₹6,000.00 / month</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                    <span className="text-slate-400">Dues Pending</span>
                    <span className="font-semibold text-rose-500">₹6,000.00</span>
                  </div>
                  
                  <button 
                    onClick={handlePaySubscription}
                    disabled={paying}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-5 h-5" />
                    {paying ? 'Initiating Checkout...' : 'Renew Subscription via Razorpay'}
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 z-10">
                  Real-time cryptographic verification is active. direct direct access is restored instantly upon payment.
                </p>
              </div>
            ) : (
              (() => {
                const currentPath = location.pathname;
                const currentItem = navItems.find(item => item.path === currentPath);
                const isFeatureDisabled = currentItem && currentItem.feature && user && user.role !== 'super_admin' && 
                  (!user.features || !user.features.split(',').includes(currentItem.feature));
                
                if (isFeatureDisabled) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-red-100 text-red-650 rounded-2xl flex items-center justify-center shadow-sm">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">Module Disabled</h3>
                      <p className="text-slate-500 max-w-md">
                        The "{currentItem.name}" feature module is disabled for your property. Please contact your platform administrator or super-admin to enable this module.
                      </p>
                    </div>
                  );
                }
                return <Outlet />;
              })()
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
