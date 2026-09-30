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
      setSuccessMessage(`৳${amountInBdt} credited to your TeslaPay wallet!`);
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Link href="/passenger/book" className="hover:text-blue-400 transition">Book</Link>
              <span>/</span>
              <span className="text-slate-300">Wallet</span>
            </div>
            <h1 className="font-display text-xl font-bold text-white">TeslaPay Digital Wallet</h1>
          </div>
          <Link
            href="/passenger/book"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-md shadow-blue-600/20 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> Book a Ride
          </Link>
        </div>

        {successMessage && (
          <div className="mb-5 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Balance + Topup */}
          <div className="lg:col-span-5 space-y-4">
            {/* Balance card */}
            <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-blue-600/5 blur-[50px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <LiquidGlassAvatar
                      fallback={user?.name?.charAt(0) || 'U'}
                      variant="primary"
                      size="md"
                      glow
                    />
                    <div>
                      <p className="font-display text-sm font-bold text-white">{user?.name}</p>
                      <p className="text-[11px] text-slate-400">TeslaPay Member</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-blue-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-white">৳{balanceBdt.toFixed(2)}</span>
                    <span className="text-xs text-blue-400 font-bold">BDT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top-up card */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 mb-0.5">
                  <ArrowUpRight className="w-4 h-4 text-blue-400" /> Instant Top-Up
                </h3>
                <p className="text-xs text-slate-400">Add funds for automated cashless trip checkout.</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Amount</p>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setTopupAmountBdt(amt); setCustomAmount(''); }}
                      className={`py-2 rounded-xl font-bold font-mono text-xs transition border ${
                        topupAmountBdt === amt && !customAmount
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-900/80 text-white border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Or Custom Amount (BDT)</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">৳</span>
                  <input
                    type="number"
                    min="10"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) setTopupAmountBdt(Number(e.target.value));
                    }}
                    className="w-full pl-8 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <button
                onClick={() => handleTopup(topupAmountBdt)}
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Add ৳{topupAmountBdt} Now
              </button>
            </div>
          </div>

          {/* Right: Transactions */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" /> Payment Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Automated ride receipts and wallet settlements</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{transactions.length} entries</span>
            </div>

            {loadingTx ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Wallet className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs font-semibold text-slate-400">No payment records yet</p>
                <p className="text-[11px] text-slate-500">Trip fare deductions will automatically appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white mb-0.5">
                        {tx.rideRequest?.pickupArea?.name || 'Hub'} → {tx.rideRequest?.destinationArea?.name || 'Destination'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {tx.method} · {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-400 block text-xs">-৳{(tx.amountPaisa / 100).toFixed(0)}</span>
                      <span className="text-[10px] text-blue-400 font-medium px-1.5 py-0.5 bg-blue-500/10 rounded-full">{tx.status}</span>
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
