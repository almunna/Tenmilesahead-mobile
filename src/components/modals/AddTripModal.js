import React, { useEffect, useMemo, useState } from "react";
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
import { COLORS, SPACING } from "../../lib/constants";
import { COUNTRIES, getStates } from "../../lib/geo";
import { sortAZWithOtherLast } from "../../lib/utils";

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

  const isCruise = form.originTransportationType === "Cruise";
  const cruiseLineValue =
    form.cruiseLine === OTHER_CRUISE_LINE
      ? form.customCruiseLine
      : form.cruiseLine;
  const cruiseShipValue =
    form.cruiseShip === "Other" ? form.customCruiseShip : form.cruiseShip;
  const isCruiseComplete =
    !isCruise || (!!cruiseLineValue && !!cruiseShipValue);

  const canCreate =
    !!form.name && isCruiseComplete && !!form.startDate && !!form.endDate;

  const sortedCountries = useMemo(() => {
    const withOther = new Set([...COUNTRIES, "Other", "Others"]);
    return sortAZWithOtherLast(Array.from(withOther), "United States");
  }, []);

  const availableOriginStates = useMemo(
    () => sortAZWithOtherLast(getStates(form.originCountry)),
    [form.originCountry]
  );

  const allMedia = useMemo(() => [...photos, ...videos], [photos, videos]);

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
      quality: 0.8,
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

      for (let i = 0; i < allMedia.length; i++) {
        const asset = allMedia[i];
        const isImage = photos.includes(asset);
        const isVideo = videos.includes(asset);
        const kind = isImage ? "image" : isVideo ? "video" : "other";
        if (kind === "other") continue;

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const mediaRef = doc(collection(db, "trips", tripRef.id, "media"));
        const mediaId = mediaRef.id;

        const safeName = (asset.fileName || `media_${Date.now()}.jpg`).replace(
          /[^\w.\-]+/g,
          "_"
        );
        const storagePath = `trip_media/${user.uid}/${tripRef.id}/${mediaId}/${safeName}`;
        const sref = storageRef(storage, storagePath);

        await uploadBytes(sref, blob);
        const downloadURL = await getDownloadURL(sref);

        await setDoc(mediaRef, {
          tripId: tripRef.id,
          type: kind,
          storagePath,
          downloadURL,
          createdAt: Date.now(),
          takenAt: Date.now(),
          caption: captions[i] || "",
          fileName: asset.fileName || safeName,
          size: asset.fileSize || 0,
          contentType: asset.type || "image/jpeg",
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
      console.error("Error creating trip:", error);
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

        <Text style={styles.sectionTitle}>Starting From</Text>

        <Dropdown
          label="Origin Country"
          value={form.originCountry}
          options={sortedCountries}
          onSelect={(value) =>
            setForm({ ...form, originCountry: value, originState: "" })
          }
          placeholder="Select origin country"
          searchable
        />

        <Dropdown
          label="Origin State / Province"
          value={form.originState}
          options={availableOriginStates}
          onSelect={(value) => setForm({ ...form, originState: value })}
          placeholder="Select or enter state/province"
          searchable
          allowCustom
        />

        <View style={styles.section}>
          <Text style={styles.label}>Origin City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., St. Augustine"
            placeholderTextColor={COLORS.muted}
            value={form.originCity}
            onChangeText={(text) => setForm({ ...form, originCity: text })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 123 Main Street, Suite 100"
            placeholderTextColor={COLORS.muted}
            value={form.originAddress}
            onChangeText={(text) => setForm({ ...form, originAddress: text })}
          />
        </View>

        <Dropdown
          label="Mode of Transportation"
          value={form.originTransportationType}
          options={TRANSPORT_OPTIONS}
          onSelect={(value) =>
            setForm({ ...form, originTransportationType: value })
          }
          placeholder="Select transportation"
        />

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
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    color: COLORS.foreground,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  halfColumn: {
    flex: 1,
  },
  reviewSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ratingContainer: {
    marginBottom: SPACING.md,
  },
  ratingLabel: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  starButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  star: {
    fontSize: 24,
  },
  starFilled: {
    color: "#FFD700",
  },
  starEmpty: {
    color: COLORS.border,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  clearText: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  mediaGrid: {
    gap: SPACING.md,
  },
  mediaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  mediaPreview: {
    width: "100%",
    height: 200,
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
    fontSize: 16,
    color: COLORS.muted,
  },
  mediaActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  coverActive: {
    fontSize: 14,
    color: "#16a34a",
  },
  coverInactive: {
    fontSize: 14,
    color: COLORS.primary,
  },
  removeText: {
    fontSize: 14,
    color: COLORS.error,
  },
  captionContainer: {
    marginTop: SPACING.sm,
  },
  captionInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.sm,
    color: COLORS.foreground,
    fontSize: 14,
    minHeight: 40,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
