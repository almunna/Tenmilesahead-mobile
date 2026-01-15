/**
 * Geocoding and distance calculation utilities
 */

// Cache for geocoding results to avoid redundant API calls
const geocodeCache = new Map();

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests to respect Nominatim's usage policy

/**
 * Geocode a location string to coordinates using Nominatim API
 * @param {string} location - Location string (e.g., "Paris, France")
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
// Track pending requests to avoid duplicate calls
const pendingRequests = new Map();

async function geocodeLocation(location) {
  try {
    // Check cache first
    if (geocodeCache.has(location)) {
      return geocodeCache.get(location);
    }

    // Check if there's already a pending request for this location
    if (pendingRequests.has(location)) {
      return await pendingRequests.get(location);
    }

    // Parse location string (expected format: "city, state, country" or "city, country")
    const parts = location.split(",").map((p) => p.trim());
    const city = parts[0] || "";

    // Handle state/division parameter for 3-part locations
    let state = "";
    let country = "";

    if (parts.length === 3) {
      // Format: "city, state, country"
      state = parts[1] || "";
      country = parts[2] || "";
    } else if (parts.length === 2) {
      // Format: "city, country"
      country = parts[1] || "";
    } else {
      // Just country
      country = parts[parts.length - 1] || "";
    }

    // Build query for Nominatim
    const queryParts = [];
    if (city) queryParts.push(city);
    if (state) queryParts.push(state);
    if (country) queryParts.push(country);
    const query = queryParts.join(", ");

    // Create the promise for this request
    const requestPromise = (async () => {
      try {
        // Rate limiting: wait if necessary to respect Nominatim's usage policy
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await new Promise((resolve) =>
            setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
          );
        }
        lastRequestTime = Date.now();

        // Use Nominatim geocoding API (free, no API key required)
        // Use a Promise.race for timeout instead of AbortController for better web compatibility
        const fetchPromise = fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=1`,
          {
            headers: {
              "User-Agent": "TenMilesAhead Mobile App",
            },
          }
        );

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 10000)
        );

        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          const coords = {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
          };
          // Cache the result
          geocodeCache.set(location, coords);
          return coords;
        }

        return null;
      } catch (error) {
        // Silently fail for geocoding errors to avoid console spam
        return null;
      } finally {
        // Remove from pending requests
        pendingRequests.delete(location);
      }
    })();

    // Store the pending request
    pendingRequests.set(location, requestPromise);

    return await requestPromise;
  } catch (error) {
    console.error("Error geocoding location:", error);
    pendingRequests.delete(location);
    return null;
  }
}

/**
 * Calculate distance between two locations using Haversine formula
 * @param {string | null | undefined} originCity
 * @param {string | null | undefined} originState
 * @param {string | null | undefined} originCountry
 * @param {string} destCity
 * @param {string | null | undefined} destState
 * @param {string} destCountry
 * @returns {Promise<number>} Distance in miles (rounded to nearest mile)
 */
