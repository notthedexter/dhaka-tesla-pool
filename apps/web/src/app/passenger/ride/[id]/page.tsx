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
  { key: 'DRIVER_ARRIVED', label: 'Arrived', desc: 'At hub' },
  { key: 'STARTED', label: 'In Transit', desc: 'Trip active' },
  { key: 'COMPLETED', label: 'Arrived', desc: 'Destination' },
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
    if (!confirm('Cancel this ride request?')) return;
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
      <div className="min-h-screen bg-[#070b14] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-sm mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold text-white mb-1">Ride Not Found</h2>
          <p className="text-xs text-slate-400 mb-5">{error || 'Unable to retrieve ride details.'}</p>
          <Link href="/passenger/book" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs">
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Link href="/passenger/history" className="hover:text-blue-400 transition">My Rides</Link>
              <span>/</span>
              <span className="text-slate-300 font-mono">#{ride.id.slice(0, 8)}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
              {ride.pickupArea.name}
              <span className="text-slate-500">→</span>
              <span className="text-blue-400">{ride.destinationArea.name}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Cancel
              </button>
            )}
            <button
              onClick={fetchRide}
              className="px-3 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Status stepper */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          {isCancelled ? (
            <div className="flex items-center gap-3 text-rose-300 text-xs">
              <XCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Ride Cancelled</p>
                <p className="text-rose-400/80 mt-0.5">This trip request was cancelled before departure.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <React.Fragment key={step.key}>
                    <div className={`flex flex-col items-center text-center min-w-[70px] ${!isDone ? 'opacity-40' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                        isCurrent ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : isDone ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isDone && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-blue-400' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-px min-w-[16px] ${currentStepIndex > idx ? 'bg-blue-500/40' : 'bg-slate-800'}`} />
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
              <div className="glass-card rounded-2xl p-4 border border-blue-500/25 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                  <Clock className="w-3.5 h-3.5 animate-pulse text-blue-400" /> Advance Reservation Queued
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-white">~{ride.advanceBooking.estimatedWaitMin}</span>
                  <span className="text-xs text-blue-300">min estimated wait</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{ride.advanceBooking.message}</p>
              </div>
            )}

            {/* Driver card */}
            {ride.pool ? (
              <div className="glass-card rounded-2xl p-5 border border-slate-700/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> Assigned Tesla
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{ride.pool.occupiedSeats}/{ride.pool.tesla.totalSeats} seats</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">🚗</div>
                  <div>
                    <h3 className="font-display font-bold text-white text-sm">{ride.pool.driver.name}</h3>
                    <p className="text-xs text-amber-400 font-medium">"{ride.pool.tesla.name}" · {ride.pool.tesla.totalSeats} seats</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Status: <span className="text-blue-400 font-semibold">{ride.status.replace('_', ' ')}</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-5 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                <p className="font-semibold text-white text-xs">Waiting for Pilot Match</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Nearby Teslas in your zone are being notified.</p>
              </div>
            )}

            {/* Pool members */}
            {otherMembers.length > 0 && (
              <div className="glass-card rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-xs font-bold text-white flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Shared Pool Active
                  </h4>
                  <span className="text-[10px] text-blue-400 font-semibold px-2 py-0.5 bg-blue-500/10 rounded-full font-mono">{otherMembers.length + 1} riders</span>
                </div>
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  {otherMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-semibold text-white block">{m.passenger.name}</span>
                        <span className="text-[10px] text-slate-400">To: {m.rideRequest?.destinationArea?.name || 'Dhaka'}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{m.seats} {m.seats === 1 ? 'seat' : 'seats'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fare */}
            <div className="glass-card rounded-2xl p-4 space-y-2 text-xs">
              <h4 className="font-display text-xs font-bold text-white">Trip &amp; Fare Breakdown</h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-slate-400"><span>Distance</span><span className="font-mono text-white">{ride.distanceKm} km</span></div>
                <div className="flex justify-between text-slate-400"><span>Seats Reserved</span><span className="font-mono text-white">{ride.seatsNeeded}</span></div>
                {ride.pool && ride.pool.occupiedSeats >= 2 && (
                  <div className="flex justify-between items-center text-[11px] text-blue-300 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/20">
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-400" /> Pool discount applied</span>
                    <span className="font-mono font-bold">{ride.pool.occupiedSeats === 2 ? '20%' : '30%'}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-bold text-white">
                  <span>Total Fare</span>
                  <span className="font-mono text-blue-400 text-sm">৳{(ride.estimatedFarePaisa / 100).toFixed(0)}</span>
                </div>
                <div className="text-[10px] text-slate-400">Payment: {ride.paymentMethod}</div>
              </div>

              {ride.payment && (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs mt-2">
                  <span className="text-blue-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> Payment {ride.payment.status}
                  </span>
                  <span className="font-mono text-white font-bold">৳{(ride.payment.amountPaisa / 100).toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">Live Route Trajectory</span>
              </div>
              <span className="text-xs text-blue-400 font-semibold font-mono">{ride.distanceKm} km</span>
            </div>
            <DynamicMap
              center={[ride.pickupArea.latitude, ride.pickupArea.longitude]}
              zoom={13}
              markers={markers}
              routePath={routeCoordinates}
              className="h-[480px] w-full rounded-xl overflow-hidden border border-slate-800"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
