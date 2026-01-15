import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../AuthProvider";
import ModalShell from "./ModalShell";
import ConfirmModal from "./ConfirmModal";
import Dropdown from "../Dropdown";
import DatePicker from "../DatePicker";
import { COLORS, SPACING } from "../../lib/constants";
import { COUNTRIES, getStates } from "../../lib/geo";
import { sortAZWithOtherLast } from "../../lib/utils";

export default function PlaceModal({
  tripId,
  visible,
  onClose,
  title,
  subcollection, // "destinations" | "activities" | "accommodations" | "restaurants"
  extraLeft = [], // Additional fields like transportationType
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    notes: "",
    startDate: "",
    endDate: "",
    review: "",
    qualityRating: 0,
    valueRating: 0,
    serviceRating: 0,
    locationRating: 0,
  });

  // Additional fields
  const [extraFields, setExtraFields] = useState({});
  const [placePhotos, setPlacePhotos] = useState({});

  const sortedCountries = sortAZWithOtherLast(COUNTRIES, "United States");
  const availableStates = sortAZWithOtherLast(getStates(form.country));

  useEffect(() => {
    if (!tripId || !visible || !subcollection) return;

    const q = query(
      collection(db, "trips", tripId, subcollection),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setItems(arr);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [tripId, visible, subcollection]);

  // Fetch photos for each place
  useEffect(() => {
    if (!tripId || !visible || !subcollection || items.length === 0) return;

    const fetchPhotos = async () => {
      const photoMap = {};
      for (const item of items) {
        const photoSnap = await getDocs(
          collection(db, "trips", tripId, subcollection, item.id, "photos")
        );
        const photos = [];
        photoSnap.forEach((doc) => photos.push({ id: doc.id, ...doc.data() }));
        photoMap[item.id] = photos;
      }
      setPlacePhotos(photoMap);
    };

    fetchPhotos();
  }, [items, tripId, visible, subcollection]);

  function resetForm() {
    setForm({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      notes: "",
      startDate: "",
      endDate: "",
      review: "",
      qualityRating: 0,
      valueRating: 0,
      serviceRating: 0,
      locationRating: 0,
    });
    setExtraFields({});
    setEditingItem(null);
  }

  function startEdit(item) {
    setForm({
      name: item.name || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      country: item.country || "",
      notes: item.notes || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      review: item.review || "",
      qualityRating: item.qualityRating || 0,
      valueRating: item.valueRating || 0,
      serviceRating: item.serviceRating || 0,
      locationRating: item.locationRating || 0,
    });
    setExtraFields({
      transportationType: item.transportationType || "",
      accommodationType: item.accommodationType || "",
    });
    setEditingItem(item);
    setShowAddForm(true);
  }

  async function handleSave() {
    if (!form.name) return;

    try {
      const data = {
        ...form,
        ...extraFields,
        ownerId: user.uid,
      };

      if (editingItem) {
        // Update existing
        await updateDoc(
          doc(db, "trips", tripId, subcollection, editingItem.id),
          {
            ...data,
            updatedAt: Date.now(),
          }
        );
      } else {
        // Create new
        await addDoc(collection(db, "trips", tripId, subcollection), {
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error saving place:", error);
      Alert.alert("Error", "Failed to save place");
    }
  }

  async function handleDelete(id) {
    try {
      // Delete photos first
      const photoSnap = await getDocs(
        collection(db, "trips", tripId, subcollection, id, "photos")
      );

      for (const photoDoc of photoSnap.docs) {
        const photo = photoDoc.data();
        if (photo.storagePath) {
          const sref = storageRef(storage, photo.storagePath);
          await deleteObject(sref);
        }
        await deleteDoc(
          doc(db, "trips", tripId, subcollection, id, "photos", photoDoc.id)
        );
      }

      // Delete place
      await deleteDoc(doc(db, "trips", tripId, subcollection, id));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting place:", error);
      Alert.alert("Error", "Failed to delete place");
    }
  }

  async function pickImages(placeId) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant photo library permissions to upload photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      uploadPhotos(placeId, result.assets);
    }
  }

  async function uploadPhotos(placeId, assets) {
    setUploading(true);
    try {
      for (const asset of assets) {
        const { uri, fileName } = asset;

        // Fetch the file as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        const photoRef = doc(
          collection(db, "trips", tripId, subcollection, placeId, "photos")
        );
        const photoId = photoRef.id;

        const safeName = (fileName || `photo_${Date.now()}.jpg`).replace(
          /[^\w.\-]+/g,
          "_"
        );
        const path = `place_photos/${user.uid}/${tripId}/${subcollection}/${placeId}/${photoId}/${safeName}`;
        const sref = storageRef(storage, path);

        await uploadBytes(sref, blob);
        const url = await getDownloadURL(sref);

        await updateDoc(photoRef, {
          storagePath: path,
          downloadURL: url,
          createdAt: Date.now(),
          fileName: safeName,
        });
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(placeId, photoId, storagePath) {
    try {
      if (storagePath) {
        const sref = storageRef(storage, storagePath);
        await deleteObject(sref);
      }
      await deleteDoc(
        doc(db, "trips", tripId, subcollection, placeId, "photos", photoId)
      );
    } catch (error) {
      console.error("Error deleting photo:", error);
      Alert.alert("Error", "Failed to delete photo");
    }
  }

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  const renderStars = (rating, onPress) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Text style={styles.star}>{star <= rating ? "★" : "☆"}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const photos = placePhotos[item.id] || [];

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => startEdit(item)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {(item.startDate || item.endDate) && (
          <Text style={styles.itemDates}>
            {item.startDate && item.endDate
              ? `${formatDisplayDate(item.startDate)} - ${formatDisplayDate(
                  item.endDate
                )}`
              : formatDisplayDate(item.startDate || item.endDate)}
          </Text>
        )}

        {(item.city || item.country) && (
          <Text style={styles.itemLocation}>
            {[item.city, item.state, item.country].filter(Boolean).join(", ")}
          </Text>
        )}

        {item.address && <Text style={styles.itemAddress}>{item.address}</Text>}
        {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
        {item.review && <Text style={styles.itemReview}>"{item.review}"</Text>}

        {/* Show ratings if any exist */}
        {(item.qualityRating > 0 || item.serviceRating > 0 || item.valueRating > 0 || item.locationRating > 0) && (
          <View style={styles.ratingsContainer}>
            {item.qualityRating > 0 && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Quality:</Text>
                {renderStars(item.qualityRating)}
              </View>
            )}
            {item.serviceRating > 0 && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Service:</Text>
                {renderStars(item.serviceRating)}
              </View>
            )}
            {item.valueRating > 0 && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Value:</Text>
                {renderStars(item.valueRating)}
              </View>
            )}
            {item.locationRating > 0 && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Location:</Text>
                {renderStars(item.locationRating)}
              </View>
            )}
          </View>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.photosContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoWrapper}>
                  <Image
                    source={{ uri: photo.downloadURL }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.photoDeleteButton}
                    onPress={() =>
                      deletePhoto(item.id, photo.id, photo.storagePath)
                    }
                  >
                    <Text style={styles.photoDeleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImages(item.id)}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>
              {uploading ? "Uploading..." : "📷 Add Photos"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteId(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ModalShell visible={visible} title={title} onClose={onClose} fullScreen noScroll={true}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.container}>
          {showAddForm ? (
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {editingItem ? "Edit" : "Add"} {title.slice(0, -1)}
              </Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder={`${title.slice(0, -1)} name`}
                placeholderTextColor={COLORS.muted}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />

              <Dropdown
                label="Country"
                value={form.country}
                options={sortedCountries}
                onSelect={(value) =>
                  setForm({ ...form, country: value, state: "" })
                }
                placeholder="Select country"
                searchable
              />

              <Dropdown
                label="State / Province"
                value={form.state}
                options={availableStates}
                onSelect={(value) => setForm({ ...form, state: value })}
                placeholder="Select or enter state/province"
                searchable
                allowCustom
              />

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City name"
                placeholderTextColor={COLORS.muted}
                value={form.city}
                onChangeText={(text) => setForm({ ...form, city: text })}
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Street address"
                placeholderTextColor={COLORS.muted}
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
              />

              <View style={styles.row}>
                <View style={styles.halfColumn}>
                  <DatePicker
                    label="Start Date"
                    value={form.startDate}
                    onSelect={(date) => setForm({ ...form, startDate: date })}
                    placeholder="Select start date"
                  />
                </View>
                <View style={styles.halfColumn}>
                  <DatePicker
                    label="End Date"
                    value={form.endDate}
                    onSelect={(date) => setForm({ ...form, endDate: date })}
                    placeholder="Select end date"
                    minDate={form.startDate}
                  />
                </View>
              </View>

              {/* Extra fields like transportation */}
              {extraLeft.map((field) => (
                <Dropdown
                  key={field.key}
                  label={field.label}
                  value={extraFields[field.key] || ""}
                  options={field.options}
                  onSelect={(value) =>
                    setExtraFields({ ...extraFields, [field.key]: value })
                  }
                  placeholder={`Select ${field.label.toLowerCase()}`}
                />
              ))}

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes..."
                placeholderTextColor={COLORS.muted}
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Review</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your experience..."
                placeholderTextColor={COLORS.muted}
                value={form.review}
                onChangeText={(text) => setForm({ ...form, review: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Quality Rating</Text>
              {renderStars(form.qualityRating, (rating) =>
                setForm({ ...form, qualityRating: rating })
              )}

              <Text style={styles.label}>Service Rating</Text>
              {renderStars(form.serviceRating, (rating) =>
                setForm({ ...form, serviceRating: rating })
              )}

              <Text style={styles.label}>Value Rating</Text>
              {renderStars(form.valueRating, (rating) =>
                setForm({ ...form, valueRating: rating })
              )}

              <Text style={styles.label}>Location Rating</Text>
              {renderStars(form.locationRating, (rating) =>
                setForm({ ...form, locationRating: rating })
              )}

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, !form.name && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={!form.name}
                >
                  <Text style={styles.saveButtonText}>
                    {editingItem ? "Save" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
              >
                <Text style={styles.addButtonText}>
                  + Add {title.slice(0, -1)}
                </Text>
              </TouchableOpacity>

              {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No {title.toLowerCase()} yet
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={items}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.list}
                />
              )}
            </>
          )}
        </View>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title={`Delete ${title.slice(0, -1)}`}
        message={`Are you sure you want to delete this ${title
          .slice(0, -1)
          .toLowerCase()}? All photos will also be deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 16,
  },
  list: {
    padding: SPACING.sm,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: "center",
    margin: SPACING.md,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xs,
  },
  itemHeaderLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  star: {
    fontSize: 18,
    color: "#FFD700",
    marginRight: 2,
  },
  editButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  editButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  itemDates: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  itemLocation: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  itemAddress: {
    fontSize: 14,
    color: COLORS.muted,
  },
  itemReview: {
    fontSize: 14,
    color: COLORS.foreground,
    marginTop: SPACING.sm,
    fontStyle: "italic",
  },
  itemNotes: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: SPACING.sm,
    fontStyle: "italic",
  },
  ratingsContainer: {
    marginTop: SPACING.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginRight: SPACING.xs,
    minWidth: 60,
  },
  photosContainer: {
    marginTop: SPACING.sm,
  },
  photoWrapper: {
    position: "relative",
    marginRight: SPACING.sm,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoDeleteButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  photoDeleteText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  uploadButton: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  uploadButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: "center",
  },
  deleteButton: {
    paddingHorizontal: SPACING.sm,
  },
  deleteButtonText: {
    fontSize: 12,
    color: COLORS.error,
  },
  formContainer: {
    padding: SPACING.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
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
  },
  halfColumn: {
    flex: 1,
  },
  formButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
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
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
