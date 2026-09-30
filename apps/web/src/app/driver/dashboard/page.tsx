'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import DynamicMap, { MapMarker } from '../../../components/DynamicMap';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { LiquidGlassAvatar } from '@/components/lightswind/liquid-glass-avatar';
import {
  Zap,
  Car,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wallet,
} from 'lucide-react';

interface PendingRequest {
  id: string;
  passengerId: string;
  seatsNeeded: number;
  estimatedFarePaisa: number;
  distanceKm: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  passenger: { name: string; email: string };
  pickupArea: { id: number; name: string; latitude: number; longitude: number };
  destinationArea: { id: number; name: string; latitude: number; longitude: number };
}

interface ActivePool {
  id: string;
  teslaId: string;
  status: 'ACTIVE' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED';
  occupiedSeats: number;
  pickupArea: { id: number; name: string; latitude: number; longitude: number };
  tesla: { name: string; totalSeats: number; isOnline: boolean };
  createdAt?: string;
  members: Array<{
    id: string;
    passengerId: string;
    seats: number;
    farePaisa: number;
    status: string;
    passenger: { name: string; email: string };
    rideRequest?: {
      destinationArea?: { id: number; name: string; latitude: number; longitude: number };
      status: string;
    };
  }>;
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [activePool, setActivePool] = useState<ActivePool | null>(null);
  const [awaitingPool, setAwaitingPool] = useState<ActivePool | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.push('/login?redirect=/driver/dashboard');
      else if (user.role !== 'DRIVER') router.push('/passenger/book');
      else if (user.tesla) setIsOnline(user.tesla.isOnline);
    }
  }, [user, isLoading, router]);

  const fetchData = async () => {
    try {
      const res = await api.get<any>('/api/drivers/pool/current');
      if (res) {
        setActivePool(res.currentPool || null);
        setAwaitingPool(res.awaitingPool || null);
      } else {
        setActivePool(null);
        setAwaitingPool(null);
      }
      if (isOnline) {
        const requests = await api.get<PendingRequest[]>('/api/drivers/requests');
        setPendingRequests(requests);
      } else {
        setPendingRequests([]);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.role === 'DRIVER') {
      fetchData();
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [user, isOnline]);

  const handleToggleOnline = async () => {
    setTogglingStatus(true);
    setError(null);
    try {
      const newStatus = !isOnline;
      await api.patch('/api/drivers/status', { isOnline: newStatus });
      setIsOnline(newStatus);
      if (newStatus) {
        const requests = await api.get<PendingRequest[]>('/api/drivers/requests');
        setPendingRequests(requests);
      } else {
        setPendingRequests([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post(`/api/drivers/accept/${rideId}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to accept ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrive = async () => {
    if (!activePool) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/drivers/pool/${activePool.id}/arrive`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to mark arrival');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!activePool) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/drivers/pool/${activePool.id}/start`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activePool || !confirm('Complete this trip? All fares will be finalized.')) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/drivers/pool/${activePool.id}/complete`);
      setActivePool(null);
      await refreshUser();
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete trip');
    } finally {
      setActionLoading(false);
    }
  };

  // Map markers
  const markers: MapMarker[] = [];
  if (activePool) {
    markers.push({ id: 'pickup', position: [activePool.pickupArea.latitude, activePool.pickupArea.longitude], title: `Pickup: ${activePool.pickupArea.name}`, subtitle: 'Tesla boarding hub', type: 'pickup' });
    activePool.members.forEach((m, i) => {
      const dest = m.rideRequest?.destinationArea;
      if (dest) markers.push({ id: `drop-${i}`, position: [dest.latitude, dest.longitude], title: `Dropoff: ${dest.name}`, subtitle: m.passenger.name, type: 'dropoff' });
    });
  }
  if (awaitingPool) {
    markers.push({ id: 'await-pickup', position: [awaitingPool.pickupArea.latitude, awaitingPool.pickupArea.longitude], title: `[Queued] ${awaitingPool.pickupArea.name}`, subtitle: 'Advance reservation', type: 'pickup' });
  }
  if (!activePool && !awaitingPool) {
    pendingRequests.forEach((req) => markers.push({
      id: req.id,
      position: [req.pickupArea.latitude, req.pickupArea.longitude],
      title: `${req.pickupArea.name} → ${req.destinationArea.name}`,
      subtitle: `${req.passenger.name} (${req.seatsNeeded} seat)`,
      type: 'pickup',
    }));
  }

  const teslaName = user?.tesla?.name || 'Bullet';
  const totalSeats = user?.tesla?.totalSeats || 3;
  const occupiedSeats = activePool?.occupiedSeats || 0;
  const seatsAvailable = Math.max(0, totalSeats - occupiedSeats);
  const isTripStarted = Boolean(activePool?.members.some((m) => m.rideRequest?.status === 'STARTED'));

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Cockpit header */}
        <div className="glass-card rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <LiquidGlassAvatar
              fallback={user?.name?.charAt(0) || 'D'}
              variant="primary"
              size="lg"
              glow
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-lg font-bold text-white">{user?.name}</h1>
                <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[11px] font-semibold rounded-full">
                  Pilot · "{teslaName}"
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalSeats} passenger seats · Banani Road 11 Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Wallet */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-semibold text-blue-400">
              <Wallet className="w-3.5 h-3.5" />
              <span className="font-mono font-bold">৳{((user?.walletBalancePaisa || 0) / 100).toFixed(0)}</span>
              <span className="text-[10px] text-slate-400 font-normal">wallet</span>
            </div>

            <Link
              href="/driver/history"
              className="px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Trip History
            </Link>

            {/* Online toggle */}
            <button
              onClick={handleToggleOnline}
              disabled={togglingStatus}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition flex items-center gap-2 ${
                isOnline
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
              {togglingStatus ? 'Updating...' : isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Pool management */}
          <div className="lg:col-span-6 space-y-4">
            {/* Active Pool */}
            {activePool && (
              <div className="glass-card rounded-2xl p-5 space-y-4 border border-blue-500/25">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    Active Pool Trip
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{activePool.status}</span>
                </div>

                <div>
                  <p className="font-display text-sm font-bold text-white mb-2">Pickup Hub: {activePool.pickupArea.name}</p>
                  {/* Capacity bar */}
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-slate-400 font-mono">{occupiedSeats}/{totalSeats} seats filled</span>
                    <span className={`font-semibold ${seatsAvailable === 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                      {seatsAvailable === 0 ? 'Capacity Reached' : `${seatsAvailable} seat(s) available`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(occupiedSeats / totalSeats) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Passengers */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Onboard Passengers ({activePool.members.length})</p>
                  {activePool.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="font-semibold text-white block">{m.passenger.name}</span>
                        <span className="text-slate-400 text-[11px]">→ {m.rideRequest?.destinationArea?.name || 'Hub'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-blue-400 block">৳{(m.farePaisa / 100).toFixed(0)}</span>
                        <span className="text-[10px] text-slate-400">{m.seats} {m.seats > 1 ? `seats (${m.seats === 2 ? '1.75×' : '2.40×'})` : 'seat (Solo)'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  {activePool.status === 'ACTIVE' && (
                    <button
                      onClick={handleArrive}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Arrived at {activePool.pickupArea.name} (Notify Riders)
                    </button>
                  )}

                  {activePool.status === 'EN_ROUTE' && (
                    !isTripStarted ? (
                      <button
                        onClick={handleStartTrip}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        Depart &amp; Start Trip (All Onboard)
                      </button>
                    ) : (
                      <button
                        onClick={handleCompleteTrip}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Complete Trip &amp; Finalize Fares
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Awaiting advance trip */}
            {awaitingPool && (
              <div className="glass-card rounded-2xl p-5 space-y-3 border border-indigo-500/25">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    <Clock className="w-3 h-3 text-indigo-400 animate-pulse" /> Queued Advance Trip
                  </span>
                  <span className="text-xs text-slate-400">Activates on trip completion</span>
                </div>

                <p className="font-display text-sm font-bold text-white">Pickup Hub: {awaitingPool.pickupArea.name}</p>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-mono">{awaitingPool.occupiedSeats}/{totalSeats} advance seats reserved</span>
                    <span className="text-indigo-300 font-mono">{totalSeats - awaitingPool.occupiedSeats} remaining</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(awaitingPool.occupiedSeats / totalSeats) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {awaitingPool.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="font-semibold text-white block">{m.passenger.name}</span>
                        <span className="text-[10px] text-slate-400">→ {m.rideRequest?.destinationArea?.name || 'Hub'}</span>
                      </div>
                      <span className="font-mono font-bold text-blue-400">৳{(m.farePaisa / 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Reserved advance trip queued. Will activate immediately after current ride finishes.
                </div>
              </div>
            )}

            {/* Pending requests */}
            <div className="glass-card rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" /> Incoming Corridor Requests
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isOnline ? 'Passengers currently requesting a seat in Dhaka' : 'Toggle Online above to accept calls'}
                  </p>
                </div>
                <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isOnline ? (
                <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-800">
                  <p className="text-xs font-semibold text-slate-300">Driver Cockpit is Offline</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click &quot;Online&quot; above to start accepting rides.</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-800">
                  <p className="text-xs font-semibold text-slate-300">No Pending Requests</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Waiting for passengers along the corridor.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingRequests.map((req) => {
                    const canPoolIntoActive = Boolean(activePool && activePool.status === 'ACTIVE' && activePool.pickupArea.id === req.pickupArea.id && seatsAvailable >= req.seatsNeeded);
                    const isAdvanceAccept = Boolean(activePool && !canPoolIntoActive);
                    const isAdvanceLimitReached = Boolean(activePool && awaitingPool && !canPoolIntoActive);
                    const canAccept = !isAdvanceLimitReached && (!activePool || canPoolIntoActive || (!awaitingPool && req.seatsNeeded <= totalSeats));

                    return (
                      <div key={req.id} className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 flex-wrap">
                              <span className="font-semibold text-white">{req.passenger.name}</span>
                              <span>·</span>
                              <span>{req.seatsNeeded} {req.seatsNeeded > 1 ? `seats (${req.seatsNeeded === 2 ? '1.75×' : '2.40×'})` : 'seat'}</span>
                              <span>·</span>
                              <span className="font-mono">{req.distanceKm} km</span>
                            </div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1">
                              {req.pickupArea.name}
                              <span className="text-slate-500">→</span>
                              <span className="text-blue-400">{req.destinationArea.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Fare: <strong className="font-mono text-white">৳{(req.estimatedFarePaisa / 100).toFixed(0)}</strong> · {req.paymentMethod}
                              {req.seatsNeeded > 1 && <span className="ml-1 text-slate-500">(Solo 1× credit)</span>}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAcceptRide(req.id)}
                            disabled={Boolean(actionLoading || !canAccept)}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition shrink-0 flex items-center gap-1.5 ${
                              isAdvanceLimitReached
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : isAdvanceAccept
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                            } disabled:opacity-40`}
                          >
                            {actionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isAdvanceLimitReached ? (
                              <AlertCircle className="w-3.5 h-3.5" />
                            ) : isAdvanceAccept ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 fill-current" />
                            )}
                            {isAdvanceLimitReached ? 'Queue Full' : isAdvanceAccept ? 'Advance' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-6 glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">Live Cockpit Radar</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {activePool ? `${activePool.members.length} onboard` : `${pendingRequests.length} pending`}
              </span>
            </div>
            <DynamicMap
              center={[23.7937, 90.4045]}
              zoom={13}
              markers={markers}
              className="h-[520px] w-full rounded-xl overflow-hidden border border-slate-800"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
