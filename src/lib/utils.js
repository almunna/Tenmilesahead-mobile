// lib/utils.js

/**
 * Utility to join class names (for StyleSheet compatibility, returns object)
 * In React Native, we use StyleSheet.flatten or array of styles instead
 * @param  {...any} args
 * @returns {Array} Array of truthy style values
 */
export function classNames(...args) {
  return args.filter(Boolean);
}

/**
 * Format ISO date string to locale date string
 * @param {string} iso - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

/**
 * Format date as MM/DD/YYYY
 * @param {string|number|Date} d - Date to format
 * @returns {string} Formatted date
 */
export function formatDateMMDDYYYY(d) {
  if (typeof d === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (match) return `${match[2]}/${match[3]}/${match[1]}`;
  }
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${m}/${day}/${y}`;
}

/**
 * Clamp a number between min and max
 * @param {number} n - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Generate a file key for uniquely identifying files
 * @param {Object} file - File object with name, size, lastModified
 * @returns {string} Unique file key
 */
export function fileKey(file) {
  return `${file.name || file.fileName}__${file.size || file.fileSize}__${file.lastModified || Date.now()}`;
}

/**
 * Check if string is "Other" or similar placeholder
 * @param {string} s - String to check
 * @returns {boolean}
 */
export function isOtherish(s) {
  const t = s.trim().toLowerCase();
  return (
    t === "other" ||
    t === "others" ||
    t === "—" ||
    t === "-" ||
    t === "n/a" ||
    t === "none"
  );
}

/**
 * Sort array alphabetically with "Other" values at end and optionally pin one value first
 * @param {string[]} list - Array to sort
 * @param {string} [pinFirst] - Value to pin to the start
 * @returns {string[]} Sorted array
 */
export function sortAZWithOtherLast(list = [], pinFirst) {
  const arr = [...list].sort((a, b) => a.localeCompare(b));
  const tail = arr.filter(isOtherish);
  const head = arr.filter((x) => !isOtherish(x) && x !== pinFirst);
  const pinned = pinFirst && arr.includes(pinFirst) ? [pinFirst] : [];
  return [...pinned, ...head, ...tail];
}

/**
 * Format location string from trip data
 * @param {Object} trip - Trip object
 * @returns {string} Formatted location
 */
export function locationOf(trip) {
  const cityState = trip.city ? `${trip.city}${trip.state ? ", " + trip.state : ""}` : "";
  if (trip.country) return cityState ? `${cityState}, ${trip.country}` : trip.country;
  return cityState || "—";
}

/**
 * Format date range string from trip
 * @param {Object} trip - Trip object
 * @returns {string} Date range string
 */
export function dateRangeOf(trip) {
  return `${formatDateMMDDYYYY(trip.startDate)} → ${formatDateMMDDYYYY(trip.endDate)}`;
}
