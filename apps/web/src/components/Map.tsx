'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  id: string | number;
  position: [number, number]; // [lat, lng]
  title: string;
  subtitle?: string;
  type?: 'pickup' | 'dropoff' | 'area' | 'tesla';
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routePath?: [number, number][];
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  interactive?: boolean;
}

// Custom modern SVG pin icons
function createPinIcon(type: 'pickup' | 'dropoff' | 'area' | 'tesla' = 'area', label?: string) {
  let bgColor = '#10b981'; // emerald-500
  let iconEmoji = '📍';

  if (type === 'pickup') {
    bgColor = '#16a34a'; // green-600
    iconEmoji = '🟢';
  } else if (type === 'dropoff') {
    bgColor = '#ef4444'; // red-500
    iconEmoji = '🏁';
  } else if (type === 'tesla') {
    bgColor = '#f59e0b'; // amber-500
    iconEmoji = '⚡';
  }

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          background-color: ${bgColor};
          color: white;
          padding: 4px 8px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 11px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 2px solid white;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>${iconEmoji}</span>
          ${label ? `<span>${label}</span>` : ''}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${bgColor};
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function MapBoundsUpdater({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
      });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14, { animate: true });
    }
  }, [bounds, map]);

  return null;
}

export default function Map({
  center = [23.7937, 90.4045], // Default: Banani
  zoom = 13,
  markers = [],
  routePath = [],
  onMarkerClick,
  className = 'h-[450px] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-700/60',
  interactive = true,
}: MapProps) {
  // Aggregate all points for auto-centering
  const allCoordinates: [number, number][] = [
    ...markers.map((m) => m.position),
    ...(routePath || []),
  ];

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        className="h-full w-full bg-slate-900"
      >
        {/* OpenStreetMap standard tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Route Polyline (Dhaka Road Geometry) */}
        {routePath.length > 1 && (
          <>
            {/* Glow / Outline */}
            <Polyline
              positions={routePath}
              pathOptions={{
                color: '#065f46',
                weight: 8,
                opacity: 0.6,
              }}
            />
            {/* Primary vibrant line */}
            <Polyline
              positions={routePath}
              pathOptions={{
                color: '#10b981',
                weight: 5,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={`${marker.id}-${marker.position[0]}-${marker.position[1]}`}
            position={marker.position}
            icon={createPinIcon(marker.type, marker.title)}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(marker),
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 text-slate-900">
                <div className="font-bold text-sm">{marker.title}</div>
                {marker.subtitle && (
                  <div className="text-xs text-slate-600 mt-0.5">{marker.subtitle}</div>
                )}
                {onMarkerClick && (
                  <button
                    onClick={() => onMarkerClick(marker)}
                    className="mt-2 text-xs bg-emerald-600 text-white font-semibold py-1 px-2.5 rounded-md hover:bg-emerald-700 transition block w-full text-center"
                  >
                    Select Location
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {allCoordinates.length > 0 && <MapBoundsUpdater bounds={allCoordinates} />}
      </MapContainer>
    </div>
  );
}
