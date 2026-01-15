import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { COLORS, SPACING } from "../lib/constants";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DatePicker({
  label,
  value,
  onSelect,
  placeholder = "Select date",
  minDate,
  maxDate,
}) {
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current value or use today's date
  const parseDate = (dateStr) => {
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return { year, month: month - 1, day };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  };

  const initialDate = parseDate(value);
  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);
  const [selectedDate, setSelectedDate] = useState(value ? initialDate : null);

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Format date as YYYY-MM-DD
  const formatDate = (year, month, day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // Format date for display (MM/DD/YYYY)
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  // Check if date is disabled
  const isDateDisabled = (year, month, day) => {
    const dateStr = formatDate(year, month, day);
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  // Handle date selection
  const handleSelectDate = (day) => {
    if (isDateDisabled(viewYear, viewMonth, day)) return;

    setSelectedDate({ year: viewYear, month: viewMonth, day });
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate.year, selectedDate.month, selectedDate.day);
      onSelect(dateStr);
    }
    setModalVisible(false);
  };

  // Navigate months
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Navigate years
  const goToPrevYear = () => {
    setViewYear(viewYear - 1);
  };

  const goToNextYear = () => {
    setViewYear(viewYear + 1);
  };

  // Open modal and reset view to selected date or today
  const openModal = () => {
    const date = parseDate(value);
    setViewYear(date.year);
    setViewMonth(date.month);
    setSelectedDate(value ? date : null);
    setModalVisible(true);
  };

  // Render calendar grid
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days = [];

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate &&
        selectedDate.year === viewYear &&
        selectedDate.month === viewMonth &&
        selectedDate.day === day;
      const isDisabled = isDateDisabled(viewYear, viewMonth, day);
      const isToday = (() => {
        const today = new Date();
        return viewYear === today.getFullYear() &&
               viewMonth === today.getMonth() &&
               day === today.getDate();
      })();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
            isSelected && styles.selectedCell,
            isDisabled && styles.disabledCell,
          ]}
          onPress={() => handleSelectDate(day)}
          disabled={isDisabled}
        >
          <Text
            style={[
              styles.dayText,
              isToday && styles.todayText,
              isSelected && styles.selectedText,
              isDisabled && styles.disabledText,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.input} onPress={openModal}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Year Navigation */}
            <View style={styles.yearNav}>
              <TouchableOpacity onPress={goToPrevYear} style={styles.navButton}>
                <Text style={styles.navButtonText}>‹‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{viewYear}</Text>
              <TouchableOpacity onPress={goToNextYear} style={styles.navButton}>
                <Text style={styles.navButtonText}>››</Text>
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>{MONTHS[viewMonth]}</Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {DAYS.map((day) => (
                <View key={day} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>

            {/* Selected Date Display */}
            {selectedDate && (
              <Text style={styles.selectedDateText}>
                Selected: {MONTHS[selectedDate.month]} {selectedDate.day}, {selectedDate.year}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  onSelect("");
                  setModalVisible(false);
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedDate && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!selectedDate}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputText: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  placeholder: {
    color: COLORS.muted,
  },
  calendarIcon: {
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    width: "90%",
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
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
  yearNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  yearText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginHorizontal: SPACING.lg,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.foreground,
    marginHorizontal: SPACING.lg,
    minWidth: 100,
    textAlign: "center",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 20,
    color: COLORS.foreground,
    fontWeight: "bold",
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  dayHeaderText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  todayCell: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  selectedCell: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  disabledCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  selectedText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  disabledText: {
    color: COLORS.muted,
  },
  selectedDateText: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: SPACING.md,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  clearButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  confirmButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.muted,
  },
  confirmButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "600",
  },
});
