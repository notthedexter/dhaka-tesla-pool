'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import DynamicMap, { MapMarker } from '../../../components/DynamicMap';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Zap,
  MapPin,
  Users,
  Wallet,
  Banknote,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Area {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface RouteCalculation {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  fare: {
    totalFare: number;
    baseFare: number;
    distanceCharge: number;
  };
  fareBreakdown: {
    solo: { totalFare: number };
    pooled2: { totalFare: number };
    pooled3: { totalFare: number };
  };
}

function BookRideContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const [areas, setAreas] = useState<Area[]>([]);
  const [pickupId, setPickupId] = useState<number>(1); // Banani
  const [destinationId, setDestinationId] = useState<number>(4); // Mohakhali
  const [seatsNeeded, setSeatsNeeded] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TESLAPAY'>('TESLAPAY');

  const [routeData, setRouteData] = useState<RouteCalculation | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication Guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/passenger/book');
    }
  }, [user, isLoading, router]);

  // Load areas on mount
  useEffect(() => {
    async function loadAreas() {
      try {
        const data = await api.get<Area[]>('/api/areas');
        setAreas(data);

        // Pre-fill from query params if available
        const qPickup = searchParams.get('pickup');
        const qDest = searchParams.get('destination');
        if (qPickup) setPickupId(Number(qPickup));
        if (qDest) setDestinationId(Number(qDest));
      } catch (err) {
        console.error('Failed to load areas:', err);
      }
    }
    loadAreas();
  }, [searchParams]);

  // Fetch route and fare estimate
  useEffect(() => {
    if (!pickupId || !destinationId || pickupId === destinationId) {
      setRouteData(null);
      return;
    }

    async function fetchRoute() {
      setLoadingRoute(true);
      setError(null);
      try {
        const data = await api.get<RouteCalculation>(
          `/api/areas/distance?from=${pickupId}&to=${destinationId}`
        );
        setRouteData(data);
      } catch (err: any) {
        console.error('Route error:', err);
        setError(err.message || 'Failed to calculate route');
      } finally {
        setLoadingRoute(false);
      }
    }

    fetchRoute();
  }, [pickupId, destinationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupId === destinationId) {
      setError('Pickup and destination areas cannot be the same');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post<{ ride: { id: string } }>('/api/rides', {
        pickupAreaId: pickupId,
        destinationAreaId: destinationId,
        seatsNeeded,
        paymentMethod,
      });

      router.push(`/passenger/ride/${res.ride.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ride request');
      setSubmitting(false);
    }
  };

  // Build map markers
  const markers: MapMarker[] = areas.map((area) => {
    let type: 'pickup' | 'dropoff' | 'area' = 'area';
    if (area.id === pickupId) type = 'pickup';
    else if (area.id === destinationId) type = 'dropoff';

    return {
      id: area.id,
      position: [area.latitude, area.longitude],
      title: area.name,
      subtitle: area.id === pickupId ? '🟢 Pickup Location' : area.id === destinationId ? '🏁 Dropoff Location' : 'Dhaka Zone',
      type,
    };
  });

  const estimatedFarePaisa = routeData?.fare?.totalFare || 0;
  const walletBalancePaisa = user?.walletBalancePaisa || 0;
  const hasSufficientTeslaPay = walletBalancePaisa >= estimatedFarePaisa;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-emerald-400 fill-current" />
              Request a Seat in a Tesla
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Select your Dhaka pickup and destination hubs. Our matching algorithm connects you to nearby rides automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/passenger/history')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition"
            >
              My Ride History
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Booking Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Booking Controls */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Pickup Area */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white">●</span>
                  Pickup Zone (Where to meet)
                </label>
                <select
                  value={pickupId}
                  onChange={(e) => setPickupId(Number(e.target.value))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Area */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[8px] text-white">■</span>
                  Destination Zone (Where you&apos;re going)
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(Number(e.target.value))}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seats Needed Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Seats Needed (Max 3 in Bullet)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSeatsNeeded(num)}
                      className={`py-2.5 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                        seatsNeeded === num
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {num} {num === 1 ? 'Seat' : 'Seats'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TESLAPAY')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentMethod === 'TESLAPAY'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-400" /> TeslaPay
                      </span>
                      {paymentMethod === 'TESLAPAY' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-emerald-300">
                      Balance: ৳{(walletBalancePaisa / 100).toFixed(0)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-amber-400" /> Cash
                      </span>
                      {paymentMethod === 'CASH' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400">Pay driver at destination</div>
                  </button>
                </div>
              </div>

              {/* Fare Breakdown Card */}
              {routeData && (
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Fare:</span>
                    <span className="font-medium text-white">৳{(routeData.fare.baseFare / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Distance Charge ({routeData.distanceKm} km @ ৳10/km):</span>
                    <span className="font-medium text-white">৳{(routeData.fare.distanceCharge / 100).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center text-sm font-bold text-white">
                    <span>Estimated Solo Fare:</span>
                    <span className="text-emerald-400 text-base">৳{(routeData.fare.totalFare / 100).toFixed(2)}</span>
                  </div>

                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] text-emerald-300 mt-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Pool Savings:</strong> If another passenger joins your route, your fare drops to <strong>৳{(routeData.fareBreakdown.pooled2.totalFare / 100).toFixed(0)}</strong> (2 riders) or <strong>৳{(routeData.fareBreakdown.pooled3.totalFare / 100).toFixed(0)}</strong> (3 riders).
                    </span>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || loadingRoute || !routeData || (paymentMethod === 'TESLAPAY' && !hasSufficientTeslaPay)}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    Confirm &amp; Request Tesla <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {paymentMethod === 'TESLAPAY' && !hasSufficientTeslaPay && routeData && (
                <p className="text-[11px] text-amber-400 text-center font-medium">
                  ⚠️ Insufficient TeslaPay balance for solo estimate. Please choose Cash or top up.
                </p>
              )}
            </form>
          </div>

          {/* Right Column: Route Map & Live Details */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">Live OpenStreetMap Navigation Route</span>
                </div>
                {routeData && (
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> ~{routeData.durationMin} mins
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-white">{routeData.distanceKm} km</span>
                  </div>
                )}
              </div>

              <DynamicMap
                center={[23.7937, 90.4045]}
                zoom={13}
                markers={markers}
                routePath={routeData?.coordinates || []}
                className="h-[480px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookRidePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading booking screen...</div>}>
      <BookRideContent />
    </Suspense>
  );
}
