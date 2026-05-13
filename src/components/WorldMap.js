import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";
import { getCoordinates } from "../lib/geocoding";

export default function WorldMap({ trips, user }) {
  const [pins, setPins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const webViewRef = useRef(null);
  const webViewReady = useRef(false);
  const pinQueue = useRef([]);
  const countryQueue = useRef(null);
  const fetchId = useRef(0);
  const prevTripIds = useRef("");

  // Static HTML — rendered once on mount, never reloads
  const webViewSource = useMemo(() => ({ html: generateMapHTML(process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY) }), []);

  useEffect(() => {
    if (!user || !trips || trips.length === 0) return;

    const tripIds = trips.map((t) => t.id).sort().join(",");
    if (tripIds === prevTripIds.current) return;
    prevTripIds.current = tripIds;

    fetchId.current += 1;
    pinQueue.current = [];
    countryQueue.current = null;
    setPins([]);
    setDestinations([]);
    setGeocoding(false);

    // Clear previous pins + shading if WebView already loaded
    if (webViewReady.current && webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.clearMap && window.clearMap(); true;`);
    }

    fetchAllDestinations(fetchId.current);
  }, [user, trips]);

  // ─── Batch pin injection ──────────────────────────────────────────────────

  function doInjectPins(pins) {
    if (!webViewRef.current || pins.length === 0) return;
    webViewRef.current.injectJavaScript(
      `window.addPins && window.addPins(${JSON.stringify(pins)}); true;`
    );
  }

  function injectPins(pins) {
    if (!webViewReady.current) {
      pinQueue.current.push(...pins);
      return;
    }
    doInjectPins(pins);
  }

  // ─── Country shading injection ────────────────────────────────────────────

  function doInjectCountryShading(countries) {
    if (!webViewRef.current || countries.length === 0) return;
    const js = `window.applyCountryShading && window.applyCountryShading(${JSON.stringify(countries)}); true;`;
    webViewRef.current.injectJavaScript(js);
  }

  function injectCountryShading(countries) {
    if (!webViewReady.current) {
      countryQueue.current = countries;
      return;
    }
    doInjectCountryShading(countries);
  }

  // ─── WebView ready — flush queued data ────────────────────────────────────

  function handleWebViewLoad() {
    webViewReady.current = true;
    if (countryQueue.current !== null) {
      doInjectCountryShading(countryQueue.current);
      countryQueue.current = null;
    }
    const queued = pinQueue.current.splice(0);
    if (queued.length > 0) doInjectPins(queued);
  }

  // ─── Data fetching ────────────────────────────────────────────────────────

  async function fetchAllDestinations(currentFetchId) {
    try {
      const seenLocations = new Set();
      const countries = new Set();

      const todayStr = new Date().toISOString().split("T")[0];
      const pastTrips = trips.filter((t) => !t.startDate || t.startDate <= todayStr);

      const tripResults = await Promise.all(
        pastTrips.map(async (trip) => {
          try {
            const destSnap = await getDocs(
              collection(db, "trips", trip.id, "destinations")
            );
            return destSnap.docs.map((doc) => ({
              doc,
              data: doc.data(),
              tripId: trip.id,
              tripName: trip.name,
            }));
          } catch {
            return [];
          }
        })
      );
      const allDestsRaw = tripResults.flat();

      if (fetchId.current !== currentFetchId) return;

      if (allDestsRaw.length === 0) return;

      // Show destination text immediately — no geocoding needed for the list
      setDestinations(
        allDestsRaw
          .filter((item) => item.data.country)
          .map(({ doc, data, tripId, tripName }) => ({
            id: `${tripId}_${doc.id}`,
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            tripName,
          }))
      );

      // Inject country shading as soon as country list is known
      for (const { data } of allDestsRaw) {
        if (data.country) countries.add(data.country.toLowerCase().trim());
      }
      injectCountryShading(Array.from(countries));
      setGeocoding(true);

      const geocodeResults = await Promise.allSettled(
        allDestsRaw.filter((item) => item.data.country).map(async ({ doc, data, tripId, tripName }) => {
          const coords = await getCoordinates(
            data.specificAddress,
            data.city,
            data.state,
            data.country
          );
          if (!coords) return null;
          return {
            id: `${tripId}_${doc.id}`,
            tripId,
            tripName,
            name: data.name,
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            latitude: coords[1],
            longitude: coords[0],
          };
        })
      );

      if (fetchId.current !== currentFetchId) return;

      const resolvedPins = geocodeResults
        .filter((r) => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);

      if (resolvedPins.length > 0) injectPins(resolvedPins);
      setPins(resolvedPins);
      setGeocoding(false);
    } catch (err) {
      console.error("fetchAllDestinations error:", err);
      setGeocoding(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Travel Map</Text>

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

      <View style={styles.pinListContainer}>
        <Text style={styles.pinListTitle}>
          Destinations ({destinations.length} pins)
        </Text>
        <ScrollView
          style={styles.pinList}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          {destinations.map((dest) => (
            <TouchableOpacity
              key={dest.id}
              style={[
                styles.pinItem,
                selectedPin?.id === dest.id && styles.pinItemSelected,
              ]}
              onPress={() => {
                const pin = pins.find((p) => p.id === dest.id);
                if (pin) setSelectedPin(pin);
              }}
            >
              <Text style={styles.pinIcon}>📍</Text>
              <View style={styles.pinInfo}>
                <Text style={styles.pinCity}>{dest.city || dest.country}</Text>
                {dest.state ? (
                  <Text style={styles.pinState}>{dest.state}</Text>
                ) : null}
                <Text style={styles.pinTrip}>{dest.tripName}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Static map HTML ─────────────────────────────────────────────────────────
// Rendered once. Country shading and pins are injected via JS after data loads.

function generateMapHTML(apiKey) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
    html, body { height: 100%; width: 100%; overflow: hidden; background: #e8eaed; position: fixed; touch-action: none; }
    #map { height: 100%; width: 100%; position: absolute; top: 0; left: 0; }
    .info-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .info-location { font-size: 12px; color: #555; margin-bottom: 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .info-trip { font-size: 11px; color: #888; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var _markers = [];
    var _allPositions = [];
    var _cachedGeoJSON = null;
    var _pendingPins = null;
    var _pendingCountries = null;

    var countryNameMap = {
        'united states': ['united states of america', 'usa', 'us', 'united states'],
        'usa': ['united states of america'],
        'united states (usvi)': ['united states of america'],
        'canada': ['canada'],
        'mexico': ['mexico', 'united mexican states'],
        'brazil': ['brazil', 'federative republic of brazil'],
        'argentina': ['argentina'],
        'chile': ['chile'],
        'colombia': ['colombia'],
        'peru': ['peru'],
        'venezuela': ['venezuela'],
        'ecuador': ['ecuador'],
        'bolivia': ['bolivia'],
        'paraguay': ['paraguay'],
        'uruguay': ['uruguay'],
        'costa rica': ['costa rica'],
        'panama': ['panama'],
        'guatemala': ['guatemala'],
        'honduras': ['honduras'],
        'el salvador': ['el salvador'],
        'nicaragua': ['nicaragua'],
        'belize': ['belize'],
        'cuba': ['cuba'],
        'dominican republic': ['dominican republic'],
        'haiti': ['haiti'],
        'jamaica': ['jamaica'],
        'puerto rico': ['puerto rico', 'united states of america'],
        'bahamas': ['the bahamas', 'bahamas', 'commonwealth of the bahamas'],
        'the bahamas': ['the bahamas', 'bahamas', 'commonwealth of the bahamas'],
        'new providence': ['the bahamas', 'bahamas'],
        'barbados': ['barbados'],
        'trinidad and tobago': ['trinidad and tobago'],
        'antigua and barbuda': ['antigua and barbuda'],
        'saint lucia': ['saint lucia'],
        'st. lucia': ['saint lucia'],
        'st lucia': ['saint lucia'],
        'grenada': ['grenada'],
        'saint kitts and nevis': ['saint kitts and nevis'],
        'st. kitts and nevis': ['saint kitts and nevis'],
        'dominica': ['dominica'],
        'saint vincent and the grenadines': ['saint vincent and the grenadines'],
        'saint vincent and grenadines': ['saint vincent and the grenadines'],
        'anguilla': ['anguilla'],
        'aruba': ['aruba'],
        'bonaire': ['bonaire', 'caribbean netherlands'],
        'curacao': ['curacao', 'curaçao'],
        'curaçao': ['curacao', 'curaçao'],
        'bermuda': ['bermuda'],
        'cayman islands': ['cayman islands'],
        'turks and caicos islands': ['turks and caicos islands'],
        'turks and caicos': ['turks and caicos islands'],
        'british virgin islands': ['british virgin islands'],
        'u.s. virgin islands': ['united states virgin islands', 'u.s. virgin islands'],
        'virgin islands': ['united states virgin islands', 'british virgin islands'],
        'guadeloupe': ['guadeloupe'],
        'guadeloupe (france)': ['guadeloupe'],
        'martinique': ['martinique'],
        'martinique (france)': ['martinique'],
        'sint maarten': ['sint maarten'],
        'st. maarten': ['sint maarten'],
        'saint martin': ['saint martin', 'sint maarten'],
        'st. martin': ['saint martin', 'sint maarten'],
        'netherlands antilles': ['sint maarten', 'curacao'],
        'montserrat': ['montserrat'],
        'united kingdom': ['united kingdom', 'uk', 'great britain'],
        'uk': ['united kingdom'],
        'uk overseas territory': ['united kingdom'],
        'england': ['united kingdom'],
        'scotland': ['united kingdom'],
        'wales': ['united kingdom'],
        'northern ireland': ['united kingdom'],
        'ireland': ['ireland'],
        'france': ['france', 'french republic'],
        'france (mayotte)': ['mayotte'],
        'mayotte': ['mayotte'],
        'germany': ['germany', 'federal republic of germany'],
        'italy': ['italy', 'italian republic'],
        'spain': ['spain', 'kingdom of spain'],
        'portugal': ['portugal'],
        'netherlands': ['netherlands', 'holland'],
        'holland': ['netherlands'],
        'belgium': ['belgium', 'kingdom of belgium'],
        'luxembourg': ['luxembourg'],
        'switzerland': ['switzerland'],
        'austria': ['austria'],
        'greece': ['greece'],
        'poland': ['poland'],
        'czech republic': ['czech republic', 'czechia'],
        'czechia': ['czech republic', 'czechia'],
        'slovakia': ['slovakia'],
        'hungary': ['hungary'],
        'croatia': ['croatia'],
        'slovenia': ['slovenia'],
        'romania': ['romania'],
        'bulgaria': ['bulgaria'],
        'serbia': ['serbia', 'republic of serbia'],
        'montenegro': ['montenegro'],
        'bosnia and herzegovina': ['bosnia and herzegovina'],
        'albania': ['albania'],
        'macedonia': ['north macedonia', 'macedonia'],
        'north macedonia': ['north macedonia'],
        'denmark': ['denmark'],
        'sweden': ['sweden'],
        'norway': ['norway'],
        'finland': ['finland'],
        'iceland': ['iceland'],
        'greenland': ['greenland'],
        'estonia': ['estonia'],
        'latvia': ['latvia'],
        'lithuania': ['lithuania'],
        'russia': ['russia', 'russian federation'],
        'ukraine': ['ukraine'],
        'belarus': ['belarus'],
        'moldova': ['moldova', 'republic of moldova'],
        'malta': ['malta'],
        'cyprus': ['cyprus'],
        'monaco': ['monaco'],
        'andorra': ['andorra'],
        'san marino': ['san marino'],
        'liechtenstein': ['liechtenstein'],
        'vatican city': ['vatican'],
        'china': ['china', "people's republic of china"],
        'japan': ['japan'],
        'south korea': ['south korea', 'korea, republic of', 'republic of korea'],
        'korea': ['south korea', 'republic of korea'],
        'north korea': ['north korea', "democratic people's republic of korea"],
        'taiwan': ['taiwan'],
        'hong kong': ['hong kong', 'china'],
        'macau': ['macau', 'macao', 'china'],
        'india': ['india', 'republic of india'],
        'pakistan': ['pakistan'],
        'bangladesh': ['bangladesh', "people's republic of bangladesh"],
        'sri lanka': ['sri lanka'],
        'nepal': ['nepal'],
        'bhutan': ['bhutan'],
        'maldives': ['maldives'],
        'thailand': ['thailand', 'kingdom of thailand'],
        'vietnam': ['vietnam', 'viet nam'],
        'cambodia': ['cambodia'],
        'laos': ['laos', "lao people's democratic republic"],
        'myanmar': ['myanmar', 'burma'],
        'burma': ['myanmar', 'burma'],
        'malaysia': ['malaysia'],
        'singapore': ['singapore'],
        'indonesia': ['indonesia'],
        'philippines': ['philippines'],
        'brunei': ['brunei', 'brunei darussalam'],
        'timor-leste': ['timor-leste', 'east timor'],
        'mongolia': ['mongolia'],
        'turkey': ['turkey', 'türkiye'],
        'israel': ['israel'],
        'palestine': ['palestine', 'palestinian territories'],
        'jordan': ['jordan'],
        'lebanon': ['lebanon'],
        'syria': ['syria', 'syrian arab republic'],
        'iraq': ['iraq'],
        'iran': ['iran', 'islamic republic of iran'],
        'saudi arabia': ['saudi arabia'],
        'united arab emirates': ['united arab emirates', 'uae'],
        'uae': ['united arab emirates'],
        'qatar': ['qatar'],
        'bahrain': ['bahrain'],
        'kuwait': ['kuwait'],
        'oman': ['oman'],
        'yemen': ['yemen'],
        'kazakhstan': ['kazakhstan'],
        'uzbekistan': ['uzbekistan'],
        'turkmenistan': ['turkmenistan'],
        'tajikistan': ['tajikistan'],
        'kyrgyzstan': ['kyrgyzstan'],
        'afghanistan': ['afghanistan'],
        'egypt': ['egypt'],
        'morocco': ['morocco'],
        'algeria': ['algeria'],
        'tunisia': ['tunisia'],
        'libya': ['libya'],
        'sudan': ['sudan'],
        'south sudan': ['south sudan'],
        'ethiopia': ['ethiopia'],
        'kenya': ['kenya'],
        'tanzania': ['tanzania', 'united republic of tanzania'],
        'uganda': ['uganda'],
        'rwanda': ['rwanda'],
        'south africa': ['south africa'],
        'nigeria': ['nigeria'],
        'ghana': ['ghana'],
        'senegal': ['senegal'],
        'ivory coast': ['ivory coast', "côte d'ivoire", "cote d'ivoire"],
        "côte d'ivoire": ['ivory coast', "côte d'ivoire", "cote d'ivoire"],
        'cameroon': ['cameroon'],
        'democratic republic of the congo': ['democratic republic of the congo', 'drc', 'congo'],
        'congo': ['congo', 'republic of the congo', 'democratic republic of the congo'],
        'angola': ['angola'],
        'mozambique': ['mozambique'],
        'zimbabwe': ['zimbabwe'],
        'zambia': ['zambia'],
        'botswana': ['botswana'],
        'namibia': ['namibia'],
        'madagascar': ['madagascar'],
        'mauritius': ['mauritius'],
        'seychelles': ['seychelles'],
        'comoros': ['comoros'],
        'são tomé & príncipe': ['sao tome and principe', 'são tomé and príncipe'],
        'sao tome and principe': ['sao tome and principe'],
        'australia': ['australia', 'commonwealth of australia'],
        'new zealand': ['new zealand'],
        'papua new guinea': ['papua new guinea'],
        'fiji': ['fiji'],
        'samoa': ['samoa'],
        'tonga': ['tonga'],
        'vanuatu': ['vanuatu'],
        'solomon islands': ['solomon islands'],
        'new caledonia': ['new caledonia', 'france'],
        'new caledonia (france)': ['new caledonia', 'france'],
        'french polynesia': ['french polynesia', 'france'],
        'guam': ['guam', 'united states of america'],
        'hawaii': ['united states of america'],
        'tahiti': ['french polynesia', 'france'],
        'bora bora': ['french polynesia', 'france'],
        'cook islands': ['cook islands', 'new zealand'],
        'kiribati': ['kiribati'],
        'marshall islands': ['marshall islands'],
        'micronesia': ['micronesia', 'federated states of micronesia'],
        'nauru': ['nauru'],
        'palau': ['palau'],
        'tuvalu': ['tuvalu'],
        'réunion (france)': ['france', 'reunion'],
        'reunion': ['france', 'reunion'],
        'saint barthélemy (france)': ['france', 'saint barthelemy'],
        'saint barthelemy': ['france'],
        'antarctica': ['antarctica']
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
        fullscreenControl: false,
        restriction: {
          latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
          strictBounds: true,
        },
      });
      if (_pendingCountries !== null) {
        window.applyCountryShading(_pendingCountries);
        _pendingCountries = null;
      }
      if (_pendingPins !== null) {
        window.addPins(_pendingPins);
        _pendingPins = null;
      }
    }

    window.clearMap = function() {
      _markers.forEach(function(m) { m.setMap(null); });
      _markers = [];
      _allPositions = [];
      if (map) {
        map.data.forEach(function(f) { map.data.remove(f); });
        map.setCenter({ lat: 20, lng: 0 });
        map.setZoom(2);
      }
    };

    window.applyCountryShading = function(visitedCountries) {
      if (!map) { _pendingCountries = visitedCountries; return; }
      map.data.forEach(function(f) { map.data.remove(f); });
      if (!visitedCountries || visitedCountries.length === 0) return;

      var countriesToShade = {};
      visitedCountries.forEach(function(visited) {
        countriesToShade[visited] = true;
        var mapped = countryNameMap[visited] || [];
        mapped.forEach(function(n) { countriesToShade[n.toLowerCase().trim()] = true; });
      });

      function applyShading(geoJSON) {
        var visitedFeatures = geoJSON.features.filter(function(feature) {
          var props = feature.properties;
          var name = (props.ADMIN || props.NAME || props.name || props.NAME_LONG || '').toLowerCase().trim();
          if (name.includes('antarctica')) return !!countriesToShade['antarctica'];
          if (countriesToShade[name]) return true;
          for (var key in countryNameMap) {
            if (countryNameMap[key].some(function(v) { return v.toLowerCase() === name; }) && countriesToShade[key]) return true;
          }
          return false;
        });
        if (visitedFeatures.length === 0) return;
        map.data.addGeoJson({ type: 'FeatureCollection', features: visitedFeatures });
        map.data.setStyle({ fillColor: '#FFC0CB', fillOpacity: 0.4, strokeColor: '#FF69B4', strokeWeight: 1, strokeOpacity: 0.6, clickable: false });
      }

      if (_cachedGeoJSON) {
        applyShading(_cachedGeoJSON);
      } else {
        fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson')
          .then(function(r) { return r.json(); })
          .then(function(geoJSON) { _cachedGeoJSON = geoJSON; applyShading(geoJSON); })
          .catch(function() {});
      }
    };

    window.addPins = function(pins) {
      if (!map) { _pendingPins = pins; return; }
      if (!pins || pins.length === 0) return;
      pins.forEach(function(pin) {
        var marker = new google.maps.Marker({
          position: { lat: pin.latitude, lng: pin.longitude },
          map: map,
          icon: {
            url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            scaledSize: new google.maps.Size(25, 41),
            anchor: new google.maps.Point(12, 41)
          }
        });
        var locationParts = [pin.city, pin.state, pin.country].filter(Boolean);
        var locationStr = locationParts.join(', ');
        var content = '<div><div class="info-title">' + (pin.name || locationStr) + '</div>' +
          '<div class="info-location">' + locationStr + '</div>' +
          '<div class="info-trip">Part of: ' + pin.tripName + '</div></div>';
        var infoWindow = new google.maps.InfoWindow({ content: content });
        marker.addListener('click', function() { infoWindow.open({ map: map, anchor: marker }); });
        _markers.push(marker);
        _allPositions.push({ lat: pin.latitude, lng: pin.longitude });
      });
      if (_allPositions.length === 1) {
        map.setCenter(_allPositions[0]);
        map.setZoom(4);
      } else if (_allPositions.length > 1) {
        var bounds = new google.maps.LatLngBounds();
        _allPositions.forEach(function(pos) { bounds.extend(pos); });
        map.fitBounds(bounds, 30);
      }
    };
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>
  `;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  title: {
    fontSize: scaleFontSize(16),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  mapContainer: {
    height: 300,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: scaleSpacing(SPACING.sm),
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
    backgroundColor: COLORS.surface,
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
    fontSize: scaleFontSize(11),
  },
  pinListContainer: {
    backgroundColor: "#2c3e50",
    borderRadius: 8,
    padding: scaleSpacing(SPACING.sm),
    maxHeight: 250,
  },
  pinListTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: scaleSpacing(SPACING.xs),
  },
  pinList: {
    maxHeight: 200,
  },
  pinItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3d5266",
    borderRadius: 6,
    padding: scaleSpacing(SPACING.xs),
    marginBottom: scaleSpacing(SPACING.xs),
  },
  pinItemSelected: {
    backgroundColor: "#4a5f7a",
    borderWidth: 1,
    borderColor: "#66bfcc",
  },
  pinIcon: {
    fontSize: scaleFontSize(16),
    marginRight: scaleSpacing(SPACING.xs),
  },
  pinInfo: {
    flex: 1,
  },
  pinCity: {
    fontSize: scaleFontSize(13),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pinState: {
    fontSize: scaleFontSize(11),
    color: "rgba(255, 255, 255, 0.8)",
  },
  pinTrip: {
    fontSize: scaleFontSize(10),
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
});
