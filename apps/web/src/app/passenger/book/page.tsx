'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
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
  CheckCircle,
  XCircle,
  Car,
  Navigation,
  ShieldCheck,
} from 'lucide-react';

interface Area {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface ActiveRide {
  id: string;
  pickupAreaId: number;
  destinationAreaId: number;
  seatsNeeded: number;
  estimatedFarePaisa: number;
  distanceKm: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  pickupArea: { id: number; name: string; latitude: number; longitude: number };
  destinationArea: { id: number; name: string; latitude: number; longitude: number };
  pool?: {
    id: string;
    tesla: { name: string; totalSeats: number; plateNumber?: string };
    driver: { id: string; name: string };
    status: string;
    occupiedSeats: number;
  } | null;
}

interface RouteCalculation {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  seats: number;
  fare: {
    totalFare: number;
    baseFare: number;
    distanceCharge: number;
    soloFare: number;
    seatMultiplier: number;
    rawFare: number;
    poolDiscount: number;
    discountPercentage: number;
    seatsCount: number;
  };
  soloFare: {
    totalFare: number;
    baseFare: number;
    distanceCharge: number;
  };
  fareBreakdown: {
    solo: { totalFare: number };
    double: { totalFare: number };
    triple: { totalFare: number };
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

  // Active ride states
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [checkingActive, setCheckingActive] = useState<boolean>(true);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Authentication Guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/passenger/book');
    }
  }, [user, isLoading, router]);

  // Check for currently active ride on mount and poll
  const fetchActiveRide = useCallback(async () => {
    try {
      const active = await api.get<ActiveRide | null>('/api/rides/active');
      setActiveRide(active);
      return active;
    } catch (err) {
      console.error('Failed to fetch active ride:', err);
      return null;
    } finally {
      setCheckingActive(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchActiveRide();

    const interval = setInterval(() => {
      fetchActiveRide();
    }, 4000);

    return () => clearInterval(interval);
  }, [user, fetchActiveRide]);

  // Fetch coordinates for active ride route map
  useEffect(() => {
    if (!activeRide) {
      setActiveRouteCoords([]);
      return;
    }

    async function loadActiveRoute() {
      try {
        const data = await api.get<RouteCalculation>(
          `/api/areas/distance?from=${activeRide!.pickupAreaId}&to=${activeRide!.destinationAreaId}`
        );
        if (data.coordinates) {
          setActiveRouteCoords(data.coordinates);
        }
      } catch (err) {
        console.error('Failed to fetch active route coordinates:', err);
      }
    }

    loadActiveRoute();
  }, [activeRide?.id, activeRide?.pickupAreaId, activeRide?.destinationAreaId]);

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

  // Fetch route and fare estimate accounting for seatsNeeded
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
          `/api/areas/distance?from=${pickupId}&to=${destinationId}&seats=${seatsNeeded}`
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
  }, [pickupId, destinationId, seatsNeeded]);

  const handleCancelActiveRide = async () => {
    if (!activeRide) return;
    if (!confirm('Are you sure you want to cancel your current ride request?')) return;

    setCancelling(true);
    setError(null);
    try {
      await api.patch(`/api/rides/${activeRide.id}/cancel`);
      setActiveRide(null);
      setActiveRouteCoords([]);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel active ride');
    } finally {
      setCancelling(false);
    }
  };

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
      if (err.data?.activeRide || err.activeRide) {
        setActiveRide(err.data?.activeRide || err.activeRide);
      } else {
        fetchActiveRide();
      }
      setError(err.message || 'Failed to submit ride request');
      setSubmitting(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return {
          label: 'Searching for Tesla Pilot...',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          description: 'Our matching algorithm is locating an optimal Tesla Bullet or Model 3 for your route.',
        };
      case 'MATCHED':
        return {
          label: 'Tesla Dispatched & Matched',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          description: 'Your pilot is on the way to the pickup hub.',
        };
      case 'DRIVER_ARRIVED':
        return {
          label: 'Tesla Pilot Arrived at Hub',
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          description: 'Your Tesla has arrived at the pickup zone. Please proceed to board.',
        };
      case 'STARTED':
        return {
          label: 'Trip in Progress',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          description: 'You are on your way to the destination hub.',
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
          description: 'Ride status updated.',
        };
    }
  };

  // Build map markers
  const markers: MapMarker[] = activeRide
    ? [
        {
          id: activeRide.pickupArea.id,
          position: [activeRide.pickupArea.latitude, activeRide.pickupArea.longitude],
          title: activeRide.pickupArea.name,
          subtitle: '🟢 Your Pickup Hub',
          type: 'pickup' as const,
        },
        {
          id: activeRide.destinationArea.id,
          position: [activeRide.destinationArea.latitude, activeRide.destinationArea.longitude],
          title: activeRide.destinationArea.name,
          subtitle: '🏁 Your Dropoff Hub',
          type: 'dropoff' as const,
        },
      ]
    : areas.map((area) => {
        let type: 'pickup' | 'dropoff' | 'area' = 'area';
        if (area.id === pickupId) type = 'pickup';
        else if (area.id === destinationId) type = 'dropoff';

        return {
          id: area.id,
          position: [area.latitude, area.longitude],
          title: area.name,
          subtitle:
            area.id === pickupId
              ? '🟢 Pickup Location'
              : area.id === destinationId
              ? '🏁 Dropoff Location'
              : 'Dhaka Zone',
          type,
        };
      });

  const estimatedFarePaisa = routeData?.fare?.totalFare || 0;
  const walletBalancePaisa = user?.walletBalancePaisa || 0;
  const hasSufficientTeslaPay = walletBalancePaisa >= estimatedFarePaisa;

  const mapCenter: [number, number] = activeRide
    ? [activeRide.pickupArea.latitude, activeRide.pickupArea.longitude]
    : [23.7937, 90.4045];

  const mapRoutePath = activeRide ? activeRouteCoords : (routeData?.coordinates || []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-emerald-400 fill-current" />
              {activeRide ? 'Active Tesla Ride Request' : 'Request a Seat in a Tesla'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeRide
                ? 'You currently have an active ride request in progress. Track your pilot or manage your ride below.'
                : 'Select your Dhaka pickup and destination hubs. Our matching algorithm connects you to nearby rides automatically.'}
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
              <p className="font-bold">Notice</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          {checkingActive ? (
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-10 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center min-h-[420px] text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
              <p className="text-white font-bold">Checking Active Requests</p>
              <p className="text-xs text-slate-400 mt-1">Synchronizing with Dhaka Tesla Fleet Dispatch...</p>
            </div>
          ) : activeRide ? (
            /* Active Ride in Progress Card */
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Live Active Request
                  </span>
                </div>
                {(() => {
                  const statusInfo = getStatusDisplay(activeRide.status);
                  return (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  );
                })()}
              </div>

              {/* Status Explanation */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300">
                {getStatusDisplay(activeRide.status).description}
              </div>

              {/* Route Summary */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Pickup Hub</div>
                    <div className="text-sm font-bold text-white">{activeRide.pickupArea.name}</div>
                  </div>
                </div>

                <div className="border-l-2 border-dashed border-slate-700 ml-1.5 h-4" />

                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-sm bg-rose-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Destination Hub</div>
                    <div className="text-sm font-bold text-white">{activeRide.destinationArea.name}</div>
                  </div>
                </div>
              </div>

              {/* Ride Spec Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Distance</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeRide.distanceKm} km</div>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Seats Reserved</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeRide.seatsNeeded} seat(s)</div>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Estimated Fare</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    ৳{(activeRide.estimatedFarePaisa / 100).toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-[11px]">Payment Method</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {activeRide.paymentMethod === 'TESLAPAY' ? 'TeslaPay Wallet' : 'Cash'}
                  </div>
                </div>
              </div>

              {/* Pilot / Vehicle Details (If matched) */}
              {activeRide.pool && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Car className="w-4 h-4" /> Assigned Fleet Vehicle
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">{activeRide.pool.tesla.name}</span>
                    <span className="text-slate-400">Pilot: <strong className="text-white">{activeRide.pool.driver.name}</strong></span>
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    Pool Occupancy: {activeRide.pool.occupiedSeats} / {activeRide.pool.tesla.totalSeats} seats
                  </div>
                </div>
              )}

              {/* Single Active Policy Note */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <span>
                  <strong>Single Active Ride Policy:</strong> You can only have 1 active ride request at a time. To book another trip, complete or cancel this active request.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/passenger/ride/${activeRide.id}`)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2 text-base"
                >
                  <Navigation className="w-5 h-5" /> Open Live Ride Radar &amp; GPS <ArrowRight className="w-5 h-5" />
                </button>

                {['REQUESTED', 'MATCHED'].includes(activeRide.status) ? (
                  <button
                    type="button"
                    onClick={handleCancelActiveRide}
                    disabled={cancelling}
                    className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Cancelling Request...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" /> Cancel Ride Request
                      </>
                    )}
                  </button>
                ) : (
                  <p className="text-center text-[11px] text-slate-500">
                    Ride is in transit. Cancellation is disabled once pilot arrives or trip starts.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Booking Form when no active ride */
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      Seats Needed (Person Count)
                    </label>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {seatsNeeded === 1 ? '1x Solo Rate' : seatsNeeded === 2 ? '1.75x Companion Rate' : '2.40x Charter Rate'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSeatsNeeded(num)}
                        className={`py-2.5 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center ${
                          seatsNeeded === num
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span>{num} {num === 1 ? 'Seat' : 'Seats'}</span>
                        <span className={`text-[10px] ${seatsNeeded === num ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                          {num === 1 ? '1.0x' : num === 2 ? '1.75x' : '2.40x'}
                        </span>
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
                      <span>Base Fare (Solo):</span>
                      <span className="font-medium text-white">৳{(routeData.fare.baseFare / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Distance Charge ({routeData.distanceKm} km @ ৳10/km):</span>
                      <span className="font-medium text-white">৳{(routeData.fare.distanceCharge / 100).toFixed(2)}</span>
                    </div>

                    {seatsNeeded > 1 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Person Count Multiplier ({seatsNeeded} persons):</span>
                        <span className="font-medium text-amber-300">
                          {seatsNeeded === 2 ? '1.75x (Companion Discount)' : '2.40x (Fleet Charter)'}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center text-sm font-bold text-white">
                      <span>{seatsNeeded === 1 ? 'Estimated Solo Fare:' : `Total Fare (${seatsNeeded} Persons):`}</span>
                      <div className="text-right">
                        <span className="text-emerald-400 text-base">৳{(routeData.fare.totalFare / 100).toFixed(2)}</span>
                        {seatsNeeded > 1 && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            ~৳{(routeData.fare.totalFare / 100 / seatsNeeded).toFixed(0)} / person
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] text-emerald-300 mt-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {seatsNeeded === 1 ? (
                          <>
                            <strong>Pool Savings:</strong> If another passenger joins your route, your fare drops to <strong>৳{(routeData.fareBreakdown.pooled2.totalFare / 100).toFixed(0)}</strong> (2 riders) or <strong>৳{(routeData.fareBreakdown.pooled3.totalFare / 100).toFixed(0)}</strong> (3 riders).
                          </>
                        ) : (
                          <>
                            <strong>Driver Earnings Policy:</strong> Driver receives the solo fare (<strong>৳{((routeData.soloFare?.totalFare || routeData.fare.soloFare || routeData.fare.totalFare) / 100).toFixed(0)}</strong>) directly in their cockpit wallet.
                          </>
                        )}
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
          )}

          {/* Right Column: Route Map & Live Details */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">
                    {activeRide
                      ? `Active Route: ${activeRide.pickupArea.name} → ${activeRide.destinationArea.name}`
                      : 'Live OpenStreetMap Navigation Route'}
                  </span>
                </div>
                {(activeRide || routeData) && (
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {activeRide ? `~${Math.round(activeRide.distanceKm * 3)} mins` : `~${routeData?.durationMin} mins`}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-white">
                      {activeRide ? `${activeRide.distanceKm} km` : `${routeData?.distanceKm} km`}
                    </span>
                  </div>
                )}
              </div>

              <DynamicMap
                center={mapCenter}
                zoom={13}
                markers={markers}
                routePath={mapRoutePath}
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
