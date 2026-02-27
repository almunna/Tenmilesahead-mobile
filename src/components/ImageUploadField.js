import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import { useAuth } from "./AuthProvider";
import { COLORS, SPACING } from "../lib/constants";

export default function ImageUploadField({
  label = "Photos",
  images = [],
  onImagesChange,
  maxImages = 10,
  showCoverOption = false,
  coverImageId,
  onCoverChange,
  storagePath = "uploads",
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please grant camera roll permissions.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadImages(result.assets);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please grant camera permissions.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadImages(result.assets);
    }
  }

  async function uploadImages(assets) {
    if (!user) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      Alert.alert("Limit reached", `Maximum ${maxImages} images allowed.`);
      return;
    }

    const toUpload = assets.slice(0, remainingSlots);
    setUploading(true);

    try {
      const newImages = [];

      for (const asset of toUpload) {
        const uri = asset.uri;
        const filename = uri.split("/").pop() || `image_${Date.now()}`;
        const safeName = filename.replace(/[^\w.\-]+/g, "_");
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const path = `${storagePath}/${user.uid}/${imageId}/${safeName}`;

        const response = await fetch(uri);
        const blob = await response.blob();

        const sref = storageRef(storage, path);
        await uploadBytes(sref, blob);
        const downloadURL = await getDownloadURL(sref);

        newImages.push({
          id: imageId,
          uri: downloadURL,
          storagePath: path,
          caption: "",
          width: asset.width || null,
          height: asset.height || null,
        });
      }

      onImagesChange([...images, ...newImages]);
    } catch (error) {
      Alert.alert("Upload failed", "There was an error uploading your images.");
    } finally {
      setUploading(false);
    }
  }

  function updateCaption(imageId, caption) {
    const updated = images.map((img) =>
      img.id === imageId ? { ...img, caption } : img
    );
    onImagesChange(updated);
  }

  function removeImage(imageId) {
    const updated = images.filter((img) => img.id !== imageId);
    onImagesChange(updated);
    if (coverImageId === imageId && onCoverChange) {
      onCoverChange(null);
    }
  }

  function setCover(imageId) {
    if (onCoverChange) {
      onCoverChange(imageId);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Image list */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageList}
          contentContainerStyle={styles.imageListContent}
        >
          {images.map((img) => (
            <View key={img.id} style={styles.imageItem}>
              <View style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.image} />
                {showCoverOption && coverImageId === img.id && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(img.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.captionInput}
                placeholder="Add caption..."
                placeholderTextColor={COLORS.muted}
                value={img.caption}
                onChangeText={(text) => updateCaption(img.id, text)}
                multiline
                numberOfLines={2}
              />
              {showCoverOption && coverImageId !== img.id && (
                <TouchableOpacity
                  style={styles.setCoverButton}
                  onPress={() => setCover(img.id)}
                >
                  <Text style={styles.setCoverText}>Set as Cover</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Upload buttons */}
      {images.length < maxImages && (
        <View style={styles.buttonRow}>
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadIcon}>🖼</Text>
                <Text style={styles.uploadText}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>Camera</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {images.length > 0 && (
        <Text style={styles.countText}>
          {images.length} / {maxImages} images
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  imageList: {
    marginBottom: SPACING.sm,
  },
  imageListContent: {
    gap: SPACING.sm,
  },
  imageItem: {
    width: 150,
    marginRight: SPACING.sm,
  },
  imageWrapper: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: 150,
    height: 100,
    borderRadius: 8,
  },
  coverBadge: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "600",
  },
  removeButton: {
    position: "absolute",
    top: SPACING.xs,
    right: SPACING.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 18,
  },
  captionInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    padding: SPACING.xs,
    marginTop: SPACING.xs,
    color: COLORS.foreground,
    fontSize: 12,
    minHeight: 40,
  },
  setCoverButton: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.xs,
    alignItems: "center",
  },
  setCoverText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    gap: SPACING.sm,
  },
  uploadIcon: {
    fontSize: 20,
  },
  uploadText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  uploadingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  uploadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  countText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "right",
    marginTop: SPACING.xs,
  },
});
