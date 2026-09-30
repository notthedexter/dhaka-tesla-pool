'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import DynamicMap, { MapMarker } from '../../../components/DynamicMap';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  MapPin,
  Users,
  Wallet,
  Banknote,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Car,
  Navigation,
  ShieldCheck,
  Zap,
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
  soloFare: { totalFare: number; baseFare: number; distanceCharge: number };
  fareBreakdown: {
    solo: { totalFare: number };
    double: { totalFare: number };
    triple: { totalFare: number };
    pooled2: { totalFare: number };
    pooled3: { totalFare: number };
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  REQUESTED: { label: 'Searching Pilot...', color: 'amber', desc: 'Our algorithm is matching an available Tesla for your corridor.' },
  MATCHED: { label: 'Tesla Dispatched', color: 'blue', desc: 'Your pilot is on the way to the pickup hub.' },
  DRIVER_ARRIVED: { label: 'Arrived at Hub', color: 'sky', desc: 'Your Tesla is waiting at the hub. Proceed to board.' },
  STARTED: { label: 'Trip in Progress', color: 'indigo', desc: 'En route to your destination hub.' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'slate', desc: '' };
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${colorMap[s.color]}`}>
      {s.label}
    </span>
  );
}

function BookRideContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const [areas, setAreas] = useState<Area[]>([]);
  const [pickupId, setPickupId] = useState<number>(1);
  const [destinationId, setDestinationId] = useState<number>(4);
  const [seatsNeeded, setSeatsNeeded] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TESLAPAY'>('TESLAPAY');

  const [routeData, setRouteData] = useState<RouteCalculation | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [checkingActive, setCheckingActive] = useState<boolean>(true);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);
  const [cancelling, setCancelling] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login?redirect=/passenger/book');
  }, [user, isLoading, router]);

  const fetchActiveRide = useCallback(async () => {
    try {
      const active = await api.get<ActiveRide | null>('/api/rides/active');
      setActiveRide(active);
      return active;
    } catch {
      return null;
    } finally {
      setCheckingActive(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 4000);
    return () => clearInterval(interval);
  }, [user, fetchActiveRide]);

  useEffect(() => {
    if (!activeRide) { setActiveRouteCoords([]); return; }
    api.get<RouteCalculation>(`/api/areas/distance?from=${activeRide.pickupAreaId}&to=${activeRide.destinationAreaId}`)
      .then((d) => d.coordinates && setActiveRouteCoords(d.coordinates))
      .catch(() => {});
  }, [activeRide?.id]);

  useEffect(() => {
    async function loadAreas() {
      try {
        const data = await api.get<Area[]>('/api/areas');
        setAreas(data);
        const qPickup = searchParams.get('pickup');
        const qDest = searchParams.get('destination');
        if (qPickup) setPickupId(Number(qPickup));
        if (qDest) setDestinationId(Number(qDest));
      } catch {}
    }
    loadAreas();
  }, [searchParams]);

  useEffect(() => {
    if (!pickupId || !destinationId || pickupId === destinationId) { setRouteData(null); return; }
    let cancelled = false;
    setLoadingRoute(true);
    api.get<RouteCalculation>(`/api/areas/distance?from=${pickupId}&to=${destinationId}&seats=${seatsNeeded}`)
      .then((d) => { if (!cancelled) setRouteData(d); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Route error'); })
      .finally(() => { if (!cancelled) setLoadingRoute(false); });
    return () => { cancelled = true; };
  }, [pickupId, destinationId, seatsNeeded]);

  const handleCancelActiveRide = async () => {
    if (!activeRide || !confirm('Cancel your current ride request?')) return;
    setCancelling(true);
    try {
      await api.patch(`/api/rides/${activeRide.id}/cancel`);
      setActiveRide(null);
      setActiveRouteCoords([]);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupId === destinationId) { setError('Pickup and destination cannot be the same'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ ride: { id: string } }>('/api/rides', { pickupAreaId: pickupId, destinationAreaId: destinationId, seatsNeeded, paymentMethod });
      router.push(`/passenger/ride/${res.ride.id}`);
    } catch (err: any) {
      fetchActiveRide();
      setError(err.message || 'Failed to submit ride request');
      setSubmitting(false);
    }
  };

  const markers: MapMarker[] = activeRide
    ? [
        { id: activeRide.pickupArea.id, position: [activeRide.pickupArea.latitude, activeRide.pickupArea.longitude], title: activeRide.pickupArea.name, subtitle: '🔵 Your Pickup', type: 'pickup' },
        { id: activeRide.destinationArea.id, position: [activeRide.destinationArea.latitude, activeRide.destinationArea.longitude], title: activeRide.destinationArea.name, subtitle: '🏁 Dropoff', type: 'dropoff' },
      ]
    : areas.map((a) => ({
        id: a.id,
        position: [a.latitude, a.longitude] as [number, number],
        title: a.name,
        subtitle: a.id === pickupId ? '🔵 Pickup' : a.id === destinationId ? '🏁 Dropoff' : 'Zone',
        type: (a.id === pickupId ? 'pickup' : a.id === destinationId ? 'dropoff' : 'area') as 'pickup' | 'dropoff' | 'area',
      }));

  const estimatedFarePaisa = routeData?.fare?.totalFare || 0;
  const walletBalancePaisa = user?.walletBalancePaisa || 0;
  const hasSufficientTeslaPay = walletBalancePaisa >= estimatedFarePaisa;
  const mapCenter: [number, number] = activeRide
    ? [activeRide.pickupArea.latitude, activeRide.pickupArea.longitude]
    : [23.7937, 90.4045];
  const mapRoutePath = activeRide ? activeRouteCoords : (routeData?.coordinates || []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              {activeRide ? 'Active Ride' : 'Book a Seat'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeRide ? 'Your live ride request in Dhaka corridor' : 'Select Dhaka hubs to match an electric Tesla ride'}
            </p>
          </div>
          <button
            onClick={() => router.push('/passenger/history')}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 border border-slate-700/80 rounded-lg transition-colors"
          >
            Ride History
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column */}
          {checkingActive ? (
            <div className="lg:col-span-5 glass-card rounded-2xl p-10 flex flex-col items-center justify-center min-h-[360px] text-center">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-300">Checking active requests...</p>
            </div>
          ) : activeRide ? (
            /* Active Ride Card */
            <div className="lg:col-span-5 glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Request</span>
                </div>
                <StatusBadge status={activeRide.status} />
              </div>

              <p className="text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                {STATUS_MAP[activeRide.status]?.desc || 'Status updated.'}
              </p>

              {/* Route */}
              <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Pickup Hub</div>
                    <div className="text-sm font-bold text-white">{activeRide.pickupArea.name}</div>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-slate-700 ml-1 h-3" />
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Destination Hub</div>
                    <div className="text-sm font-bold text-white">{activeRide.destinationArea.name}</div>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Distance', value: `${activeRide.distanceKm} km` },
                  { label: 'Seats Reserved', value: `${activeRide.seatsNeeded} seat(s)` },
                  { label: 'Estimated Fare', value: `৳${(activeRide.estimatedFarePaisa / 100).toFixed(0)}`, accent: true },
                  { label: 'Payment Method', value: activeRide.paymentMethod === 'TESLAPAY' ? 'TeslaPay' : 'Cash' },
                ].map((d) => (
                  <div key={d.label} className="p-2.5 bg-slate-900/70 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">{d.label}</div>
                    <div className={`text-sm font-bold font-mono mt-0.5 ${d.accent ? 'text-blue-400' : 'text-white'}`}>{d.value}</div>
                  </div>
                ))}
              </div>

              {/* Pool match */}
              {activeRide.pool && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-1">
                    <Car className="w-3.5 h-3.5" /> Assigned Tesla Vehicle
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-200 font-medium">{activeRide.pool.tesla.name}</span>
                    <span className="text-slate-400">Pilot: <strong className="text-white">{activeRide.pool.driver.name}</strong></span>
                  </div>
                </div>
              )}

              {/* Policy note */}
              <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span>Single active ride policy: 1 active request allowed at a time.</span>
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => router.push(`/passenger/ride/${activeRide.id}`)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs"
                >
                  <Navigation className="w-3.5 h-3.5" /> Open Live GPS Radar <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {['REQUESTED', 'MATCHED'].includes(activeRide.status) ? (
                  <button
                    onClick={handleCancelActiveRide}
                    disabled={cancelling}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Cancel Ride Request
                  </button>
                ) : (
                  <p className="text-center text-[10px] text-slate-500">Trip locked — pilot has arrived or ride has departed.</p>
                )}
              </div>
            </div>
          ) : (
            /* Booking Form */
            <div className="lg:col-span-5 glass-card rounded-2xl p-5 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Pickup */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Pickup Hub
                  </label>
                  <select
                    value={pickupId}
                    onChange={(e) => setPickupId(Number(e.target.value))}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                  >
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {/* Destination */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-sm bg-rose-500" />
                    Destination Hub
                  </label>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(Number(e.target.value))}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                  >
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {/* Seats */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Seats Needed
                    </label>
                    <span className="text-[11px] text-blue-400 font-semibold font-mono">
                      {seatsNeeded === 1 ? '1.0× Solo' : seatsNeeded === 2 ? '1.75× Companion' : '2.40× Charter'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSeatsNeeded(n)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition flex flex-col items-center ${
                          seatsNeeded === n
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>{n} {n === 1 ? 'Seat' : 'Seats'}</span>
                        <span className={`text-[10px] font-mono ${seatsNeeded === n ? 'text-white/80' : 'text-slate-500'}`}>
                          {n === 1 ? '1.0×' : n === 2 ? '1.75×' : '2.40×'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TESLAPAY')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        paymentMethod === 'TESLAPAY'
                          ? 'bg-blue-500/10 border-blue-500/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Wallet className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-bold text-white">TeslaPay</span>
                        {paymentMethod === 'TESLAPAY' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 ml-auto" />}
                      </div>
                      <div className="text-[10px] text-blue-400 font-mono">৳{(walletBalancePaisa / 100).toFixed(0)} balance</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        paymentMethod === 'CASH'
                          ? 'bg-blue-500/10 border-blue-500/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Banknote className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-white">Cash</span>
                        {paymentMethod === 'CASH' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 ml-auto" />}
                      </div>
                      <div className="text-[10px] text-slate-400">Pay at destination</div>
                    </button>
                  </div>
                </div>

                {/* Fare breakdown */}
                {routeData && (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Base fare</span>
                      <span className="font-mono text-white">৳{(routeData.fare.baseFare / 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Distance ({routeData.distanceKm} km)</span>
                      <span className="font-mono text-white">৳{(routeData.fare.distanceCharge / 100).toFixed(0)}</span>
                    </div>
                    {seatsNeeded > 1 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Person count multiplier</span>
                        <span className="text-amber-300 font-mono">{seatsNeeded === 2 ? '1.75×' : '2.40×'}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-xs text-white">
                      <span>Estimated Fare</span>
                      <div className="text-right">
                        <span className="font-mono text-blue-400 text-sm">৳{(routeData.fare.totalFare / 100).toFixed(0)}</span>
                        {seatsNeeded > 1 && (
                          <span className="block text-[10px] text-slate-400 font-normal font-mono">
                            ~৳{(routeData.fare.totalFare / 100 / seatsNeeded).toFixed(0)} /person
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {loadingRoute && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    Calculating route distance...
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || loadingRoute || !routeData || (paymentMethod === 'TESLAPAY' && !hasSufficientTeslaPay)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5 fill-current" /> Confirm &amp; Request Tesla <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>

                {paymentMethod === 'TESLAPAY' && !hasSufficientTeslaPay && routeData && (
                  <p className="text-[11px] text-amber-400 text-center">
                    Insufficient TeslaPay balance — select Cash or{' '}
                    <button type="button" onClick={() => router.push('/passenger/wallet')} className="underline">top up</button>.
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Right: Map */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">
                  {activeRide ? `${activeRide.pickupArea.name} → ${activeRide.destinationArea.name}` : 'Route Navigation Radar'}
                </span>
              </div>
              {(activeRide || routeData) && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="font-mono">{activeRide ? `~${Math.round(activeRide.distanceKm * 3)} min` : `~${routeData?.durationMin} min`}</span>
                  <span>·</span>
                  <span className="text-white font-semibold font-mono">{activeRide ? `${activeRide.distanceKm} km` : `${routeData?.distanceKm} km`}</span>
                </div>
              )}
            </div>
            <DynamicMap
              center={mapCenter}
              zoom={13}
              markers={markers}
              routePath={mapRoutePath}
              className="h-[460px] w-full rounded-xl overflow-hidden border border-slate-800"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookRidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    }>
      <BookRideContent />
    </Suspense>
  );
}
