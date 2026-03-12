import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  orderBy,
  query,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import TripDetailMap from "../components/TripDetailMap";
import { COLORS, SPACING } from "../lib/constants";
import { dateRangeOf } from "../lib/utils";

const { width, height } = Dimensions.get("window");

// Helper to convert timestamps to milliseconds (handles both number and Firestore Timestamp)
function getMillis(t) {
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t === "object" && typeof t.seconds === "number") {
    return t.seconds * 1000 + (t.nanoseconds ? t.nanoseconds / 1e6 : 0);
  }
  return 0;
}

export default function TripDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tripId } = route.params;

  const [trip, setTrip] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subcollections
  const [destinations, setDestinations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [cruises, setCruises] = useState([]);
  const [extras, setExtras] = useState([]);

  // Modals
  const [editingCaption, setEditingCaption] = useState(null);
  const [showFlipbook, setShowFlipbook] = useState(false);
  const [flipbookIndex, setFlipbookIndex] = useState(0);
  const [selectedItemPhotos, setSelectedItemPhotos] = useState(null);

  // Cover image positioning
  const [coverPosY, setCoverPosY] = useState(50);

  // Listen to trip document
  useEffect(() => {
    if (!tripId || !user) return;

    const tripRef = doc(db, "trips", tripId);
    const unsubTrip = onSnapshot(
      tripRef,
      (snap) => {
        if (!snap.exists()) {
          setError("Trip not found");
          setLoading(false);
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        if (data.ownerId !== user.uid) {
          setError("You don't have permission to view this trip");
          setLoading(false);
          return;
        }

        setTrip(data);
        if (data.coverPositionY !== undefined) {
          setCoverPosY(data.coverPositionY);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubTrip();
  }, [tripId, user]);

  // Listen to media subcollection
  useEffect(() => {
    if (!tripId) return;

    const mediaQuery = query(
      collection(db, "trips", tripId, "media"),
      orderBy("createdAt", "desc")
    );

    const unsubMedia = onSnapshot(mediaQuery, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setMedia(arr);
    });

    return () => unsubMedia();
  }, [tripId]);

  // Listen to subcollections
  useEffect(() => {
    if (!tripId) return;

    const unsubDest = onSnapshot(
      query(
        collection(db, "trips", tripId, "destinations"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setDestinations(arr);
      }
    );

    const unsubAct = onSnapshot(
      query(
        collection(db, "trips", tripId, "activities"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setActivities(arr);
      }
    );

    const unsubAcc = onSnapshot(
      query(
        collection(db, "trips", tripId, "accommodations"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setAccommodations(arr);
      }
    );

    const unsubRest = onSnapshot(
      query(
        collection(db, "trips", tripId, "restaurants"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setRestaurants(arr);
      }
    );

    const unsubCruise = onSnapshot(
      query(
        collection(db, "trips", tripId, "cruises"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setCruises(arr);
      }
    );

    const unsubExtras = onSnapshot(
      query(
        collection(db, "trips", tripId, "extras"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setExtras(arr);
      }
    );

    return () => {
      unsubDest();
      unsubAct();
      unsubAcc();
      unsubRest();
      unsubCruise();
      unsubExtras();
    };
  }, [tripId]);

  const coverMedia = trip
    ? media.find((m) => m.id === trip.coverMediaId)
    : null;

  // Sort chronologically by takenAt (if available) or createdAt - oldest first
  // Use document ID as tiebreaker for stable sort when timestamps are equal
  const sortedMedia = [...media]
    .filter((m) => m.type === "image" || m.type === "video")
    .sort((a, b) => {
      const aWhen = getMillis(a.takenAt ?? a.createdAt);
      const bWhen = getMillis(b.takenAt ?? b.createdAt);
      if (aWhen !== bWhen) return aWhen - bWhen;
      // Stable sort: use ID as tiebreaker
      return (a.id || "").localeCompare(b.id || "");
    });

  async function setCover(mediaId) {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), {
      coverMediaId: mediaId,
      updatedAt: Date.now(),
    });
  }

  async function saveCaption(mediaId, caption) {
    await updateDoc(doc(db, "trips", tripId, "media", mediaId), { caption });
  }

  async function deleteMedia(mediaId) {
    Alert.alert("Delete Media", "Are you sure you want to delete this media?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "trips", tripId, "media", mediaId));
        },
      },
    ]);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (match) return `${match[2]}/${match[3]}/${match[1]}`;
    return dateStr;
  }

  function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  async function deleteExtra(extraId) {
    Alert.alert("Delete Extra", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "trips", tripId, "extras", extraId));
        },
      },
    ]);
  }

  async function handleViewPhotos(itemId, subcollection) {
    const itemMedia = media.filter(
      (m) => m.linkedId === itemId && m.linkedSubcollection === subcollection
    );
    setSelectedItemPhotos({ media: itemMedia, index: 0 });
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trip) return null;

  const locationStr = [trip.city, trip.state, trip.country]
    .filter(Boolean)
    .join(", ");

  const itinerary = [
    ...destinations.map((d) => ({
      kind: "Destination",
      subcollection: "destinations",
      data: d,
    })),
    ...activities.map((d) => ({
      kind: "Activity",
      subcollection: "activities",
      data: d,
    })),
    ...accommodations.map((d) => ({
      kind: "Accommodation",
      subcollection: "accommodations",
      data: d,
    })),
    ...restaurants.map((d) => ({
      kind: "Restaurant",
      subcollection: "restaurants",
      data: d,
    })),
    ...cruises.map((d) => ({ kind: "Cruise", subcollection: "cruises", data: d })),
  ].sort((a, b) => {
    const aDate = a.data.startDate
      ? new Date(a.data.startDate).getTime()
      : 0;
    const bDate = b.data.startDate
      ? new Date(b.data.startDate).getTime()
      : 0;
    return aDate - bDate;
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {coverMedia?.type === "image" ? (
            <Image
              source={{ uri: coverMedia.downloadURL }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : coverMedia?.type === "video" ? (
            <View style={styles.videoCover}>
              <Text style={styles.videoIcon}>▶</Text>
            </View>
          ) : (
            <View style={styles.noCover}>
              <Text style={styles.noCoverText}>No cover photo</Text>
            </View>
          )}
        </View>

        {/* Trip Header */}
        <View style={styles.header}>
          <Text style={styles.tripName}>{trip.name}</Text>
          <Text style={styles.location}>{locationStr}</Text>
          <Text style={styles.dates}>{dateRangeOf(trip)}</Text>

          {trip.originCity && (
            <Text style={styles.originText}>
              From {trip.originCity}
              {trip.originState ? `, ${trip.originState}` : ""}
              {trip.originCountry ? `, ${trip.originCountry}` : ""}
            </Text>
          )}

          {trip.totalMiles !== null && trip.totalMiles !== undefined && (
            <Text style={styles.milesText}>
              {trip.totalMiles.toLocaleString()} miles traveled
            </Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowFlipbook(true)}
            >
              <Text style={styles.primaryButtonText}>Open Flipbook</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        {trip.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{trip.description}</Text>
          </View>
        )}

        {/* Trip Detail Map */}
        <View style={styles.section}>
          <TripDetailMap
            trip={trip}
            destinations={destinations}
            activities={activities}
            restaurants={restaurants}
          />
        </View>

        {/* Photos Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photosGrid}>
            {sortedMedia.map((m, index) => (
              <View key={m.id} style={styles.photoCard}>
                <TouchableOpacity
                  onPress={() => {
                    setFlipbookIndex(index);
                    setShowFlipbook(true);
                  }}
                >
                  {m.type === "image" ? (
                    <Image
                      source={{ uri: m.downloadURL }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.videoThumbnail}>
                      <Text style={styles.videoIcon}>▶</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.photoActions}>
                  <TouchableOpacity onPress={() => setCover(m.id)}>
                    <Text style={styles.photoActionText}>
                      {trip.coverMediaId === m.id ? "✓ Cover" : "Set as cover"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMedia(m.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.captionInput}
                  value={
                    editingCaption?.id === m.id ? editingCaption.text : m.caption || ""
                  }
                  onChangeText={(text) =>
                    setEditingCaption({ id: m.id, text })
                  }
                  onBlur={() => {
                    if (editingCaption?.id === m.id) {
                      saveCaption(m.id, editingCaption.text);
                      setEditingCaption(null);
                    }
                  }}
                  placeholder="Add a caption..."
                  placeholderTextColor={COLORS.muted}
                  multiline
                />
              </View>
            ))}
          </View>
          {sortedMedia.length === 0 && (
            <Text style={styles.emptyText}>No photos yet</Text>
          )}
        </View>

        {/* Itinerary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinerary</Text>
          {itinerary.map((row, i) => (
            <View key={i} style={styles.itineraryItem}>
              <View style={styles.itineraryHeader}>
                <Text style={styles.itineraryKind}>{row.kind}</Text>
                {row.subcollection !== "trip" && (
                  <TouchableOpacity
                    onPress={() =>
                      handleViewPhotos(row.data.id, row.subcollection)
                    }
                  >
                    <Text style={styles.viewPhotosLink}>View Photos</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.itineraryName}>{row.data.name}</Text>
              <Text style={styles.itineraryDates}>
                {formatDate(row.data.startDate)}
                {row.data.endDate
                  ? ` → ${formatDate(row.data.endDate)}`
                  : ""}
              </Text>
              {row.data.city && (
                <Text style={styles.itineraryLocation}>
                  {[row.data.city, row.data.state, row.data.country]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              )}
            </View>
          ))}
          {itinerary.length === 0 && (
            <Text style={styles.emptyText}>No itinerary entries yet</Text>
          )}
        </View>

        {/* Destinations */}
        <PlaceSection
          title="Destinations"
          items={destinations}
          subcollection="destinations"
          onViewPhotos={handleViewPhotos}
          formatDate={formatDate}
          formatPhone={formatPhoneNumber}
        />

        {/* Activities */}
        <PlaceSection
          title="Activities"
          items={activities}
          subcollection="activities"
          onViewPhotos={handleViewPhotos}
          formatDate={formatDate}
          formatPhone={formatPhoneNumber}
        />

        {/* Accommodations */}
        <PlaceSection
          title="Accommodations"
          items={accommodations}
          subcollection="accommodations"
          onViewPhotos={handleViewPhotos}
          formatDate={formatDate}
          formatPhone={formatPhoneNumber}
        />

        {/* Restaurants */}
        <PlaceSection
          title="Restaurants"
          items={restaurants}
          subcollection="restaurants"
          onViewPhotos={handleViewPhotos}
          formatDate={formatDate}
          formatPhone={formatPhoneNumber}
        />

        {/* Cruises */}
        <PlaceSection
          title="Cruises"
          items={cruises}
          subcollection="cruises"
          onViewPhotos={handleViewPhotos}
          formatDate={formatDate}
          formatPhone={formatPhoneNumber}
        />

        {/* Extras / Others */}
        <ExtrasSection
          items={extras}
          formatDate={formatDate}
          onDelete={deleteExtra}
        />
      </ScrollView>

      {/* Flipbook Modal */}
      {showFlipbook && (
        <FlipbookModal
          media={sortedMedia}
          initialIndex={flipbookIndex}
          onClose={() => setShowFlipbook(false)}
        />
      )}

      {/* Item Photos Modal */}
      {selectedItemPhotos && (
        <FlipbookModal
          media={selectedItemPhotos.media}
          initialIndex={selectedItemPhotos.index}
          onClose={() => setSelectedItemPhotos(null)}
        />
      )}
    </View>
  );
}

function PlaceSection({
  title,
  items,
  subcollection,
  onViewPhotos,
  formatDate,
  formatPhone,
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <PlaceCard
          key={item.id}
          item={item}
          subcollection={subcollection}
          onViewPhotos={onViewPhotos}
          formatDate={formatDate}
          formatPhone={formatPhone}
        />
      ))}
    </View>
  );
}

