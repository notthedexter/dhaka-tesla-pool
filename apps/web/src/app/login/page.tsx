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
          <p className="text-xs text-slate-400">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6">
          {/* Role toggle */}
          <div className="flex gap-1 p-1 bg-slate-900/90 rounded-xl mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => setRoleTab('PASSENGER')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                roleTab === 'PASSENGER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('DRIVER')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                roleTab === 'DRIVER'
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
              <label className="text-[11px] font-medium text-slate-400 block">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleTab === 'DRIVER' ? 'jashim@tesla.pool' : 'nusrat@tesla.pool'}
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>

          {/* Demo logins */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Quick demo logins
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nusrat', sub: 'Passenger (Banani)', email: 'nusrat@tesla.pool', role: 'PASSENGER' as const },
                { label: 'Jashim', sub: 'Driver (Bullet)', email: 'jashim@tesla.pool', role: 'DRIVER' as const },
                { label: 'Rafiq', sub: 'Passenger (Pool #2)', email: 'rafiq@tesla.pool', role: 'PASSENGER' as const },
                { label: 'Shirin', sub: 'Passenger (Pool #3)', email: 'shirin@tesla.pool', role: 'PASSENGER' as const },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => handleQuickDemo(d.email, d.role)}
                  className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition"
                >
                  <span className="font-semibold text-xs text-white block">{d.label}</span>
                  <span className="text-[10px] text-slate-400 truncate block">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          New to Tesla Pool?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
