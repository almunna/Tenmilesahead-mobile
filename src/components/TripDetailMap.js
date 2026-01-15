import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { COLORS, SPACING } from "../lib/constants";

// Color coding for different types (matching web version)
const PIN_COLORS = {
  destination: { fill: "#DC2626", stroke: "#991B1B" }, // Red
  activity: { fill: "#16a34a", stroke: "#15803d" }, // Green
  restaurant: { fill: "#eab308", stroke: "#ca8a04" }, // Yellow
  origin: { fill: "#9333ea", stroke: "#7e22ce" }, // Purple (starting point)
};

// Transportation mode icons (SVG paths from web version)
const TRANSPORT_ICONS = {
  Airplane: `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>`,
  "Boat/Ferry": `<path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>`,
  Bus: `<path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>`,
  Car: `<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>`,
  Cruise: `<path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>`,
  RV: `<path d="M18 4h-5V1h-2v3H6c-1.1 0-2 .9-2 2v8h1c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1V8l-4-4zm-6 2h3l2 2h-5V6zM8 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>`,
  "Taxi/Rideshare": `<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H15V3H9v2H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>`,
  Train: `<path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>`,
  Walk: `<path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>`,
  Other: `<circle cx="12" cy="12" r="8"/>`,
};

export default function TripDetailMap({
  trip,
  destinations,
  activities,
  restaurants,
}) {
  const [loading, setLoading] = useState(true);

  // Generate HTML with Leaflet map
  const generateMapHTML = () => {
    // Prepare markers data
    const markers = [];

    // Helper function to create icon SVG
    const createIconSVG = (type, transportMode) => {
      const colors = PIN_COLORS[type];
      const transportIcon = transportMode && TRANSPORT_ICONS[transportMode]
        ? TRANSPORT_ICONS[transportMode]
        : "";

      return `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26C32 7.163 24.837 0 16 0z"
            fill="${colors.fill}"
            stroke="${colors.stroke}"
            stroke-width="2"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
          ${transportIcon ? `<g transform="translate(9, 9) scale(0.58)" fill="${colors.fill}">${transportIcon}</g>` : ""}
        </svg>
      `)}`;
    };

    // Add origin marker if available
    if (trip.originCity && trip.originCountry) {
      const coords = getCoordinates(
        trip.originAddress,
        trip.originCity,
        trip.originState,
        trip.originCountry
      );
      if (coords) {
        markers.push({
          lat: coords.latitude,
          lng: coords.longitude,
          type: "origin",
          name: "Starting Point",
          location: [trip.originCity, trip.originState, trip.originCountry]
            .filter(Boolean)
            .join(", "),
          transportMode: trip.originTransportationType,
          iconUrl: createIconSVG("origin", trip.originTransportationType),
          startDate: trip.startDate,
        });
      }
    }

    // Add destination markers
    destinations.forEach((dest) => {
      if (dest.onShip) return;
      const city = dest.city || trip.city;
      const country = dest.country || trip.country;
      if (!city || !country) return;

      const coords = getCoordinates(dest.address, city, dest.state, country);
      if (coords) {
        markers.push({
          lat: coords.latitude,
          lng: coords.longitude,
          type: "destination",
          name: dest.name,
          location: [city, dest.state, country].filter(Boolean).join(", "),
          transportMode: dest.transportationMode || dest.transportationType,
          iconUrl: createIconSVG(
            "destination",
            dest.transportationMode || dest.transportationType
          ),
          startDate: dest.startDate,
        });
      }
    });

    // Add activity markers
    activities.forEach((act) => {
      if (act.onShip) return;
      const city = act.city || trip.city;
      const country = act.country || trip.country;
      if (!city || !country) return;

      const coords = getCoordinates(act.address, city, act.state, country);
      if (coords) {
        markers.push({
          lat: coords.latitude,
          lng: coords.longitude,
          type: "activity",
          name: act.name,
          location: [city, act.state, country].filter(Boolean).join(", "),
          transportMode: act.transportationMode || act.transportationType,
          iconUrl: createIconSVG(
            "activity",
            act.transportationMode || act.transportationType
          ),
          startDate: act.startDate,
        });
      }
    });

    // Add restaurant markers
    restaurants.forEach((rest) => {
      if (rest.onShip) return;
      const city = rest.city || trip.city;
      const country = rest.country || trip.country;
      if (!city || !country) return;

      const coords = getCoordinates(rest.address, city, rest.state, country);
      if (coords) {
        markers.push({
          lat: coords.latitude,
          lng: coords.longitude,
          type: "restaurant",
          name: rest.name,
          location: [city, rest.state, country].filter(Boolean).join(", "),
          transportMode: rest.transportationMode || rest.transportationType,
          iconUrl: createIconSVG(
            "restaurant",
            rest.transportationMode || rest.transportationType
          ),
          startDate: rest.startDate,
        });
      }
    });

    const markersJSON = JSON.stringify(markers);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: #fff;
      position: fixed;
      touch-action: none;
    }
    #map {
      height: 100%;
      width: 100%;
      background: #aad3df;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
    .leaflet-container {
      background: #aad3df !important;
      touch-action: pan-x pan-y;
    }
    .leaflet-tile {
      opacity: 1 !important;
    }
    .leaflet-control-attribution {
      display: none !important;
    }
    .leaflet-popup-content-wrapper {
      background: #2c3e50;
      color: white;
      border-radius: 8px;
    }
    .leaflet-popup-content {
      margin: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .popup-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .popup-location {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 2px;
    }
    .popup-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      margin-top: 4px;
    }
    .leaflet-popup-tip {
      background: #2c3e50;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const markers = ${markersJSON};

    // Create map
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: false,
      fadeAnimation: true,
      zoomAnimation: true,
      minZoom: 2,
      worldCopyJump: true,
      maxBounds: [[-85, -Infinity], [85, Infinity]],
      maxBoundsViscosity: 1.0
    }).setView([20, 0], 2);

    // Add Google Maps tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en', {
      attribution: '',
      maxZoom: 20,
      minZoom: 2,
      keepBuffer: 4,
      updateWhenIdle: false,
      updateWhenZooming: false,
      crossOrigin: true
    }).addTo(map);

    const bounds = [];
    const colorMap = {
      origin: '#9333ea',
      destination: '#DC2626',
      activity: '#16a34a',
      restaurant: '#eab308'
    };

    // Sort markers chronologically by startDate
    const sortedMarkers = [...markers].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    // Add markers
    sortedMarkers.forEach((marker, index) => {
      const icon = L.icon({
        iconUrl: marker.iconUrl,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
      });

      const m = L.marker([marker.lat, marker.lng], { icon }).addTo(map);

      const typeLabel = marker.type.charAt(0).toUpperCase() + marker.type.slice(1);
      const color = colorMap[marker.type];
      const transportBadge = marker.transportMode
        ? \`<div class="popup-badge" style="background: \${color}; color: white;">\${marker.transportMode}</div>\`
        : '';

      m.bindPopup(\`
        <div style="padding: 8px; min-width: 150px;">
          <div class="popup-title" style="color: \${color};">\${typeLabel}</div>
          <div class="popup-location">\${marker.name}</div>
          <div class="popup-location" style="font-size: 11px;">\${marker.location}</div>
          \${transportBadge}
        </div>
      \`);

      bounds.push([marker.lat, marker.lng]);
    });

    // Draw chronological connecting lines
    if (sortedMarkers.length > 1) {
      for (let i = 1; i < sortedMarkers.length; i++) {
        const prev = sortedMarkers[i - 1];
        const curr = sortedMarkers[i];

        const color = i === 1 && prev.type === 'origin' ? '#9333ea' : '#DC2626';

        L.polyline(
          [[prev.lat, prev.lng], [curr.lat, curr.lng]],
          {
            color: color,
            weight: 2,
            opacity: 0.6,
            dashArray: '8, 8'
          }
        ).addTo(map);
      }
    }

    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }

    // Force map to recalculate size
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 200);
  </script>
</body>
</html>
    `;
  };

  function getCoordinates(address, city, state, country) {
    // Use approximate coordinates based on country (same logic as WorldMap)
    const countryCoordinates = getCountryCoordinates(country);
    if (countryCoordinates) {
      // Add small random offset to prevent overlapping pins
      const offset = 0.5;
      return {
        latitude: countryCoordinates.latitude + (Math.random() - 0.5) * offset,
        longitude:
          countryCoordinates.longitude + (Math.random() - 0.5) * offset,
      };
    }
    return null;
  }

  function getCountryCoordinates(country) {
    const coordinates = {
      "United States": { latitude: 37.0902, longitude: -95.7129 },
      USA: { latitude: 37.0902, longitude: -95.7129 },
      US: { latitude: 37.0902, longitude: -95.7129 },
      Canada: { latitude: 56.1304, longitude: -106.3468 },
      Mexico: { latitude: 23.6345, longitude: -102.5528 },
      "United Kingdom": { latitude: 55.3781, longitude: -3.436 },
      UK: { latitude: 55.3781, longitude: -3.436 },
      France: { latitude: 46.2276, longitude: 2.2137 },
      Germany: { latitude: 51.1657, longitude: 10.4515 },
      Italy: { latitude: 41.8719, longitude: 12.5674 },
      Spain: { latitude: 40.4637, longitude: -3.7492 },
      Japan: { latitude: 36.2048, longitude: 138.2529 },
      China: { latitude: 35.8617, longitude: 104.1954 },
      India: { latitude: 20.5937, longitude: 78.9629 },
      Australia: { latitude: -25.2744, longitude: 133.7751 },
      Brazil: { latitude: -14.235, longitude: -51.9253 },
      Argentina: { latitude: -38.4161, longitude: -63.6167 },
      "South Africa": { latitude: -30.5595, longitude: 22.9375 },
      Egypt: { latitude: 26.8206, longitude: 30.8025 },
      Thailand: { latitude: 15.87, longitude: 100.9925 },
      Greece: { latitude: 39.0742, longitude: 21.8243 },
      Portugal: { latitude: 39.3999, longitude: -8.2245 },
      Netherlands: { latitude: 52.1326, longitude: 5.2913 },
      Switzerland: { latitude: 46.8182, longitude: 8.2275 },
      Norway: { latitude: 60.472, longitude: 8.4689 },
      Sweden: { latitude: 60.1282, longitude: 18.6435 },
      Denmark: { latitude: 56.2639, longitude: 9.5018 },
      Iceland: { latitude: 64.9631, longitude: -19.0208 },
      Ireland: { latitude: 53.4129, longitude: -8.2439 },
      "New Zealand": { latitude: -40.9006, longitude: 174.886 },
      Singapore: { latitude: 1.3521, longitude: 103.8198 },
      "South Korea": { latitude: 35.9078, longitude: 127.7669 },
      Turkey: { latitude: 38.9637, longitude: 35.2433 },
      Russia: { latitude: 61.524, longitude: 105.3188 },
      Poland: { latitude: 51.9194, longitude: 19.1451 },
      Austria: { latitude: 47.5162, longitude: 14.5501 },
      Belgium: { latitude: 50.5039, longitude: 4.4699 },
      Croatia: { latitude: 45.1, longitude: 15.2 },
      "Czech Republic": { latitude: 49.8175, longitude: 15.473 },
      Hungary: { latitude: 47.1625, longitude: 19.5033 },
      Morocco: { latitude: 31.7917, longitude: -7.0926 },
      Peru: { latitude: -9.19, longitude: -75.0152 },
      Chile: { latitude: -35.6751, longitude: -71.543 },
      Colombia: { latitude: 4.5709, longitude: -74.2973 },
      Vietnam: { latitude: 14.0583, longitude: 108.2772 },
      Indonesia: { latitude: -0.7893, longitude: 113.9213 },
      Malaysia: { latitude: 4.2105, longitude: 101.9758 },
      Philippines: { latitude: 12.8797, longitude: 121.774 },
      Barbados: { latitude: 13.1939, longitude: -59.5432 },
    };

    if (coordinates[country]) {
      return coordinates[country];
    }

    const countryLower = country?.toLowerCase() || "";
    for (const [key, value] of Object.entries(coordinates)) {
      if (key.toLowerCase() === countryLower) {
        return value;
      }
    }

    return { latitude: 20, longitude: 0 };
  }

  const hasContent =
    destinations.length > 0 ||
    activities.length > 0 ||
    restaurants.length > 0 ||
    (trip.originCity && trip.originCountry);

  if (!hasContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip Map</Text>
      <Text style={styles.subtitle}>
        Pin drops for your trip locations. Lines show chronological travel path
        by date.
      </Text>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#9333ea" }]} />
          <Text style={styles.legendText}>Starting Point</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#DC2626" }]} />
          <Text style={styles.legendText}>Destination</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
          <Text style={styles.legendText}>Activity</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#eab308" }]} />
          <Text style={styles.legendText}>Restaurant</Text>
        </View>
      </View>

      {/* Map WebView */}
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={["*"]}
          source={{ html: generateMapHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          onLoadEnd={() => setLoading(false)}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  mapContainer: {
    height: 300,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
  },
});
