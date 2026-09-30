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
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: <XCircle className="w-3 h-3" />,
  },
  STARTED: {
    label: 'In Progress',
    cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
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
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" /> Ride History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">All your Dhaka Tesla journeys</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/passenger/wallet"
              className="px-3 py-1.5 text-xs font-medium text-slate-400 glass border border-white/[0.06] rounded-lg hover:text-white transition flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-emerald-400" /> Wallet
            </Link>
            <Link
              href="/passenger/book"
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              Book
            </Link>
          </div>
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
        ) : rides.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="text-4xl mb-4">🚗</div>
            <h3 className="font-bold text-white mb-2">No rides yet</h3>
            <p className="text-xs text-slate-500 mb-5">Book your first Tesla pool ride across Dhaka.</p>
            <Link href="/passenger/book" className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs inline-block">
              Book a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => {
              const s = statusConfig(ride.status);
              return (
                <Link
                  key={ride.id}
                  href={`/passenger/ride/${ride.id}`}
                  className="block glass-card rounded-2xl p-5 hover:border-emerald-500/20 transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(ride.createdAt).toLocaleString()}</span>
                        <span>·</span>
                        <span>{ride.seatsNeeded} {ride.seatsNeeded === 1 ? 'seat' : 'seats'}</span>
                        <span>·</span>
                        <span>{ride.distanceKm} km</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{ride.pickupArea.name}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-emerald-400">{ride.destinationArea.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Fare</span>
                        <span className="font-bold text-white">৳{(ride.estimatedFarePaisa / 100).toFixed(0)}</span>
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${s.cls}`}>
                        {s.icon} {s.label}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-white/[0.05] group-hover:bg-emerald-500/10 flex items-center justify-center transition">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
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
