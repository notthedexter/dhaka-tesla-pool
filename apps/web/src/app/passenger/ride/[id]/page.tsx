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
  Wallet,
  ArrowRight,
  ShieldCheck,
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
    members: Array<{
      id: string;
      passengerId: string;
      passenger: { name: string };
      seats: number;
      farePaisa: number;
      status: string;
      rideRequest?: {
        destinationArea?: { name: string };
      };
    }>;
  } | null;
  payment?: {
    amountPaisa: number;
    method: string;
    status: string;
  } | null;
}

const STATUS_STEPS = [
  { key: 'REQUESTED', label: 'Requested', desc: 'Matching with Tesla' },
  { key: 'MATCHED', label: 'Tesla Assigned', desc: 'Driver en route' },
  { key: 'DRIVER_ARRIVED', label: 'Driver Arrived', desc: 'At pickup zone' },
  { key: 'STARTED', label: 'On the Way', desc: 'Trip in progress' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Arrived at destination' },
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

  // Authentication check
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch ride details function
  const fetchRide = async () => {
    try {
      const data = await api.get<RideDetail>(`/api/rides/${resolvedParams.id}`);
      setRide(data);

      // Fetch route geometry if not already fetched
      if (routeCoordinates.length === 0 && data.pickupArea && data.destinationArea) {
        api.get<any>(
          `/api/areas/distance?from=${data.pickupArea.id}&to=${data.destinationArea.id}`
        )
          .then((res) => setRouteCoordinates(res.coordinates || []))
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('Fetch ride error:', err);
      setError(err.message || 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  // Poll ride details every 4 seconds to catch driver updates in real-time
  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, [resolvedParams.id]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this ride request?')) return;
    setCancelling(true);
    try {
      await api.patch(`/api/rides/${resolvedParams.id}/cancel`);
      await fetchRide();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ride');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Ride Not Found</h2>
          <p className="text-slate-400 text-sm mt-2">{error || 'This ride could not be retrieved.'}</p>
          <Link
            href="/passenger/book"
            className="mt-6 inline-block px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm"
          >
            Back to Booking
          </Link>
        </div>
      </div>
    );
  }

  // Markers for the map
  const markers: MapMarker[] = [
    {
      id: 'pickup',
      position: [ride.pickupArea.latitude, ride.pickupArea.longitude],
      title: `Pickup: ${ride.pickupArea.name}`,
      subtitle: 'Meet your Tesla here',
      type: 'pickup',
    },
    {
      id: 'dropoff',
      position: [ride.destinationArea.latitude, ride.destinationArea.longitude],
      title: `Dropoff: ${ride.destinationArea.name}`,
      subtitle: 'Your destination',
      type: 'dropoff',
    },
  ];

  // Calculate current step index
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === ride.status);
  const isCancelled = ride.status === 'CANCELLED';
  const isCompleted = ride.status === 'COMPLETED';
  const canCancel = ride.status === 'REQUESTED' || ride.status === 'MATCHED';

  // Other pool members (if shared)
  const otherMembers = ride.pool?.members.filter((m) => m.passengerId !== ride.passengerId) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Breadcrumb & Status */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/passenger/history" className="hover:text-emerald-400">
                My Rides
              </Link>
              <span>/</span>
              <span className="text-slate-200">Trip #{ride.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{ride.pickupArea.name}</span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-400">{ride.destinationArea.name}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Cancel Ride
              </button>
            )}

            <button
              onClick={fetchRide}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition"
              title="Refresh status"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Status Stepper Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl mb-8">
          {isCancelled ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300">
              <XCircle className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold text-sm">Ride Cancelled</p>
                <p className="text-xs text-rose-400/80">This ride was cancelled before completion.</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                          : isDone
                          ? 'bg-slate-800/60 border-emerald-500/40'
                          : 'bg-slate-900/40 border-slate-800 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isDone
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-emerald-400' : isDone ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-7">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Ride Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Driver & Tesla Card */}
            {ride.pool ? (
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> Matched Tesla
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {ride.pool.occupiedSeats} / {ride.pool.tesla.totalSeats} Seats Filled
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl">
                    🚗
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {ride.pool.driver.name}
                    </h3>
                    <p className="text-xs text-amber-400 font-semibold mt-0.5">
                      Driving &quot;{ride.pool.tesla.name}&quot; ({ride.pool.tesla.totalSeats} seats)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Status: <span className="text-emerald-400 font-semibold">{ride.status.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <h3 className="font-bold text-white text-base">Waiting for Driver</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Nearby Teslas (like Jashim&apos;s Bullet) will be notified to accept your request.
                </p>
              </div>
            )}

            {/* Pooling Status Card */}
            {otherMembers.length > 0 ? (
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Shared Ride-Pool Active
                  </h4>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full">
                    {otherMembers.length + 1} Riders
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  You are sharing this Tesla with other passengers. Your fare has been discounted!
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {otherMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{member.passenger.name}</span>
                        <span className="text-[11px] text-slate-400">
                          To: {member.rideRequest?.destinationArea?.name || 'Dhaka Zone'}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-semibold text-xs">
                        {member.seats} {member.seats === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Fare Breakdown Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Fare &amp; Payment Details</span>
                <span className="text-xs font-normal text-slate-400">
                  Method: <strong className="text-white">{ride.paymentMethod}</strong>
                </span>
              </h4>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Distance:</span>
                  <span className="font-semibold text-white">{ride.distanceKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Seats Reserved:</span>
                  <span className="font-semibold text-white">{ride.seatsNeeded}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
                  <span>Your Individual Fare:</span>
                  <span className="text-emerald-400 text-lg">
                    ৳{(ride.estimatedFarePaisa / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {ride.payment && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Payment {ride.payment.status}
                  </span>
                  <span className="text-white font-bold">
                    ৳{(ride.payment.amountPaisa / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Map Navigation */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white">Route Navigation Path</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {ride.distanceKm} km trip
              </span>
            </div>

            <DynamicMap
              center={[ride.pickupArea.latitude, ride.pickupArea.longitude]}
              zoom={13}
              markers={markers}
              routePath={routeCoordinates}
              className="h-[520px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
