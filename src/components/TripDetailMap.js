import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { COLORS, SPACING } from "../lib/constants";
import { getCoordinates } from "../lib/geocoding";

const PIN_COLORS = {
  destination: { fill: "#DC2626", stroke: "#991B1B" },
  activity: { fill: "#16a34a", stroke: "#15803d" },
  restaurant: { fill: "#eab308", stroke: "#ca8a04" },
  origin: { fill: "#9333ea", stroke: "#7e22ce" },
};

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

function createIconSVG(type, transportMode) {
  const colors = PIN_COLORS[type];
  const transportIcon =
    transportMode && TRANSPORT_ICONS[transportMode]
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
}

export default function TripDetailMap({
  trip,
  destinations,
  activities,
  restaurants,
}) {
  const [geocoding, setGeocoding] = useState(false);

  const webViewRef = useRef(null);
  const webViewReady = useRef(false);
  const markerQueue = useRef(null);
  const fetchId = useRef(0);

  // Static HTML rendered once — markers are injected via JS after geocoding
  const webViewSource = useMemo(() => ({ html: generateStaticMapHTML(process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY) }), []);

  useEffect(() => {
    fetchId.current += 1;
    geocodeAndInject(fetchId.current);
  }, [trip, destinations, activities, restaurants]);

  function handleWebViewLoad() {
    webViewReady.current = true;
    if (markerQueue.current !== null) {
      doInjectMarkers(markerQueue.current);
      markerQueue.current = null;
    }
  }

  function doInjectMarkers(markers) {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.setMarkers && window.setMarkers(${JSON.stringify(markers)}); true;`
    );
  }

  function injectMarkers(markers) {
    if (!webViewReady.current) {
      markerQueue.current = markers;
      return;
    }
    doInjectMarkers(markers);
  }

  async function geocodeAndInject(currentFetchId) {
    const items = [];

    if (trip.originCity && trip.originCountry) {
      items.push({
        type: "origin",
        address: trip.originAddress,
        city: trip.originCity,
        state: trip.originState,
        country: trip.originCountry,
        name: "Starting Point",
        transportMode: trip.originTransportationType,
        startDate: trip.startDate,
      });
    }

    for (const dest of destinations) {
      if (dest.onShip) continue;
      const city = dest.city || trip.city;
      const country = dest.country || trip.country;
      if (!city || !country) continue;
      items.push({
        type: "destination",
        address: dest.address,
        city,
        state: dest.state,
        country,
        name: dest.name,
        transportMode: dest.transportationMode || dest.transportationType,
        startDate: dest.startDate,
      });
    }

    for (const act of activities) {
      if (act.onShip) continue;
      const city = act.city || trip.city;
      const country = act.country || trip.country;
      if (!city || !country) continue;
      items.push({
        type: "activity",
        address: act.address,
        city,
        state: act.state,
        country,
        name: act.name,
        transportMode: act.transportationMode || act.transportationType,
        startDate: act.startDate,
      });
    }

    for (const rest of restaurants) {
      if (rest.onShip) continue;
      const city = rest.city || trip.city;
      const country = rest.country || trip.country;
      if (!city || !country) continue;
      items.push({
        type: "restaurant",
        address: rest.address,
        city,
        state: rest.state,
        country,
        name: rest.name,
        transportMode: rest.transportationMode || rest.transportationType,
        startDate: rest.startDate,
      });
    }

    if (items.length === 0) {
      injectMarkers([]);
      return;
    }

    setGeocoding(true);

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const coords = await getCoordinates(
          item.address,
          item.city,
          item.state,
          item.country
        );
        return coords ? { ...item, coords } : null;
      })
    );

    if (fetchId.current !== currentFetchId) return;

    const markers = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => {
        const { coords, type, name, city, state, country, transportMode, startDate } =
          r.value;
        const [lng, lat] = coords;
        return {
          lat,
          lng,
          type,
          name,
          location: [city, state, country].filter(Boolean).join(", "),
          transportMode,
          iconUrl: createIconSVG(type, transportMode),
          startDate,
        };
      });

    injectMarkers(markers);
    setGeocoding(false);
  }

  const hasContent =
    destinations.length > 0 ||
    activities.length > 0 ||
    restaurants.length > 0 ||
    (trip.originCity && trip.originCountry);

  if (!hasContent) return null;

  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={webViewSource}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        onLoadEnd={handleWebViewLoad}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      />
      {geocoding && (
        <View style={styles.geocodingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.geocodingText}>Loading pins...</Text>
        </View>
      )}
    </View>
  );
}

function generateStaticMapHTML(apiKey) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
    html, body { height: 100%; width: 100%; overflow: hidden; background: #e8eaed; position: fixed; touch-action: none; }
    #map { height: 100%; width: 100%; position: absolute; top: 0; left: 0; }
    .info-type { font-size: 13px; font-weight: 600; margin-bottom: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .info-name { font-size: 12px; color: #333; margin-bottom: 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .info-location { font-size: 11px; color: #666; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .info-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var _markers = [];
    var _polylines = [];
    var _pendingMarkers = null;
    var colorMap = {
      origin: '#9333ea',
      destination: '#DC2626',
      activity: '#16a34a',
      restaurant: '#eab308'
    };

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        minZoom: 2,
        mapTypeId: 'roadmap',
        gestureHandling: 'greedy',
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.BOTTOM_LEFT,
        },
        streetViewControl: false,
        fullscreenControl: false
      });
      if (_pendingMarkers !== null) {
        window.setMarkers(_pendingMarkers);
        _pendingMarkers = null;
      }
    }

    window.setMarkers = function(markers) {
      if (!map) { _pendingMarkers = markers; return; }
      _markers.forEach(function(m) { m.setMap(null); });
      _polylines.forEach(function(p) { p.setMap(null); });
      _markers = [];
      _polylines = [];

      if (!markers || markers.length === 0) return;

      var bounds = new google.maps.LatLngBounds();
      var sortedMarkers = markers.slice().sort(function(a, b) {
        if (!a.startDate || !b.startDate) return 0;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

      sortedMarkers.forEach(function(marker) {
        var pos = { lat: marker.lat, lng: marker.lng };
        var color = colorMap[marker.type];
        var gMarker = new google.maps.Marker({
          position: pos,
          map: map,
          zIndex: marker.type === 'origin' ? 1000 : 1,
          icon: { url: marker.iconUrl, scaledSize: new google.maps.Size(32, 42), anchor: new google.maps.Point(16, 42) }
        });
        var typeLabel = marker.type.charAt(0).toUpperCase() + marker.type.slice(1);
        var badge = marker.transportMode
          ? '<span class="info-badge" style="background:' + color + ';">' + marker.transportMode + '</span>'
          : '';
        var content = '<div style="min-width:150px;padding:4px;">' +
          '<div class="info-type" style="color:' + color + ';">' + typeLabel + '</div>' +
          (marker.name ? '<div class="info-name">' + marker.name + '</div>' : '') +
          '<div class="info-location">' + marker.location + '</div>' +
          badge + '</div>';
        var infoWindow = new google.maps.InfoWindow({ content: content });
        gMarker.addListener('click', function() { infoWindow.open({ map: map, anchor: gMarker }); });
        _markers.push(gMarker);
        bounds.extend(pos);
      });

      for (var i = 1; i < sortedMarkers.length; i++) {
        var prev = sortedMarkers[i - 1];
        var curr = sortedMarkers[i];
        var lineColor = (i === 1 && prev.type === 'origin') ? '#9333ea' : '#DC2626';
        var polyline = new google.maps.Polyline({
          path: [{ lat: prev.lat, lng: prev.lng }, { lat: curr.lat, lng: curr.lng }],
          geodesic: true,
          strokeColor: lineColor,
          strokeOpacity: 0,
          strokeWeight: 2,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 2 }, offset: '0', repeat: '12px' }],
          map: map
        });
        _polylines.push(polyline);
      }

      if (_markers.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(8);
      } else if (_markers.length > 1) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
          if (map.getZoom() > 10) map.setZoom(10);
        });
      }
    };
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>
  `;
}

const styles = StyleSheet.create({
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
  geocodingOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(44, 62, 80, 0.85)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  geocodingText: {
    color: "#FFFFFF",
    fontSize: 11,
  },
});
