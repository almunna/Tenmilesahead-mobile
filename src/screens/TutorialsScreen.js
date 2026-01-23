import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

export default function TutorialsScreen({ navigation }) {
  const [tutorials, setTutorials] = useState([]);
  const [filteredTutorials, setFilteredTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVideo, setPlayingVideo] = useState(null); // Track which video is playing

  useEffect(() => {
    loadTutorials();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTutorials(tutorials);
    } else {
      const filtered = tutorials.filter(
        (tutorial) =>
          tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tutorial.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
      setFilteredTutorials(filtered);
    }
  }, [searchQuery, tutorials]);

  async function loadTutorials() {
    try {
      const q = query(
        collection(db, "tutorials"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const tutorialsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTutorials(tutorialsData);
      setFilteredTutorials(tutorialsData);
    } catch (error) {
      console.error("Error loading tutorials:", error);
    } finally {
      setLoading(false);
    }
  }

  function getYouTubeThumbnail(url) {
    try {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } catch (error) {
      console.error("Error extracting YouTube ID:", error);
    }
    return null;
  }

  function getYouTubeEmbedUrl(url) {
    try {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (error) {
      console.error("Error extracting YouTube ID:", error);
    }
    return "";
  }

  function extractYouTubeVideoId(url) {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  function openVideo(url) {
    Linking.openURL(url).catch((err) =>
      console.error("Error opening video:", err),
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tutorials...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Tutorials</Text>
        <Text style={styles.subtitle}>
          Watch step-by-step videos to get the most out of your travel planning.
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tutorials..."
          placeholderTextColor={COLORS.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tutorials Grid */}
      {filteredTutorials.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery
              ? "No tutorials found matching your search."
              : "No tutorials available yet. Check back soon!"}
          </Text>
        </View>
      ) : (
        <View style={styles.tutorialsGrid}>
          {filteredTutorials.map((tutorial) => {
            const thumbnail = getYouTubeThumbnail(tutorial.url);
            const embedUrl = getYouTubeEmbedUrl(tutorial.url);

            return (
              <View key={tutorial.id} style={styles.tutorialCard}>
                {/* Thumbnail - Click to play in modal */}
                <TouchableOpacity
                  style={styles.thumbnailContainer}
                  onPress={() => setPlayingVideo(tutorial)}
                >
                  {thumbnail ? (
                    <Image
                      source={{ uri: thumbnail }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <Text style={styles.playButtonText}>▶</Text>
                  </View>
                </TouchableOpacity>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.tutorialTitle} numberOfLines={2}>
                    {tutorial.title}
                  </Text>
                  {tutorial.description && (
                    <Text style={styles.tutorialDescription} numberOfLines={2}>
                      {tutorial.description}
                    </Text>
                  )}
                  <Text style={styles.tutorialDate}>
                    {formatDate(tutorial.createdAt)}
                  </Text>

                  {/* Open in YouTube Button */}
                  <TouchableOpacity
                    style={styles.youtubeButton}
                    onPress={() => openVideo(tutorial.url)}
                  >
                    <Text style={styles.youtubeButtonText}>
                      📺 Open in YouTube
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Video Player Modal */}
      {playingVideo && (
        <Modal
          visible={!!playingVideo}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setPlayingVideo(null)}
        >
          <View style={styles.videoModalContainer}>
            {/* Header */}
            <View style={styles.videoModalHeader}>
              <TouchableOpacity
                style={styles.closeVideoButton}
                onPress={() => setPlayingVideo(null)}
              >
                <Text style={styles.closeVideoButtonText}>✕ Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openYoutubeButton}
                onPress={() => {
                  openVideo(playingVideo.url);
                  setPlayingVideo(null);
                }}
              >
                <Text style={styles.openYoutubeButtonText}>
                  📺 Open in YouTube
                </Text>
              </TouchableOpacity>
            </View>

            {/* Video Player */}
            <View style={styles.videoPlayerContainer}>
              {getYouTubeEmbedUrl(playingVideo.url) ? (
                <WebView
                  style={styles.webview}
                  source={{ uri: getYouTubeEmbedUrl(playingVideo.url) }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                />
              ) : (
                <View style={styles.videoError}>
                  <Text style={styles.videoErrorText}>
                    Unable to load video
                  </Text>
                </View>
              )}
            </View>

            {/* Video Info */}
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{playingVideo.title}</Text>
              {playingVideo.description && (
                <Text style={styles.videoDescription}>
                  {playingVideo.description}
                </Text>
              )}
              <Text style={styles.videoDate}>
                {formatDate(playingVideo.createdAt)}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    marginTop: 20,
    padding: scaleSpacing(SPACING.md),
  },
  loadingContainer: {
    flex: 1,
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
    marginBottom: scaleSpacing(SPACING.lg),
  },
  title: {
    fontSize: scaleFontSize(32),
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  subtitle: {
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
  },
  searchContainer: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
    fontSize: scaleFontSize(16),
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyContainer: {
    paddingVertical: scaleSpacing(SPACING.xl * 2),
    alignItems: "center",
  },
  emptyText: {
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
    textAlign: "center",
  },
  tutorialsGrid: {
    gap: scaleSpacing(SPACING.md),
  },
  tutorialCard: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: scaleSpacing(SPACING.md),
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surfaceLight,
    position: "relative",
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
    backgroundColor: COLORS.surfaceLight,
  },
  playIcon: {
    fontSize: scaleFontSize(48),
    color: COLORS.muted,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playButtonText: {
    fontSize: scaleFontSize(40),
    color: COLORS.white,
  },
  cardContent: {
    padding: scaleSpacing(SPACING.md),
  },
  tutorialTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  tutorialDescription: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  tutorialDate: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: scaleSpacing(SPACING.lg),
    marginTop: scaleSpacing(SPACING.md),
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(16),
  },
  youtubeButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    marginTop: scaleSpacing(SPACING.sm),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  youtubeButtonText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  videoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingTop: scaleSpacing(SPACING.xl + SPACING.sm), // Account for status bar
  },
  closeVideoButton: {
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
  },
  closeVideoButtonText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  openYoutubeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
  },
  openYoutubeButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
  videoPlayerContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.black,
    width: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  videoError: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
  },
  videoErrorText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(16),
  },
  videoInfo: {
    padding: scaleSpacing(SPACING.md),
  },
  videoTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  videoDescription: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.sm),
    lineHeight: scaleFontSize(20),
  },
  videoDate: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },
});
