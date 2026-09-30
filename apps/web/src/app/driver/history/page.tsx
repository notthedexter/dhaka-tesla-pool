'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Car,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
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
      if (!user) router.push('/login');
      else if (user.role !== 'DRIVER') router.push('/passenger/book');
      else loadHistory();
    }
  }, [user, isLoading, router]);

  const loadHistory = async () => {
    try {
      const data = await api.get<CompletedPool[]>('/api/drivers/history');
      setPools(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const totalEarningsPaisa = pools.reduce((sum, p) => sum + p.members.reduce((ms, m) => ms + m.farePaisa, 0), 0);
  const totalPassengers = pools.reduce((sum, p) => sum + p.members.length, 0);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-400" /> Trip History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed pools for &quot;{user?.tesla?.name || 'Bullet'}&quot;
            </p>
          </div>
          <Link
            href="/driver/dashboard"
            className="px-3 py-1.5 text-xs font-medium text-slate-400 glass border border-white/[0.06] rounded-lg hover:text-white transition"
          >
            ← Cockpit
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, label: 'Total Fares', value: `৳${(totalEarningsPaisa / 100).toFixed(0)}`, color: 'emerald' },
            { icon: <Car className="w-4 h-4 text-cyan-400" />, label: 'Completed Trips', value: `${pools.length}`, color: 'cyan' },
            { icon: <Users className="w-4 h-4 text-amber-400" />, label: 'Passengers Served', value: `${totalPassengers}`, color: 'amber' },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs text-slate-500">{s.label}</span></div>
              <span className={`text-2xl font-black ${s.color === 'emerald' ? 'text-emerald-400' : s.color === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : pools.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-bold text-white mb-2">No Completed Pools</h3>
            <p className="text-xs text-slate-500 mb-5">Go online and accept your first ride request.</p>
            <Link href="/driver/dashboard" className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs inline-block">
              Open Cockpit
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pools.map((pool) => {
              const poolTotal = pool.members.reduce((sum, m) => sum + m.farePaisa, 0);
              return (
                <div key={pool.id} className="glass-card rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(pool.createdAt).toLocaleString()}</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-semibold">{pool.members.length} riders</span>
                      </div>
                      <h3 className="font-bold text-white text-sm">Pickup: {pool.pickupArea.name}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500 block">Collected</span>
                      <span className="font-bold text-emerald-400 text-lg">৳{(poolTotal / 100).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-white/[0.05]">
                    {pool.members.map((m) => (
                      <div key={m.id} className="p-3 bg-white/[0.03] rounded-xl text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-white">{m.passenger.name}</span>
                          <span className="text-emerald-400 font-semibold">৳{(m.farePaisa / 100).toFixed(0)}</span>
                        </div>
                        <span className="text-slate-500">→ {m.rideRequest?.destinationArea?.name || 'Dhaka'}</span>
                      </div>
                    ))}
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
