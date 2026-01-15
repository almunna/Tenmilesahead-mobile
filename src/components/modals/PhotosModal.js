import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
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
import { COLORS, SPACING } from "../../lib/constants";

export default function PhotosModal({ tripId, visible, onClose }) {
  const { user } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState(null);
  const [trip, setTrip] = useState(null);

  // Fetch trip data to know current cover
  useEffect(() => {
    if (!tripId || !visible) return;

    const unsub = onSnapshot(doc(db, "trips", tripId), (snap) => {
      if (snap.exists()) {
        setTrip({ id: snap.id, ...snap.data() });
      }
    });

    return () => unsub();
  }, [tripId, visible]);

  useEffect(() => {
    if (!tripId || !visible) return;

    const q = query(
      collection(db, "trips", tripId, "media"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setMedia(arr);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
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
      uploadFiles(result.assets);
    }
  }

  async function uploadFiles(assets) {
    setUploading(true);
    try {
      // Check if trip already has a cover photo
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      const existingCoverMediaId = tripSnap.exists()
        ? tripSnap.data()?.coverMediaId
        : null;

      let firstImageMediaId = null;

      for (const asset of assets) {
        const { uri, type, fileName } = asset;
        const isImage = type === "image";
        const isVideo = type === "video";
        const kind = isImage ? "image" : isVideo ? "video" : "other";
        if (kind === "other") continue;

        // Fetch the file as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        const mediaRef = doc(collection(db, "trips", tripId, "media"));
        const mediaId = mediaRef.id;

        const safeName = (fileName || `photo_${Date.now()}`).replace(
          /[^\w.\-]+/g,
          "_"
        );
        const path = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;
        const sref = storageRef(storage, path);

        await uploadBytes(sref, blob);
        const url = await getDownloadURL(sref);

        await setDoc(mediaRef, {
          tripId: tripId,
          type: kind,
          storagePath: path,
          downloadURL: url,
          createdAt: Date.now(),
          takenAt: Date.now(),
          caption: "",
          fileName: safeName,
          size: blob.size,
          contentType: blob.type,
        });

        if (isImage && !firstImageMediaId) {
          firstImageMediaId = mediaId;
        }
      }

      // Only update cover photo if trip doesn't have an existing cover
      if (firstImageMediaId && !existingCoverMediaId) {
        await updateDoc(doc(db, "trips", tripId), {
          coverMediaId: firstImageMediaId,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  }

  async function setCover(mediaId) {
    try {
      await updateDoc(doc(db, "trips", tripId), {
        coverMediaId: mediaId,
        updatedAt: Date.now(),
      });
    } catch (error) {
      Alert.alert("Error", "Failed to set cover photo");
    }
  }

  async function saveCaption(mediaId, caption) {
    try {
      await updateDoc(doc(db, "trips", tripId, "media", mediaId), {
        caption,
      });
      setEditingCaption(null);
    } catch (error) {
      Alert.alert("Error", "Failed to save caption");
    }
  }

  async function deleteMedia(mediaId, storagePath) {
    Alert.alert("Delete Media", "Are you sure you want to delete this media?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Delete from storage
            if (storagePath) {
              const sref = storageRef(storage, storagePath);
              await deleteObject(sref);
            }

            // Delete from Firestore
            await deleteDoc(doc(db, "trips", tripId, "media", mediaId));

            // If this was the cover photo, clear it
            if (trip?.coverMediaId === mediaId) {
              await updateDoc(doc(db, "trips", tripId), {
                coverMediaId: null,
                updatedAt: Date.now(),
              });
            }
          } catch (error) {
            Alert.alert("Error", "Failed to delete media");
          }
        },
      },
    ]);
  }

  function renderItem({ item }) {
    const isCover = trip?.coverMediaId === item.id;

    return (
      <View style={styles.mediaCard}>
        <TouchableOpacity activeOpacity={0.9}>
          {item.type === "image" ? (
            <Image
              source={{ uri: item.downloadURL }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.videoThumbnail}>
              <Text style={styles.videoIcon}>▶</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.mediaActions}>
          <TouchableOpacity onPress={() => setCover(item.id)}>
            <Text style={[styles.actionText, isCover && styles.activeAction]}>
              {isCover ? "✓ Cover" : "Set as cover"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteMedia(item.id, item.storagePath)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.captionInput}
          value={
            editingCaption?.id === item.id
              ? editingCaption.text
              : item.caption || ""
          }
          onChangeText={(text) => setEditingCaption({ id: item.id, text })}
          onBlur={() => {
            if (editingCaption?.id === item.id) {
              saveCaption(item.id, editingCaption.text);
            }
          }}
          placeholder="Add a caption..."
          placeholderTextColor={COLORS.muted}
          multiline
        />
      </View>
    );
  }

  return (
    <ModalShell
      visible={visible}
      title="Photos & Videos"
      onClose={onClose}
      fullScreen={true}
      noScroll={true}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickImages}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.uploadButtonText}>
              📷 Upload Photos/Videos
            </Text>
          )}
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : media.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>
              Upload photos and videos to your trip
            </Text>
          </View>
        ) : (
          <FlatList
            data={media}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
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
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
  list: {
    paddingBottom: SPACING.lg,
  },
  mediaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  mediaImage: {
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
  videoIcon: {
    fontSize: 48,
    color: COLORS.white,
  },
  mediaActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  activeAction: {
    fontWeight: "600",
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
});
