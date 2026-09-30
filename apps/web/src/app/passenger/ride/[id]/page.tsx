'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import DynamicMap, { MapMarker } from '../../../../components/DynamicMap';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../../../lib/api';
import {
  Zap,
  Car,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface RideDetail {
  id: string;
  passengerId: string;
  pickupAreaId: number;
  destinationAreaId: number;
  seatsNeeded: number;
  estimatedFarePaisa: number;
  distanceKm: number;
  status: 'REQUESTED' | 'MATCHED' | 'DRIVER_ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  poolId: string | null;
  paymentMethod: 'CASH' | 'TESLAPAY';
  createdAt: string;
  pickupArea: { id: number; name: string; latitude: number; longitude: number };
  destinationArea: { id: number; name: string; latitude: number; longitude: number };
  pool?: {
    id: string;
    tesla: { name: string; totalSeats: number };
    driver: { id: string; name: string };
    status: string;
    occupiedSeats: number;
    members: Array<{ id: string; passengerId: string; passenger: { name: string }; seats: number; farePaisa: number; status: string; rideRequest?: { destinationArea?: { name: string } } }>;
  } | null;
  advanceBooking?: {
    isAwaiting: boolean;
    estimatedWaitMin: number;
    priorPoolStatus: string;
    priorDestinationName: string;
    driverName: string;
    teslaName: string;
    message: string;
  } | null;
  payment?: { amountPaisa: number; method: string; status: string } | null;
}

const STATUS_STEPS = [
  { key: 'REQUESTED', label: 'Requested', desc: 'Finding Tesla' },
  { key: 'MATCHED', label: 'Assigned', desc: 'En route' },
  { key: 'DRIVER_ARRIVED', label: 'Arrived', desc: 'At pickup' },
  { key: 'STARTED', label: 'On the Way', desc: 'Trip started' },
  { key: 'COMPLETED', label: 'Done', desc: 'Arrived' },
];

export default function RideTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const fetchRide = async () => {
    try {
      const data = await api.get<RideDetail>(`/api/rides/${resolvedParams.id}`);
      setRide(data);
      if (routeCoordinates.length === 0 && data.pickupArea && data.destinationArea) {
        api.get<any>(`/api/areas/distance?from=${data.pickupArea.id}&to=${data.destinationArea.id}`)
          .then((res) => setRouteCoordinates(res.coordinates || []))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ride');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, [resolvedParams.id]);

  const handleCancel = async () => {
    if (!confirm('Cancel this ride?')) return;
    setCancelling(true);
    try {
      await api.patch(`/api/rides/${resolvedParams.id}/cancel`);
      await fetchRide();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-sm mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Ride Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <Link href="/passenger/book" className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm">
            Back to Booking
          </Link>
        </div>
      </div>
    );
  }

  const markers: MapMarker[] = [
    { id: 'pickup', position: [ride.pickupArea.latitude, ride.pickupArea.longitude], title: `Pickup: ${ride.pickupArea.name}`, subtitle: 'Meet here', type: 'pickup' },
    { id: 'dropoff', position: [ride.destinationArea.latitude, ride.destinationArea.longitude], title: `Dropoff: ${ride.destinationArea.name}`, subtitle: 'Your destination', type: 'dropoff' },
  ];

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === ride.status);
  const isCancelled = ride.status === 'CANCELLED';
  const canCancel = ride.status === 'REQUESTED' || ride.status === 'MATCHED';
  const otherMembers = ride.pool?.members.filter((m) => m.passengerId !== ride.passengerId) || [];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Link href="/passenger/history" className="hover:text-emerald-400 transition">My Rides</Link>
              <span>/</span>
              <span className="text-slate-300 font-mono">#{ride.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {ride.pickupArea.name}
              <span className="text-slate-600">→</span>
              <span className="text-emerald-400">{ride.destinationArea.name}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Cancel
              </button>
            )}
            <button
              onClick={fetchRide}
              className="px-3 py-2 glass border border-white/[0.06] rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Status stepper */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          {isCancelled ? (
            <div className="flex items-center gap-3 text-rose-300">
              <XCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Ride Cancelled</p>
                <p className="text-xs text-rose-400/70">This ride was cancelled before completion.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <React.Fragment key={step.key}>
                    <div className={`flex flex-col items-center text-center min-w-[64px] ${!isDone ? 'opacity-40' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                        isCurrent ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30' : isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] text-slate-500'
                      }`}>
                        {isDone && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-emerald-400' : isDone ? 'text-slate-300' : 'text-slate-600'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-px min-w-[16px] ${currentStepIndex > idx ? 'bg-emerald-500/40' : 'bg-white/[0.06]'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left */}
          <div className="lg:col-span-5 space-y-4">
            {/* Advance booking notice */}
            {ride.advanceBooking?.isAwaiting && (
              <div className="glass-card rounded-2xl p-5 border border-purple-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Clock className="w-4 h-4 animate-pulse" /> Advance Trip Queued
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">~{ride.advanceBooking.estimatedWaitMin}</span>
                  <span className="text-sm text-purple-300">min estimated wait</span>
                </div>
                <p className="text-xs text-slate-400">{ride.advanceBooking.message}</p>
              </div>
            )}

            {/* Driver card */}
            {ride.pool ? (
              <div className="glass-card rounded-2xl p-5 border border-amber-500/15">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> Matched Tesla
                  </span>
                  <span className="text-xs text-slate-500">{ride.pool.occupiedSeats}/{ride.pool.tesla.totalSeats} seats</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">🚗</div>
                  <div>
                    <h3 className="font-bold text-white">{ride.pool.driver.name}</h3>
                    <p className="text-xs text-amber-400">"{ride.pool.tesla.name}" · {ride.pool.tesla.totalSeats} seats</p>
                    <p className="text-[11px] text-slate-500">Status: <span className="text-emerald-400 font-semibold">{ride.status.replace('_', ' ')}</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-5 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-white text-sm">Waiting for a Driver</p>
                <p className="text-xs text-slate-500 mt-1">Nearby Teslas are being notified.</p>
              </div>
            )}

            {/* Pool members */}
            {otherMembers.length > 0 && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" /> Shared Pool
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-semibold">{otherMembers.length + 1} riders</span>
                </div>
                <div className="space-y-2 pt-1 border-t border-white/[0.05]">
                  {otherMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs p-2.5 bg-white/[0.03] rounded-xl">
                      <div>
                        <span className="font-bold text-white block">{m.passenger.name}</span>
                        <span className="text-slate-500">To: {m.rideRequest?.destinationArea?.name || 'Dhaka'}</span>
                      </div>
                      <span className="text-slate-400">{m.seats} {m.seats === 1 ? 'seat' : 'seats'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fare */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-white">Fare & Payment</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400"><span>Distance</span><span className="text-white">{ride.distanceKm} km</span></div>
                <div className="flex justify-between text-slate-400"><span>Seats</span><span className="text-white">{ride.seatsNeeded}</span></div>
                {ride.pool && ride.pool.occupiedSeats >= 2 && (
                  <div className="flex justify-between items-center text-[11px] text-emerald-400 bg-emerald-500/8 px-2.5 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" /> Pool discount</span>
                    <span>{ride.pool.occupiedSeats === 2 ? '20%' : '30%'}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/[0.06] flex justify-between text-sm font-bold text-white">
                  <span>Total</span>
                  <span className="text-emerald-400">৳{(ride.estimatedFarePaisa / 100).toFixed(0)}</span>
                </div>
                <div className="text-[11px] text-slate-500">Method: {ride.paymentMethod}</div>
              </div>

              {ride.payment && (
                <div className="p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Payment {ride.payment.status}
                  </span>
                  <span className="text-white font-bold">৳{(ride.payment.amountPaisa / 100).toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-7 glass-card rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">Route Navigation</span>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">{ride.distanceKm} km</span>
            </div>
            <DynamicMap
              center={[ride.pickupArea.latitude, ride.pickupArea.longitude]}
              zoom={13}
              markers={markers}
              routePath={routeCoordinates}
              className="h-[500px] w-full rounded-xl overflow-hidden border border-white/[0.06]"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
