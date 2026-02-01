import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  addDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import Protected from "../components/Protected";
import SubscriptionRequiredModal from "../components/SubscriptionRequiredModal";
import {
  COLORS,
  SPACING,
  SCREENS,
  scaleFontSize,
  scaleSpacing,
  isTablet,
} from "../lib/constants";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const REVIEW_TYPES = [
  "All Types",
  "Destinations",
  "Activities",
  "Accommodations",
  "Restaurants",
  "Cruises",
];

function formatDateString(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) {
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString();
}

export default function GlobalReviewsScreen({ navigation }) {
  return (
    <Protected>
      <GlobalReviewsInner navigation={navigation} />
    </Protected>
  );
}

function GlobalReviewsInner({ navigation }) {
  const { user, profile } = useAuth();

  // Check subscription (must have valid status AND not expired)
  const subscription = profile?.subscription;
  const isSubscribed =
    (subscription?.status === "active" ||
      subscription?.status === "trialing") &&
    !subscription?.cancelAtPeriodEnd &&
    subscription?.currentPeriodEnd > Date.now();

  if (!isSubscribed) {
    return (
      <SubscriptionRequiredModal
        title="Global Reviews"
        description="Access to global reviews requires an active subscription."
        onSubscribe={() => navigation.navigate(SCREENS.SUBSCRIBE)}
        onBack={() => navigation.goBack()}
      />
    );
  }

  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedReview, setSelectedReview] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [addingReviewForPlace, setAddingReviewForPlace] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const tripsSnapshot = await getDocs(collection(db, "trips"));
      const reviews = [];

      for (const tripDoc of tripsSnapshot.docs) {
        const tripId = tripDoc.id;
        const tripData = tripDoc.data();
        const ownerId = tripData.ownerId || "";

        let ownerUsername;
        if (ownerId) {
          try {
            const userDoc = await getDoc(doc(db, "users", ownerId));
            if (userDoc.exists()) {
              ownerUsername = userDoc.data().username;
            }
          } catch (e) {
            console.error("Error fetching username:", e);
          }
        }

        const subcollections = [
          { name: "destinations", type: "Destinations" },
          { name: "activities", type: "Activities" },
          { name: "accommodations", type: "Accommodations" },
          { name: "restaurants", type: "Restaurants" },
          { name: "cruises", type: "Cruises" },
        ];

        for (const { name, type } of subcollections) {
          const snapshot = await getDocs(
            query(
              collection(db, "trips", tripId, name),
              orderBy("createdAt", "desc"),
            ),
          );

          for (const reviewDoc of snapshot.docs) {
            const data = reviewDoc.data();

            const mediaSnapshot = await getDocs(
              query(
                collection(db, "trips", tripId, "media"),
                where("linkedSubcollection", "==", name),
                where("linkedId", "==", reviewDoc.id),
              ),
            );

            const mediaItems = mediaSnapshot.docs.map((mediaDoc) => ({
              id: mediaDoc.id,
              ...mediaDoc.data(),
            }));

            const calculateOverallRating = () => {
              const ratings = [];
              if (data.qualityRating) ratings.push(data.qualityRating);
              if (data.valueRating) ratings.push(data.valueRating);
              if (data.serviceRating) ratings.push(data.serviceRating);
              if (data.locationRating) ratings.push(data.locationRating);
              if (ratings.length === 0) return 0;
              return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
            };

            reviews.push({
              id: reviewDoc.id,
              tripId,
              ownerId,
              ownerUsername,
              type,
              placeName: data.name || "Unnamed Place",
              city: data.city || "",
              state: data.state || null,
              country: data.country || "",
              address: data.address || null,
              phone: data.phoneNumber || null,
              websiteUrl: data.websiteUrl || null,
              notes: data.review || data.notes || null,
              visitDate: data.startDate || null,
              createdAt: data.createdAt || Date.now(),
              mediaItems,
              overallRating: calculateOverallRating(),
              qualityRating: data.qualityRating || 0,
              serviceRating: data.serviceRating || 0,
              valueRating: data.valueRating || 0,
              locationRating: data.locationRating || 0,
              cruiseLine: data.cruiseLine || undefined,
              shipName: data.shipName || undefined,
            });
          }
        }
      }

      reviews.sort((a, b) => b.createdAt - a.createdAt);
      setAllReviews(reviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueLocations = [
    "All Locations",
    ...Array.from(
      new Set(allReviews.map((r) => r.city).filter(Boolean)),
    ).sort(),
  ];

  const filteredReviews = allReviews.filter((review) => {
    const matchesType =
      selectedType === "All Types" || review.type === selectedType;
    const matchesLocation =
      selectedLocation === "All Locations" || review.city === selectedLocation;
    return matchesType && matchesLocation;
  });

  const visibleReviews = filteredReviews.slice(0, visibleCount);

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Text
        key={i}
        style={[styles.star, i < rating ? styles.starFilled : styles.starEmpty]}
      >
        ★
      </Text>
    ));
  };

  const handleDeleteReview = async (review) => {
    Alert.alert(
      "Delete Review",
      `Are you sure you want to delete your review for "${review.placeName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const subcollectionMap = {
                Destinations: "destinations",
                Activities: "activities",
                Accommodations: "accommodations",
                Restaurants: "restaurants",
                Cruises: "cruises",
              };
              const subcollection = subcollectionMap[review.type];
              await deleteDoc(
                doc(db, "trips", review.tripId, subcollection, review.id),
              );
              loadReviews();
            } catch (error) {
              Alert.alert("Error", "Failed to delete review.");
            }
          },
        },
      ],
    );
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
  };

  const handleAddReview = (review) => {
    setAddingReviewForPlace({
      placeName: review.placeName,
      city: review.city,
      country: review.country,
      type: review.type,
    });
  };

  const handleSaveEdit = async (updatedReview) => {
    try {
      const subcollectionMap = {
        Destinations: "destinations",
        Activities: "activities",
        Accommodations: "accommodations",
        Restaurants: "restaurants",
        Cruises: "cruises",
      };

      const subcollection = subcollectionMap[updatedReview.type];
      const reviewRef = doc(
        db,
        "trips",
        updatedReview.tripId,
        subcollection,
        updatedReview.id,
      );

      // Update the review document (include required fields for validation)
      const now = Date.now();
      await updateDoc(reviewRef, {
        name: updatedReview.placeName,
        city: updatedReview.city,
        country: updatedReview.country,
        review: updatedReview.notes,
        notes: updatedReview.notes,
        qualityRating: updatedReview.qualityRating,
        valueRating: updatedReview.valueRating,
        serviceRating: updatedReview.serviceRating,
        locationRating: updatedReview.locationRating,
        address: updatedReview.address || null,
        phoneNumber: updatedReview.phone || null,
        websiteUrl: updatedReview.websiteUrl || null,
        coverMediaId: updatedReview.coverMediaId || null,
        createdAt: updatedReview.createdAt,
        updatedAt: now,
      });

      // Update local state instead of reloading all reviews
      setAllReviews((prevReviews) =>
        prevReviews.map((r) =>
          r.id === updatedReview.id
            ? {
                ...r,
                ...updatedReview,
                updatedAt: now,
              }
            : r,
        ),
      );

      setEditingReview(null);
    } catch (error) {
      console.error("Error updating review:", error);
      Alert.alert("Error", "Failed to update review. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerIcon}>⭐</Text>
          <Text style={styles.headerTitle}>Global Reviews</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {/* Location Filter */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setShowLocationDropdown(!showLocationDropdown);
              setShowTypeDropdown(false);
            }}
          >
            <Text style={styles.filterButtonText}>{selectedLocation}</Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>

          {/* Type Filter */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowLocationDropdown(false);
            }}
          >
            <Text style={styles.filterButtonText}>{selectedType}</Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.resultCount}>
          Showing {Math.min(visibleCount, filteredReviews.length)} of{" "}
          {filteredReviews.length} reviews
        </Text>
      </View>

      {/* Filter Dropdowns */}
      {showLocationDropdown && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll}>
            {uniqueLocations.map((location) => (
              <TouchableOpacity
                key={location}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedLocation(location);
                  setShowLocationDropdown(false);
                  setVisibleCount(10);
                }}
              >
                <Text style={styles.dropdownItemText}>{location}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showTypeDropdown && (
        <View style={[styles.dropdown, styles.dropdownRight]}>
          {REVIEW_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedType(type);
                setShowTypeDropdown(false);
                setVisibleCount(10);
              }}
            >
              <Text style={styles.dropdownItemText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Reviews List */}
      <ScrollView
        style={styles.reviewsList}
        contentContainerStyle={styles.reviewsContent}
      >
        {filteredReviews.length === 0 ? (
          <Text style={styles.emptyText}>
            No reviews found matching your filters.
          </Text>
        ) : (
          <>
            {visibleReviews.map((review) => (
              <TouchableOpacity
                key={`${review.id}-${review.tripId}`}
                style={styles.reviewCard}
                onPress={() => setSelectedReview(review)}
              >
                <View style={styles.reviewRow}>
                  {/* Thumbnail */}
                  <View style={styles.thumbnailContainer}>
                    {review.mediaItems.length > 0 ? (
                      <Image
                        source={{ uri: review.mediaItems[0].downloadURL }}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Text style={styles.thumbnailIcon}>📷</Text>
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {review.placeName}
                      </Text>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{review.type}</Text>
                      </View>
                    </View>

                    {review.ownerUsername && (
                      <Text style={styles.ownerName}>
                        @{review.ownerUsername}
                      </Text>
                    )}

                    {/* Location with Map Link */}
                    <TouchableOpacity
                      style={styles.infoRow}
                      onPress={() => {
                        const destination = encodeURIComponent(
                          review.address ||
                            `${review.placeName}, ${review.city}, ${review.state || review.country}`,
                        );
                        Linking.openURL(
                          `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
                        );
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="rgba(255,255,255,0.7)"
                      />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {review.address ||
                          `${review.city}, ${review.state || review.country}`}
                      </Text>
                    </TouchableOpacity>

                    {/* Phone Number */}
                    {review.phone && (
                      <TouchableOpacity
                        style={styles.infoRow}
                        onPress={() =>
                          Linking.openURL(
                            `tel:${review.phone.replace(/[^\d+]/g, "")}`,
                          )
                        }
                      >
                        <Ionicons
                          name="call-outline"
                          size={16}
                          color="rgba(255,255,255,0.7)"
                        />
                        <Text style={styles.infoText}>{review.phone}</Text>
                      </TouchableOpacity>
                    )}

                    {/* Website URL */}
                    {review.websiteUrl && (
                      <TouchableOpacity
                        style={styles.infoRow}
                        onPress={() => {
                          const url = review.websiteUrl.startsWith("http")
                            ? review.websiteUrl
                            : `https://${review.websiteUrl}`;
                          Linking.openURL(url);
                        }}
                      >
                        <Ionicons
                          name="globe-outline"
                          size={16}
                          color="rgba(255,255,255,0.7)"
                        />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {review.websiteUrl}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {review.notes && (
                      <Text style={styles.reviewNotes} numberOfLines={2}>
                        "{review.notes}"
                      </Text>
                    )}

                    {/* Ratings */}
                    <View style={styles.ratingsGrid}>
                      {review.qualityRating > 0 && (
                        <View style={styles.ratingRow}>
                          <Text style={styles.ratingLabel}>Quality:</Text>
                          <View style={styles.starsRow}>
                            {renderStars(review.qualityRating)}
                          </View>
                        </View>
                      )}
                      {review.serviceRating > 0 && (
                        <View style={styles.ratingRow}>
                          <Text style={styles.ratingLabel}>Service:</Text>
                          <View style={styles.starsRow}>
                            {renderStars(review.serviceRating)}
                          </View>
                        </View>
                      )}
                      {review.valueRating > 0 && (
                        <View style={styles.ratingRow}>
                          <Text style={styles.ratingLabel}>Value:</Text>
                          <View style={styles.starsRow}>
                            {renderStars(review.valueRating)}
                          </View>
                        </View>
                      )}
                      {review.locationRating > 0 && (
                        <View style={styles.ratingRow}>
                          <Text style={styles.ratingLabel}>Location:</Text>
                          <View style={styles.starsRow}>
                            {renderStars(review.locationRating)}
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Footer */}
                    <View style={styles.reviewFooter}>
                      {review.visitDate && (
                        <View style={styles.dateRow}>
                          <Text style={styles.dateIcon}>📅</Text>
                          <Text style={styles.dateText}>
                            {formatDateString(review.visitDate)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.actionButtons}>
                        {user?.uid === review.ownerId && (
                          <>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleEditReview(review)}
                            >
                              <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeleteReview(review)}
                            >
                              <Text style={styles.deleteButtonText}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {user?.uid && (
                          <TouchableOpacity
                            style={styles.addReviewButton}
                            onPress={() => handleAddReview(review)}
                          >
                            <Text style={styles.addReviewButtonText}>
                              Add Your Review
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Load More */}
            {visibleCount < filteredReviews.length && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount((prev) => prev + 10)}
              >
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Review Detail Modal */}
      {selectedReview && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedReview(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedReview.placeName}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedReview.city}, {selectedReview.country}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedReview(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Overall Rating */}
                {selectedReview.overallRating > 0 && (
                  <View style={styles.modalRating}>
                    <View style={styles.starsRow}>
                      {renderStars(Math.round(selectedReview.overallRating))}
                    </View>
                    <Text style={styles.ratingNumber}>
                      {selectedReview.overallRating.toFixed(1)}
                    </Text>
                  </View>
                )}

                {/* Visit Date */}
                {selectedReview.visitDate && (
                  <Text style={styles.modalDate}>
                    Visited on {formatDateString(selectedReview.visitDate)}
                  </Text>
                )}

                {/* Phone Number */}
                {selectedReview.phone && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() =>
                      Linking.openURL(`tel:${selectedReview.phone}`)
                    }
                  >
                    <Ionicons
                      name="call-outline"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.contactText}>
                      {selectedReview.phone}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Website URL */}
                {selectedReview.websiteUrl && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => {
                      const url = selectedReview.websiteUrl.startsWith("http")
                        ? selectedReview.websiteUrl
                        : `https://${selectedReview.websiteUrl}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.contactText}>
                      {selectedReview.websiteUrl}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Notes */}
                {selectedReview.notes && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Review Notes</Text>
                    <Text style={styles.modalNotes}>
                      {selectedReview.notes}
                    </Text>
                  </View>
                )}

                {/* Photos */}
                {selectedReview.mediaItems.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      Photos ({selectedReview.mediaItems.length})
                    </Text>
                    <View style={styles.photosGrid}>
                      {selectedReview.mediaItems.map((media) => (
                        <Image
                          key={media.id}
                          source={{ uri: media.downloadURL }}
                          style={styles.photoThumbnail}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <EditReviewModal
          review={editingReview}
          onClose={() => setEditingReview(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Add Review Modal */}
      {addingReviewForPlace && user && (
        <AddReviewModal
          placeName={addingReviewForPlace.placeName}
          city={addingReviewForPlace.city}
          country={addingReviewForPlace.country}
          type={addingReviewForPlace.type}
          userId={user.uid}
          onClose={() => setAddingReviewForPlace(null)}
          onSave={async () => {
            setAddingReviewForPlace(null);
            await loadReviews();
          }}
        />
      )}
    </View>
  );
}

function EditReviewModal({ review, onClose, onSave }) {
  const [editedNotes, setEditedNotes] = useState(review.notes || "");
  const [editedAddress, setEditedAddress] = useState(review.address || "");
  const [editedPhone, setEditedPhone] = useState(review.phone || "");
  const [editedWebsite, setEditedWebsite] = useState(review.websiteUrl || "");
  const [qualityRating, setQualityRating] = useState(review.qualityRating || 0);
  const [serviceRating, setServiceRating] = useState(review.serviceRating || 0);
  const [valueRating, setValueRating] = useState(review.valueRating || 0);
  const [locationRating, setLocationRating] = useState(
    review.locationRating || 0,
  );
  const [saving, setSaving] = useState(false);

  // Photo management state
  const [existingMedia, setExistingMedia] = useState(review.mediaItems || []);
  const [newPhotos, setNewPhotos] = useState([]);
  const [coverMediaId, setCoverMediaId] = useState(
    review.coverMediaId || review.mediaItems[0]?.id || null,
  );
  const [newCoverIndex, setNewCoverIndex] = useState(null);

  const renderStars = (rating, onPress) => {
    return [...Array(5)].map((_, i) => (
      <TouchableOpacity key={i} onPress={() => onPress(i + 1)}>
        <Text
          style={[
            styles.star,
            i < rating ? styles.starFilled : styles.starEmpty,
          ]}
        >
          ★
        </Text>
      </TouchableOpacity>
    ));
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please grant permission to access your photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPhotos([...newPhotos, ...result.assets]);
    }
  };

  const removeExistingMedia = (mediaId) => {
    setExistingMedia(existingMedia.filter((m) => m.id !== mediaId));
    if (coverMediaId === mediaId) {
      const remaining = existingMedia.filter((m) => m.id !== mediaId);
      setCoverMediaId(remaining[0]?.id || null);
      setNewCoverIndex(null);
    }
  };

  const removeNewPhoto = (index) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
    if (newCoverIndex === index) {
      setNewCoverIndex(null);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const subcollectionMap = {
        Destinations: "destinations",
        Activities: "activities",
        Accommodations: "accommodations",
        Restaurants: "restaurants",
        Cruises: "cruises",
      };
      const subcollection = subcollectionMap[review.type];

      let finalCoverMediaId = coverMediaId;

      // Upload new photos
      for (let i = 0; i < newPhotos.length; i++) {
        const photo = newPhotos[i];
        const mediaRef = doc(collection(db, "trips", review.tripId, "media"));
        const mediaId = mediaRef.id;

        const filename = photo.uri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        const response = await fetch(photo.uri);
        const blob = await response.blob();

        const path = `trip_media/${review.ownerId}/${review.tripId}/${mediaId}/${filename}`;
        const sref = storageRef(storage, path);

        await uploadBytes(sref, blob, { contentType: type });
        const downloadURL = await getDownloadURL(sref);

        await setDoc(mediaRef, {
          tripId: review.tripId,
          type: "image",
          storagePath: path,
          downloadURL,
          createdAt: Date.now(),
          caption: `${review.type} • ${review.placeName}`,
          linkedSubcollection: subcollection,
          linkedId: review.id,
          fileName: filename,
          size: blob.size,
          contentType: type,
        });

        // If this new photo is marked as cover
        if (newCoverIndex === i) {
          finalCoverMediaId = mediaId;
        }

        // If no cover selected yet, use first uploaded image
        if (!finalCoverMediaId) {
          finalCoverMediaId = mediaId;
        }
      }

      // Delete removed existing media
      const removedMedia = review.mediaItems.filter(
        (m) => !existingMedia.find((em) => em.id === m.id),
      );
      for (const media of removedMedia) {
        try {
          if (media.storagePath) {
            await deleteObject(storageRef(storage, media.storagePath));
          }
          await deleteDoc(doc(db, "trips", review.tripId, "media", media.id));
        } catch (err) {
          console.error("Error deleting media:", err);
        }
      }

      const updatedReview = {
        ...review,
        notes: editedNotes,
        address: editedAddress,
        phone: editedPhone,
        websiteUrl: editedWebsite,
        qualityRating,
        serviceRating,
        valueRating,
        locationRating,
        coverMediaId: finalCoverMediaId,
      };

      await onSave(updatedReview);
    } catch (error) {
      console.error("Error saving review:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Edit Review</Text>
              <Text style={styles.modalSubtitle}>{review.placeName}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
          >
            {/* Review Notes */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Your Review</Text>
              <TextInput
                style={styles.editTextArea}
                value={editedNotes}
                onChangeText={setEditedNotes}
                multiline
                numberOfLines={5}
                placeholder="Share your experience..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>

            {/* Contact & Location Details */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Details</Text>

              <Text style={styles.editLabel}>Address</Text>
              <TextInput
                style={styles.editInput}
                value={editedAddress}
                onChangeText={setEditedAddress}
                placeholder="123 Main Street"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <Text style={styles.editLabel}>Phone Number</Text>
              <TextInput
                style={styles.editInput}
                value={editedPhone}
                onChangeText={setEditedPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="phone-pad"
              />

              <Text style={styles.editLabel}>Website</Text>
              <TextInput
                style={styles.editInput}
                value={editedWebsite}
                onChangeText={setEditedWebsite}
                placeholder="https://example.com"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Ratings */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Ratings</Text>

              <View style={styles.ratingInput}>
                <Text style={styles.editLabel}>Quality</Text>
                <View style={styles.starsRow}>
                  {renderStars(qualityRating, setQualityRating)}
                </View>
              </View>

              <View style={styles.ratingInput}>
                <Text style={styles.editLabel}>Service</Text>
                <View style={styles.starsRow}>
                  {renderStars(serviceRating, setServiceRating)}
                </View>
              </View>

              <View style={styles.ratingInput}>
                <Text style={styles.editLabel}>Value</Text>
                <View style={styles.starsRow}>
                  {renderStars(valueRating, setValueRating)}
                </View>
              </View>

              <View style={styles.ratingInput}>
                <Text style={styles.editLabel}>Location</Text>
                <View style={styles.starsRow}>
                  {renderStars(locationRating, setLocationRating)}
                </View>
              </View>
            </View>

            {/* Photos Section */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Photos</Text>

              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadButtonText}>📷 Add Photos</Text>
              </TouchableOpacity>

              {/* Existing Photos */}
              {existingMedia.length > 0 && (
                <View>
                  <Text style={styles.photoSubtitle}>Current Photos</Text>
                  <View style={styles.photosGrid}>
                    {existingMedia.map((media) => (
                      <View key={media.id} style={styles.photoItem}>
                        <Image
                          source={{ uri: media.downloadURL }}
                          style={styles.editPhotoThumbnail}
                        />
                        <View style={styles.photoOverlay}>
                          {media.type === "image" && (
                            <TouchableOpacity
                              style={[
                                styles.photoActionButton,
                                coverMediaId === media.id &&
                                  newCoverIndex === null &&
                                  styles.photoActionButtonActive,
                              ]}
                              onPress={() => {
                                setCoverMediaId(media.id);
                                setNewCoverIndex(null);
                              }}
                            >
                              <Text style={styles.photoActionText}>
                                {coverMediaId === media.id &&
                                newCoverIndex === null
                                  ? "✓ Cover"
                                  : "Set Cover"}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.photoActionButton,
                              styles.photoActionButtonDelete,
                            ]}
                            onPress={() => removeExistingMedia(media.id)}
                          >
                            <Text style={styles.photoActionText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* New Photos */}
              {newPhotos.length > 0 && (
                <View>
                  <Text style={styles.photoSubtitle}>New Photos</Text>
                  <View style={styles.photosGrid}>
                    {newPhotos.map((photo, index) => (
                      <View key={index} style={styles.photoItem}>
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.editPhotoThumbnail}
                        />
                        <View style={styles.photoOverlay}>
                          <TouchableOpacity
                            style={[
                              styles.photoActionButton,
                              newCoverIndex === index &&
                                styles.photoActionButtonActive,
                            ]}
                            onPress={() => {
                              setNewCoverIndex(index);
                              setCoverMediaId(null);
                            }}
                          >
                            <Text style={styles.photoActionText}>
                              {newCoverIndex === index
                                ? "✓ Cover"
                                : "Set Cover"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.photoActionButton,
                              styles.photoActionButtonDelete,
                            ]}
                            onPress={() => removeNewPhoto(index)}
                          >
                            <Text style={styles.photoActionText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons - Fixed at bottom */}
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editActionButton, styles.editCancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.editActionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editActionButton, styles.editSaveButton]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={styles.editActionButtonText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddReviewModal({
  placeName,
  city,
  country,
  type,
  userId,
  onClose,
  onSave,
}) {
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [qualityRating, setQualityRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [locationRating, setLocationRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setPhotos([...photos, ...result.assets]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      // Find or create a trip for this user to store the review
      const tripsSnapshot = await getDocs(
        query(collection(db, "trips"), where("ownerId", "==", userId)),
      );

      let tripId;

      if (tripsSnapshot.empty) {
        // Create a new trip for this user's reviews
        const newTripRef = doc(collection(db, "trips"));
        await setDoc(newTripRef, {
          ownerId: userId,
          name: "My Reviews",
          country: country,
          startDate: visitDate || new Date().toISOString().split("T")[0],
          endDate: visitDate || new Date().toISOString().split("T")[0],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        tripId = newTripRef.id;
      } else {
        // Use the first existing trip (or find one matching the country)
        let matchingTrip = null;
        for (const tripDoc of tripsSnapshot.docs) {
          const tripData = tripDoc.data();
          if (tripData.country === country) {
            matchingTrip = tripDoc;
            break;
          }
        }
        tripId = matchingTrip ? matchingTrip.id : tripsSnapshot.docs[0].id;
      }

      // Determine the subcollection based on review type
      const subcollectionMap = {
        Destinations: "destinations",
        Activities: "activities",
        Accommodations: "accommodations",
        Restaurants: "restaurants",
        Cruises: "cruises",
      };

      const subcollection = subcollectionMap[type];

      // Add the review to the appropriate subcollection
      const reviewDoc = await addDoc(
        collection(db, "trips", tripId, subcollection),
        {
          name: placeName,
          city: city,
          country: country,
          review: notes,
          notes: notes,
          qualityRating: qualityRating,
          serviceRating: serviceRating,
          valueRating: valueRating,
          locationRating: locationRating,
          startDate: visitDate || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      );

      // Upload photos if any
      if (photos.length > 0) {
        for (const photo of photos) {
          try {
            const response = await fetch(photo.uri);
            const blob = await response.blob();
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const photoRef = storageRef(
              storage,
              `trips/${tripId}/media/${filename}`,
            );
            await uploadBytes(photoRef, blob);
            const downloadURL = await getDownloadURL(photoRef);

            // Add photo to media subcollection
            await addDoc(collection(db, "trips", tripId, "media"), {
              downloadURL,
              storagePath: `trips/${tripId}/media/${filename}`,
              type: "image",
              linkedId: reviewDoc.id,
              linkedSubcollection: subcollection,
              ownerId: userId,
              tripId: tripId,
              createdAt: Date.now(),
            });
          } catch (photoError) {
            console.error("Error uploading photo:", photoError);
          }
        }
      }

      await onSave();
    } catch (error) {
      console.error("Error adding review:", error);
      Alert.alert("Error", "Failed to add review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderStarSelector = (rating, setRating, label) => (
    <View style={styles.addReviewRatingItem}>
      <Text style={styles.addReviewRatingLabel}>{label}</Text>
      <View style={styles.addReviewStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text
              style={[
                styles.addReviewStar,
                star <= rating && styles.addReviewStarFilled,
              ]}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.addReviewOverlay}>
        <View style={styles.addReviewContainer}>
          {/* Header */}
          <View style={styles.addReviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addReviewTitle}>Add Your Review</Text>
              <Text style={styles.addReviewPlaceName}>{placeName}</Text>
              <Text style={styles.addReviewLocation}>
                {city}, {country}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.addReviewCloseBtn}
            >
              <Text style={styles.addReviewCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.addReviewForm}>
            {/* Visit Date */}
            <View style={styles.addReviewField}>
              <Text style={styles.addReviewFieldLabel}>
                Visit Date (Optional)
              </Text>
              <TextInput
                style={styles.addReviewFieldInput}
                value={visitDate}
                onChangeText={setVisitDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>

            {/* Review Notes */}
            <View style={styles.addReviewField}>
              <Text style={styles.addReviewFieldLabel}>Your Review</Text>
              <TextInput
                style={[
                  styles.addReviewFieldInput,
                  { height: 120, textAlignVertical: "top" },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Share your experience..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={5}
              />
            </View>

            {/* Ratings */}
            <View style={styles.addReviewField}>
              <Text style={styles.addReviewRatingsTitle}>Ratings</Text>
              <View style={styles.addReviewRatingsGrid}>
                {renderStarSelector(qualityRating, setQualityRating, "Quality")}
                {renderStarSelector(serviceRating, setServiceRating, "Service")}
                {renderStarSelector(valueRating, setValueRating, "Value")}
                {renderStarSelector(
                  locationRating,
                  setLocationRating,
                  "Location",
                )}
              </View>
            </View>

            {/* Photos */}
            <View style={styles.addReviewField}>
              <Text style={styles.addReviewFieldLabel}>Photos (Optional)</Text>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={pickPhotos}
              >
                <Ionicons name="camera-outline" size={24} color="#66bfcc" />
                <Text style={styles.addPhotoButtonText}>Add Photos</Text>
              </TouchableOpacity>

              {photos.length > 0 && (
                <View style={styles.photoPreviewGrid}>
                  {photos.map((photo, index) => (
                    <View key={index} style={styles.photoPreviewItem}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoPreviewImage}
                      />
                      <TouchableOpacity
                        style={styles.photoRemoveButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#ff4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.addReviewFooter}>
            <TouchableOpacity
              style={[styles.addReviewFooterBtn, styles.addReviewCancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.addReviewCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addReviewFooterBtn, styles.addReviewSubmitButton]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={styles.addReviewSubmitBtnText}>
                {saving ? "Saving..." : "Add Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: scaleSpacing(SPACING.md),
    color: COLORS.muted,
    fontSize: scaleFontSize(16),
  },
  header: {
    backgroundColor: "#2c3e50",
    marginTop: 20,
    padding: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
    marginBottom: scaleSpacing(SPACING.md),
  },
  headerIcon: {
    fontSize: scaleFontSize(24),
    color: "#f4a261",
  },
  headerTitle: {
    fontSize: scaleFontSize(24),
    fontWeight: "bold",
    color: COLORS.white,
  },
  filtersRow: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
    marginBottom: scaleSpacing(SPACING.sm),
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3d5266",
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderRadius: isTablet ? 12 : 8,
  },
  filterButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
  },
  filterArrow: {
    color: COLORS.white,
    fontSize: scaleFontSize(10),
  },
  resultCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: scaleFontSize(12),
  },
  dropdown: {
    position: "absolute",
    top: isTablet ? 180 : 140,
    left: scaleSpacing(SPACING.md),
    right: scaleSpacing(SPACING.md),
    backgroundColor: "#2c3e50",
    borderRadius: isTablet ? 12 : 8,
    zIndex: 100,
    maxHeight: isTablet ? 300 : 200,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dropdownRight: {
    left: "50%",
  },
  dropdownScroll: {
    maxHeight: isTablet ? 300 : 200,
  },
  dropdownItem: {
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
  },
  dropdownItemText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
  },
  reviewsList: {
    flex: 1,
  },
  reviewsContent: {
    padding: scaleSpacing(SPACING.md),
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(16),
    textAlign: "center",
    paddingVertical: scaleSpacing(SPACING.xl),
  },
  reviewCard: {
    backgroundColor: "#3d5266",
    borderRadius: isTablet ? 16 : 12,
    marginBottom: scaleSpacing(SPACING.md),
    overflow: "hidden",
  },
  reviewRow: {
    flexDirection: "row",
  },
  thumbnailContainer: {
    width: isTablet ? 150 : 100,
    height: isTablet ? 150 : 100,
    backgroundColor: "#2c3e50",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailIcon: {
    fontSize: scaleFontSize(32),
    opacity: 0.3,
  },
  reviewContent: {
    flex: 1,
    padding: scaleSpacing(SPACING.sm),
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: scaleSpacing(SPACING.xs),
  },
  placeName: {
    flex: 1,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
    color: COLORS.white,
  },
  typeBadge: {
    backgroundColor: "#2c3e50",
    paddingVertical: isTablet ? 4 : 2,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    borderRadius: isTablet ? 6 : 4,
    marginLeft: scaleSpacing(SPACING.xs),
  },
  typeBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: scaleFontSize(10),
  },
  ownerName: {
    fontSize: scaleFontSize(12),
    color: "#66bfcc",
    fontWeight: "500",
    marginBottom: scaleSpacing(SPACING.xs),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(8),
    marginBottom: scaleSpacing(SPACING.xs),
  },
  infoText: {
    flex: 1,
    fontSize: scaleFontSize(12),
    color: "rgba(255,255,255,0.7)",
  },
  reviewNotes: {
    fontSize: scaleFontSize(12),
    color: "rgba(255,255,255,0.8)",
    fontStyle: "italic",
    marginBottom: scaleSpacing(SPACING.xs),
  },
  ratingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.xs),
  },
  ratingLabel: {
    fontSize: scaleFontSize(11),
    color: "rgba(255,255,255,0.9)",
  },
  starsRow: {
    flexDirection: "row",
  },
  star: {
    fontSize: scaleFontSize(12),
  },
  starFilled: {
    color: "#f4a261",
  },
  starEmpty: {
    color: "#888",
  },
  reviewFooter: {
    marginTop: scaleSpacing(SPACING.sm),
    paddingTop: scaleSpacing(SPACING.sm),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateIcon: {
    fontSize: scaleFontSize(12),
    marginRight: scaleSpacing(SPACING.xs),
  },
  dateText: {
    fontSize: scaleFontSize(11),
    color: "rgba(255,255,255,0.6)",
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: isTablet ? 6 : 4,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    borderRadius: isTablet ? 6 : 4,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(11),
    fontWeight: "500",
  },
  addReviewButton: {
    backgroundColor: "#66bfcc",
    paddingVertical: isTablet ? 8 : 6,
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderRadius: isTablet ? 6 : 4,
  },
  addReviewButtonText: {
    fontSize: scaleFontSize(11),
    color: COLORS.white,
    fontWeight: "600",
  },
  loadMoreButton: {
    backgroundColor: "#66bfcc",
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: isTablet ? 12 : 8,
    alignItems: "center",
    marginTop: scaleSpacing(SPACING.md),
  },
  loadMoreButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    padding: scaleSpacing(SPACING.md),
  },
  modalContent: {
    backgroundColor: "#2c3e50",
    borderRadius: isTablet ? 20 : 16,
    maxHeight: "90%",
    flex: 1,
    marginVertical: scaleSpacing(SPACING.xl),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: scaleSpacing(SPACING.lg),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: "bold",
    color: COLORS.white,
  },
  modalSubtitle: {
    fontSize: scaleFontSize(14),
    color: "rgba(255,255,255,0.7)",
    marginTop: scaleSpacing(SPACING.xs),
  },
  closeButton: {
    padding: scaleSpacing(SPACING.sm),
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(20),
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: scaleSpacing(SPACING.lg),
  },
  modalRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
    marginBottom: scaleSpacing(SPACING.md),
  },
  ratingNumber: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.white,
  },
  modalDate: {
    fontSize: scaleFontSize(14),
    color: "rgba(255,255,255,0.7)",
    marginBottom: scaleSpacing(SPACING.md),
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(8),
    marginBottom: scaleSpacing(SPACING.sm),
    paddingVertical: scaleSpacing(SPACING.xs),
  },
  contactText: {
    fontSize: scaleFontSize(14),
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
  },
  modalSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  modalSectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  modalNotes: {
    fontSize: scaleFontSize(14),
    color: "rgba(255,255,255,0.8)",
    lineHeight: scaleFontSize(22),
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
  },
  photoThumbnail: {
    width: isTablet ? 140 : 100,
    height: isTablet ? 140 : 100,
    borderRadius: isTablet ? 12 : 8,
    backgroundColor: "#3d5266",
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.xs),
  },
  editButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: isTablet ? 6 : 4,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    borderRadius: isTablet ? 6 : 4,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(11),
    fontWeight: "500",
  },
  editSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  editSectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: scaleSpacing(SPACING.md),
  },
  editLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: "500",
    color: COLORS.white,
    marginBottom: scaleSpacing(SPACING.xs),
    marginTop: scaleSpacing(SPACING.sm),
  },
  editInput: {
    backgroundColor: "#3d5266",
    borderRadius: isTablet ? 12 : 8,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  editTextArea: {
    backgroundColor: "#3d5266",
    borderRadius: isTablet ? 12 : 8,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minHeight: isTablet ? 150 : 100,
    textAlignVertical: "top",
  },
  ratingInput: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  uploadButton: {
    backgroundColor: "#3d5266",
    borderRadius: isTablet ? 12 : 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: scaleSpacing(SPACING.md),
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.md),
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  photoSubtitle: {
    fontSize: scaleFontSize(13),
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    marginBottom: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.sm),
  },
  photoItem: {
    width: isTablet ? 140 : 100,
    height: isTablet ? 140 : 100,
    position: "relative",
  },
  editPhotoThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: isTablet ? 12 : 8,
    backgroundColor: "#3d5266",
  },
  photoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: isTablet ? 12 : 8,
    justifyContent: "center",
    alignItems: "center",
    gap: isTablet ? 6 : 4,
  },
  photoActionButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: isTablet ? 6 : 4,
    paddingHorizontal: isTablet ? 12 : 8,
    borderRadius: isTablet ? 6 : 4,
  },
  photoActionButtonActive: {
    backgroundColor: "#22c55e",
  },
  photoActionButtonDelete: {
    backgroundColor: COLORS.error,
  },
  photoActionText: {
    color: COLORS.white,
    fontSize: scaleFontSize(10),
    fontWeight: "500",
  },
  editActions: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
    padding: scaleSpacing(SPACING.lg),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  editActionButton: {
    flex: 1,
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: isTablet ? 12 : 8,
    alignItems: "center",
  },
  editCancelButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  editSaveButton: {
    backgroundColor: "#66bfcc",
  },
  editActionButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  // Add Review Modal Styles
  addReviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: scaleSpacing(SPACING.sm),
  },
  addReviewContainer: {
    backgroundColor: "#2c3e50",
    borderRadius: isTablet ? 12 : 8,
    width: isTablet ? "85%" : "100%",
    maxHeight: "90%",
    overflow: "hidden",
  },
  addReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: scaleSpacing(SPACING.lg),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  addReviewTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: scaleSpacing(4),
  },
  addReviewPlaceName: {
    fontSize: scaleFontSize(14),
    color: "rgba(255,255,255,0.7)",
    marginTop: scaleSpacing(4),
  },
  addReviewLocation: {
    fontSize: scaleFontSize(12),
    color: "rgba(255,255,255,0.6)",
    marginTop: scaleSpacing(2),
  },
  addReviewCloseBtn: {
    padding: scaleSpacing(8),
  },
  addReviewCloseText: {
    fontSize: scaleFontSize(20),
    color: COLORS.white,
  },
  addReviewForm: {
    padding: scaleSpacing(SPACING.lg),
  },
  addReviewField: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  addReviewFieldLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
    color: COLORS.white,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  addReviewFieldInput: {
    backgroundColor: "#3d5266",
    color: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: isTablet ? 12 : 8,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
    fontSize: scaleFontSize(14),
  },
  addReviewRatingsTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: scaleSpacing(SPACING.md),
  },
  addReviewRatingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.md),
  },
  addReviewRatingItem: {
    width: isTablet ? "30%" : "47%",
    marginBottom: scaleSpacing(SPACING.sm),
  },
  addReviewRatingLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
    color: COLORS.white,
    marginBottom: scaleSpacing(4),
  },
  addReviewStars: {
    flexDirection: "row",
    gap: scaleSpacing(4),
  },
  addReviewStar: {
    fontSize: scaleFontSize(24),
    color: "#888",
  },
  addReviewStarFilled: {
    color: "#f4a261",
  },
  addReviewFooter: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
    padding: scaleSpacing(SPACING.lg),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  addReviewFooterBtn: {
    flex: 1,
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: isTablet ? 12 : 8,
    alignItems: "center",
  },
  addReviewCancelButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  addReviewCancelBtnText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
  },
  addReviewSubmitButton: {
    backgroundColor: "#66bfcc",
  },
  addReviewSubmitBtnText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(102, 191, 204, 0.1)",
    borderWidth: 1,
    borderColor: "#66bfcc",
    borderRadius: isTablet ? 12 : 8,
    padding: scaleSpacing(SPACING.md),
    gap: scaleSpacing(SPACING.xs),
    marginTop: scaleSpacing(SPACING.xs),
  },
  addPhotoButtonText: {
    color: "#66bfcc",
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  photoPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.sm),
  },
  photoPreviewItem: {
    width: isTablet ? 150 : 100,
    height: isTablet ? 150 : 100,
    position: "relative",
  },
  photoPreviewImage: {
    width: "100%",
    height: "100%",
    borderRadius: isTablet ? 12 : 8,
  },
  photoRemoveButton: {
    position: "absolute",
    top: isTablet ? -10 : -8,
    right: isTablet ? -10 : -8,
    backgroundColor: COLORS.white,
    borderRadius: isTablet ? 16 : 12,
  },
});
