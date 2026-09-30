'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import DynamicMap, { MapMarker } from '../../../components/DynamicMap';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
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
  ShieldCheck,
  TrendingUp,
  RefreshCw,
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
  const { user, isLoading } = useAuth();

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [activePool, setActivePool] = useState<ActivePool | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication Guard: must be a driver
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login?redirect=/driver/dashboard');
      } else if (user.role !== 'DRIVER') {
        router.push('/passenger/book');
      } else if (user.tesla) {
        setIsOnline(user.tesla.isOnline);
      }
    }
  }, [user, isLoading, router]);

  // Fetch driver data (pool and pending requests)
  const fetchData = async () => {
    try {
      // 1. Fetch active pool
      const pool = await api.get<ActivePool | null>('/api/drivers/pool/current');
      setActivePool(pool);

      // 2. If online and not completed, fetch pending requests
      if (isOnline) {
        const requests = await api.get<PendingRequest[]>('/api/drivers/requests');
        setPendingRequests(requests);
      } else {
        setPendingRequests([]);
      }
    } catch (err: any) {
      console.error('Driver fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and 4-second real-time polling
  useEffect(() => {
    if (user?.role === 'DRIVER') {
      fetchData();
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    }
  }, [user, isOnline]);

  // Toggle Online / Offline status
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
      setError(err.message || 'Failed to update online status');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Accept a ride request
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

  // Mark Driver Arrived at Pickup Area
  const handleArrive = async () => {
    if (!activePool) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.patch(`/api/drivers/pool/${activePool.id}/arrive`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update arrival');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Trip (Passengers on board)
  const handleStartTrip = async () => {
    if (!activePool) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.patch(`/api/drivers/pool/${activePool.id}/start`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Trip (Passengers dropped off, collect fares)
  const handleCompleteTrip = async () => {
    if (!activePool) return;
    if (!confirm('Confirm completion of this trip? All fares will be finalized.')) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.patch(`/api/drivers/pool/${activePool.id}/complete`);
      setActivePool(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete trip');
    } finally {
      setActionLoading(false);
    }
  };

  // Build map markers
  const markers: MapMarker[] = [];
  if (activePool) {
    markers.push({
      id: 'pickup',
      position: [activePool.pickupArea.latitude, activePool.pickupArea.longitude],
      title: `Pickup: ${activePool.pickupArea.name}`,
      subtitle: 'Tesla Boarding Zone',
      type: 'pickup',
    });

    activePool.members.forEach((m, i) => {
      const dest = m.rideRequest?.destinationArea;
      if (dest) {
        markers.push({
          id: `drop-${i}`,
          position: [dest.latitude, dest.longitude],
          title: `Dropoff: ${dest.name} (${m.passenger.name})`,
          subtitle: `${m.seats} seat(s)`,
          type: 'dropoff',
        });
      }
    });
  } else {
    pendingRequests.forEach((req) => {
      markers.push({
        id: req.id,
        position: [req.pickupArea.latitude, req.pickupArea.longitude],
        title: `${req.pickupArea.name} → ${req.destinationArea.name}`,
        subtitle: `${req.passenger.name} (${req.seatsNeeded} seat)`,
        type: 'pickup',
      });
    });
  }

  const teslaName = user?.tesla?.name || 'Bullet';
  const totalSeats = user?.tesla?.totalSeats || 3;
  const occupiedSeats = activePool?.occupiedSeats || 0;
  const seatsAvailable = Math.max(0, totalSeats - occupiedSeats);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header & Vehicle Status */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-3xl shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {user?.name}&apos;s Cockpit
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Pilot of &quot;{teslaName}&quot;
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Vehicle: <strong className="text-white">{teslaName}</strong> • Capacity:{' '}
                <strong className="text-white">{totalSeats} Passengers</strong> • Hub:{' '}
                <strong className="text-white">Banani Road 11</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/driver/history"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition"
            >
              Trip History
            </Link>

            {/* Online / Offline Toggle */}
            <button
              onClick={handleToggleOnline}
              disabled={togglingStatus}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
                isOnline
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? 'bg-slate-950 animate-pulse' : 'bg-slate-500'
                }`}
              />
              {togglingStatus ? (
                'Updating...'
              ) : isOnline ? (
                'ONLINE & ACCEPTING'
              ) : (
                'OFFLINE (TAP TO GO ONLINE)'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Driver Alert</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Pool Management & Requests */}
          <div className="lg:col-span-6 space-y-6">
            {/* Active Pool Card */}
            {activePool ? (
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Active Pool Trip
                    </span>
                    <h2 className="text-lg font-bold text-white mt-2 flex items-center gap-2">
                      <span>Pickup: {activePool.pickupArea.name}</span>
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {activePool.status}
                    </span>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-300">
                      Bullet Seat Capacity ({occupiedSeats} / {totalSeats} seats)
                    </span>
                    <span className={seatsAvailable === 0 ? 'text-amber-400' : 'text-emerald-400'}>
                      {seatsAvailable === 0 ? 'FULL (3/3)' : `${seatsAvailable} seat(s) available`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupiedSeats === 3
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(occupiedSeats / totalSeats) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Passengers List */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Onboard / Reserved Passengers ({activePool.members.length})
                  </h3>
                  {activePool.members.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block text-sm">
                          {member.passenger.name}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Destination: {member.rideRequest?.destinationArea?.name || 'Dhaka Hub'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">
                          ৳{(member.farePaisa / 100).toFixed(0)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {member.seats} seat(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lifecycle Step Action Buttons */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  {activePool.status === 'ACTIVE' && (
                    <button
                      onClick={handleArrive}
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      I&apos;ve Arrived at {activePool.pickupArea.name} (Notify Passengers)
                    </button>
                  )}

                  {activePool.status === 'EN_ROUTE' && (
                    <div className="space-y-2">
                      <button
                        onClick={handleStartTrip}
                        disabled={actionLoading}
                        className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-cyan-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        Depart &amp; Start Trip (All Onboard)
                      </button>

                      <button
                        onClick={handleCompleteTrip}
                        disabled={actionLoading}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-xs"
                      >
                        Complete Trip &amp; Collect Fares
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Pending Ride Requests */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Incoming Ride Requests
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isOnline ? 'Passengers currently waiting in Dhaka' : 'Go online to see requests'}
                  </p>
                </div>
                <button
                  onClick={fetchData}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                  title="Refresh requests"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isOnline ? (
                <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
                  <p className="text-sm font-semibold text-slate-300">Driver Status is Offline</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &quot;ONLINE&quot; above to start receiving ride requests.
                  </p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
                  <p className="text-sm font-semibold text-slate-300">No Pending Requests</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Waiting for passengers like Nusrat, Rafiq, or Shirin to book a seat.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700/80 hover:border-emerald-500/40 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                          <span className="font-bold text-white">{req.passenger.name}</span>
                          <span>•</span>
                          <span>{req.seatsNeeded} {req.seatsNeeded === 1 ? 'Seat' : 'Seats'}</span>
                          <span>•</span>
                          <span>{req.distanceKm} km</span>
                        </div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{req.pickupArea.name}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-emerald-400">{req.destinationArea.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Fare: <strong>৳{(req.estimatedFarePaisa / 100).toFixed(0)}</strong> • Method: {req.paymentMethod}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAcceptRide(req.id)}
                        disabled={Boolean(actionLoading || (activePool && seatsAvailable < req.seatsNeeded))}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                        Accept Ride
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Map */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white">Live Dhaka Navigation Radar</span>
              </div>
              <span className="text-xs text-slate-400">
                {activePool ? `${activePool.members.length} Active Rider(s)` : `${pendingRequests.length} Pending Call(s)`}
              </span>
            </div>

            <DynamicMap
              center={[23.7937, 90.4045]} // Centered on Banani
              zoom={13}
              markers={markers}
              className="h-[560px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
