'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Zap, User, Car, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleTab, setRoleTab] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/passenger/book');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, role: 'PASSENGER' | 'DRIVER') => {
    setEmail(demoEmail);
    setPassword('password123');
    setRoleTab(role);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Zap className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">Dhaka Tesla Pool</span>
          </Link>
          <p className="text-sm text-slate-400">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6">
          {/* Role toggle */}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-6 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setRoleTab('PASSENGER')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                roleTab === 'PASSENGER'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('DRIVER')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                roleTab === 'DRIVER'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Driver
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleTab === 'DRIVER' ? 'jashim@tesla.pool' : 'nusrat@tesla.pool'}
                className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo logins */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Quick demo logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nusrat', sub: 'Passenger', email: 'nusrat@tesla.pool', role: 'PASSENGER' as const },
                { label: 'Jashim', sub: 'Driver (Bullet)', email: 'jashim@tesla.pool', role: 'DRIVER' as const },
                { label: 'Rafiq', sub: 'Passenger', email: 'rafiq@tesla.pool', role: 'PASSENGER' as const },
                { label: 'Shirin', sub: 'Passenger', email: 'shirin@tesla.pool', role: 'PASSENGER' as const },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => handleQuickDemo(d.email, d.role)}
                  className="px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg text-left transition"
                >
                  <span className="font-semibold text-xs text-white block">{d.label}</span>
                  <span className="text-[11px] text-slate-500">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          New to Tesla Pool?{' '}
          <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
