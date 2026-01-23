import React, { useEffect, useState } from "react";
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
  const [visitedCountries, setVisitedCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);

  useEffect(() => {
    if (!user || !trips || trips.length === 0) {
      setLoading(false);
      return;
    }

    fetchAllDestinations();
  }, [user, trips]);

  async function fetchAllDestinations() {
    try {
      const allPins = [];
      const seenLocations = new Set();
      const countries = new Set();

      // Process each trip - ONLY fetch from destinations subcollection (matching web version)
      for (const trip of trips) {
        // Fetch destinations from subcollection
        const destSnap = await getDocs(
          collection(db, "trips", trip.id, "destinations")
        );

        for (const doc of destSnap.docs) {
          const dest = doc.data();

          // Skip if no country (required field)
          if (!dest.country) continue;

          // Track visited countries
          countries.add(dest.country.toLowerCase().trim());

          const locationKey = `${dest.city}_${dest.state}_${dest.country}`;

          // Skip duplicates
          if (seenLocations.has(locationKey)) continue;
          seenLocations.add(locationKey);

          // Get accurate coordinates using geocoding (matching web's 4-parameter approach)
          try {
            const coords = await getCoordinates(
              dest.specificAddress,  // First: specific address (most precise)
              dest.city,             // Second: city
              dest.state,            // Third: state
              dest.country           // Fourth: country
            );

            if (coords) {
              allPins.push({
                id: doc.id,
                tripId: trip.id,
                tripName: trip.name,
                name: dest.name,
                city: dest.city || "",
                state: dest.state || "",
                country: dest.country || "",
                latitude: coords[1], // coords is [lon, lat]
                longitude: coords[0],
              });
            }
          } catch (error) {
            // Skip this location if geocoding fails
          }

          // Small delay to respect rate limiting (100ms matches web version)
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setPins(allPins);
      setVisitedCountries(Array.from(countries));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching destinations:", error);
      setLoading(false);
    }
  }

  // Generate HTML with Leaflet map
  const generateMapHTML = () => {
    const pinsJSON = JSON.stringify(pins);
    const visitedCountriesJSON = JSON.stringify(visitedCountries);

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
    .popup-trip {
      font-size: 11px;
      opacity: 0.7;
    }
    .leaflet-popup-tip {
      background: #2c3e50;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const pins = ${pinsJSON};
    const visitedCountries = ${visitedCountriesJSON};

    // Create map (matching web version settings)
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

    // Add Google Maps tiles (same as web version)
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en', {
      attribution: '',
      maxZoom: 20,
      minZoom: 2,
      keepBuffer: 4,
      updateWhenIdle: false,
      updateWhenZooming: false,
      crossOrigin: true
    }).addTo(map);

    // Load and highlight visited countries
    if (visitedCountries.length > 0) {
      fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson')
        .then(response => response.json())
        .then(countriesGeoJSON => {
          // Comprehensive country name mapping (matching web version)
          const countryNameMap = {
            // Americas
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
            // Europe
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
            // Asia
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
            // Middle East
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
            // Central Asia
            'kazakhstan': ['kazakhstan'],
            'uzbekistan': ['uzbekistan'],
            'turkmenistan': ['turkmenistan'],
            'tajikistan': ['tajikistan'],
            'kyrgyzstan': ['kyrgyzstan'],
            'afghanistan': ['afghanistan'],
            // Africa
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
            // Oceania
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
            // French territories
            'réunion (france)': ['france', 'reunion'],
            'reunion': ['france', 'reunion'],
            'saint barthélemy (france)': ['france', 'saint barthelemy'],
            'saint barthelemy': ['france'],
            // Antarctica
            'antarctica': ['antarctica']
          };

          // Build a set of all countries that should be shaded (including parent/sovereign countries)
          const countriesToShade = new Set();

          for (const visited of visitedCountries) {
            // Add the visited country itself
            countriesToShade.add(visited);

            // Get mapped names (including parent/sovereign countries)
            const mappedNames = countryNameMap[visited] || [];
            for (const mappedName of mappedNames) {
              countriesToShade.add(mappedName.toLowerCase().trim());
            }
          }

          // Filter GeoJSON to only visited countries
          const visitedFeatures = countriesGeoJSON.features.filter(feature => {
            // Try multiple property names for country name (Natural Earth uses ADMIN, NAME, NAME_LONG)
            const props = feature.properties;
            const geoCountryName = props.ADMIN || props.NAME || props.name || props.NAME_LONG || '';

            // Skip Antarctica unless explicitly visited
            if (geoCountryName.toLowerCase().includes('antarctica')) {
              return countriesToShade.has('antarctica');
            }
            const geoCountryLower = geoCountryName.toLowerCase().trim();

            // Check direct match against our expanded set
            if (countriesToShade.has(geoCountryLower)) {
              return true;
            }

            // Also check if the GeoJSON name maps to any country we should shade
            for (const [key, values] of Object.entries(countryNameMap)) {
              if (values.some(v => v.toLowerCase() === geoCountryLower) && countriesToShade.has(key)) {
                return true;
              }
            }

            return false;
          });

          // Add visited countries layer with pink shading
          L.geoJSON({
            type: 'FeatureCollection',
            features: visitedFeatures
          }, {
            style: {
              fillColor: '#FFC0CB',
              fillOpacity: 0.4,
              color: '#FF69B4',
              weight: 1,
              opacity: 0.6
            }
          }).addTo(map);
        })
        .catch(error => {
          console.error('Error loading country boundaries:', error);
        });
    }

    // Add markers
    if (pins.length > 0) {
      const bounds = [];

      pins.forEach(pin => {
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(map);

        // Build full location string for display
        const locationParts = [pin.city, pin.state, pin.country].filter(Boolean);
        const locationStr = locationParts.join(', ');

        const popupContent = \`
          <div class="popup-title">\${pin.name || locationStr}</div>
          <div class="popup-location">\${locationStr}</div>
          <div class="popup-trip">Part of: \${pin.tripName}</div>
        \`;

        marker.bindPopup(popupContent);
        bounds.push([pin.latitude, pin.longitude]);
      });

      // Fit map to show all markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } else {
      // Default world view
      map.setView([20, 0], 2);
    }

    // Force map to recalculate size after a short delay (critical for WebView)
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (pins.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No destinations yet. Add trips to see them on the map!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Travel Map</Text>

      {/* Leaflet Map in WebView */}
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: generateMapHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        />
      </View>

      {/* Pin List */}
      <View style={styles.pinListContainer}>
        <Text style={styles.pinListTitle}>
          Destinations ({pins.length} pins)
        </Text>
        <ScrollView
          style={styles.pinList}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          {pins.map((pin) => (
            <TouchableOpacity
              key={pin.id}
              style={[
                styles.pinItem,
                selectedPin?.id === pin.id && styles.pinItemSelected,
              ]}
              onPress={() => setSelectedPin(pin)}
            >
              <Text style={styles.pinIcon}>📍</Text>
              <View style={styles.pinInfo}>
                <Text style={styles.pinCity}>{pin.city || pin.country}</Text>
                {pin.state && (
                  <Text style={styles.pinState}>{pin.state}</Text>
                )}
                <Text style={styles.pinTrip}>{pin.tripName}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
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
  loadingContainer: {
    height: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: scaleSpacing(SPACING.sm),
    color: COLORS.muted,
    fontSize: scaleFontSize(14),
  },
  emptyContainer: {
    height: 200,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: scaleSpacing(SPACING.md),
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(14),
    textAlign: "center",
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
