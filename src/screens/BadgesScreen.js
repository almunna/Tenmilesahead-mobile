import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import {
  BADGE_CATEGORIES,
  ALL_BADGES,
  TIERS,
  getTier,
  evaluateBadges,
  getTieredProgress,
  getBadgeSummary,
} from "../lib/badges";
import { COLORS, SPACING, scaleFontSize, scaleSpacing, isTablet } from "../lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC SVG MAP  (react-native-svg-transformer — static imports required)
// ─────────────────────────────────────────────────────────────────────────────

// Category icons
import CatMilesTraveled       from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled.svg";
import CatStatesVisited       from "../../assets/TMA FINAL BADGES/States Visited/States Visited.svg";
import CatCountriesVisited    from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited.svg";
import CatFirstTimeMilestones from "../../assets/TMA FINAL BADGES/First-Time Milestones/First-Time Milestones-01.svg";
import CatDistanceMileage     from "../../assets/TMA FINAL BADGES/Distance and mileage achievement/Distance and mileage achievement.svg";
import CatDestinationBased    from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/Destination-Based Achievements.svg";
import CatFrequencyStreak     from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Frequency & Streak Achievements.svg";
import CatTimingSeasonal      from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Timing & Seasonal Achievements.svg";
import CatWonders             from "../../assets/TMA FINAL BADGES/7 Wonders of the World/7 Wonders of the World.svg";

// Miles Travelled tiers
import MilesBronze   from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled_Bronze.svg";
import MilesSilver   from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled_Silver.svg";
import MilesGold     from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled_Gold.svg";
import MilesPlatinum from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled_Platinum.svg";
import MilesDiamond  from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled_Diamond-01.svg";
import MilesTitan    from "../../assets/TMA FINAL BADGES/Miles Travelled/Miles Travelled_Titan.svg";

// States Visited tiers
import StatesBronze   from "../../assets/TMA FINAL BADGES/States Visited/States Visited_Bronze.svg";
import StatesSilver   from "../../assets/TMA FINAL BADGES/States Visited/States Visited_Silver.svg";
import StatesGold     from "../../assets/TMA FINAL BADGES/States Visited/States Visited_Gold.svg";
import StatesPlatinum from "../../assets/TMA FINAL BADGES/States Visited/States Visited_Platinum.svg";
import StatesDiamond  from "../../assets/TMA FINAL BADGES/States Visited/States Visited_Diamond-01.svg";
import StatesTitan    from "../../assets/TMA FINAL BADGES/States Visited/States Visited_Titan.svg";

// Countries Visited tiers
import CountriesBronze   from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited_Bronze.svg";
import CountriesSilver   from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited_Silver.svg";
import CountriesGold     from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited_Gold.svg";
import CountriesPlatinum from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited_Platinum.svg";
import CountriesDiamond  from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited_Diamond-01.svg";
import CountriesTitan    from "../../assets/TMA FINAL BADGES/Countries Visited/Countries Visited_Titan.svg";

// First-Time Milestones
import BorderCrosser      from "../../assets/TMA FINAL BADGES/First-Time Milestones/Border Crosser-01.svg";
import FirstFlight        from "../../assets/TMA FINAL BADGES/First-Time Milestones/First Flight-01.svg";
import FirstAccommodation from "../../assets/TMA FINAL BADGES/First-Time Milestones/First Accommodation Stay-01.svg";
import FirstLoggedTrip    from "../../assets/TMA FINAL BADGES/First-Time Milestones/First Logged Trip-01.svg";
import RoadTripRookie     from "../../assets/TMA FINAL BADGES/First-Time Milestones/Road Trip Rookie-01.svg";

// Distance & Mileage
import DistanceDriver      from "../../assets/TMA FINAL BADGES/Distance and mileage achievement/Distance Driver.svg";
import LongHaulTraveler    from "../../assets/TMA FINAL BADGES/Distance and mileage achievement/Long Haul Traveler.svg";
import RoadMarathoner      from "../../assets/TMA FINAL BADGES/Distance and mileage achievement/Road Marathoner.svg";
import MileageMaster       from "../../assets/TMA FINAL BADGES/Distance and mileage achievement/Mileage Master.svg";
import CrossCountryCruiser from "../../assets/TMA FINAL BADGES/Distance and mileage achievement/Cross Country Cruiser.svg";

