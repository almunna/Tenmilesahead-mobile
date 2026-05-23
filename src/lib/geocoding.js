/**
 * Geocoding utilities for the mobile app.
 *
 * Strategy:
 *   1. Check in-memory cache (O(1), instant)
 *   2. On first call, wait for AsyncStorage cache to load (~10-30ms)
 *   3. Try the production /api/geocode endpoint (5s timeout, sends Referer so
 *      the server's origin check allows it) — same server-side Google key as web
 *   4. If the server fails or times out, fall back to direct Google Geocoding API
 *   5. If Google direct also fails, fall back to Photon/OSM geocoding
 *   6. Cache and optionally persist the result
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEB_GEOCODE_API  = 'https://tenmilesahead.com/api/geocode';
const GOOGLE_GEOCODE_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const PHOTON_API   = 'https://photon.komoot.io/api/';
// v2: bumped to clear stale Photon/OSM coords cached under v1
const CACHE_STORAGE_KEY = '@tma_geocode_cache_v3';

// ─── In-memory cache ─────────────────────────────────────────────────────────

const geocodeCache = new Map();
let _cacheLoaded = false;

// Save the promise so getCoordinates can await it before checking the cache.
// This prevents the race condition where geocoding starts before AsyncStorage
// has finished loading previously cached coordinates, causing unnecessary
// network requests on every app launch.
const _cacheReadyPromise = AsyncStorage.getItem(CACHE_STORAGE_KEY)
  .then((stored) => {
    if (stored) {
      const entries = JSON.parse(stored);
      for (const [k, v] of entries) {
        if (v !== null) geocodeCache.set(k, v); // skip nulls — retry failed locations
      }
    }
  })
  .catch(() => {})
  .finally(() => { _cacheLoaded = true; });

// Debounced persist — batches writes so we don't hit AsyncStorage on every geocode
let persistTimer = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      const entries = [...geocodeCache.entries()].filter(([, v]) => v !== null);
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }, 2000);
}

// ─── Provider implementations ─────────────────────────────────────────────────

// Primary: call the production web API — uses the same server-side Google key
// and normalization as the web app, guaranteeing identical coordinates.
async function geocodeViaWebApi(address, city, state, country) {
  if (!city && !country && !address) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    if (country) params.set('country', country);
    const response = await fetch(`${WEB_GEOCODE_API}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Referer: 'https://tenmilesahead.com/' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data?.coordinates) && data.coordinates.length === 2
      ? data.coordinates
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeViaGoogle(address, city, state, country) {
  const parts = [address, city, state, country].filter(Boolean);
  if (parts.length === 0) return null;

  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const params = new URLSearchParams({ address: parts.join(', '), key });
    const response = await fetch(`${GOOGLE_GEOCODE_API}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const loc = data.results[0].geometry.location;
    return [loc.lng, loc.lat];
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeViaPhoton(address, city, state, country) {
  // Build the most specific query possible, falling back to city+country
  const parts = [address, city, state, country].filter(Boolean);
  if (parts.length === 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const q = encodeURIComponent(parts.join(', '));
    const response = await fetch(`${PHOTON_API}?q=${q}&limit=1&lang=en`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TenMilesAhead-Mobile/1.0 (tenmilesahead.com)' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const coords = data.features?.[0]?.geometry?.coordinates;
    // Photon returns [longitude, latitude] — same format as our API
    return Array.isArray(coords) && coords.length === 2 ? coords : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get coordinates for a location.
 * Returns [longitude, latitude] or null.
 */
export async function getCoordinates(address, city, state, country) {
  // Ensure AsyncStorage cache is loaded before checking — prevents the race
  // condition on app start that caused every launch to make network requests
  // even for already-cached locations.
  if (!_cacheLoaded) await _cacheReadyPromise;

  const parts = [address, city, state, country]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const cacheKey = parts.join(',');

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // Web API (primary, matches web exactly) → Google direct (fallback) → Photon/OSM (last resort)
  let coords = await geocodeViaWebApi(address, city, state, country);
  if (!coords) coords = await geocodeViaGoogle(address, city, state, country);
  if (!coords) coords = await geocodeViaPhoton(address, city, state, country);

  geocodeCache.set(cacheKey, coords);
  if (coords) schedulePersist();
  return coords;
}

/**
 * Calculate distance in miles between two locations using Haversine formula.
 */
export async function calculateDistance(
  originCity, originState, originCountry,
  destCity, destState, destCountry
) {
  if (!originCity && !originCountry) return 0;

  try {
    const [originCoords, destCoords] = await Promise.all([
      getCoordinates(null, originCity, originState, originCountry),
      getCoordinates(null, destCity, destState, destCountry),
    ]);

    if (!originCoords || !destCoords) return 0;

    const [originLon, originLat] = originCoords;
    const [destLon, destLat] = destCoords;

    const R = 3958.8;
    const lat1 = (originLat * Math.PI) / 180;
    const lat2 = (destLat * Math.PI) / 180;
    const dLat = ((destLat - originLat) * Math.PI) / 180;
    const dLon = ((destLon - originLon) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  } catch {
    return 0;
  }
}

export function clearGeocodeCache() {
  geocodeCache.clear();
  AsyncStorage.removeItem(CACHE_STORAGE_KEY).catch(() => {});
}
