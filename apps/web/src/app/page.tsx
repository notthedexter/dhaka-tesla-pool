'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import DynamicMap, { MapMarker } from '../components/DynamicMap';
import { api } from '../lib/api';
import {
  Zap,
  Car,
  Users,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Percent,
  Compass,
  Sparkles,
  ChevronRight,
  TrendingDown,
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
  fare: {
    totalFare: number;
    baseFare: number;
    distanceCharge: number;
    poolDiscount: number;
    discountPercentage: number;
  };
  fareBreakdown: {
    solo: { totalFare: number };
    pooled2: { totalFare: number; discountPercentage: number };
    pooled3: { totalFare: number; discountPercentage: number };
  };
}

export default function HomePage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<number>(1); // Banani default
  const [selectedDestination, setSelectedDestination] = useState<number>(4); // Mohakhali default
  const [routeData, setRouteData] = useState<DistanceCalculation | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);

  const [apiOffline, setApiOffline] = useState<boolean>(false);

  // Fallback areas for high resilience
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

  // Fetch areas on load
  useEffect(() => {
    async function loadAreas() {
      try {
        const data = await api.get<Area[]>('/api/areas');
        setAreas(data);
        setApiOffline(false);
      } catch (err) {
        console.warn('Backend API currently unreachable, using verified Dhaka hub coordinates fallback:', err);
        setAreas(FALLBACK_AREAS);
        setApiOffline(true);
      }
    }
    loadAreas();
  }, []);

  // Fetch route when pickup & destination change
  useEffect(() => {
    if (!selectedPickup || !selectedDestination || selectedPickup === selectedDestination) {
      setRouteData(null);
      return;
    }

    async function calculate() {
      setLoadingRoute(true);
      try {
        const data = await api.get<DistanceCalculation>(
          `/api/areas/distance?from=${selectedPickup}&to=${selectedDestination}`
        );
        setRouteData(data);
      } catch (err) {
        console.error('Distance calculation error:', err);
      } finally {
        setLoadingRoute(false);
      }
    }

    calculate();
  }, [selectedPickup, selectedDestination]);

  // Construct map markers
  const markers: MapMarker[] = areas.map((area) => {
    let type: 'pickup' | 'dropoff' | 'area' = 'area';
    if (area.id === selectedPickup) type = 'pickup';
    else if (area.id === selectedDestination) type = 'dropoff';

    return {
      id: area.id,
      position: [area.latitude, area.longitude],
      title: area.name,
      subtitle: area.id === selectedPickup ? '🟢 Selected Pickup' : area.id === selectedDestination ? '🏁 Selected Dropoff' : 'Dhaka Pool Zone',
      type,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {apiOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <span>⚠️ Backend API server is offline (port 4000). Run <code>npm run dev:api</code> or <code>npm run dev</code> in your terminal to enable live bookings.</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.12),transparent_40%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              The Banani Rush-Hour Mobility Solution
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Share a seat. Split the fare.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Survive Dhaka traffic.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">
              8:41 AM, Banani Road 11. Jashim is leaning against Bullet, his 3-seat, battery-powered Tesla.
              Nusrat, Rafiq, and Shirin share the ride, divide the fare fairly, and get to Mohakhali and Gulshan without solo ride surcharges.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/passenger/book"
                className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 text-base active:scale-95"
              >
                Book a Ride <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/driver/dashboard"
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
              >
                <Car className="w-5 h-5 text-emerald-400" /> Driver Dashboard
              </Link>
            </div>

            {/* Quick stats pills */}
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-emerald-400">3 Seats</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Max Capacity</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-cyan-400">Up to 30%</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Pool Discount</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xl sm:text-2xl font-black text-amber-400">12 Zones</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Dhaka Covered</div>
              </div>
            </div>
          </div>

          {/* Interactive Live Route & Map Calculator */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left Route Selector & Live Fare Panel */}
              <div className="w-full lg:w-96 flex flex-col gap-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-emerald-400" />
                    Live Route & Fare Calculator
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select any two points on OpenStreetMap to inspect distance and fare splitting.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Pickup Area
                    </label>
                    <select
                      value={selectedPickup}
                      onChange={(e) => setSelectedPickup(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Destination Area
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fare Breakdown Display */}
                {loadingRoute ? (
                  <div className="p-4 bg-slate-800/60 rounded-2xl text-center text-sm text-slate-400 animate-pulse border border-slate-700/50">
                    Calculating OSRM driving distance...
                  </div>
                ) : routeData ? (
                  <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-slate-700/50">
                      <span>Driving Distance:</span>
                      <span className="font-bold text-white text-sm">{routeData.distanceKm} km</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pb-2 border-b border-slate-700/50">
                      <span>Est. Rush Hour Time:</span>
                      <span className="font-bold text-white text-sm">~{routeData.durationMin} mins</span>
                    </div>

                    {/* Compare Solo vs Pooled */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Solo Ride (1 seat):</span>
                        <span className="font-semibold text-slate-200">
                          ৳{(routeData.fareBreakdown.solo.totalFare / 100).toFixed(0)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30">
                        <span className="text-emerald-300 font-semibold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> 2 Riders (20% Off):
                        </span>
                        <span className="font-bold text-emerald-400 text-sm">
                          ৳{(routeData.fareBreakdown.pooled2.totalFare / 100).toFixed(0)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-teal-950/60 border border-teal-500/30">
                        <span className="text-teal-300 font-semibold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> 3 Riders (30% Off):
                        </span>
                        <span className="font-bold text-teal-400 text-sm">
                          ৳{(routeData.fareBreakdown.pooled3.totalFare / 100).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/passenger/book?pickup=${selectedPickup}&destination=${selectedDestination}`}
                      className="block text-center w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                    >
                      Book This Route Now
                    </Link>
                  </div>
                ) : null}
              </div>

              {/* Right OpenStreetMap Component */}
              <div className="w-full lg:flex-1">
                <DynamicMap
                  center={[23.7937, 90.4045]}
                  zoom={13}
                  markers={markers}
                  routePath={routeData?.coordinates || []}
                  className="h-[460px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Cast Section (PRD Section 1) */}
      <section id="story-cast" className="py-20 border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-white">Meet the Story Cast</h2>
            <p className="text-slate-400 text-sm mt-2">
              The real people navigating Banani Road 11 at 8:41 AM in our seed data and live demo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Jashim & Bullet */}
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-3 bg-amber-500/10 rounded-bl-2xl">
                <Car className="w-6 h-6 text-amber-400" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Tesla Driver
              </span>
              <h3 className="text-xl font-bold text-white mt-3">Jashim</h3>
              <p className="text-amber-400 text-xs font-semibold mt-0.5">Pilot of &quot;Bullet&quot; (3 Seats)</p>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Leaning against his battery-powered 3-seat Tesla at Banani Road 11. Just wants to know who is riding, when he can depart, and keep all seats filled.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                Status: <span className="text-emerald-400 font-semibold">Online &amp; Ready</span>
              </div>
            </div>

            {/* Nusrat */}
            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-3 bg-emerald-500/10 rounded-bl-2xl">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Passenger #1
              </span>
              <h3 className="text-xl font-bold text-white mt-3">Nusrat</h3>
              <p className="text-emerald-400 text-xs font-semibold mt-0.5">Banani → Mohakhali</p>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Running late for work. Books the first seat in Bullet. Welcomes anyone heading along the same corridor to split the fare without detours.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                Wallet: <span className="text-white font-semibold">৳1,000 (TeslaPay)</span>
              </div>
            </div>

            {/* Rafiq */}
            <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-3 bg-cyan-500/10 rounded-bl-2xl">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Passenger #2 (Pool)
              </span>
              <h3 className="text-xl font-bold text-white mt-3">Rafiq</h3>
              <p className="text-cyan-400 text-xs font-semibold mt-0.5">Banani → Gulshan 1</p>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Books two minutes after Nusrat. Our matching algorithm automatically pairs him into Bullet, reducing both riders&apos; fares by 20%.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                Wallet: <span className="text-white font-semibold">৳1,000 (TeslaPay)</span>
              </div>
            </div>

            {/* Shirin */}
            <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-3 bg-purple-500/10 rounded-bl-2xl">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Passenger #3 (Last Seat)
              </span>
              <h3 className="text-xl font-bold text-white mt-3">Shirin</h3>
              <p className="text-purple-400 text-xs font-semibold mt-0.5">Banani → Dhanmondi</p>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                Grabs the 3rd and final seat in Bullet thirty seconds later. The pool discount jumps to 30% for all three passengers, and Bullet reaches 100% capacity!
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                Wallet: <span className="text-white font-semibold">৳1,000 (TeslaPay)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-white">How Ride-Pooling Works</h2>
            <p className="text-slate-400 text-sm mt-2">
              Three simple steps to cheaper, cleaner, congestion-busting rides in Dhaka.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Pick Your Zones</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Select your pickup and drop-off from 12 Dhaka hubs. See exact driving distance and estimated solo fare immediately.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Instant Pool Matching</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                If another passenger is traveling in a compatible direction from your zone, you share the Tesla automatically up to Bullet&apos;s 3-seat limit.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Split Fares Transparently</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Every rider gets an individual receipt. 2-person pools save 20%, 3-person pools save 30%. Pay with simulated TeslaPay or Cash.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-center text-xs text-slate-500">
        <p>© 2026 Dhaka Tesla Pool MVP — Built with Next.js 14, Express, PostgreSQL &amp; OpenStreetMap.</p>
        <p className="mt-1 text-slate-600">
          Remember: In Dhaka, your Tesla may have three wheels — but your engineering is production-minded.
        </p>
      </footer>
    </div>
  );
}
