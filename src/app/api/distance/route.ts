import { NextResponse } from 'next/server';

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY 
  || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
  || 'AIzaSyDHZkzDCSJXxltAnvWeSeC9wLylN93G3S0';

// Headers needed so Google accepts server-side calls despite HTTP referrer restrictions
const GOOGLE_HEADERS = {
  'Referer': 'https://scrapcarai.vercel.app',
  'X-Goog-Maps-API-Key': GOOGLE_KEY,
};

// ── Try Distance Matrix API (requires Distance Matrix API enabled) ─────────────
async function tryDistanceMatrix(origin: string, destination: string) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${encodeURIComponent(origin)}` +
    `&destinations=${encodeURIComponent(destination)}` +
    `&units=metric&language=fr&key=${GOOGLE_KEY}`;

  const res  = await fetch(url, { headers: GOOGLE_HEADERS });
  const data = await res.json();

  console.log('[distance] Matrix status:', data.status, '| element:', data.rows?.[0]?.elements?.[0]?.status);

  if (data.status !== 'OK') throw new Error(`Matrix: ${data.status} — ${data.error_message ?? ''}`);

  const el = data.rows?.[0]?.elements?.[0];
  if (!el || el.status !== 'OK') throw new Error(`Element: ${el?.status ?? 'NO_RESULTS'}`);

  return {
    distanceText:  el.distance.text,
    distanceValue: el.distance.value,
    durationText:  el.duration.text,
    durationValue: el.duration.value,
  };
}

// ── Fallback: geocode both addresses then compute straight-line distance ────────
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
  const res  = await fetch(url, { headers: GOOGLE_HEADERS });
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) return null;
  return data.results[0].geometry.location; // { lat, lng }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function tryGeocodeFallback(origin: string, destination: string) {
  const [o, d] = await Promise.all([geocodeAddress(origin), geocodeAddress(destination)]);
  if (!o || !d) throw new Error('Geocoding failed for one or both addresses');

  const km      = haversineKm(o.lat, o.lng, d.lat, d.lng);
  const kmRound = Math.round(km * 10) / 10;
  // rough estimate: ~40 km/h average in urban area
  const minEst  = Math.round((km / 40) * 60);

  return {
    distanceText:  `≈ ${kmRound.toLocaleString('fr-CA')} km`,
    distanceValue: Math.round(km * 1000),
    durationText:  `≈ ${minEst} min (estimé)`,
    durationValue: minEst * 60,
    isFallback: true,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { origin, destination } = body;

    if (!origin || !destination) {
      return NextResponse.json({ ok: false, error: 'Missing origin or destination' }, { status: 400 });
    }

    console.log('[distance] origin:', origin);
    console.log('[distance] destination:', destination);

    // 1️⃣ Try Distance Matrix first
    try {
      const result = await tryDistanceMatrix(origin, destination);
      console.log('[distance] ✅ Matrix success:', result.distanceText, result.durationText);
      return NextResponse.json({ ok: true, ...result });
    } catch (matrixErr: any) {
      console.warn('[distance] ⚠️ Matrix failed:', matrixErr.message, '— trying geocode fallback');
    }

    // 2️⃣ Fallback: geocode + haversine
    try {
      const result = await tryGeocodeFallback(origin, destination);
      console.log('[distance] ✅ Geocode fallback:', result.distanceText, result.durationText);
      return NextResponse.json({ ok: true, ...result });
    } catch (geoErr: any) {
      console.error('[distance] ❌ Geocode fallback failed:', geoErr.message);
      return NextResponse.json({ ok: false, error: geoErr.message }, { status: 400 });
    }

  } catch (err: any) {
    console.error('[distance] ❌ Unexpected error:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
