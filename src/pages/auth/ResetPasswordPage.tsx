import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Validate presence of email and token
  const hasValidParams = !!(email && token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasValidParams) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Navigate to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Xane PMS</h1>
          <p className="text-slate-500 mt-2">Manage your hotel operations seamlessly</p>
        </div>

        <Card className="w-full shadow-lg border-0">
          {!hasValidParams ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-semibold flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                  Invalid Link
                </CardTitle>
                <CardDescription>
                  This password reset link is invalid or incomplete.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-md border border-amber-200">
                  The URL query parameters must contain both the email and verification token. Please verify the link in the email or log, or request a new reset link.
                </div>
              </CardContent>
              <CardFooter>
                <Link
                  to="/forgot-password"
                  className="w-full flex items-center justify-center py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md transition-colors bg-white hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Request new link
                </Link>
              </CardFooter>
            </>
          ) : success ? (
            <>
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">Password Reset Successfully</h3>
                  <p className="text-sm text-slate-500">
                    Your password has been updated. Redirecting you to the login page in a moment...
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Go to Sign In immediately
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-semibold">Reset Password</CardTitle>
                <CardDescription>
                  Enter a new, secure password for your account <span className="font-medium text-slate-700">{email}</span>.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="password">
                      New Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? 'Resetting password...' : 'Reset password'}
                  </Button>
                  <Link
                    to="/login"
                    className="flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
