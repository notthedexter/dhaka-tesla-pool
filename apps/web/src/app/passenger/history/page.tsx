'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Zap,
  ArrowRight,
  Clock,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
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

export default function RideHistoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [rides, setRides] = useState<RideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadRides() {
      try {
        const data = await api.get<RideItem[]>('/api/rides/my');
        setRides(data);
      } catch (err: any) {
        console.error('Fetch history error:', err);
        setError(err.message || 'Failed to load ride history');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadRides();
    }
  }, [user, isLoading, router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case 'STARTED':
        return (
          <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-lg flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg">
            {status.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-emerald-400" />
              My Ride History
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              All your booked, pooled, and completed Dhaka Tesla journeys.
            </p>
          </div>

          <Link
            href="/passenger/book"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-current" /> Book New Ride
          </Link>
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
            <p className="text-sm text-slate-400">Loading your trips...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
              🚗
            </div>
            <h3 className="font-bold text-white text-base">No Rides Found</h3>
            <p className="text-xs text-slate-400 mt-1">You haven&apos;t booked any Tesla rides yet.</p>
            <Link
              href="/passenger/book"
              className="mt-5 inline-block px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Book Your First Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <Link
                key={ride.id}
                href={`/passenger/ride/${ride.id}`}
                className="block bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(ride.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>{ride.seatsNeeded} {ride.seatsNeeded === 1 ? 'Seat' : 'Seats'}</span>
                    </div>

                    <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>{ride.pickupArea.name}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-400">{ride.destinationArea.name}</span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Distance: {ride.distanceKm} km • Method: {ride.paymentMethod}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Fare</span>
                      <span className="font-extrabold text-white text-lg block">
                        ৳{(ride.estimatedFarePaisa / 100).toFixed(0)}
                      </span>
                    </div>

                    <div>{getStatusBadge(ride.status)}</div>

                    <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700/80 transition">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
