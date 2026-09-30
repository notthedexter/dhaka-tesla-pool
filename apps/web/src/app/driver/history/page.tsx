'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Car,
  Clock,
  Users,
  CheckCircle,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface CompletedPool {
  id: string;
  pickupArea: { name: string };
  createdAt: string;
  members: Array<{
    id: string;
    seats: number;
    farePaisa: number;
    passenger: { name: string };
    rideRequest?: {
      destinationArea?: { name: string };
      payment?: { amountPaisa: number; method: string; status: string };
    };
  }>;
}

export default function DriverHistoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [pools, setPools] = useState<CompletedPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'DRIVER') {
        router.push('/passenger/book');
      } else {
        loadHistory();
      }
    }
  }, [user, isLoading, router]);

  const loadHistory = async () => {
    try {
      const data = await api.get<CompletedPool[]>('/api/drivers/history');
      setPools(data);
    } catch (err: any) {
      console.error('Fetch driver history error:', err);
      setError(err.message || 'Failed to load driver trip history');
    } finally {
      setLoading(false);
    }
  };

  // Calculate cumulative stats
  const totalEarningsPaisa = pools.reduce(
    (sum, p) => sum + p.members.reduce((mSum, m) => mSum + m.farePaisa, 0),
    0
  );
  const totalPassengersServed = pools.reduce((sum, p) => sum + p.members.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Car className="h-6 w-6 text-amber-400" />
              Driver Trip &amp; Fare History
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Completed pool trips and collected fares for vehicle &quot;{user?.tesla?.name || 'Bullet'}&quot;.
            </p>
          </div>

          <Link
            href="/driver/dashboard"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
          >
            ← Back to Cockpit
          </Link>
        </div>

        {/* Lifetime Earnings Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Total Fares Collected
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              ৳{(totalEarningsPaisa / 100).toFixed(0)}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Total Completed Pools
            </span>
            <span className="text-2xl font-black text-cyan-400 mt-1 block">
              {pools.length} Trips
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Passengers Carried
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {totalPassengersServed} Riders
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading your completed trips...</p>
          </div>
        ) : pools.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3 text-xl">
              ⚡
            </div>
            <h3 className="font-bold text-white text-base">No Completed Pools Yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Go online in your cockpit and accept your first ride request.
            </p>
            <Link
              href="/driver/dashboard"
              className="mt-5 inline-block px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Open Driver Cockpit
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => {
              const poolTotal = pool.members.reduce((sum, m) => sum + m.farePaisa, 0);

              return (
                <div
                  key={pool.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(pool.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-400">
                          {pool.members.length} Riders Pooled
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">
                        Pickup Hub: {pool.pickupArea.name}
                      </h3>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block">Total Collected</span>
                      <span className="font-extrabold text-emerald-400 text-lg block">
                        ৳{(poolTotal / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Pool Members Breakdown */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Riders Carried:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {pool.members.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-white">{m.passenger.name}</span>
                            <span className="font-semibold text-emerald-400">
                              ৳{(m.farePaisa / 100).toFixed(0)}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            Dropoff: {m.rideRequest?.destinationArea?.name || 'Dhaka'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
