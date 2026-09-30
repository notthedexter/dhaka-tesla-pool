export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][]; // [latitude, longitude] for Leaflet
}

/**
 * Calculates Haversine distance as a resilient fallback
 */
export function getHaversineDistanceKm(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Fetches real driving route geometry and distance via public OSRM API
 */
export async function getDrivingRoute(points: Coordinates[]): Promise<RouteResult> {
  if (points.length < 2) {
    throw new Error('At least two coordinate points are required to calculate a route');
  }

  // OSRM requires format: {lon1},{lat1};{lon2},{lat2}
  const coordinatesString = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM API responded with status ${res.status}`);
    }

    const data = (await res.json()) as any;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No route found in OSRM response');
    }

    const primaryRoute = data.routes[0];
    const distanceKm = Number((primaryRoute.distance / 1000).toFixed(2));
    const durationMin = Math.max(1, Math.round(primaryRoute.duration / 60));

    // Convert OSRM GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
    const leafletCoordinates: [number, number][] = primaryRoute.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon]
    );

    return {
      distanceKm,
      durationMin,
      coordinates: leafletCoordinates,
    };
  } catch (err: any) {
    console.warn(`[OSRM] Public routing failed or timed out (${err.message}). Falling back to Haversine straight-line estimation.`);

    // Fallback: Haversine distance with 1.3x urban road curvature factor
    let totalKm = 0;
    const fallbackCoords: [number, number][] = [];

    for (let i = 0; i < points.length; i++) {
      fallbackCoords.push([points[i].lat, points[i].lng]);
      if (i > 0) {
        totalKm += getHaversineDistanceKm(points[i - 1], points[i]) * 1.3;
      }
    }

    const finalDistance = Number(Math.max(1.0, totalKm).toFixed(2));
    // Estimate Dhaka average speed: ~15 km/h in rush hour
    const estimatedMins = Math.max(5, Math.round((finalDistance / 15) * 60));

    return {
      distanceKm: finalDistance,
      durationMin: estimatedMins,
      coordinates: fallbackCoords,
    };
  }
}
