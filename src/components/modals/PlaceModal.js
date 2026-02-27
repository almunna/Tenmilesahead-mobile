import React, { useEffect, useState, useRef, useMemo } from "react";
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
  Linking,
  Modal,
  Dimensions,
  PanResponder,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
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
import { COUNTRIES, getStates, matchCountryName, matchStateName } from "../../lib/geo";
import { sortAZWithOtherLast } from "../../lib/utils";
import PlaceAutocomplete from "../PlaceAutocomplete";

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
    phoneNumber: "",
    websiteUrl: "",
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
  const [placeDocuments, setPlaceDocuments] = useState({});
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  // Pending documents for the form (before saving)
  const [pendingDocuments, setPendingDocuments] = useState([]);
  // Photo viewer state
  const [viewingPhotosFor, setViewingPhotosFor] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Refs for swipe gesture to access current values
  const photosRef = useRef(placePhotos);
  const viewingRef = useRef(viewingPhotosFor);

  // Keep refs updated
  useEffect(() => {
    photosRef.current = placePhotos;
  }, [placePhotos]);

  useEffect(() => {
    viewingRef.current = viewingPhotosFor;
  }, [viewingPhotosFor]);

  // Swipe gesture handler for photo slider
  const swipeThreshold = 50;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > swipeThreshold) {
            // Swiped right - go to previous photo
            setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
          } else if (gestureState.dx < -swipeThreshold) {
            // Swiped left - go to next photo
            setCurrentPhotoIndex((prev) => {
              const photos = photosRef.current[viewingRef.current] || [];
              return Math.min(photos.length - 1, prev + 1);
            });
          }
        },
      }),
    []
  );

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

  // Fetch photos for each place from trips/{tripId}/media collection
  useEffect(() => {
    if (!tripId || !visible || !subcollection || items.length === 0) return;

    const fetchPhotos = async () => {
      const photoMap = {};
      // Initialize empty arrays for all items
      items.forEach((item) => {
        photoMap[item.id] = [];
      });

      // Fetch all media documents for this trip that are images linked to this subcollection
      const mediaSnap = await getDocs(collection(db, "trips", tripId, "media"));

      mediaSnap.forEach((d) => {
        const data = d.data();
        // Filter for images linked to items in this subcollection
        if (data.type === "image" && data.linkedSubcollection === subcollection) {
          const linkedId = data.linkedId;
          if (photoMap[linkedId]) {
            photoMap[linkedId].push({ id: d.id, ...data });
          }
        }
      });

      setPlacePhotos(photoMap);
    };

    fetchPhotos();
  }, [items, tripId, visible, subcollection]);

  // Fetch documents for each place from trips/{tripId}/media collection
  useEffect(() => {
    if (!tripId || !visible || !subcollection || items.length === 0) return;

    const fetchDocuments = async () => {
      const docMap = {};
      // Fetch all media documents for this trip that are linked to this subcollection
      const mediaSnap = await getDocs(collection(db, "trips", tripId, "media"));

      mediaSnap.forEach((d) => {
        const data = d.data();
        // Filter for documents linked to items in this subcollection
        if (data.type === "document" && data.linkedSubcollection === subcollection) {
          const linkedId = data.linkedId;
          if (!docMap[linkedId]) {
            docMap[linkedId] = [];
          }
          docMap[linkedId].push({ id: d.id, ...data });
        }
      });

      setPlaceDocuments(docMap);
    };

    fetchDocuments();
  }, [items, tripId, visible, subcollection]);

  function resetForm() {
    setForm({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      phoneNumber: "",
      websiteUrl: "",
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
    setPendingDocuments([]);
    setEditingItem(null);
  }

  function startEdit(item) {
    setForm({
      name: item.name || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      country: item.country || "",
      phoneNumber: item.phoneNumber || "",
      websiteUrl: item.websiteUrl || "",
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
      setUploading(true);
      const data = {
        ...form,
        ...extraFields,
        ownerId: user.uid,
      };

      let placeId;

      if (editingItem) {
        // Update existing
        await updateDoc(
          doc(db, "trips", tripId, subcollection, editingItem.id),
          {
            ...data,
            updatedAt: Date.now(),
          }
        );
        placeId = editingItem.id;
      } else {
        // Create new
        const newDoc = await addDoc(collection(db, "trips", tripId, subcollection), {
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        placeId = newDoc.id;
      }

      // Upload pending documents if any - store in trips/{tripId}/media collection
      if (pendingDocuments.length > 0 && placeId) {
        for (const asset of pendingDocuments) {
          const { uri, name, mimeType, size } = asset;

          const response = await fetch(uri);
          const blob = await response.blob();

          // Store in trips/{tripId}/media collection like the web version
          const mediaRef = doc(collection(db, "trips", tripId, "media"));
          const mediaId = mediaRef.id;

          const safeName = (name || `document_${Date.now()}`).replace(
            /[^\w.\-]+/g,
            "_"
          );
          const path = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;
          const sref = storageRef(storage, path);

          await uploadBytes(sref, blob);
          const url = await getDownloadURL(sref);

          await setDoc(mediaRef, {
            tripId,
            type: "document",
            storagePath: path,
            downloadURL: url,
            createdAt: Date.now(),
            caption: `${title.slice(0, -1)} • ${form.name}`,
            linkedSubcollection: subcollection,
            linkedId: placeId,
            fileName: name || safeName,
            fileSize: size || blob.size,
            mimeType: mimeType || "application/octet-stream",
          });
        }
      }

      resetForm();
      setShowAddForm(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save place");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    try {
      // Delete linked documents from trips/{tripId}/media collection
      const mediaSnap = await getDocs(collection(db, "trips", tripId, "media"));
      for (const mediaDoc of mediaSnap.docs) {
        const mediaData = mediaDoc.data();
        if (
          mediaData.type === "document" &&
          mediaData.linkedSubcollection === subcollection &&
          mediaData.linkedId === id
        ) {
          if (mediaData.storagePath) {
            const sref = storageRef(storage, mediaData.storagePath);
            await deleteObject(sref);
          }
          await deleteDoc(doc(db, "trips", tripId, "media", mediaDoc.id));
        }
      }

      // Delete place
      await deleteDoc(doc(db, "trips", tripId, subcollection, id));
      setDeleteId(null);
    } catch (error) {
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
      mediaTypes: ["images"],
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
      // Get place name for caption
      const place = items.find((item) => item.id === placeId);
      const placeName = place?.name || "";

      for (const asset of assets) {
        const { uri, fileName } = asset;

        // Fetch the file as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Store in trips/{tripId}/media collection like the web version
        const mediaRef = doc(collection(db, "trips", tripId, "media"));
        const mediaId = mediaRef.id;

        const safeName = (fileName || `photo_${Date.now()}.jpg`).replace(
          /[^\w.\-]+/g,
          "_"
        );
        const path = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;
        const sref = storageRef(storage, path);

        await uploadBytes(sref, blob);
        const url = await getDownloadURL(sref);

        await setDoc(mediaRef, {
          tripId,
          type: "image",
          storagePath: path,
          downloadURL: url,
          createdAt: Date.now(),
          caption: `${title.slice(0, -1)} • ${placeName}`,
          linkedSubcollection: subcollection,
          linkedId: placeId,
          fileName: safeName,
        });
      }

      // Refresh photos list from media collection
      const mediaSnap = await getDocs(collection(db, "trips", tripId, "media"));
      const photos = [];
      mediaSnap.forEach((d) => {
        const data = d.data();
        if (data.type === "image" && data.linkedSubcollection === subcollection && data.linkedId === placeId) {
          photos.push({ id: d.id, ...data });
        }
      });
      setPlacePhotos((prev) => ({ ...prev, [placeId]: photos }));
    } catch (error) {
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
      // Delete from trips/{tripId}/media collection
      await deleteDoc(doc(db, "trips", tripId, "media", photoId));

      // Update local state
      setPlacePhotos((prev) => ({
        ...prev,
        [placeId]: (prev[placeId] || []).filter((p) => p.id !== photoId),
      }));
    } catch (error) {
      Alert.alert("Error", "Failed to delete photo");
    }
  }

  // Document picker and upload functions
  async function pickDocuments(placeId) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        uploadDocuments(placeId, result.assets);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick documents");
    }
  }

  async function uploadDocuments(placeId, assets) {
    setUploadingDocuments(true);
    try {
      // Get place name for caption
      const place = items.find((item) => item.id === placeId);
      const placeName = place?.name || "";

      for (const asset of assets) {
        const { uri, name, mimeType, size } = asset;

        // Fetch the file as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Store in trips/{tripId}/media collection like the web version
        const mediaRef = doc(collection(db, "trips", tripId, "media"));
        const mediaId = mediaRef.id;

        const safeName = (name || `document_${Date.now()}`).replace(
          /[^\w.\-]+/g,
          "_"
        );
        const path = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;
        const sref = storageRef(storage, path);

        await uploadBytes(sref, blob);
        const url = await getDownloadURL(sref);

        await setDoc(mediaRef, {
          tripId,
          type: "document",
          storagePath: path,
          downloadURL: url,
          createdAt: Date.now(),
          caption: `${title.slice(0, -1)} • ${placeName}`,
          linkedSubcollection: subcollection,
          linkedId: placeId,
          fileName: name || safeName,
          fileSize: size || blob.size,
          mimeType: mimeType || "application/octet-stream",
        });
      }

      // Refresh documents list from media collection
      const mediaSnap = await getDocs(collection(db, "trips", tripId, "media"));
      const docs = [];
      mediaSnap.forEach((d) => {
        const data = d.data();
        if (data.type === "document" && data.linkedSubcollection === subcollection && data.linkedId === placeId) {
          docs.push({ id: d.id, ...data });
        }
      });
      setPlaceDocuments((prev) => ({ ...prev, [placeId]: docs }));
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploadingDocuments(false);
    }
  }

  async function deleteDocument(placeId, docId, storagePath) {
    try {
      if (storagePath) {
        const sref = storageRef(storage, storagePath);
        await deleteObject(sref);
      }
      // Delete from trips/{tripId}/media collection
      await deleteDoc(doc(db, "trips", tripId, "media", docId));

      // Update local state
      setPlaceDocuments((prev) => ({
        ...prev,
        [placeId]: (prev[placeId] || []).filter((d) => d.id !== docId),
      }));
    } catch (error) {
      Alert.alert("Error", "Failed to delete document");
    }
  }

  function openDocument(url) {
    Linking.openURL(url).catch((err) => {
      Alert.alert("Error", "Unable to open document");
    });
  }

  // Pick documents for the form (before saving)
  async function pickFormDocuments() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setPendingDocuments((prev) => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick documents");
    }
  }

  function removePendingDocument(index) {
    setPendingDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType) {
    if (mimeType?.includes("pdf")) return "PDF";
    if (mimeType?.includes("word") || mimeType?.includes("document")) return "DOC";
    if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) return "XLS";
    if (mimeType?.includes("text")) return "TXT";
    return "FILE";
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
    const documents = placeDocuments[item.id] || [];

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
        {item.phoneNumber && (
          <Text style={styles.itemPhone}>{item.phoneNumber}</Text>
        )}
        {item.websiteUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(item.websiteUrl)}>
            <Text style={styles.itemWebsite}>{item.websiteUrl}</Text>
          </TouchableOpacity>
        )}
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


        {/* Documents / Attached Files */}
        {documents.length > 0 && (
          <View style={styles.documentsContainer}>
            <Text style={styles.documentsTitle}>
              Attached Files ({documents.length})
            </Text>
            <ScrollView
              style={styles.documentsScrollView}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {documents.map((docItem) => (
                <View key={docItem.id} style={styles.documentItem}>
                  <View style={styles.documentIcon}>
                    <Text style={styles.documentIconText}>
                      {getFileIcon(docItem.mimeType)}
                    </Text>
                  </View>
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {docItem.fileName}
                    </Text>
                    <Text style={styles.documentSize}>
                      {formatFileSize(docItem.fileSize)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.documentDownloadButton}
                    onPress={() => openDocument(docItem.downloadURL)}
                  >
                    <Text style={styles.documentDownloadIcon}>⬇</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentDeleteButton}
                    onPress={() =>
                      deleteDocument(item.id, docItem.id, docItem.storagePath)
                    }
                  >
                    <Text style={styles.documentDeleteText}>×</Text>
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
              {uploading ? "Uploading..." : "Add Photos"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {
              setCurrentPhotoIndex(0);
              setViewingPhotosFor(item.id);
            }}
          >
            <Text style={styles.attachButtonText}>View Photos</Text>
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
              <PlaceAutocomplete
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                onPlaceSelect={(details) => {
                  // Match country name to our COUNTRIES array
                  const matchedCountry = matchCountryName(details.country);
                  // Match state name to our STATES_BY_COUNTRY
                  const matchedState = matchStateName(matchedCountry, details.state);

                  setForm((prev) => ({
                    ...prev,
                    name: details.name || prev.name,
                    country: matchedCountry || prev.country,
                    state: matchedState || prev.state,
                    city: details.city || prev.city,
                    address: details.address || prev.address,
                    phoneNumber: details.phoneNumber || prev.phoneNumber,
                    websiteUrl: details.websiteUrl || prev.websiteUrl,
                  }));
                }}
                placeholder={`Search for ${title.slice(0, -1).toLowerCase()}...`}
                style={styles.input}
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

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={COLORS.muted}
                value={form.phoneNumber}
                onChangeText={(text) => setForm({ ...form, phoneNumber: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="Website URL"
                placeholderTextColor={COLORS.muted}
                value={form.websiteUrl}
                onChangeText={(text) => setForm({ ...form, websiteUrl: text })}
                keyboardType="url"
                autoCapitalize="none"
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

              {/* Attach Files Section */}
              <Text style={styles.label}>Attach Files (PDF, Documents, etc.)</Text>
              <TouchableOpacity
                style={styles.attachFilesButton}
                onPress={pickFormDocuments}
              >
                <Text style={styles.attachFilesButtonText}>+ Choose Files</Text>
              </TouchableOpacity>

              {pendingDocuments.length > 0 && (
                <View style={styles.pendingDocumentsContainer}>
                  {pendingDocuments.map((docItem, index) => (
                    <View key={index} style={styles.pendingDocumentItem}>
                      <View style={styles.pendingDocumentIcon}>
                        <Text style={styles.pendingDocumentIconText}>
                          {getFileIcon(docItem.mimeType)}
                        </Text>
                      </View>
                      <View style={styles.pendingDocumentDetails}>
                        <Text style={styles.pendingDocumentName} numberOfLines={1}>
                          {docItem.name}
                        </Text>
                        <Text style={styles.pendingDocumentSize}>
                          {formatFileSize(docItem.size)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.pendingDocumentRemove}
                        onPress={() => removePendingDocument(index)}
                      >
                        <Text style={styles.pendingDocumentRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

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
          .toLowerCase()}? All photos and attached files will also be deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Photo Viewer Modal */}
      <Modal
        visible={!!viewingPhotosFor}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingPhotosFor(null)}
      >
        <View style={styles.photoModalOverlay}>
          {/* Close button at top right */}
          <TouchableOpacity
            style={styles.photoModalCloseButton}
            onPress={() => setViewingPhotosFor(null)}
          >
            <Text style={styles.photoModalCloseText}>×</Text>
          </TouchableOpacity>

          {(placePhotos[viewingPhotosFor] || []).length === 0 ? (
            <View style={styles.noPhotosContainer}>
              <Text style={styles.noPhotosTextWhite}>
                No photos yet. Tap "Add Photos" to upload.
              </Text>
            </View>
          ) : (
            <>
              {/* Photo counter */}
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {currentPhotoIndex + 1} / {(placePhotos[viewingPhotosFor] || []).length}
                </Text>
              </View>

              {/* Main photo display */}
              <View style={styles.photoSliderContainer}>
                {/* Left Arrow */}
                <TouchableOpacity
                  style={[
                    styles.arrowButton,
                    styles.arrowButtonLeft,
                    currentPhotoIndex === 0 && styles.arrowButtonDisabled,
                  ]}
                  onPress={() => setCurrentPhotoIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentPhotoIndex === 0}
                >
                  <Text style={styles.arrowText}>‹</Text>
                </TouchableOpacity>

                {/* Photo */}
                <View style={styles.photoFrame} {...panResponder.panHandlers}>
                  <Image
                    source={{
                      uri: (placePhotos[viewingPhotosFor] || [])[currentPhotoIndex]?.downloadURL,
                    }}
                    style={styles.photoModalImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Right Arrow */}
                <TouchableOpacity
                  style={[
                    styles.arrowButton,
                    styles.arrowButtonRight,
                    currentPhotoIndex >= (placePhotos[viewingPhotosFor] || []).length - 1 &&
                      styles.arrowButtonDisabled,
                  ]}
                  onPress={() =>
                    setCurrentPhotoIndex((prev) =>
                      Math.min((placePhotos[viewingPhotosFor] || []).length - 1, prev + 1)
                    )
                  }
                  disabled={currentPhotoIndex >= (placePhotos[viewingPhotosFor] || []).length - 1}
                >
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Delete button */}
              <TouchableOpacity
                style={styles.deletePhotoButton}
                onPress={() => {
                  const photos = placePhotos[viewingPhotosFor] || [];
                  const photo = photos[currentPhotoIndex];
                  if (photo) {
                    deletePhoto(viewingPhotosFor, photo.id, photo.storagePath);
                    // Adjust index if we deleted the last photo
                    if (currentPhotoIndex >= photos.length - 1 && currentPhotoIndex > 0) {
                      setCurrentPhotoIndex(currentPhotoIndex - 1);
                    }
                  }
                }}
              >
                <Text style={styles.deletePhotoButtonText}>Delete Photo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
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
  itemPhone: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  itemWebsite: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    textDecorationLine: "underline",
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
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  photosTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  noPhotosText: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: "italic",
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
  attachButton: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  attachButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: "center",
  },
  documentsContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  documentsScrollView: {
    maxHeight: 180,
  },
  documentsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  documentInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  documentIconText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  documentSize: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  documentDownloadButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.sm,
  },
  documentDownloadIcon: {
    color: COLORS.white,
    fontSize: 14,
  },
  documentDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.xs,
  },
  documentDeleteText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  // Form attach files styles
  attachFilesButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
  },
  attachFilesButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  pendingDocumentsContainer: {
    marginTop: SPACING.sm,
  },
  pendingDocumentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  pendingDocumentIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  pendingDocumentIconText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  pendingDocumentDetails: {
    flex: 1,
  },
  pendingDocumentName: {
    fontSize: 13,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  pendingDocumentSize: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  pendingDocumentRemove: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  pendingDocumentRemoveText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "600",
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
  // Photo Modal Styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  photoModalCloseText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 30,
  },
  photoCounter: {
    position: "absolute",
    top: 55,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  photoCounterText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  photoSliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 10,
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowButtonLeft: {
    marginRight: 10,
  },
  arrowButtonRight: {
    marginLeft: 10,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: "bold",
    lineHeight: 40,
  },
  photoFrame: {
    width: Dimensions.get("window").width - 140,
    height: Dimensions.get("window").height * 0.6,
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  noPhotosContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  noPhotosTextWhite: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: "center",
  },
  deletePhotoButton: {
    position: "absolute",
    bottom: 50,
    backgroundColor: COLORS.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  deletePhotoButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
