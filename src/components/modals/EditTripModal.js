import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
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
import { COLORS, SPACING, TRANSPORT_OPTIONS } from "../../lib/constants";
import { sortAZWithOtherLast } from "../../lib/utils";
import { COUNTRIES, getStates } from "../../lib/geo";
import { getCruiseLineNames, getShipsForCruiseLine } from "../../lib/cruiseData";

const OTHER_CRUISE_LINE = "Other";

export default function EditTripModal({ tripId, visible, onClose }) {
  const { user } = useAuth();
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

  const isCruise = form.originTransportationType === "Cruise";
  const cruiseLineValue =
    form.cruiseLine === OTHER_CRUISE_LINE
      ? form.customCruiseLine
      : form.cruiseLine;
  const cruiseShipValue =
    form.cruiseShip === "Other" ? form.customCruiseShip : form.cruiseShip;

  const sortedCountries = useMemo(() => {
    const withOther = new Set([...COUNTRIES, "Other", "Others"]);
    return sortAZWithOtherLast(Array.from(withOther), "United States");
  }, []);

  const availableOriginStates = useMemo(
    () => sortAZWithOtherLast(getStates(form.originCountry)),
    [form.originCountry]
  );

  const allMedia = useMemo(
    () => [...existingMedia, ...newPhotos, ...newVideos],
    [existingMedia, newPhotos, newVideos]
  );

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
        console.error("Error loading trip:", error);
        Alert.alert("Error", "Failed to load trip data");
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [tripId, visible]);

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

    if (isCruise && (!cruiseLineValue || !cruiseShipValue)) {
      Alert.alert("Error", "Please select cruise line and ship");
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const destCity = form.originCity || "Unknown";
      const destCountry = form.originCountry || "Unknown";

      // Update trip data
      const tripData = {
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
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description || null,
        updatedAt: now,
      };

      await updateDoc(doc(db, "trips", tripId), tripData);

      // Delete removed media from storage
      for (const media of mediaToDelete) {
        try {
          if (media.storagePath) {
            const sref = storageRef(storage, media.storagePath);
            await deleteObject(sref);
          }
          await deleteDoc(doc(db, "trips", tripId, "media", media.id));
        } catch (error) {
          console.error("Error deleting media:", error);
        }
      }

      // Upload new media
      let firstNewImageId = null;
      const newMediaList = [...newPhotos, ...newVideos];

      for (let i = 0; i < newMediaList.length; i++) {
        const asset = newMediaList[i];
        const isImage = newPhotos.includes(asset);
        const isVideo = newVideos.includes(asset);
        const kind = isImage ? "image" : isVideo ? "video" : "other";
        if (kind === "other") continue;

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const mediaRef = doc(collection(db, "trips", tripId, "media"));
        const mediaId = mediaRef.id;

        const safeName = (asset.fileName || `media_${Date.now()}.jpg`).replace(
          /[^\w.\-]+/g,
          "_"
        );
        const storagePath = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;
        const sref = storageRef(storage, storagePath);

        await uploadBytes(sref, blob);
        const downloadURL = await getDownloadURL(sref);

        await setDoc(mediaRef, {
          tripId,
          type: kind,
          storagePath,
          downloadURL,
          createdAt: now,
          takenAt: now,
          caption: captions[existingMedia.length + i] || "",
          fileName: asset.fileName || safeName,
          size: asset.fileSize || 0,
          contentType: asset.type || "image/jpeg",
        });

        if (isImage && !firstNewImageId) {
          firstNewImageId = mediaId;
        }
      }

      // Update cover media ID if needed
      if (!coverMediaId && firstNewImageId) {
        await updateDoc(doc(db, "trips", tripId), {
          coverMediaId: firstNewImageId,
          updatedAt: now,
        });
      } else if (coverMediaId) {
        await updateDoc(doc(db, "trips", tripId), {
          coverMediaId,
          updatedAt: now,
        });
      }

      // Handle cruise review
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
            // Update existing review
            await updateDoc(
              doc(db, "trips", tripId, "cruises", cruiseReview.id),
              cruiseData
            );
          } else {
            // Create new review
            await addDoc(collection(db, "trips", tripId, "cruises"), {
              ...cruiseData,
              createdAt: now,
            });
          }
        } else if (cruiseReview.id) {
          // Delete review if no content
          await deleteDoc(
            doc(db, "trips", tripId, "cruises", cruiseReview.id)
          );
        }
      } else if (cruiseReview.id) {
        // Delete cruise review if no longer a cruise
        await deleteDoc(doc(db, "trips", tripId, "cruises", cruiseReview.id));
      }

      Alert.alert("Success", "Trip updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating trip:", error);
      Alert.alert("Error", "Failed to update trip");
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
          {/* Header */}
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
                  onChangeText={(text) =>
                    setForm({ ...form, originAddress: text })
                  }
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
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  headerButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  headerButtonText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  saveHeaderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    minWidth: 60,
    alignItems: "center",
  },
  saveHeaderButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.muted,
  },
  scrollView: {
    flex: 1,
  },
  formContent: {
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
    marginBottom: SPACING.md,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  mediaGrid: {
    gap: SPACING.md,
    marginTop: SPACING.md,
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
  bottomSpacer: {
    height: SPACING.xxl,
  },
});
