import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from "react-native";

// Tablet breakpoint
const TABLET_BREAKPOINT = 600;
import * as ImagePicker from "expo-image-picker";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../AuthProvider";
import Dropdown from "../Dropdown";
import DatePicker from "../DatePicker";
import { COLORS, SPACING, TRANSPORT_OPTIONS, scaleFontSize, scaleSpacing, API_BASE_URL } from "../../lib/constants";
import { getCruiseLineNames, getShipsForCruiseLine } from "../../lib/cruiseData";

const PLACES_KEY = "AIzaSyCYnlpsu8WOAu2Z0sW_ngZgxxW8UNbOwbw";

const OTHER_CRUISE_LINE = "Other";

export default function EditTripModal({ tripId, visible, onClose }) {
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Existing destination city/country — preserved on save (required by Firestore rules)
  const [tripCity, setTripCity] = useState("");
  const [tripCountry, setTripCountry] = useState("");

  // Cruise review state
  const [cruiseReview, setCruiseReview] = useState({
    id: null,
    review: "",
    qualityRating: null,
    valueRating: null,
    serviceRating: null,
    foodRating: null,
    entertainmentRating: null,
  });

  // Media state
  const [existingMedia, setExistingMedia] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [captions, setCaptions] = useState({});
  const [coverMediaId, setCoverMediaId] = useState(null);
  const [mediaToDelete, setMediaToDelete] = useState([]);

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressLoading, setAddressLoading]         = useState(false);
  const searchTimer = useRef(null);

  const isCruise = form.originTransportationType === "Cruise";
  const cruiseLineValue =
    form.cruiseLine === OTHER_CRUISE_LINE
      ? form.customCruiseLine
      : form.cruiseLine;
  const cruiseShipValue = form.customCruiseShip || form.cruiseShip;

  const allMedia = [...existingMedia, ...newPhotos, ...newVideos];

  // Load trip data when modal opens
  useEffect(() => {
    if (!tripId || !visible) return;

    async function loadTrip() {
      setLoading(true);
      try {
        const tripDoc = await getDoc(doc(db, "trips", tripId));
        if (tripDoc.exists()) {
          const data = tripDoc.data();

          // Set cruise line/ship handling "Other" option
          let cruiseLine = data.cruiseLine || "";
          let customCruiseLine = "";
          const cruiseLineNames = getCruiseLineNames();
          if (cruiseLine && !cruiseLineNames.includes(cruiseLine)) {
            customCruiseLine = cruiseLine;
            cruiseLine = OTHER_CRUISE_LINE;
          }

          setTripCity(data.city || "");
          setTripCountry(data.country || "");
          setForm({
            name: data.name || "",
            originCity: data.originCity || "",
            originState: data.originState || "",
            originCountry: data.originCountry || "",
            originAddress: data.originAddress || "",
            originTransportationType: data.originTransportationType || "",
            cruiseLine,
            cruiseShip: data.cruiseShip || "",
            customCruiseLine,
            customCruiseShip: "",
            startDate: data.startDate || "",
            endDate: data.endDate || "",
            description: data.description || "",
          });

          // Load existing media
          const mediaSnap = await getDocs(
            collection(db, "trips", tripId, "media")
          );
          const mediaList = [];
          mediaSnap.forEach((mediaDoc) => {
            mediaList.push({
              id: mediaDoc.id,
              ...mediaDoc.data(),
              isExisting: true,
            });
          });
          setExistingMedia(mediaList);

          // Set cover media ID
          if (data.coverMediaId) {
            setCoverMediaId(data.coverMediaId);
          }

          // Load cruise review if exists
          if (data.originTransportationType === "Cruise") {
            const cruisesSnap = await getDocs(
              collection(db, "trips", tripId, "cruises")
            );
            if (!cruisesSnap.empty) {
              const cruiseDoc = cruisesSnap.docs[0];
              const cruiseData = cruiseDoc.data();
              setCruiseReview({
                id: cruiseDoc.id,
                review: cruiseData.review || "",
                qualityRating: cruiseData.qualityRating || null,
                valueRating: cruiseData.valueRating || null,
                serviceRating: cruiseData.serviceRating || null,
                foodRating: cruiseData.foodRating || null,
                entertainmentRating: cruiseData.entertainmentRating || null,
              });
            }
          }
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load trip data");
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [tripId, visible]);

  // ── Address autocomplete (Google Places API) ─────────────────────────────
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
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(query)}` +
        `&key=${PLACES_KEY}` +
        `&language=en`;
      const resp = await fetch(url);
      const data = await resp.json();
      setAddressSuggestions(data.status === "OK" ? data.predictions : []);
    } catch {
      setAddressSuggestions([]);
    } finally {
      setAddressLoading(false);
    }
  }

  async function selectSuggestion(item) {
    setForm((prev) => ({ ...prev, originAddress: item.description }));
    setAddressSuggestions([]);
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
      // Details failed — keep description; user can fill city/state/country manually
    }
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
      const photos = result.assets.filter((asset) => asset.type === "image");
      const videos = result.assets.filter((asset) => asset.type === "video");
      setNewPhotos((prev) => [...prev, ...photos]);
      setNewVideos((prev) => [...prev, ...videos]);
    }
  }

  function removeMedia(index) {
    const media = allMedia[index];

    if (media.isExisting) {
      // Mark existing media for deletion
      setMediaToDelete((prev) => [...prev, media]);
      setExistingMedia((prev) => prev.filter((m) => m.id !== media.id));

      // Clear cover if it's being deleted
      if (coverMediaId === media.id) {
        setCoverMediaId(null);
      }
    } else {
      // Remove new media
      const isPhoto = newPhotos.includes(media);
      if (isPhoto) {
        setNewPhotos((prev) => prev.filter((p) => p !== media));
      } else {
        setNewVideos((prev) => prev.filter((v) => v !== media));
      }
    }

    // Update captions
    const newCaptions = { ...captions };
    delete newCaptions[index];
    setCaptions(newCaptions);
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      Alert.alert("Invalid Dates", "End date cannot be before start date.");
      return;
    }

    if (isCruise && (!cruiseLineValue || !cruiseShipValue)) {
      Alert.alert("Error", "Please select cruise line and ship");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();

      // Delete removed media from storage first (before updating trip)
      for (const media of mediaToDelete) {
        try {
          if (media.storagePath) {
            const sref = storageRef(storage, media.storagePath);
            await deleteObject(sref);
          }
          await deleteDoc(doc(db, "trips", tripId, "media", media.id));
        } catch (error) {
        }
      }

      // Upload new media first to get IDs
      let firstNewImageId = null;
      const newMediaList = [...newPhotos, ...newVideos];
      const idToken = await user.getIdToken();

      for (let i = 0; i < newMediaList.length; i++) {
        const asset = newMediaList[i];
        const isImage = newPhotos.includes(asset);
        const isVideo = newVideos.includes(asset);
        const kind = isImage ? "image" : isVideo ? "video" : "other";
        if (kind === "other") continue;

        try {
          const mediaRef = doc(collection(db, "trips", tripId, "media"));
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
            formData.append("tripId", tripId);
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
            storagePath = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;
            const sref = storageRef(storage, storagePath);
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            await uploadBytes(sref, blob);
            downloadURL = await getDownloadURL(sref);
          }

          await setDoc(mediaRef, {
            tripId,
            ownerId: user.uid,
            type: kind,
            storagePath,
            downloadURL,
            createdAt: now,
            takenAt: asset.modificationTime || now,
            caption: captions[existingMedia.length + i] || "",
          });

          if (isImage && !firstNewImageId) {
            firstNewImageId = mediaId;
          }
        } catch (mediaError) {
          // Continue with other media uploads
        }
      }

      // Determine final cover media ID
      let finalCoverMediaId = coverMediaId;
      if (!finalCoverMediaId && firstNewImageId) {
        finalCoverMediaId = firstNewImageId;
      }

      // Update trip data (single update with all fields including coverMediaId)
      const tripData = {
        name: form.name,
        // Keep existing destination city/country (required by Firestore rules)
        city: tripCity || form.originCity || null,
        state: form.originState || null,
        country: tripCountry || form.originCountry || null,
        originCity: form.originCity || null,
        originState: form.originState || null,
        originCountry: form.originCountry || null,
        originAddress: form.originAddress || null,
        originTransportationType: form.originTransportationType || null,
        cruiseLine: isCruise ? cruiseLineValue || null : null,
        cruiseShip: isCruise ? cruiseShipValue || null : null,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description || null,
        updatedAt: now,
      };

      // Only include coverMediaId if we have one
      if (finalCoverMediaId) {
        tripData.coverMediaId = finalCoverMediaId;
      }

      await updateDoc(doc(db, "trips", tripId), tripData);

      // Handle cruise review (separate try-catch so it doesn't affect trip save)
      try {
        if (isCruise && cruiseLineValue && cruiseShipValue) {
          const hasReviewContent =
            cruiseReview.review ||
            cruiseReview.qualityRating ||
            cruiseReview.valueRating ||
            cruiseReview.serviceRating ||
            cruiseReview.foodRating ||
            cruiseReview.entertainmentRating;

          if (hasReviewContent) {
            const cruiseData = {
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
              updatedAt: now,
            };

            if (cruiseReview.id) {
              await updateDoc(
                doc(db, "trips", tripId, "cruises", cruiseReview.id),
                cruiseData
              );
            } else {
              await addDoc(collection(db, "trips", tripId, "cruises"), {
                ...cruiseData,
                createdAt: now,
              });
            }
          } else if (cruiseReview.id) {
            await deleteDoc(
              doc(db, "trips", tripId, "cruises", cruiseReview.id)
            );
          }
        } else if (cruiseReview.id) {
          await deleteDoc(doc(db, "trips", tripId, "cruises", cruiseReview.id));
        }
      } catch (cruiseError) {
        // Don't fail the whole save for cruise review errors
      }

      Alert.alert("Success", "Trip updated successfully");
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update trip. Please try again.");
    } finally {
      setSaving(false);
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
    const isImage = item.type === "image" || newPhotos.includes(item);
    const isCover = coverMediaId === item.id;

    return (
      <View key={index} style={styles.mediaCard}>
        <View style={styles.mediaPreview}>
          {isImage ? (
            <Image
              source={{ uri: item.downloadURL || item.uri }}
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
          {isImage && item.isExisting && (
            <TouchableOpacity onPress={() => setCoverMediaId(item.id)}>
              <Text style={isCover ? styles.coverActive : styles.coverInactive}>
                {isCover ? "✓ Cover" : "Set as cover"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => removeMedia(index)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>

        {!item.isExisting && (
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
        )}
      </View>
    );
  };

  if (!visible) return null;

  const renderFormContent = () => (
    <>
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
            options={getCruiseLineNames()}
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
              value={form.customCruiseShip || form.cruiseShip}
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
                setCruiseReview({
                  ...cruiseReview,
                  qualityRating: rating,
                }),
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
                setCruiseReview({
                  ...cruiseReview,
                  serviceRating: rating,
                }),
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
        <Text style={styles.sectionTitle}>Photos/Videos</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickImages}
          disabled={saving}
        >
          <Text style={styles.uploadButtonText}>
            📷 Add Photos/Videos
          </Text>
        </TouchableOpacity>

        {allMedia.length > 0 && (
          <View style={styles.mediaGrid}>
            {allMedia.map((item, index) => renderMediaItem(item, index))}
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.headerButton}>
        <Text style={styles.headerButtonText}>Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Trip</Text>
      <TouchableOpacity
        onPress={handleSave}
        style={[styles.headerButton, styles.saveHeaderButton]}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.saveHeaderButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => (
    <>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {renderFormContent()}
        </ScrollView>
      )}
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {renderHeader()}
          {renderContent()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabletOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: scaleSpacing(SPACING.md),
  },
  tabletContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    maxWidth: 600,
    width: "90%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  headerButton: {
    paddingVertical: scaleSpacing(SPACING.xs),
    paddingHorizontal: scaleSpacing(SPACING.sm),
  },
  headerButtonText: {
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
  },
  saveHeaderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.xs),
    minWidth: scaleFontSize(60),
    alignItems: "center",
  },
  saveHeaderButtonText: {
    fontSize: scaleFontSize(16),
    color: COLORS.white,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: scaleSpacing(SPACING.md),
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
  },
  scrollView: {
    flex: 1,
  },
  formContent: {
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
    marginBottom: scaleSpacing(SPACING.md),
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  mediaGrid: {
    gap: scaleSpacing(SPACING.md),
    marginTop: scaleSpacing(SPACING.md),
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
  bottomSpacer: {
    height: scaleSpacing(SPACING.xxl),
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
