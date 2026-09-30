'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { LiquidGlassAvatar } from '@/components/lightswind/liquid-glass-avatar';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CreditCard,
  Zap,
} from 'lucide-react';

interface Transaction {
  id: string;
  amountPaisa: number;
  method: string;
  status: string;
  createdAt: string;
  rideRequest?: {
    pickupArea?: { name: string };
    destinationArea?: { name: string };
  };
}

export default function PassengerWalletPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();

  const [topupAmountBdt, setTopupAmountBdt] = useState<number>(200);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.push('/login?redirect=/passenger/wallet');
      else if (user.role !== 'PASSENGER') router.push('/driver/dashboard');
    }
  }, [user, isLoading, router]);

  const fetchTransactions = async () => {
    try {
      const data = await api.get<Transaction[]>('/api/wallet/transactions');
      setTransactions(data);
    } catch {}
    finally { setLoadingTx(false); }
  };

  useEffect(() => { if (user) fetchTransactions(); }, [user]);

  const handleTopup = async (amountInBdt: number) => {
    if (amountInBdt <= 0) { setError('Enter a valid amount'); return; }
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.post<any>('/api/wallet/topup', { amountPaisa: Math.round(amountInBdt * 100) });
      setSuccessMessage(`৳${amountInBdt} added to your wallet!`);
      await refreshUser();
      await fetchTransactions();
      setCustomAmount('');
    } catch (err: any) {
      setError(err.message || 'Top-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const balanceBdt = (user?.walletBalancePaisa || 0) / 100;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Link href="/passenger/book" className="hover:text-emerald-400 transition">Book</Link>
              <span>/</span>
              <span className="text-slate-300">Wallet</span>
            </div>
            <h1 className="text-xl font-bold text-white">TeslaPay Wallet</h1>
          </div>
          <Link
            href="/passenger/book"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Book a Ride
          </Link>
        </div>

        {successMessage && (
          <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Balance + Topup */}
          <div className="lg:col-span-5 space-y-4">
            {/* Balance card */}
            <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <LiquidGlassAvatar
                      fallback={user?.name?.charAt(0) || 'U'}
                      variant="emerald"
                      size="md"
                      glow
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{user?.name}</p>
                      <p className="text-[11px] text-slate-500">TeslaPay Member</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Available balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">৳{balanceBdt.toFixed(2)}</span>
                    <span className="text-xs text-emerald-400 font-bold">BDT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top-up card */}
            <div className="glass-card rounded-3xl p-6 space-y-5">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-0.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Top Up
                </h3>
                <p className="text-xs text-slate-500">Add funds instantly.</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick amounts</p>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setTopupAmountBdt(amt); setCustomAmount(''); }}
                      className={`py-2.5 rounded-xl font-bold text-sm transition border ${
                        topupAmountBdt === amt && !customAmount
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-white/[0.04] text-white border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Custom amount</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                  <input
                    type="number"
                    min="10"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) setTopupAmountBdt(Number(e.target.value));
                    }}
                    className="w-full pl-8 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/40 transition"
                  />
                </div>
              </div>

              <button
                onClick={() => handleTopup(topupAmountBdt)}
                disabled={submitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Add ৳{topupAmountBdt}
              </button>
            </div>
          </div>

          {/* Right: Transactions */}
          <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Transaction Ledger
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Completed ride payments and receipts</p>
              </div>
              <span className="text-xs text-slate-500">{transactions.length} records</span>
            </div>

            {loadingTx ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Wallet className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-sm font-semibold text-slate-500">No transactions yet</p>
                <p className="text-xs text-slate-600">Complete a ride with TeslaPay to see receipts.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white text-sm mb-0.5">
                        {tx.rideRequest?.pickupArea?.name || 'Hub'} → {tx.rideRequest?.destinationArea?.name || 'Destination'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {tx.method} · {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-400 block text-sm">-৳{(tx.amountPaisa / 100).toFixed(0)}</span>
                      <span className="text-[10px] text-slate-600 px-1.5 py-0.5 bg-emerald-500/10 rounded-full">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