// Destination-Based
import CapitalCityExplorer from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/Capital City Explorer.svg";
import CityBreaker         from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/City Breaker.svg";
import CulturalExplorer    from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/Cultural Explorer.svg";
import IslandHopper        from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/Island Hopper.svg";
import WaterfallExplorer   from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/Waterfall Explorer.svg";
import NatureEscape        from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/Nature Escape.svg";
import NewYearNewPlaces    from "../../assets/TMA FINAL BADGES/Destination-Based Achievements/New Year New Places.svg";

// Frequency & Streak
import WeekendWanderer      from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Weekend Wanderer.svg";
import WeekendWarrior       from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Weekend Warrior.svg";
import TwelveMonthMomentum  from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/12 Month Momentum.svg";
import SeasonalExplorer     from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Seasonal Explorer.svg";
import AnnualTrailblazer    from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Annual Trailblazer.svg";
import AnniversaryAdventurer from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Anniversary Adventurer.svg";
import FrequentFlyerMonth   from "../../assets/TMA FINAL BADGES/Frequency & Streak Achievements/Frequent Flyer Month.svg";

// Timing & Seasonal
import MidweekMover   from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Midweek Mover.svg";
import FallExplorer   from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Fall Explorer.svg";
import SpringBreaker  from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Spring Breaker.svg";
import SummerExplorer from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Summer Explorer.svg";
import WinterWanderer from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Winter Wanderer.svg";
import HolidayTraveler from "../../assets/TMA FINAL BADGES/Timing & Seasonal Achievements/Timing & Seasonal Achievements/Holiday Traveler.svg";

// 7 Wonders
import GreatWallWanderer     from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Great Wall Wanderer.svg";
import PetraPathfinder       from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Petra Pathfinder.svg";
import RedeemerRidgeVisitor  from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Redeemer Ridge Visitor.svg";
import MachuPicchuExplorer   from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Machu Picchu Explorer.svg";
import ChichenItzaAdventurer from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Chichen Itza Adventurer.svg";
import ColosseumChallenger   from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Colosseum Challenger.svg";
import TajMahalTraveler      from "../../assets/TMA FINAL BADGES/7 Wonders of the World/Taj Mahal Traveler.svg";

