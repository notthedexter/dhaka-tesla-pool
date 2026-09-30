'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import DynamicMap, { MapMarker } from '../components/DynamicMap';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Car,
  Users,
  ArrowRight,
  Compass,
  Loader2,
} from 'lucide-react';

interface Area {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface DistanceCalculation {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  fare: { totalFare: number; baseFare: number; distanceCharge: number; poolDiscount: number; discountPercentage: number };
  fareBreakdown: {
    solo: { totalFare: number };
    pooled2: { totalFare: number; discountPercentage: number };
    pooled3: { totalFare: number; discountPercentage: number };
  };
}

const FALLBACK_AREAS: Area[] = [
  { id: 1, name: 'Banani', latitude: 23.7937, longitude: 90.4045 },
  { id: 2, name: 'Gulshan 1', latitude: 23.7806, longitude: 90.4169 },
  { id: 3, name: 'Gulshan 2', latitude: 23.7947, longitude: 90.4137 },
  { id: 4, name: 'Mohakhali', latitude: 23.7776, longitude: 90.4005 },
  { id: 5, name: 'Dhanmondi', latitude: 23.7535, longitude: 90.3703 },
  { id: 6, name: 'Mirpur', latitude: 23.8084, longitude: 90.3683 },
  { id: 7, name: 'Uttara', latitude: 23.8728, longitude: 90.3984 },
  { id: 8, name: 'Farmgate', latitude: 23.7590, longitude: 90.3871 },
  { id: 9, name: 'Bashundhara', latitude: 23.8167, longitude: 90.4294 },
  { id: 10, name: 'Motijheel', latitude: 23.7273, longitude: 90.4212 },
  { id: 11, name: 'Shahbag', latitude: 23.7373, longitude: 90.3962 },
  { id: 12, name: 'Tejgaon', latitude: 23.7628, longitude: 90.3913 },
];

export default function HomePage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<number>(1);
  const [selectedDestination, setSelectedDestination] = useState<number>(4);
  const [routeData, setRouteData] = useState<DistanceCalculation | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [apiOffline, setApiOffline] = useState<boolean>(false);

  useEffect(() => {
    async function loadAreas() {
      try {
        const data = await api.get<Area[]>('/api/areas');
        setAreas(data);
        setApiOffline(false);
      } catch {
        setAreas(FALLBACK_AREAS);
        setApiOffline(true);
      }
    }
    loadAreas();
  }, []);

  useEffect(() => {
    if (!selectedPickup || !selectedDestination || selectedPickup === selectedDestination) {
      setRouteData(null);
      return;
    }
    async function calculate() {
      setLoadingRoute(true);
      try {
        const data = await api.get<DistanceCalculation>(`/api/areas/distance?from=${selectedPickup}&to=${selectedDestination}`);
        setRouteData(data);
      } catch {
        // silent
      } finally {
        setLoadingRoute(false);
      }
    }
    calculate();
  }, [selectedPickup, selectedDestination]);

  const markers: MapMarker[] = areas.map((area) => ({
    id: area.id,
    position: [area.latitude, area.longitude],
    title: area.name,
    subtitle: area.id === selectedPickup ? '🟢 Pickup' : area.id === selectedDestination ? '🏁 Dropoff' : 'Zone',
    type: area.id === selectedPickup ? 'pickup' : area.id === selectedDestination ? 'dropoff' : 'area',
  }));

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      <Navbar />

      {apiOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-[11px] text-amber-400">
          API server offline — showing demo data. Run <code className="font-mono bg-amber-500/10 px-1 rounded">npm run dev:api</code> to enable live bookings.
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/6 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
              <Zap className="w-3 h-3 fill-current" />
              Rush-Hour Mobility
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] mb-5">
              Share the ride.{' '}
              <span className="text-emerald-400">Split the fare.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg mx-auto">
              Electric pool rides across Dhaka. Up to 3 passengers, 1 Tesla — automatic matching, transparent pricing.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user?.role === 'DRIVER' ? (
                <Link
                  href="/driver/dashboard"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2"
                >
                  <Car className="w-4 h-4" /> Driver Cockpit <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/passenger/book"
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2"
                >
                  Book Now <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[
                { val: '3', label: 'Max seats' },
                { val: '30%', label: 'Pool savings' },
                { val: '12', label: 'Dhaka zones' },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-emerald-400">{s.val}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 capitalize">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Route Calculator */}
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left: selector + fare */}
              <div className="w-full lg:w-80 shrink-0 space-y-5">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Live Fare Calculator
                  </h3>
                  <p className="text-xs text-slate-500">Pick any two zones to see real driving distance and fare.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Pickup
                    </label>
                    <select
                      value={selectedPickup}
                      onChange={(e) => setSelectedPickup(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/40 transition"
                    >
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      <span className="w-2 h-2 rounded-sm bg-rose-500" />
                      Destination
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/40 transition"
                    >
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                {loadingRoute ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Calculating route via OSRM...
                  </div>
                ) : routeData ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.06] text-xs">
                      <span className="text-slate-400">Distance</span>
                      <span className="font-bold text-white">{routeData.distanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.06] text-xs">
                      <span className="text-slate-400">Est. duration</span>
                      <span className="font-bold text-white">~{routeData.durationMin} min</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Solo (1 seat)</span>
                        <span className="font-semibold text-slate-200">৳{(routeData.fareBreakdown.solo.totalFare / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <span className="text-emerald-300 font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 2 riders (20% off)</span>
                        <span className="font-bold text-emerald-400">৳{(routeData.fareBreakdown.pooled2.totalFare / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-teal-500/8 border border-teal-500/20">
                        <span className="text-teal-300 font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 3 riders (30% off)</span>
                        <span className="font-bold text-teal-400">৳{(routeData.fareBreakdown.pooled3.totalFare / 100).toFixed(0)}</span>
                      </div>
                    </div>

                    {user?.role === 'DRIVER' ? (
                      <Link
                        href="/driver/dashboard"
                        className="block text-center w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                      >
                        Go to Driver Cockpit
                      </Link>
                    ) : (
                      <Link
                        href={`/passenger/book?pickup=${selectedPickup}&destination=${selectedDestination}`}
                        className="block text-center w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                      >
                        Book Now
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Right: Map */}
              <div className="w-full lg:flex-1">
                <DynamicMap
                  center={[23.7937, 90.4045]}
                  zoom={13}
                  markers={markers}
                  routePath={routeData?.coordinates || []}
                  className="h-[420px] w-full rounded-2xl overflow-hidden border border-white/[0.06]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-2">How Ride-Pooling Works</h2>
            <p className="text-sm text-slate-400">Three steps to cheaper, greener commutes in Dhaka.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Pick Your Zones', body: 'Select pickup and destination from 12 Dhaka hubs. See exact distance and fare estimate immediately.' },
              { n: '2', title: 'Auto Pool Match', body: 'Compatible passengers are paired into the same Tesla automatically — up to 3 seats.' },
              { n: '3', title: 'Split Transparently', body: '2-person pools save 20%, 3-person pools save 30%. Every rider gets their own fare receipt.' },
            ].map((step) => (
              <div key={step.n} className="glass-card rounded-2xl p-6 text-center">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-black text-base flex items-center justify-center mx-auto mb-4">
                  {step.n}
                </div>
                <h3 className="font-bold text-sm text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.04] text-center text-[11px] text-slate-600">
        © 2026 Dhaka Tesla Pool MVP — Next.js · Express · PostgreSQL · OpenStreetMap
      </footer>
    </div>
  );
}
