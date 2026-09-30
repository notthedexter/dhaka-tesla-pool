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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-400" /> Driver Trip History
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Completed pool journeys and settled solo fares for vehicle &quot;{user?.tesla?.name || 'Bullet'}&quot;
            </p>
          </div>
          <Link
            href="/driver/dashboard"
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/80 border border-slate-700/80 rounded-lg hover:text-white transition"
          >
            ← Cockpit
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { icon: <TrendingUp className="w-4 h-4 text-blue-400" />, label: 'Total Fares Collected', value: `৳${(totalEarningsPaisa / 100).toFixed(0)}`, color: 'blue' },
            { icon: <Car className="w-4 h-4 text-sky-400" />, label: 'Completed Pools', value: `${pools.length} Trips`, color: 'sky' },
            { icon: <Users className="w-4 h-4 text-amber-400" />, label: 'Passengers Carried', value: `${totalPassengers} Riders`, color: 'amber' },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">{s.icon}<span className="text-[11px] text-slate-400 uppercase tracking-wider">{s.label}</span></div>
              <span className={`font-mono text-xl font-bold ${s.color === 'blue' ? 'text-blue-400' : s.color === 'sky' ? 'text-sky-400' : 'text-amber-400'}`}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : pools.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-display font-bold text-white mb-1 text-sm">No Completed Pools Yet</h3>
            <p className="text-xs text-slate-400 mb-4">Toggle Online in your cockpit and accept incoming passenger rides.</p>
            <Link href="/driver/dashboard" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs inline-block">
              Open Driver Cockpit
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pools.map((pool) => {
              const poolTotal = pool.members.reduce((sum, m) => sum + m.farePaisa, 0);
              return (
                <div key={pool.id} className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(pool.createdAt).toLocaleString()}</span>
                        <span>·</span>
                        <span className="text-blue-400 font-semibold">{pool.members.length} riders pooled</span>
                      </div>
                      <h3 className="font-display font-semibold text-white text-sm">Pickup Hub: {pool.pickupArea.name}</h3>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase block">Total Collected</span>
                      <span className="font-mono font-bold text-blue-400 text-base">৳{(poolTotal / 100).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-0.5">
                    {pool.members.map((m) => (
                      <div key={m.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-semibold text-white truncate">{m.passenger.name}</span>
                          <span className="font-mono font-bold text-blue-400 ml-2">৳{(m.farePaisa / 100).toFixed(0)}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          Drop: {m.rideRequest?.destinationArea?.name || 'Dhaka Hub'}
                        </span>
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
