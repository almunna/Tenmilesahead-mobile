import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import { COLORS, SPACING } from "../lib/constants";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export default function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a place...",
  style,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  // Debounced search function
  const searchPlaces = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json"
      );
      url.searchParams.set("input", query);
      url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
      url.searchParams.set("types", "establishment");

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" && data.predictions?.length > 0) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (text) => {
    onChange(text);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  // Fetch place details when a suggestion is selected
  const handleSelectPlace = async (prediction) => {
    setIsLoading(true);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();

    try {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/details/json"
      );
      url.searchParams.set("place_id", prediction.place_id);
      url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
      url.searchParams.set(
        "fields",
        "name,formatted_address,formatted_phone_number,international_phone_number,website,address_components,geometry"
      );

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const result = data.result;

        // Parse address components
        const addressComponents = result.address_components || [];
        let country = "";
        let state = "";
        let city = "";
        let streetNumber = "";
        let route = "";

        for (const component of addressComponents) {
          const types = component.types || [];

          if (types.includes("country")) {
            country = component.long_name;
          }
          if (
            types.includes("administrative_area_level_1") ||
            types.includes("administrative_area_level_2")
          ) {
            // Prefer level 1 for state, but use level 2 as fallback
            if (types.includes("administrative_area_level_1")) {
              state = component.long_name;
            } else if (!state) {
              state = component.long_name;
            }
          }
          if (
            types.includes("locality") ||
            types.includes("sublocality") ||
            types.includes("postal_town")
          ) {
            // Prefer locality over sublocality
            if (types.includes("locality") || types.includes("postal_town")) {
              city = component.long_name;
            } else if (!city) {
              city = component.long_name;
            }
          }
          if (types.includes("street_number")) {
            streetNumber = component.long_name;
          }
          if (types.includes("route")) {
            route = component.long_name;
          }
        }

        // Build street address
        let address = "";
        if (streetNumber && route) {
          address = `${streetNumber} ${route}`;
        } else if (route) {
          address = route;
        }

        const details = {
          name: result.name || "",
          address,
          city,
          state,
          country,
          phoneNumber:
            result.formatted_phone_number ||
            result.international_phone_number ||
            "",
          websiteUrl: result.website || "",
          formattedAddress: result.formatted_address || "",
        };

        // Update the name field
        onChange(
          details.name ||
            prediction.structured_formatting?.main_text ||
            prediction.description
        );

        // Notify parent of selected place details
        onPlaceSelect(details);
      } else {
        // If details fetch fails, just use the name from prediction
        onChange(
          prediction.structured_formatting?.main_text || prediction.description
        );
      }
    } catch (error) {
      // Use prediction name as fallback
      onChange(
        prediction.structured_formatting?.main_text || prediction.description
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, style]}
          value={value}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionsList}
          >
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Text style={styles.suggestionMainText}>
                  {item.structured_formatting?.main_text || item.description}
                </Text>
                {item.structured_formatting?.secondary_text && (
                  <Text style={styles.suggestionSecondaryText}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    color: COLORS.foreground,
    fontSize: 16,
  },
  loadingIndicator: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -10,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
});
