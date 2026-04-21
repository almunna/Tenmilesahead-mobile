import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../AuthProvider";
import ModalShell from "./ModalShell";
import Dropdown from "../Dropdown";
import DatePicker from "../DatePicker";
import { COLORS, SPACING, scaleFontSize, scaleSpacing, API_BASE_URL } from "../../lib/constants";

const TRANSPORT_OPTIONS = [
  "Airplane",
  "Bus",
  "Car",
  "Cruise",
  "RV",
  "Train",
  "Uber/Taxi",
  "Walk",
];

// Cruise line data (simplified - you can expand this)
const CRUISE_LINES = [
  "Carnival Cruise Line",
  "Royal Caribbean International",
  "Norwegian Cruise Line",
  "Disney Cruise Line",
  "Princess Cruises",
  "Holland America Line",
  "Celebrity Cruises",
  "MSC Cruises",
  "Costa Cruises",
  "Viking Ocean Cruises",
  "Other",
].sort();

const OTHER_CRUISE_LINE = "Other";

export default function AddTripModal({ visible, onClose, onCreated }) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    originCity: "",
    originState: "",
    originCountry: "",
    originAddress: "",
    originTransportationType: "",
    cruiseLine: "",
    cruiseShip: "",
    customCruiseLine: "",
    customCruiseShip: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  // Cruise review state
  const [cruiseReview, setCruiseReview] = useState({
    review: "",
    qualityRating: null,
    valueRating: null,
    serviceRating: null,
    foodRating: null,
    entertainmentRating: null,
  });

  // Media state
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [captions, setCaptions] = useState({});
  const [coverIndex, setCoverIndex] = useState(null);

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressLoading, setAddressLoading]         = useState(false);
  const searchTimer = useRef(null);

  const isCruise = form.originTransportationType === "Cruise";
  const cruiseLineValue =
    form.cruiseLine === OTHER_CRUISE_LINE
      ? form.customCruiseLine
      : form.cruiseLine;
  const cruiseShipValue = form.customCruiseShip || form.cruiseShip;
  const isCruiseComplete =
    !isCruise || (!!cruiseLineValue && !!cruiseShipValue);

  const canCreate =
    !!form.name && isCruiseComplete && !!form.startDate && !!form.endDate;

  const allMedia = [...photos, ...videos];

  // Set first photo as cover by default
  useEffect(() => {
    if (photos.length > 0 && coverIndex === null) {
      setCoverIndex(0);
    } else if (photos.length === 0) {
      setCoverIndex(null);
    }
  }, [photos, coverIndex]);

  function resetForm() {
    setForm({
      name: "",
      originCity: "",
      originState: "",
      originCountry: "",
      originAddress: "",
      originTransportationType: "",
      cruiseLine: "",
      cruiseShip: "",
      customCruiseLine: "",
      customCruiseShip: "",
      startDate: "",
      endDate: "",
      description: "",
    });
    setCruiseReview({
      review: "",
      qualityRating: null,
      valueRating: null,
      serviceRating: null,
      foodRating: null,
      entertainmentRating: null,
    });
    setPhotos([]);
    setVideos([]);
    setCaptions({});
    setCoverIndex(null);
  }

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant photo library permissions to upload photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.filter((asset) =>
        asset.type === "image"
      );
      const newVideos = result.assets.filter((asset) =>
        asset.type === "video"
      );
      setPhotos((prev) => [...prev, ...newPhotos]);
      setVideos((prev) => [...prev, ...newVideos]);
    }
  }

  function removeMedia(index) {
    const media = allMedia[index];
    const isPhoto = photos.includes(media);

    if (isPhoto) {
      setPhotos((prev) => prev.filter((p) => p !== media));
    } else {
      setVideos((prev) => prev.filter((v) => v !== media));
    }

    // Update captions
    const newCaptions = { ...captions };
    delete newCaptions[index];
    setCaptions(newCaptions);

    // Update cover if needed
    if (coverIndex === index) {
      setCoverIndex(null);
    }
  }

  // ── Address autocomplete (Google Places API) ─────────────────────────────
  const PLACES_KEY = "AIzaSyCYnlpsu8WOAu2Z0sW_ngZgxxW8UNbOwbw";

  function handleAddressInput(text) {
    setForm((prev) => ({ ...prev, originAddress: text }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) {
      setAddressSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(() => fetchSuggestions(text), 400);
  }

  async function fetchSuggestions(query) {
    setAddressLoading(true);
    try {
      // No `types` filter so cities, addresses and regions all match
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(query)}` +
        `&key=${PLACES_KEY}` +
        `&language=en`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === "OK") {
        setAddressSuggestions(data.predictions);
      } else {
        setAddressSuggestions([]);
      }
    } catch {
      setAddressSuggestions([]);
    } finally {
      setAddressLoading(false);
    }
  }

  async function selectSuggestion(item) {
    setForm((prev) => ({ ...prev, originAddress: item.description }));
    setAddressSuggestions([]);

    // Fetch full address components via Place Details
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${item.place_id}` +
        `&fields=address_components,formatted_address` +
        `&key=${PLACES_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== "OK") return;

      const components = data.result.address_components || [];
      const get = (type) =>
        components.find((c) => c.types.includes(type))?.long_name || "";

      const streetNum   = get("street_number");
      const route       = get("route");
      const addressLine = [streetNum, route].filter(Boolean).join(" ")
        || data.result.formatted_address
        || item.description;

      const city    = get("locality") || get("sublocality_level_1") || get("postal_town") || get("administrative_area_level_2");
      const state   = get("administrative_area_level_1");
      const country = get("country");

      setForm((prev) => ({
        ...prev,
        originAddress: addressLine,
        originCity:    city,
        originState:   state,
        originCountry: country,
      }));
    } catch {
      // Details failed — address field keeps the description; city/state/country editable manually
    }
  }

  async function createTrip() {
    if (!user || creating || !canCreate) return;

    setCreating(true);
    try {
      const now = Date.now();
      const destCity = form.originCity || "Unknown";
      const destCountry = form.originCountry || "Unknown";

      const payload = {
        ownerId: user.uid,
        name: form.name,
        city: destCity,
        state: form.originState || null,
        country: destCountry,
        originCity: form.originCity || null,
        originState: form.originState || null,
        originCountry: form.originCountry || null,
        originAddress: form.originAddress || null,
        originTransportationType: form.originTransportationType || null,
        cruiseLine: isCruise ? cruiseLineValue || null : null,
        cruiseShip: isCruise ? cruiseShipValue || null : null,
        specificAddress: null,
        totalMiles: null,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description || null,
        coverMediaId: null,
        createdAt: now,
        updatedAt: now,
      };

      // Create trip
      const tripRef = await addDoc(collection(db, "trips"), payload);

      // Upload media
      let chosenCoverMediaId = null;
      let firstImageMediaId = null;
      const idToken = await user.getIdToken();

      for (let i = 0; i < allMedia.length; i++) {
        const asset = allMedia[i];
        const isImage = photos.includes(asset);
        const isVideo = videos.includes(asset);
        const kind = isImage ? "image" : isVideo ? "video" : "other";
        if (kind === "other") continue;

        const mediaRef = doc(collection(db, "trips", tripRef.id, "media"));
        const mediaId = mediaRef.id;

        let downloadURL = "";
        let storagePath = "";

        if (isImage) {
          const formData = new FormData();
          formData.append("file", {
            uri: asset.uri,
            name: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.mimeType || "image/jpeg",
          });
          formData.append("ownerId", user.uid);
          formData.append("tripId", tripRef.id);
          formData.append("idToken", idToken);
          const res = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Upload failed (${res.status})`);
          }
          ({ downloadURL, storagePath } = await res.json());
        } else {
          // Video: direct Firebase Storage upload
          const safeName = (asset.fileName || `media_${Date.now()}.mp4`).replace(/[^\w.\-]+/g, "_");
          storagePath = `trip_media/${user.uid}/${tripRef.id}/${mediaId}/${safeName}`;
          const sref = storageRef(storage, storagePath);
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          await uploadBytes(sref, blob);
          downloadURL = await getDownloadURL(sref);
        }

        await setDoc(mediaRef, {
          tripId: tripRef.id,
          ownerId: user.uid,
          type: kind,
          storagePath,
          downloadURL,
          createdAt: Date.now(),
          takenAt: asset.modificationTime || Date.now(),
          caption: captions[i] || "",
        });

        if (isImage) {
          if (!firstImageMediaId) firstImageMediaId = mediaId;
          if (i === coverIndex && !chosenCoverMediaId)
            chosenCoverMediaId = mediaId;
        }
      }

      const coverId = chosenCoverMediaId || firstImageMediaId;
      if (coverId) {
        await updateDoc(doc(db, "trips", tripRef.id), {
          coverMediaId: coverId,
          updatedAt: Date.now(),
        });
      }

      // Save cruise review if applicable
      if (isCruise && cruiseLineValue && cruiseShipValue) {
        const hasReviewContent =
          cruiseReview.review ||
          cruiseReview.qualityRating ||
          cruiseReview.valueRating ||
          cruiseReview.serviceRating ||
          cruiseReview.foodRating ||
          cruiseReview.entertainmentRating;

        if (hasReviewContent) {
          await addDoc(collection(db, "trips", tripRef.id, "cruises"), {
            name: `${cruiseLineValue} - ${cruiseShipValue}`,
            cruiseLine: cruiseLineValue,
            shipName: cruiseShipValue,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            city: form.originCity || "Unknown",
            state: form.originState || null,
            country: form.originCountry || "Unknown",
            review: cruiseReview.review || null,
            qualityRating: cruiseReview.qualityRating,
            valueRating: cruiseReview.valueRating,
            serviceRating: cruiseReview.serviceRating,
            foodRating: cruiseReview.foodRating,
            entertainmentRating: cruiseReview.entertainmentRating,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      onCreated?.(tripRef.id);
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to create trip");
    } finally {
      setCreating(false);
    }
  }

  const renderStarRating = (value, onChange, label) => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            onPress={() => onChange(rating)}
            style={styles.starButton}
          >
            <Text
              style={[
                styles.star,
                (value ?? 0) >= rating ? styles.starFilled : styles.starEmpty,
              ]}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMediaItem = (item, index) => {
    const isImage = photos.includes(item);
    const isCover = coverIndex === index;

    return (
      <View key={index} style={styles.mediaCard}>
        <View style={styles.mediaPreview}>
          {isImage ? (
            <Image
              source={{ uri: item.uri }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoText}>Video</Text>
            </View>
          )}
        </View>

        <View style={styles.mediaActions}>
          {isImage && (
            <TouchableOpacity onPress={() => setCoverIndex(index)}>
              <Text style={isCover ? styles.coverActive : styles.coverInactive}>
                {isCover ? "✓ Cover" : "Set as cover"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => removeMedia(index)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.captionContainer}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor={COLORS.muted}
            value={captions[index] || ""}
            onChangeText={(text) =>
              setCaptions((prev) => ({ ...prev, [index]: text }))
            }
            multiline
          />
        </View>
      </View>
    );
  };

  return (
    <ModalShell
      visible={visible}
      title="Add Trip"
      onClose={onClose}
      fullScreen
    >
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.label}>Trip Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Summer in Paris"
            placeholderTextColor={COLORS.muted}
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.halfColumn}>
            <DatePicker
              label="Start Date *"
              value={form.startDate}
              onSelect={(date) => setForm({ ...form, startDate: date })}
              placeholder="Select start date"
            />
          </View>
          <View style={styles.halfColumn}>
            <DatePicker
              label="End Date *"
              value={form.endDate}
              onSelect={(date) => setForm({ ...form, endDate: date })}
              placeholder="Select end date"
              minDate={form.startDate}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Beginning</Text>

        {/* 1. Beginning Address — autocomplete */}
        <View style={styles.section}>
          <Text style={styles.label}>Beginning Address</Text>
          <View style={styles.autocompleteWrapper}>
            <View style={styles.autocompleteInputRow}>
              <TextInput
                style={[styles.input, styles.autocompleteInput]}
                placeholder="Start typing your address…"
                placeholderTextColor={COLORS.muted}
                value={form.originAddress}
                onChangeText={handleAddressInput}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />
              {addressLoading && (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={styles.autocompleteSpinner}
                />
              )}
              {form.originAddress.length > 0 && !addressLoading && (
                <TouchableOpacity
                  style={styles.autocompleteClear}
                  onPress={() => {
                    setForm((prev) => ({
                      ...prev,
                      originAddress: "",
                      originCity: "",
                      originState: "",
                      originCountry: "",
                    }));
                    setAddressSuggestions([]);
                  }}
                >
                  <Text style={styles.autocompleteClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {addressSuggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {addressSuggestions.map((item, i) => (
                  <TouchableOpacity
                    key={item.place_id ?? i}
                    style={[
                      styles.suggestionItem,
                      i < addressSuggestions.length - 1 && styles.suggestionBorder,
                    ]}
                    onPress={() => selectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionIcon}>📍</Text>
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* 2. Beginning City — auto-filled, editable */}
        <View style={styles.section}>
          <Text style={styles.label}>Beginning City</Text>
          <TextInput
            style={styles.input}
            placeholder="Auto-filled from address"
            placeholderTextColor={COLORS.muted}
            value={form.originCity}
            onChangeText={(text) => setForm({ ...form, originCity: text })}
          />
        </View>

        {/* 3. Beginning State / Province — auto-filled, editable */}
        <View style={styles.section}>
          <Text style={styles.label}>Beginning State / Province</Text>
          <TextInput
            style={styles.input}
            placeholder="Auto-filled from address"
            placeholderTextColor={COLORS.muted}
            value={form.originState}
            onChangeText={(text) => setForm({ ...form, originState: text })}
          />
        </View>

        {/* 4. Beginning Country — auto-filled, editable */}
        <View style={styles.section}>
          <Text style={styles.label}>Beginning Country</Text>
          <TextInput
            style={styles.input}
            placeholder="Auto-filled from address"
            placeholderTextColor={COLORS.muted}
            value={form.originCountry}
            onChangeText={(text) => setForm({ ...form, originCountry: text })}
          />
        </View>

        {isCruise && (
          <>
            <Dropdown
              label="Cruise Line *"
              value={form.cruiseLine}
              options={CRUISE_LINES}
              onSelect={(value) =>
                setForm({
                  ...form,
                  cruiseLine: value,
                  cruiseShip: "",
                  customCruiseShip: "",
                })
              }
              placeholder="Select cruise line"
              searchable
            />

            {form.cruiseLine === OTHER_CRUISE_LINE && (
              <View style={styles.section}>
                <Text style={styles.label}>Enter Cruise Line Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter cruise line name"
                  placeholderTextColor={COLORS.muted}
                  value={form.customCruiseLine}
                  onChangeText={(text) =>
                    setForm({ ...form, customCruiseLine: text })
                  }
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Ship Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter ship name"
                placeholderTextColor={COLORS.muted}
                value={form.customCruiseShip}
                onChangeText={(text) =>
                  setForm({ ...form, customCruiseShip: text })
                }
              />
            </View>

            {/* Cruise Review Section */}
            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>
                Cruise Review (Optional)
              </Text>

              <View style={styles.section}>
                <Text style={styles.label}>Your Review</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Share your cruise experience..."
                  placeholderTextColor={COLORS.muted}
                  value={cruiseReview.review}
                  onChangeText={(text) =>
                    setCruiseReview({ ...cruiseReview, review: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              {renderStarRating(
                cruiseReview.qualityRating,
                (rating) =>
                  setCruiseReview({ ...cruiseReview, qualityRating: rating }),
                "Overall Quality"
              )}
              {renderStarRating(
                cruiseReview.valueRating,
                (rating) =>
                  setCruiseReview({ ...cruiseReview, valueRating: rating }),
                "Value for Money"
              )}
              {renderStarRating(
                cruiseReview.serviceRating,
                (rating) =>
                  setCruiseReview({ ...cruiseReview, serviceRating: rating }),
                "Service"
              )}
              {renderStarRating(
                cruiseReview.foodRating,
                (rating) =>
                  setCruiseReview({ ...cruiseReview, foodRating: rating }),
                "Food & Dining"
              )}
              {renderStarRating(
                cruiseReview.entertainmentRating,
                (rating) =>
                  setCruiseReview({
                    ...cruiseReview,
                    entertainmentRating: rating,
                  }),
                "Entertainment"
              )}
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add trip description..."
            placeholderTextColor={COLORS.muted}
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos/Videos</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImages}
            disabled={creating}
          >
            <Text style={styles.uploadButtonText}>📷 Upload Photos/Videos</Text>
          </TouchableOpacity>

          {allMedia.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setPhotos([]);
                setVideos([]);
                setCaptions({});
                setCoverIndex(null);
              }}
              disabled={creating}
            >
              <Text style={styles.clearText}>Clear selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {allMedia.length > 0 && (
          <View style={styles.mediaGrid}>
            {allMedia.map((item, index) => renderMediaItem(item, index))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.createButton, !canCreate && styles.buttonDisabled]}
            onPress={createTrip}
            disabled={!canCreate || creating}
          >
            {creating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.createButtonText}>Create Trip</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();
              onClose();
            }}
            disabled={creating}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: scaleSpacing(SPACING.md),
  },
  section: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.md),
  },
  label: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: scaleSpacing(SPACING.md),
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
  },
  textArea: {
    height: scaleSpacing(100),
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
  },
  halfColumn: {
    flex: 1,
  },
  reviewSection: {
    marginTop: scaleSpacing(SPACING.lg),
    paddingTop: scaleSpacing(SPACING.lg),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ratingContainer: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  ratingLabel: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  starsRow: {
    flexDirection: "row",
    gap: scaleSpacing(4),
  },
  starButton: {
    width: scaleFontSize(32),
    height: scaleFontSize(32),
    justifyContent: "center",
    alignItems: "center",
  },
  star: {
    fontSize: scaleFontSize(24),
  },
  starFilled: {
    color: "#FFD700",
  },
  starEmpty: {
    color: COLORS.border,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    paddingHorizontal: scaleSpacing(SPACING.lg),
    borderRadius: 8,
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.sm),
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  clearText: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary,
    textAlign: "center",
    marginTop: scaleSpacing(SPACING.sm),
  },
  mediaGrid: {
    gap: scaleSpacing(SPACING.md),
  },
  mediaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
  },
  mediaPreview: {
    width: "100%",
    height: scaleSpacing(200),
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceLight,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
  },
  videoText: {
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
  },
  mediaActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: scaleSpacing(SPACING.sm),
  },
  coverActive: {
    fontSize: scaleFontSize(14),
    color: "#16a34a",
  },
  coverInactive: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary,
  },
  removeText: {
    fontSize: scaleFontSize(14),
    color: COLORS.error,
  },
  captionContainer: {
    marginTop: scaleSpacing(SPACING.sm),
  },
  captionInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: scaleSpacing(SPACING.sm),
    color: COLORS.foreground,
    fontSize: scaleFontSize(14),
    minHeight: scaleFontSize(40),
  },
  buttonContainer: {
    marginTop: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.xl),
    gap: scaleSpacing(SPACING.md),
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Address autocomplete
  autocompleteWrapper: {
    position: "relative",
    zIndex: 10,
  },
  autocompleteInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  autocompleteInput: {
    flex: 1,
  },
  autocompleteSpinner: {
    position: "absolute",
    right: scaleSpacing(12),
  },
  autocompleteClear: {
    position: "absolute",
    right: scaleSpacing(12),
    padding: scaleSpacing(4),
  },
  autocompleteClearText: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },
  suggestionsList: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: scaleSpacing(4),
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
    gap: scaleSpacing(SPACING.xs),
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionIcon: {
    fontSize: scaleFontSize(14),
    marginTop: scaleSpacing(1),
  },
  suggestionText: {
    flex: 1,
    fontSize: scaleFontSize(13),
    color: COLORS.foreground,
    lineHeight: scaleFontSize(18),
  },
});
