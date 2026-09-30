'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { MapMarker } from './Map';

export type { MapMarker };

interface DynamicMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routePath?: [number, number][];
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  interactive?: boolean;
}

const DynamicLeafletMap = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full bg-slate-800/80 rounded-2xl flex flex-col items-center justify-center border border-slate-700/60 p-6 text-slate-400 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
        <span className="text-xl">🗺️</span>
      </div>
      <p className="font-semibold text-sm text-slate-300">Loading OpenStreetMap of Dhaka...</p>
      <p className="text-xs text-slate-500 mt-1">Connecting to Dhaka Tesla Pool routing grid</p>
    </div>
  ),
});

export default function DynamicMap(props: DynamicMapProps) {
  return <DynamicLeafletMap {...props} />;
}
