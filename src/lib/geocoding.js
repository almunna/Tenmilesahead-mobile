/**
 * Geocoding utilities — delegates to the web app's /api/geocode server route.
 * The server handles Google Maps geocoding, fallback strategies, and in-memory caching.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOCODE_API = 'https://tenmilesahead.com/api/geocode';
const CACHE_STORAGE_KEY = '@tma_geocode_cache_v1';

// In-memory cache — fast O(1) lookups
const geocodeCache = new Map();

// Load persisted cache from AsyncStorage on module init so subsequent app launches skip geocoding
(async () => {
  try {
    const stored = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored);
      for (const [k, v] of entries) geocodeCache.set(k, v);
    }
  } catch {}
})();

// Debounced persist — batches writes so we don't hit AsyncStorage on every single geocode
let persistTimer = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([...geocodeCache.entries()]));
    } catch {}
  }, 2000);
}

/**
 * Get coordinates for a location.
 * Returns [longitude, latitude] or null.
 */
export async function getCoordinates(address, city, state, country) {
  const parts = [address, city, state, country]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const cacheKey = parts.join(',');

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    if (country) params.set('country', country);

    const response = await fetch(`${GEOCODE_API}?${params.toString()}`);
    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();
    const coords = data.coordinates || null;
    geocodeCache.set(cacheKey, coords);
    schedulePersist();
    return coords;
  } catch {
    return null;
  }
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
