import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  SafeAreaView,
} from "react-native";
import { COLORS, SPACING } from "../lib/constants";

export default function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  searchable = false,
  allowCustom = false,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (option) => {
    onSelect(option);
    setModalVisible(false);
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomValue("");
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onSelect(customValue.trim());
    }
    setModalVisible(false);
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomValue("");
  };

  const openCustomInput = () => {
    setShowCustomInput(true);
    setCustomValue(value || "");
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setShowCustomInput(false);
          setSearchQuery("");
          setCustomValue("");
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setShowCustomInput(false);
                  setSearchQuery("");
                  setCustomValue("");
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {showCustomInput ? (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Enter custom value:</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Type here..."
                  placeholderTextColor={COLORS.muted}
                  value={customValue}
                  onChangeText={setCustomValue}
                  autoFocus
                />
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.customBackButton}
                    onPress={() => setShowCustomInput(false)}
                  >
                    <Text style={styles.customBackButtonText}>Back to List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.customSubmitButton,
                      !customValue.trim() && styles.customSubmitButtonDisabled,
                    ]}
                    onPress={handleCustomSubmit}
                    disabled={!customValue.trim()}
                  >
                    <Text style={styles.customSubmitButtonText}>Use This</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {searchable && (
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor={COLORS.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                )}

                {allowCustom && (
                  <TouchableOpacity
                    style={styles.customOption}
                    onPress={openCustomInput}
                  >
                    <Text style={styles.customOptionIcon}>✏️</Text>
                    <Text style={styles.customOptionText}>Enter custom value</Text>
                  </TouchableOpacity>
                )}

                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.option,
                        value === item && styles.optionSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          value === item && styles.optionTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                      {value === item && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No options found</Text>
                      {allowCustom && (
                        <TouchableOpacity
                          style={styles.emptyCustomButton}
                          onPress={openCustomInput}
                        >
                          <Text style={styles.emptyCustomButtonText}>
                            Enter custom value
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  }
                />

                {value && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => handleSelect("")}
                  >
                    <Text style={styles.clearButtonText}>Clear Selection</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  dropdown: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.foreground,
    flex: 1,
  },
  placeholder: {
    color: COLORS.muted,
  },
  arrow: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: SPACING.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  searchInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    margin: SPACING.md,
    color: COLORS.foreground,
    fontSize: 16,
  },
  customOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: `${COLORS.primary}15`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customOptionIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  customOptionText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionSelected: {
    backgroundColor: `${COLORS.primary}20`,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
  },
  emptyCustomButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  emptyCustomButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "600",
  },
  clearButton: {
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  customInputContainer: {
    padding: SPACING.lg,
  },
  customInputLabel: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  customInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    color: COLORS.foreground,
    fontSize: 16,
    marginBottom: SPACING.lg,
  },
  customInputButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  customBackButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  customBackButtonText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  customSubmitButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  customSubmitButtonDisabled: {
    backgroundColor: COLORS.muted,
  },
  customSubmitButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "600",
  },
});