function PlaceCard({
  item,
  subcollection,
  onViewPhotos,
  formatDate,
  formatPhone,
}) {
  const location = item.onShip
    ? "On Ship"
    : [item.address, item.city, item.state, item.country]
        .filter(Boolean)
        .join(", ");

  return (
    <View style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.placeName}>{item.name}</Text>
          {item.cruiseLine && (
            <Text style={styles.placeSubtitle}>{item.cruiseLine}</Text>
          )}
          {item.shipName && (
            <Text style={styles.placeSubtitle}>{item.shipName}</Text>
          )}
          <Text style={styles.placeLocation}>
            {formatDate(item.startDate)}
            {item.endDate ? ` → ${formatDate(item.endDate)}` : ""}
            {location && ` • ${location}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onViewPhotos(item.id, subcollection)}>
          <Text style={styles.viewPhotosLink}>View Photos</Text>
        </TouchableOpacity>
      </View>

      {item.transportationMode && (
        <Text style={styles.placeDetail}>
          Transport: {item.transportationMode}
        </Text>
      )}

      {item.phoneNumber && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phoneNumber}`)}>
          <Text style={styles.placeDetailLink}>
            Phone: {formatPhone(item.phoneNumber)}
          </Text>
        </TouchableOpacity>
      )}

      {item.websiteUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(item.websiteUrl)}>
          <Text style={styles.placeDetailLink} numberOfLines={1}>
            Website: {item.websiteUrl}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ratings */}
      {(item.qualityRating ||
        item.valueRating ||
        item.serviceRating ||
        item.locationRating ||
        item.foodRating ||
        item.entertainmentRating) && (
        <View style={styles.ratingsContainer}>
          {item.qualityRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Quality:</Text>
              <StarRating rating={item.qualityRating} />
            </View>
          )}
          {item.valueRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Value:</Text>
              <StarRating rating={item.valueRating} />
            </View>
          )}
          {item.serviceRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Service:</Text>
              <StarRating rating={item.serviceRating} />
            </View>
          )}
          {item.locationRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Location:</Text>
              <StarRating rating={item.locationRating} />
            </View>
          )}
          {item.foodRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Food:</Text>
              <StarRating rating={item.foodRating} />
            </View>
          )}
          {item.entertainmentRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Entertainment:</Text>
              <StarRating rating={item.entertainmentRating} />
            </View>
          )}
        </View>
      )}

      {item.notes && (
        <View style={styles.textBlock}>
          <Text style={styles.textBlockLabel}>Notes:</Text>
          <Text style={styles.textBlockContent}>{item.notes}</Text>
        </View>
      )}

      {item.review && (
        <View style={styles.textBlock}>
          <Text style={styles.textBlockLabel}>Review:</Text>
          <Text style={styles.textBlockContent}>{item.review}</Text>
        </View>
      )}
    </View>
  );
}

