import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Mail, Lock, Landmark, Sparkles, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Details, Step 2: OTP Verification
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName,
          hotelAddress,
          adminName,
          adminEmail,
          adminPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setSuccessMessage('A 6-digit verification code has been sent to your email.');
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete onboarding
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          otp: otpCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed. Please try again.');
      }

      // Automatically log the user in on success
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName,
          hotelAddress,
          adminName,
          adminEmail,
          adminPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setSuccessMessage('Verification code resent successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setError('');
    setSuccessMessage('');
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="w-full max-w-xl z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">Xane PMS</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Onboard Your Property</h1>
          <p className="text-slate-400 mt-2">Initialize your property management workspace in seconds</p>
        </div>
        
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full bg-slate-950/40 backdrop-blur-xl border border-slate-800 shadow-2xl overflow-hidden text-white">
            <CardHeader className="border-b border-slate-800/80 bg-slate-900/20 py-5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" /> Onboarding Wizard
              </div>
              <CardTitle className="text-xl font-bold text-white">
                {step === 1 ? 'Register Hotel & Administrator' : 'Verify Your Email'}
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                {step === 1 
                  ? "Fill in the details below. We'll send a verification code to check your email."
                  : `We sent a 6-digit code to ${adminEmail}. Verify to complete setup.`
                }
              </CardDescription>
            </CardHeader>
            
            {step === 1 ? (
              // Step 1 Form: Details Submission
              <form onSubmit={handleRequestOtp}>
                <CardContent className="p-6 space-y-6">
                  {error && (
                    <div className="bg-red-500/10 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 flex items-start gap-2">
                      <span className="font-bold">Error:</span> {error}
                    </div>
                  )}
                  
                  {/* Hotel Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Landmark className="w-4 h-4 text-indigo-400" />
                      <h3 className="font-semibold text-sm text-slate-200 uppercase tracking-wider">1. Property Details</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="hotelName">Hotel Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            id="hotelName" 
                            type="text" 
                            placeholder="e.g. Grand Palace Resort"
                            value={hotelName}
                            onChange={(e) => setHotelName(e.target.value)}
                            className="pl-10 bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-500 rounded-lg h-11"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="hotelAddress">Location / Address</label>
                        <div className="relative">
                          <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            id="hotelAddress" 
                            type="text" 
                            placeholder="e.g. Goa, India"
                            value={hotelAddress}
                            onChange={(e) => setHotelAddress(e.target.value)}
                            className="pl-10 bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-500 rounded-lg h-11"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <h3 className="font-semibold text-sm text-slate-200 uppercase tracking-wider">2. Administrator Account</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="adminName">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            id="adminName" 
                            type="text" 
                            placeholder="e.g. John Doe"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            className="pl-10 bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-500 rounded-lg h-11"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="adminEmail">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            id="adminEmail" 
                            type="email" 
                            placeholder="e.g. admin@hotel.com"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className="pl-10 bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-500 rounded-lg h-11"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="adminPassword">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            id="adminPassword" 
                            type="password" 
                            placeholder="••••••••"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="pl-10 bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-500 rounded-lg h-11"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="confirmPassword">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input 
                            id="confirmPassword" 
                            type="password" 
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-500 rounded-lg h-11"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-slate-800/80 bg-slate-900/10 p-6 flex flex-col gap-4">
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 text-base flex items-center justify-center gap-2"
                    type="submit" 
                    disabled={loading}
                  >
                    <span>Send Verification Code</span>
                    <Mail className="w-5 h-5" />
                  </Button>
                  
                  <div className="text-center text-sm text-slate-400 mt-2">
                    Already have a hotel onboarded?{' '}
                    <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                      Sign In
                    </Link>
                  </div>
                </CardFooter>
              </form>
            ) : (
              // Step 2 Form: OTP Verification
              <form onSubmit={handleVerifyOtp}>
                <CardContent className="p-6 space-y-6">
                  {error && (
                    <div className="bg-red-500/10 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 flex items-start gap-2">
                      <span className="font-bold">Error:</span> {error}
                    </div>
                  )}

                  {successMessage && (
                    <div className="bg-emerald-500/10 text-emerald-400 text-sm p-4 rounded-xl border border-emerald-500/20">
                      {successMessage}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <KeyRound className="w-8 h-8 text-indigo-400 animate-pulse" />
                      </div>
                      <p className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
                        Please enter the 6-digit confirmation code we sent to <strong className="text-indigo-300">{adminEmail}</strong>.
                      </p>
                    </div>

                    <div className="space-y-2 max-w-xs mx-auto">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider text-center block" htmlFor="otpCode">Verification Code</label>
                      <Input 
                        id="otpCode" 
                        type="text" 
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="bg-slate-900/60 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-white placeholder-slate-600 rounded-xl h-14 text-center text-2xl font-bold tracking-widest"
                        required
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-slate-800/80 bg-slate-900/10 p-6 flex flex-col gap-4">
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 text-base"
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? 'Initializing Workspace...' : 'Verify & Initialize Workspace'}
                  </Button>

                  <div className="flex items-center justify-between w-full text-sm mt-2 px-2">
                    <button 
                      type="button"
                      onClick={handleGoBack}
                      className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                      disabled={loading}
                    >
                      <ArrowLeft className="w-4 h-4" /> Edit Details
                    </button>

                    <button 
                      type="button"
                      onClick={handleResendOtp}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                  </div>
                </CardFooter>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