const BADGE_IMAGES = {
  // Category icons
  cat_miles_traveled:        CatMilesTraveled,
  cat_states_visited:        CatStatesVisited,
  cat_countries_visited:     CatCountriesVisited,
  cat_first_time_milestones: CatFirstTimeMilestones,
  cat_distance_mileage:      CatDistanceMileage,
  cat_destination_based:     CatDestinationBased,
  cat_frequency_streak:      CatFrequencyStreak,
  cat_timing_seasonal:       CatTimingSeasonal,
  cat_wonders:               CatWonders,

  // Miles Travelled tiers
  miles_bronze:   MilesBronze,
  miles_silver:   MilesSilver,
  miles_gold:     MilesGold,
  miles_platinum: MilesPlatinum,
  miles_diamond:  MilesDiamond,
  miles_titan:    MilesTitan,

  // States Visited tiers
  states_bronze:   StatesBronze,
  states_silver:   StatesSilver,
  states_gold:     StatesGold,
  states_platinum: StatesPlatinum,
  states_diamond:  StatesDiamond,
  states_titan:    StatesTitan,

  // Countries Visited tiers
  countries_bronze:   CountriesBronze,
  countries_silver:   CountriesSilver,
  countries_gold:     CountriesGold,
  countries_platinum: CountriesPlatinum,
  countries_diamond:  CountriesDiamond,
  countries_titan:    CountriesTitan,

  // First-Time Milestones
  border_crosser:      BorderCrosser,
  first_flight:        FirstFlight,
  first_accommodation_stay: FirstAccommodation,
  first_logged_trip:   FirstLoggedTrip,
  road_trip_rookie:    RoadTripRookie,

  // Distance & Mileage
  distance_driver:       DistanceDriver,
  long_haul_traveler:    LongHaulTraveler,
  road_marathoner:       RoadMarathoner,
  mileage_master:        MileageMaster,
  cross_country_cruiser: CrossCountryCruiser,

  // Destination-Based
  capital_city_explorer: CapitalCityExplorer,
  city_breaker:          CityBreaker,
  cultural_explorer:     CulturalExplorer,
  island_hopper:         IslandHopper,
  waterfall_explorer:    WaterfallExplorer,
  nature_escape:         NatureEscape,
  new_year_new_places:   NewYearNewPlaces,

  // Frequency & Streak
  weekend_wanderer:       WeekendWanderer,
  weekend_warrior:        WeekendWarrior,
  twelve_month_momentum:  TwelveMonthMomentum,
  seasonal_explorer:      SeasonalExplorer,
  annual_trailblazer:     AnnualTrailblazer,
  anniversary_adventurer: AnniversaryAdventurer,
  frequent_flyer_month:   FrequentFlyerMonth,

  // Timing & Seasonal
  midweek_mover:   MidweekMover,
  fall_explorer:   FallExplorer,
  spring_breaker:  SpringBreaker,
  summer_explorer: SummerExplorer,
  winter_wanderer: WinterWanderer,
  holiday_traveler: HolidayTraveler,

  // 7 Wonders
  great_wall_wanderer:     GreatWallWanderer,
  petra_pathfinder:        PetraPathfinder,
  redeemer_ridge_visitor:  RedeemerRidgeVisitor,
  machu_picchu_explorer:   MachuPicchuExplorer,
  chichen_itza_adventurer: ChichenItzaAdventurer,
  colosseum_challenger:    ColosseumChallenger,
  taj_mahal_traveler:      TajMahalTraveler,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function BadgesScreen({ route }) {
  const { user } = useAuth();
  // stats optionally passed from HomeScreen for accurate totalMiles
  const passedStats = route?.params?.stats || null;

  const [loading, setLoading]   = useState(true);
  const [earnedSet, setEarned]  = useState(new Set());
  const [summary, setSummary]   = useState({ earned: 0, total: 0 });
  const [tieredData, setTiered] = useState({ miles: 0, states: 0, countries: 0 });

  useEffect(() => {
    if (!user) return;
    fetchAndEvaluate();
  }, [user]);

  async function fetchAndEvaluate() {
    setLoading(true);
    try {
      // ── 1. Fetch all trips ─────────────────────────────────────────────
      const tripsSnap = await getDocs(
        query(collection(db, "trips"), where("ownerId", "==", user.uid))
      );
      const allTrips = tripsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ── 2. Fetch destinations + accommodations for each trip ───────────
      const allLocations = [];
      let hasAccommodation  = false;
      const carRvTrips      = [];
      const flightsByMonth  = {};
      const countriesSet    = new Set();
      const statesSet       = new Set();

      const USA_NORMS = ["united states","usa","us","united states of america"];
      const isUSA = (c) => USA_NORMS.includes((c || "").toLowerCase().trim());

      for (const trip of allTrips) {
        // Main trip location
        if (trip.city && trip.country) {
          allLocations.push({
            city:    trip.city,
            country: trip.country,
            state:   trip.state,
            name:    trip.name || "",
          });
        }
        if (trip.country) countriesSet.add((trip.country).toLowerCase().trim());
        if (trip.state && isUSA(trip.country)) statesSet.add(trip.state.trim());

        // Flights by month
        if (trip.originTransportationType === "Airplane" && trip.startDate) {
          const key = trip.startDate.substring(0, 7);
          flightsByMonth[key] = (flightsByMonth[key] || 0) + 1;
        }

        // Car / RV per-trip miles
        if (
          (trip.originTransportationType === "Car" ||
            trip.originTransportationType === "RV") &&
          trip.totalMiles > 0
        ) {
          carRvTrips.push({ miles: trip.totalMiles, transport: trip.originTransportationType });
        }

        // Destinations subcollection
        const destSnap = await getDocs(
          collection(db, "trips", trip.id, "destinations")
        );
        destSnap.forEach((d) => {
          const dest = d.data();
          if (dest.city && dest.country) {
            allLocations.push({
              city:    dest.city,
              country: dest.country,
              state:   dest.state,
              name:    dest.name || "",
            });
          }
          if (dest.country) countriesSet.add((dest.country).toLowerCase().trim());
          if (dest.state && isUSA(dest.country)) statesSet.add(dest.state.trim());

          // Destinations used for driving distance (Car/RV)
          if (
            (dest.transportationType === "Car" ||
              dest.transportationType === "RV") &&
            dest.totalMiles > 0
          ) {
            carRvTrips.push({ miles: dest.totalMiles, transport: dest.transportationType });
          }

          // Flights from within trip
          if (dest.transportationType === "Airplane" && dest.startDate) {
            const key = dest.startDate.substring(0, 7);
            flightsByMonth[key] = (flightsByMonth[key] || 0) + 1;
          }
        });

        // Accommodations: check trip-level accommodationType field (matches web)
        // AND check accommodations subcollection
        if (!hasAccommodation) {
          if (trip.accommodationType && trip.accommodationType.trim() !== "") {
            hasAccommodation = true;
          } else {
            const accomSnap = await getDocs(
              collection(db, "trips", trip.id, "accommodations")
            );
            if (!accomSnap.empty) hasAccommodation = true;
          }
        }

        // Activities subcollection – add to allLocations for badge detection
        // (matches web behavior: activities checked for UNESCO, wonders, etc.)
        const actSnap = await getDocs(
          collection(db, "trips", trip.id, "activities")
        );
        actSnap.forEach((d) => {
          const act = d.data();
          if (act.city || act.name) {
            allLocations.push({
              city:    act.city    || "",
              country: act.country || trip.country || "",
              state:   act.state   || trip.state   || "",
              name:    act.name    || "",
            });
          }
        });
      }

      // ── 3. Resolve stats ──────────────────────────────────────────────
      // Priority:
      //  1. passedStats from navigation (when tapped from HomeScreen)
      //  2. users/{uid}.stats saved by web app (most accurate, cross-platform)
      //  3. Per-trip totalMiles saved by web app to each trip document
      let totalMiles    = passedStats?.totalMiles    ?? 0;
      let statesCount   = passedStats?.statesVisited  ?? statesSet.size;
      let countriesCount = passedStats?.countriesVisited ?? countriesSet.size;

      if (!passedStats?.totalMiles) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const userStats = userSnap.data()?.stats;
            if (userStats?.totalMiles)     totalMiles    = userStats.totalMiles;
            if (userStats?.statesVisited)  statesCount   = userStats.statesVisited;
            if (userStats?.countriesVisited) countriesCount = userStats.countriesVisited;
          }
        } catch (_) {}
        // Final fallback: sum per-trip totalMiles stored by web app
        if (!totalMiles) {
          totalMiles = allTrips.reduce((sum, t) => sum + (t.totalMiles || 0), 0);
        }
      }

      // ── 4. Evaluate ───────────────────────────────────────────────────
      const earned = evaluateBadges({
        trips: allTrips,
        allLocations,
        totalMiles,
        statesCount,
        countriesCount,
        hasAccommodation,
        carRvTrips,
        flightsByMonth,
      });

      setEarned(earned);
      setSummary(getBadgeSummary(earned));
      setTiered({ miles: totalMiles, states: statesCount, countries: countriesCount });
    } catch (err) {
      console.error("Badge evaluation error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Calculating your badges…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ── */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>My Badges</Text>
        <Text style={styles.headerSubtitle}>
          {summary.earned} of {summary.total} earned
        </Text>
        {/* Overall progress bar */}
        <View style={styles.overallProgressTrack}>
          <View
            style={[
              styles.overallProgressFill,
              { width: `${Math.round((summary.earned / summary.total) * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.headerPct}>
          {Math.round((summary.earned / summary.total) * 100)}% complete
        </Text>
      </View>

      {/* ── Categories ── */}
      {BADGE_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          earnedSet={earnedSet}
          tieredData={tieredData}
        />
      ))}

      <Text style={styles.footerNote}>
        Badges are awarded automatically based on your logged trips and travel activity.
      </Text>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY SECTION
// ─────────────────────────────────────────────────────────────────────────────

function CategorySection({ category, earnedSet, tieredData }) {
  const badges = ALL_BADGES.filter((b) => b.categoryId === category.id);
  const catEarned = badges.filter((b) => earnedSet.has(b.id)).length;

  const catImageKey = `cat_${category.id}`;
  const CatSvg      = BADGE_IMAGES[catImageKey];

  return (
    <View style={styles.categorySection}>
      {/* Category header */}
      <View style={[styles.categoryHeader, { backgroundColor: category.color }]}>
        {CatSvg && (
          <CatSvg width={styles.categoryIcon.width} height={styles.categoryIcon.height} />
        )}
        <View style={styles.categoryHeaderText}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryCount}>
            {catEarned}/{badges.length} earned
          </Text>
        </View>
      </View>

      {/* Tiered progress (Miles, States, Countries) */}
      {category.tiered && (
        <TieredProgress
          categoryId={category.id}
          category={category}
          value={
            category.id === "miles_traveled"    ? tieredData.miles    :
            category.id === "states_visited"    ? tieredData.states   :
            tieredData.countries
          }
          label={
            category.id === "miles_traveled"    ? "miles"    :
            category.id === "states_visited"    ? "states"   :
            "countries"
          }
        />
      )}

      {/* Badge grid */}
      <View style={styles.badgeGrid}>
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            category={category}
            earned={earnedSet.has(badge.id)}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIERED PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function TieredProgress({ categoryId, category, value, label }) {
  const { currentTier, nextTier, nextThreshold, progress } =
    getTieredProgress(categoryId, value);

  const tierObj = currentTier ? getTier(currentTier.tierId) : null;

  return (
    <View style={styles.tieredProgress}>
      <View style={styles.tieredProgressRow}>
        <Text style={styles.tieredCurrentLabel}>
          {tierObj ? (
            <Text style={{ color: tierObj.color, fontWeight: "700" }}>
              {tierObj.name}
            </Text>
          ) : (
            <Text style={{ color: COLORS.muted }}>No tier yet</Text>
          )}
          {"  "}
          <Text style={styles.tieredValueText}>
            {typeof value === "number" ? value.toLocaleString() : value} {label}
          </Text>
        </Text>
        {nextTier && (
          <Text style={styles.tieredNextLabel}>
            Next: {nextThreshold?.toLocaleString()} {label}
          </Text>
        )}
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width:           `${Math.round(progress * 100)}%`,
              backgroundColor: tierObj?.color || category.lightColor,
            },
          ]}
        />
      </View>
      {nextTier && (
        <Text style={styles.tieredNextHint}>
          {(nextThreshold - value).toLocaleString()} more {label} to{" "}
          {getTier(nextTier.tierId)?.name}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE CARD
// ─────────────────────────────────────────────────────────────────────────────

function BadgeCard({ badge, category, earned }) {
  const BadgeSvg = BADGE_IMAGES[badge.id];
  const tierObj  = badge.tierId ? getTier(badge.tierId) : null;

  return (
    <View style={styles.badgeCard}>
      <View style={styles.badgeImageWrapper}>
        {BadgeSvg ? (
          <BadgeSvg width="100%" height="100%" />
        ) : (
          <View
            style={[
              styles.badgeImagePlaceholder,
              { backgroundColor: earned ? category.color : COLORS.surfaceLight },
            ]}
          >
            <Text style={styles.badgeEmoji}>{badge.emoji || "🏆"}</Text>
          </View>
        )}
        {!earned && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockDimOverlay} />
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
        {earned && tierObj && (
          <View style={[styles.tierPill, { backgroundColor: tierObj.color }]}>
            <Text style={[styles.tierPillText, { color: tierObj.textColor }]}>
              {tierObj.name}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.badgeName, !earned && styles.badgeTextLocked]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      <Text
        style={[styles.badgeDesc, !earned && styles.badgeTextLocked]}
        numberOfLines={2}
      >
        {badge.description}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_SIZE = isTablet ? 140 : 100;
const COLS       = isTablet ? 4   : 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.xxl),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    gap: scaleSpacing(SPACING.md),
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(14),
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(16),
    padding: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.md),
    alignItems: "center",
  },
  headerTitle: {
    fontSize: scaleFontSize(24),
    fontWeight: "800",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  headerSubtitle: {
    fontSize: scaleFontSize(15),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  overallProgressTrack: {
    width: "100%",
    height: scaleFontSize(10),
    backgroundColor: COLORS.surfaceLight,
    borderRadius: scaleFontSize(5),
    overflow: "hidden",
    marginBottom: scaleSpacing(SPACING.xs),
  },
  overallProgressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: scaleFontSize(5),
  },
  headerPct: {
    fontSize: scaleFontSize(13),
    color: COLORS.primary,
    fontWeight: "600",
  },

  // ── Category Section ─────────────────────────────────────────────────────
  categorySection: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(16),
    marginBottom: scaleSpacing(SPACING.md),
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: scaleSpacing(SPACING.md),
    gap: scaleSpacing(SPACING.md),
  },
  categoryIcon: {
    width:  scaleFontSize(56),
    height: scaleFontSize(56),
    borderRadius: scaleFontSize(8),
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryName: {
    fontSize: scaleFontSize(16),
    fontWeight: "700",
    color: "#fff",
  },
  categoryCount: {
    fontSize: scaleFontSize(12),
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  // ── Tiered Progress ──────────────────────────────────────────────────────
  tieredProgress: {
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical:   scaleSpacing(SPACING.sm),
    backgroundColor:   COLORS.surfaceLight,
  },
  tieredProgressRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   scaleSpacing(SPACING.xs),
  },
  tieredCurrentLabel: {
    fontSize:  scaleFontSize(13),
    color:     COLORS.foreground,
    fontWeight:"600",
  },
  tieredValueText: {
    color:      COLORS.muted,
    fontWeight: "400",
  },
  tieredNextLabel: {
    fontSize: scaleFontSize(11),
    color:    COLORS.muted,
  },
  progressTrack: {
    height:          scaleFontSize(8),
    backgroundColor: COLORS.surface,
    borderRadius:    scaleFontSize(4),
    overflow:        "hidden",
    marginBottom:    scaleSpacing(SPACING.xs),
  },
  progressFill: {
    height:       "100%",
    borderRadius: scaleFontSize(4),
    minWidth:     4,
  },
  tieredNextHint: {
    fontSize: scaleFontSize(11),
    color:    COLORS.muted,
    textAlign:"right",
  },

  // ── Badge Grid ───────────────────────────────────────────────────────────
  badgeGrid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    padding:        scaleSpacing(SPACING.sm),
    gap:            scaleSpacing(SPACING.sm),
  },

  // ── Badge Card ───────────────────────────────────────────────────────────
  badgeCard: {
    width:           (BADGE_SIZE),
    alignItems:      "center",
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.xs),
  },
  badgeImageWrapper: {
    position:     "relative",
    width:        BADGE_SIZE,
    height:       BADGE_SIZE,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  badgeImage: {
    width:  "100%",
    height: "100%",
  },
  badgeImagePlaceholder: {
    width:        "100%",
    height:       "100%",
    borderRadius: scaleFontSize(12),
    justifyContent: "center",
    alignItems:     "center",
  },
  badgeEmoji: {
    fontSize: scaleFontSize(36),
  },
  lockOverlay: {
    position:       "absolute",
    top:            0,
    left:           0,
    right:          0,
    bottom:         0,
    justifyContent: "center",
    alignItems:     "center",
  },
  lockDimOverlay: {
    position:        "absolute",
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius:    scaleFontSize(8),
  },
  lockIcon: {
    fontSize: scaleFontSize(22),
  },
  tierPill: {
    position:     "absolute",
    bottom:       2,
    alignSelf:    "center",
    paddingHorizontal: scaleSpacing(SPACING.xs),
    paddingVertical:   2,
    borderRadius: scaleFontSize(8),
  },
  tierPillText: {
    fontSize:   scaleFontSize(9),
    fontWeight: "700",
  },
  badgeName: {
    fontSize:   scaleFontSize(11),
    fontWeight: "600",
    color:      COLORS.foreground,
    textAlign:  "center",
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize:  scaleFontSize(9),
    color:     COLORS.muted,
    textAlign: "center",
    lineHeight: scaleFontSize(12),
  },
  badgeTextLocked: {
    color: COLORS.muted,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footerNote: {
    fontSize:  scaleFontSize(11),
    color:     COLORS.muted,
    textAlign: "center",
    marginTop: scaleSpacing(SPACING.sm),
  },
});