const EXTRA_TYPE_LABELS = {
  insurance: "Travel Insurance",
  rental_car: "Car Rental",
  esim: "eSIM",
  parking: "Parking",
  tour: "Tour",
  transfer: "Transfer",
  visa: "Visa",
  flight: "Flight",
  other: "Other",
};

function ExtrasSection({ items, formatDate, onDelete }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Others</Text>
      {items.map((item) => (
        <ExtraCard
          key={item.id}
          item={item}
          formatDate={formatDate}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </View>
  );
}

function ExtraCard({ item, formatDate, onDelete }) {
  const typeLabel =
    EXTRA_TYPE_LABELS[item.extraType] ||
    (item.extraType
      ? item.extraType.charAt(0).toUpperCase() + item.extraType.slice(1)
      : "Other");

  const dateStr = item.startDate
    ? item.endDate && item.endDate !== item.startDate
      ? `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`
      : formatDate(item.startDate)
    : null;

  const locationStr = [item.city, item.state, item.country]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.extraTypeBadge}>
            <Text style={styles.extraTypeBadgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.placeName}>{item.name}</Text>
          {item.provider ? (
            <Text style={styles.placeSubtitle}>{item.provider}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {dateStr ? (
        <Text style={styles.placeDetail}>📅 {dateStr}</Text>
      ) : null}
      {locationStr ? (
        <Text style={styles.placeDetail}>📍 {locationStr}</Text>
      ) : null}
      {item.confirmationNumber ? (
        <Text style={styles.placeDetail}>🔖 Confirmation: {item.confirmationNumber}</Text>
      ) : null}
      {item.amount ? (
        <Text style={styles.placeDetail}>💳 {item.amount}</Text>
      ) : null}
      {item.websiteUrl ? (
        <TouchableOpacity onPress={() => Linking.openURL(item.websiteUrl)}>
          <Text style={styles.placeDetailLink} numberOfLines={1}>
            Website: {item.websiteUrl}
          </Text>
        </TouchableOpacity>
      ) : null}
      {item.notes ? (
        <View style={styles.textBlock}>
          <Text style={styles.textBlockLabel}>Notes:</Text>
          <Text style={styles.textBlockContent}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StarRating({ rating }) {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={[
            styles.star,
            star <= rating ? styles.starFilled : styles.starEmpty,
          ]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

function FlipbookModal({ media, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  if (media.length === 0) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.flipbookContainer}>
          <View style={styles.flipbookHeader}>
            <Text style={styles.flipbookTitle}>No media</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.flipbookClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flipbookContent}>
            <Text style={styles.noMediaText}>No media available</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const currentMedia = media[currentIndex];

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.flipbookContainer}>
        <View style={styles.flipbookHeader}>
          <Text style={styles.flipbookTitle}>
            {currentIndex + 1} / {media.length}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.flipbookClose}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.flipbookContent}>
          {currentMedia.type === "image" ? (
            <Image
              source={{ uri: currentMedia.downloadURL }}
              style={styles.flipbookImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>▶</Text>
              <Text style={styles.videoText}>Video playback</Text>
            </View>
          )}

          {media.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.flipbookNav, styles.flipbookNavLeft]}
                onPress={handlePrev}
              >
                <Text style={styles.flipbookNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.flipbookNav, styles.flipbookNavRight]}
                onPress={handleNext}
              >
                <Text style={styles.flipbookNavText}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {currentMedia.caption && (
          <View style={styles.flipbookCaption}>
            <Text style={styles.flipbookCaptionText}>
              {currentMedia.caption}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  coverContainer: {
    width: "100%",
    height: 300,
    backgroundColor: COLORS.surfaceLight,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  videoCover: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  noCover: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  noCoverText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  videoIcon: {
    fontSize: 48,
    color: COLORS.white,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  tripName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  location: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  dates: {
    fontSize: 14,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  originText: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  milesText: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
  },
  photosGrid: {
    gap: SPACING.md,
  },
  photoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  photoImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  videoThumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  photoActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  photoActionText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  deleteText: {
    fontSize: 12,
    color: COLORS.error,
  },
  captionInput: {
    fontSize: 14,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: SPACING.xs,
    marginTop: SPACING.xs,
    minHeight: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    paddingVertical: SPACING.lg,
  },
  itineraryItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itineraryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  itineraryKind: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  viewPhotosLink: {
    fontSize: 12,
    color: COLORS.primary,
  },
  itineraryName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  itineraryDates: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  itineraryLocation: {
    fontSize: 12,
    color: COLORS.muted,
  },
  placeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  placeSubtitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  placeLocation: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  placeDetail: {
    fontSize: 12,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  placeDetailLink: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  ratingsContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.muted,
    width: 90,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  starFilled: {
    color: "#FFD700",
  },
  starEmpty: {
    color: "#D1D5DB",
  },
  extraTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.xs,
  },
  extraTypeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  textBlock: {
    marginTop: SPACING.sm,
  },
  textBlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  textBlockContent: {
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
  },
  flipbookContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  flipbookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  flipbookTitle: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "600",
  },
  flipbookClose: {
    fontSize: 16,
    color: COLORS.white,
  },
  flipbookContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flipbookImage: {
    width: width,
    height: height - 200,
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  noMediaText: {
    color: COLORS.white,
    fontSize: 16,
  },
  flipbookNav: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  flipbookNavLeft: {
    left: SPACING.md,
  },
  flipbookNavRight: {
    right: SPACING.md,
  },
  flipbookNavText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: "bold",
  },
  flipbookCaption: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  flipbookCaptionText: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: "center",
  },
});
