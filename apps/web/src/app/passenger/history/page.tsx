'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Clock,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  Zap,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface RideItem {
  id: string;
  pickupArea: { name: string };
  destinationArea: { name: string };
  seatsNeeded: number;
  estimatedFarePaisa: number;
  distanceKm: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  COMPLETED: {
    label: 'Completed',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: <XCircle className="w-3 h-3" />,
  },
  STARTED: {
    label: 'In Progress',
    cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
};

export default function RideHistoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [rides, setRides] = useState<RideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) { router.push('/login'); return; }
    if (user) {
      api.get<RideItem[]>('/api/rides/my')
        .then(setRides)
        .catch((err: any) => setError(err.message || 'Failed to load history'))
        .finally(() => setLoading(false));
    }
  }, [user, isLoading, router]);

  const statusConfig = (status: string) =>
    STATUS_CONFIG[status] || { label: status.replace('_', ' '), cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: null };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Ride History
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">All your pooled Tesla trips across Dhaka</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/passenger/wallet"
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/80 border border-slate-700/80 rounded-lg hover:text-white transition flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-blue-400" /> Wallet
            </Link>
            <Link
              href="/passenger/book"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition"
            >
              Book
            </Link>
          </div>
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
        ) : rides.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-display font-bold text-white mb-1 text-sm">No Rides Found</h3>
            <p className="text-xs text-slate-400 mb-4">Book your first shared seat in an electric Tesla.</p>
            <Link href="/passenger/book" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs inline-block">
              Book a Seat
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rides.map((ride) => {
              const s = statusConfig(ride.status);
              return (
                <Link
                  key={ride.id}
                  href={`/passenger/ride/${ride.id}`}
                  className="block glass-card rounded-xl p-4 hover:border-blue-500/25 transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(ride.createdAt).toLocaleString()}</span>
                        <span>·</span>
                        <span>{ride.seatsNeeded} {ride.seatsNeeded === 1 ? 'seat' : 'seats'}</span>
                        <span>·</span>
                        <span className="font-mono">{ride.distanceKm} km</span>
                      </div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <span>{ride.pickupArea.name}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-blue-400">{ride.destinationArea.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Fare</span>
                        <span className="font-mono font-bold text-white text-sm">৳{(ride.estimatedFarePaisa / 100).toFixed(0)}</span>
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${s.cls}`}>
                        {s.icon} {s.label}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-slate-900 group-hover:bg-blue-600/20 flex items-center justify-center transition">
                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
