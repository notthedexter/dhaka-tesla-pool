'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Wallet,
  Zap,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
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

  // Authentication check
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login?redirect=/passenger/wallet');
      } else if (user.role !== 'PASSENGER') {
        router.push('/driver/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const data = await api.get<Transaction[]>('/api/wallet/transactions');
      setTransactions(data);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const handleTopup = async (amountInBdt: number) => {
    if (amountInBdt <= 0) {
      setError('Please enter a valid top-up amount');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const amountPaisa = Math.round(amountInBdt * 100);
      const res = await api.post<any>('/api/wallet/topup', {
        amountPaisa,
      });

      setSuccessMessage(`Successfully added ৳${amountInBdt} to your TeslaPay wallet!`);
      await refreshUser();
      await fetchTransactions();
      setCustomAmount('');
    } catch (err: any) {
      setError(err.message || 'Top-up failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const balanceBdt = (user?.walletBalancePaisa || 0) / 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/passenger/book" className="hover:text-emerald-400">
                Passenger Hub
              </Link>
              <span>/</span>
              <span className="text-slate-200">TeslaPay Wallet</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Wallet className="h-7 w-7 text-emerald-400" />
              TeslaPay Digital Mobility Wallet
            </h1>
          </div>

          <Link
            href="/passenger/book"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 w-fit"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Book a Ride
          </Link>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Balance Card & Top-Up */}
          <div className="lg:col-span-5 space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  TeslaPay Balance
                </span>
                <span className="text-xs text-slate-400 font-medium">Dhaka EV Network</span>
              </div>

              <div>
                <span className="text-slate-400 text-xs block mb-1">Available Funds</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    ৳{balanceBdt.toFixed(2)}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold uppercase">BDT</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Stored as {user?.walletBalancePaisa || 0} integer paisa for exact precision
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Instant Cashless Checkout
                </span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
            </div>

            {/* Quick Top-Up Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  Instant Wallet Top-Up
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add funds instantly to seamlessly pay for pooled Tesla rides in Dhaka.
                </p>
              </div>

              {/* Preset buttons */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Select Amount
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setTopupAmountBdt(amt);
                        setCustomAmount('');
                      }}
                      className={`py-3 rounded-2xl font-extrabold text-sm transition border ${
                        topupAmountBdt === amt && !customAmount
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700/80 text-white border-slate-700/80'
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Or Custom Amount (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="10"
                    placeholder="Enter custom BDT amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) {
                        setTopupAmountBdt(Number(e.target.value));
                      }
                    }}
                    className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <button
                onClick={() => handleTopup(topupAmountBdt)}
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Top-Up ৳{topupAmountBdt} Now
              </button>
            </div>
          </div>

          {/* Right Column: Transactions History */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  TeslaPay Ride &amp; Payment Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Completed ride payments and automated fare receipts
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {transactions.length} record(s)
              </span>
            </div>

            {loadingTx ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Wallet className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">No payment records yet</p>
                <p className="text-xs text-slate-500">
                  When you complete a ride with TeslaPay, your payment receipt will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">
                          {tx.rideRequest?.pickupArea?.name || 'Dhaka Hub'} →{' '}
                          {tx.rideRequest?.destinationArea?.name || 'Destination'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full">
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Method: <strong className="text-white">{tx.method}</strong> •{' '}
                        {new Date(tx.createdAt).toLocaleDateString()} at{' '}
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-sm text-emerald-400 block">
                        -৳{(tx.amountPaisa / 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {tx.amountPaisa} paisa
                      </span>
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
