import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Hotel, LogIn } from 'lucide-react';

export default function GuestLoginPage() {
  const [roomNumber, setRoomNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/guest/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomNumber, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store guest token & info
      localStorage.setItem('guestToken', data.token);
      localStorage.setItem('guestInfo', JSON.stringify(data.guest));

      navigate('/guest');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 mb-2">
            <Hotel className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Xane Guest Portal</h1>
          <p className="text-slate-400 text-sm">Welcome to your digital hotel companion</p>
        </div>

        <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-2xl text-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold">Portal Sign In</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your room number and the 4-digit PIN generated during check-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm font-semibold">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="roomNumber" className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Room Number
                </Label>
                <div className="relative">
                  <Input
                    id="roomNumber"
                    type="text"
                    placeholder="e.g. 102"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                    className="bg-slate-950/80 border-slate-800 focus-visible:ring-blue-500 h-11 rounded-xl text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  4-Digit PIN
                </Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    placeholder="&bull; &bull; &bull; &bull;"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="bg-slate-950/80 border-slate-800 focus-visible:ring-blue-500 h-11 rounded-xl tracking-widest text-center text-lg font-bold text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl mt-6 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Verifying...'
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Enter Guest Portal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          Need assistance? Please contact the hotel front desk.
        </div>
      </div>
    </div>
  );
}
