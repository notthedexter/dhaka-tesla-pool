'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import DynamicMap, { MapMarker } from '../components/DynamicMap';
import { api } from '../lib/api';
import { LiquidGlassAvatar } from '@/components/lightswind/liquid-glass-avatar';
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

const CAST = [
  { name: 'Jashim', role: 'Tesla Driver', sub: 'Pilot of "Bullet" · 3 seats', variant: 'primary' as const, desc: 'Leaning against his 3-seat Tesla at Banani Road 11. Wants all seats filled.' },
  { name: 'Nusrat', role: 'Passenger #1', sub: 'Banani → Mohakhali', variant: 'cyan' as const, desc: 'Running late for work. Books the first seat. Welcomes co-riders.' },
  { name: 'Rafiq', role: 'Passenger #2', sub: 'Banani → Gulshan 1', variant: 'glass' as const, desc: 'Joins 2 mins later. Pool matching drops both fares by 20%.' },
  { name: 'Shirin', role: 'Passenger #3', sub: 'Banani → Dhanmondi', variant: 'primary' as const, desc: 'Takes the last seat. Pool discount jumps to 30% for all three.' },
];

export default function HomePage() {
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
    subtitle: area.id === selectedPickup ? '🔵 Pickup' : area.id === selectedDestination ? '🏁 Dropoff' : 'Zone',
    type: area.id === selectedPickup ? 'pickup' : area.id === selectedDestination ? 'dropoff' : 'area',
  }));

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar />

      {apiOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400">
          API server offline — showing demo data. Run <code className="font-mono bg-amber-500/15 px-1 rounded">npm run dev:api</code> to enable live bookings.
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-blue-600/5 blur-[140px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Banani Rush-Hour Mobility Network
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-4">
              Share the ride.{' '}
              <span className="text-blue-400">Split the fare.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg mx-auto">
              Electric pool rides across Dhaka. Up to 3 passengers, 1 Tesla — automatic route pairing with zero solo surcharge.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/passenger/book"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 text-sm"
              >
                Book a Seat <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/driver/dashboard"
                className="w-full sm:w-auto px-6 py-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                <Car className="w-4 h-4 text-amber-400" />
                Driver Cockpit
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[
                { val: '3', label: 'Max seats' },
                { val: '30%', label: 'Pool savings' },
                { val: '12', label: 'Dhaka zones' },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-3 text-center">
                  <div className="font-mono text-xl font-bold text-white">{s.val}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Route Calculator */}
          <div className="glass-card rounded-2xl p-6 sm:p-7">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left: selector + fare */}
              <div className="w-full lg:w-80 shrink-0 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-blue-400" />
                    Live Fare Calculator
                  </h3>
                  <p className="text-xs text-slate-400">Pick two hubs to calculate actual road distance and fare.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Pickup Hub
                    </label>
                    <select
                      value={selectedPickup}
                      onChange={(e) => setSelectedPickup(Number(e.target.value))}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                    >
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      <span className="w-2 h-2 rounded-sm bg-rose-500" />
                      Destination Hub
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(Number(e.target.value))}
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                    >
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                {loadingRoute ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    Calculating route via OSRM...
                  </div>
                ) : routeData ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-xs">
                      <span className="text-slate-400">Distance</span>
                      <span className="font-mono font-semibold text-white">{routeData.distanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-xs">
                      <span className="text-slate-400">Est. duration</span>
                      <span className="font-mono font-semibold text-white">~{routeData.durationMin} min</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-400">Solo (1 seat)</span>
                        <span className="font-mono font-semibold text-slate-200">৳{(routeData.fareBreakdown.solo.totalFare / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <span className="text-blue-300 font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 2 riders (20% off)</span>
                        <span className="font-mono font-bold text-blue-400">৳{(routeData.fareBreakdown.pooled2.totalFare / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                        <span className="text-sky-300 font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 3 riders (30% off)</span>
                        <span className="font-mono font-bold text-sky-400">৳{(routeData.fareBreakdown.pooled3.totalFare / 100).toFixed(0)}</span>
                      </div>
                    </div>

                    <Link
                      href={`/passenger/book?pickup=${selectedPickup}&destination=${selectedDestination}`}
                      className="block text-center w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition"
                    >
                      Book This Route
                    </Link>
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
                  className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Cast */}
      <section id="story-cast" className="py-16 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-white mb-2">The Story Cast</h2>
            <p className="text-xs sm:text-sm text-slate-400">Banani Road 11 morning rush commuters in our live routing model.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CAST.map((c) => (
              <div key={c.name} className="glass-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <LiquidGlassAvatar
                    fallback={c.name.charAt(0)}
                    variant={c.variant}
                    size="md"
                    glow
                  />
                  <div>
                    <div className="font-display font-bold text-sm text-white">{c.name}</div>
                    <div className="text-[11px] text-blue-400 font-semibold">{c.role}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1">{c.sub}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 border-t border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-white mb-2">How Ride-Pooling Works</h2>
            <p className="text-xs sm:text-sm text-slate-400">Three straightforward steps to lower commute costs in Dhaka.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Pick Your Zones', body: 'Select pickup and dropoff from 12 Dhaka hubs. Instant OSRM distance and fare calculations.' },
              { n: '2', title: 'Auto Matchmaking', body: 'Passengers along the corridor are paired into the same 3-seat Tesla automatically.' },
              { n: '3', title: 'Transparent Fare Split', body: '2-rider pools save 20%, 3-rider pools save 30%. Individual cashless digital receipts.' },
            ].map((step) => (
              <div key={step.n} className="glass-card rounded-2xl p-6 text-center">
                <div className="font-display w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                  {step.n}
                </div>
                <h3 className="font-display font-bold text-sm text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800 text-center text-xs text-slate-500">
        © 2026 Dhaka Tesla Pool — Next.js · Express · PostgreSQL · OpenStreetMap
      </footer>
    </div>
  );
}
