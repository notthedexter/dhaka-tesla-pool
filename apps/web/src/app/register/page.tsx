'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Zap, User, Car, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');
  const [teslaName, setTeslaName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register({
        name,
        email,
        password,
        role,
        ...(role === 'DRIVER' && { teslaName: teslaName || 'Tesla' }),
      });
      if (user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/passenger/book');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-8 h-8 bg-blue-600 group-hover:bg-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/30 transition-colors">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">Dhaka Tesla Pool</span>
          </Link>
          <p className="text-xs text-slate-400">Create your account</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          {/* Role toggle */}
          <div className="flex gap-1 p-1 bg-slate-900/90 rounded-xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => setRole('PASSENGER')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                role === 'PASSENGER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setRole('DRIVER')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                role === 'DRIVER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Driver
            </button>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 block">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'DRIVER' ? 'Jashim Uddin' : 'Nusrat Jahan'}
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 block">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 block">Password (min. 6 characters)</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {role === 'DRIVER' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 block">
                  Tesla vehicle nickname <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={teslaName}
                  onChange={(e) => setTeslaName(e.target.value)}
                  placeholder="e.g. Bullet (3 Seats)"
                  className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating account...</>
              ) : (
                <>Create account <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
