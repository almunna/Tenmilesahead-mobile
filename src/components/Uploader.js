import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, collection, setDoc } from "firebase/firestore";
import { db, storage } from "../lib/firebase";
import { useAuth } from "./AuthProvider";
import { COLORS, SPACING } from "../lib/constants";

export default function Uploader({ tripId, onUploadComplete }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please grant camera roll permissions.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadMedia(result.assets);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please grant camera permissions.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadMedia(result.assets);
    }
  }

  async function uploadMedia(assets) {
    if (!user || !tripId) return;

    setUploading(true);
    setProgress(0);

    try {
      const total = assets.length;
      let completed = 0;

      for (const asset of assets) {
        const isImage = asset.type === "image";
        const isVideo = asset.type === "video";
        const kind = isImage ? "image" : isVideo ? "video" : "other";

        if (kind === "other") continue;

        // Create media document reference
        const mediaRef = doc(collection(db, "trips", tripId, "media"));
        const mediaId = mediaRef.id;

        // Generate safe filename
        const uri = asset.uri;
        const filename = uri.split("/").pop() || `media_${Date.now()}`;
        const safeName = filename.replace(/[^\w.\-]+/g, "_");
        const storagePath = `trip_media/${user.uid}/${tripId}/${mediaId}/${safeName}`;

        // Fetch the file
        const response = await fetch(uri);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const sref = storageRef(storage, storagePath);
        await uploadBytes(sref, blob);
        const downloadURL = await getDownloadURL(sref);

        // Save to Firestore
        await setDoc(mediaRef, {
          tripId,
          ownerId: user.uid,
          type: kind,
          storagePath,
          downloadURL,
          width: asset.width || null,
          height: asset.height || null,
          durationSec: asset.duration ? asset.duration / 1000 : null,
          caption: "",
          createdAt: Date.now(),
          takenAt: Date.now(),
          fileName: filename,
        });

        completed++;
        setProgress(Math.round((completed / total) * 100));
      }

      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      Alert.alert("Upload failed", "There was an error uploading your media.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  if (uploading) {
    return (
      <View style={styles.uploadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.uploadingText}>Uploading... {progress}%</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Photos & Videos</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonIcon}>🖼</Text>
          <Text style={styles.buttonText}>Choose from Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonIcon}>📷</Text>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  buttonText: {
    fontSize: 14,
    color: COLORS.foreground,
    textAlign: "center",
  },
  uploadingContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  uploadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.foreground,
  },
});