export async function calculateDistance(
  originCity,
  originState,
  originCountry,
  destCity,
  destState,
  destCountry
) {
  // If no origin location, return 0
  if (!originCity && !originCountry) {
    return 0;
  }

  try {
    // Get coordinates for both locations using the new getCoordinates with fallback strategies
    const [originCoords, destCoords] = await Promise.all([
      getCoordinates(null, originCity, originState, originCountry),
      getCoordinates(null, destCity, destState, destCountry),
    ]);

    if (!originCoords || !destCoords) {
      return 0;
    }

    // destCoords is [lon, lat] format from getCoordinates
    const originLon = originCoords[0];
    const originLat = originCoords[1];
    const destLon = destCoords[0];
    const destLat = destCoords[1];

    // Calculate distance using Haversine formula
    const R = 3958.8; // Earth's radius in miles
    const lat1 = (originLat * Math.PI) / 180;
    const lat2 = (destLat * Math.PI) / 180;
    const dLat = ((destLat - originLat) * Math.PI) / 180;
    const dLon = ((destLon - originLon) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  } catch (error) {
    console.error("Error calculating distance:", error);
    return 0;
  }
}

/**
 * Clear the geocoding cache (useful for testing or memory management)
 */
export function clearGeocodeCache() {
  geocodeCache.clear();
}

/**
 * Get coordinates for a location (returns [longitude, latitude] to match web version)
 * Uses fallback strategy: try full location -> state+country -> country only
 * @param {string | null | undefined} address
 * @param {string | null | undefined} city
 * @param {string | null | undefined} state
 * @param {string | null | undefined} country
 * @returns {Promise<[number, number] | null>} [longitude, latitude] or null
 */
export async function getCoordinates(address, city, state, country) {
  try {
    // Build cache key from all parts (matching web version)
    const parts = [address, city, state, country]
      .filter(Boolean)
      .map((s) => s.toLowerCase());
    const cacheKey = parts.join(",");

    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey);
      return cached ? [cached.lon, cached.lat] : null;
    }

    // Helper function to try geocoding with a specific query
    const tryGeocode = async (query) => {
      // Check cache for this specific query
      if (geocodeCache.has(query)) {
        const cached = geocodeCache.get(query);
        return cached ? [cached.lon, cached.lat] : null;
      }

      // Check if there's already a pending request
      if (pendingRequests.has(query)) {
        const coords = await pendingRequests.get(query);
        return coords ? [coords.lon, coords.lat] : null;
      }

      const requestPromise = (async () => {
        try {
          // Rate limiting
          const now = Date.now();
          const timeSinceLastRequest = now - lastRequestTime;
          if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            await new Promise((resolve) =>
              setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
            );
          }
          lastRequestTime = Date.now();

          // Fetch from Nominatim
          const fetchPromise = fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&limit=1`,
            {
              headers: {
                "User-Agent": "TenMilesAhead Mobile App",
              },
            }
          );

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 10000)
          );

          const response = await Promise.race([fetchPromise, timeoutPromise]);

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          if (data && data.length > 0 && data[0].lat && data[0].lon) {
            const coords = {
              lat: parseFloat(data[0].lat),
              lon: parseFloat(data[0].lon),
            };
            geocodeCache.set(query, coords);
            return coords;
          }

          return null;
        } catch (error) {
          return null;
        } finally {
          pendingRequests.delete(query);
        }
      })();

      pendingRequests.set(query, requestPromise);
      const coords = await requestPromise;
      return coords ? [coords.lon, coords.lat] : null;
    };

    // Strategy 1: Try with all available location data (address, city, state, country)
    // Special case: if city equals country (e.g., "Barbados"), skip city to avoid confusion
    if (address || city) {
      const queryParts = [];
      if (address) queryParts.push(address);
      // Only include city if it's different from country (case-insensitive)
      if (city && (!country || city.toLowerCase() !== country.toLowerCase())) {
        queryParts.push(city);
      }
      if (state) queryParts.push(state);
      if (country) queryParts.push(country);
      const fullQuery = queryParts.filter(Boolean).join(", ");

      const coords1 = await tryGeocode(fullQuery);
      if (coords1) {
        geocodeCache.set(cacheKey, { lon: coords1[0], lat: coords1[1] });
        return coords1;
      }
    }

    // Strategy 2: Try with state + country (fallback if city fails)
    if (state && country) {
      const stateCountryQuery = `${state}, ${country}`;
      const coords2 = await tryGeocode(stateCountryQuery);
      if (coords2) {
        geocodeCache.set(cacheKey, { lon: coords2[0], lat: coords2[1] });
        return coords2;
      }
    }

    // Strategy 3: Try with country only (final fallback)
    if (country) {
      const countryQuery = country;
      const coords3 = await tryGeocode(countryQuery);
      if (coords3) {
        geocodeCache.set(cacheKey, { lon: coords3[0], lat: coords3[1] });
        return coords3;
      }
    }

    // All strategies failed
    geocodeCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error("Error getting coordinates:", error);
    return null;
  }
}
