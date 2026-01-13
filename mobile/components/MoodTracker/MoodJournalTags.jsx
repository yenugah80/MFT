/**
 * MoodJournalTags - Structured Tag Selection for Mood Context
 *
 * Features:
 * - 5 tag categories: Sleep, Exercise, Social, Weather, Work/Stress
 * - Multiple selection within each category
 * - Haptic feedback on selection
 * - Collapsible sections
 * - Icon representation for each category
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC_ACTIONS,
  MOOD_PALETTE,
  BRAND,
} from '../../constants/premiumTheme';

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TAG_CATEGORIES = {
  sleep: {
    label: 'Sleep Quality',
    icon: 'moon',
    color: MOOD_PALETTE.focused.base,    // Purple
    options: ['Poor', 'Fair', 'Good', 'Excellent'],
  },
  exercise: {
    label: 'Exercise',
    icon: 'barbell',
    color: SEMANTIC_ACTIONS.success,      // Green
    options: ['None', 'Light', 'Moderate', 'Intense'],
  },
  social: {
    label: 'Social',
    icon: 'people',
    color: MOOD_PALETTE.calm.base,        // Cyan
    options: ['Alone', 'With Friends', 'With Family', 'Crowded'],
  },
  weather: {
    label: 'Weather',
    icon: 'partly-sunny',
    color: MOOD_PALETTE.happy.base,       // Amber
    options: ['Sunny', 'Rainy', 'Cloudy', 'Snowy'],
  },
  stress: {
    label: 'Work/Stress',
    icon: 'briefcase',
    color: MOOD_PALETTE.energized.base,   // Orange
    options: ['Low', 'Medium', 'High', 'Overwhelmed'],
  },
};

const MoodJournalTags = ({ selected = {}, onChange }) => {
  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(TAG_CATEGORIES)
  );

  const toggleCategory = (category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter((c) => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const handleTagSelect = (category, option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newSelected = { ...selected };

    // Toggle selection
    if (newSelected[category] === option) {
      delete newSelected[category];
    } else {
      newSelected[category] = option;
    }

    if (onChange) {
      onChange(newSelected);
    }
  };

  const isTagSelected = (category, option) => {
    return selected[category] === option;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pricetag" size={20} color={BRAND.primary} />
        <Text style={styles.title}>Add Context</Text>
        <Text style={[styles.subtitle, { color: BRAND.primary }]}>
          {Object.keys(selected).length} selected
        </Text>
      </View>

      <ScrollView
        style={styles.categoriesContainer}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(TAG_CATEGORIES).map(([key, category]) => {
          const isExpanded = expandedCategories.includes(key);
          const hasSelection = selected[key];

          return (
            <View key={key} style={styles.categorySection}>
              {/* Category Header */}
              <TouchableOpacity
                style={[styles.categoryHeader, { backgroundColor: hexToRgba(category.color, 0.15), borderWidth: 1, borderColor: hexToRgba(category.color, 0.3) }]}
                onPress={() => toggleCategory(key)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color },
                    ]}
                  >
                    <Ionicons
                      name={category.icon}
                      size={18}
                      color={TEXT.white}
                    />
                  </View>
                  <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
                  {hasSelection && (
                    <View
                      style={[
                        styles.selectionBadge,
                        { backgroundColor: category.color },
                      ]}
                    >
                      <Text style={styles.selectionBadgeText}>
                        {selected[key]}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={category.color}
                />
              </TouchableOpacity>

              {/* Tag Options */}
              {isExpanded && (
                <View style={styles.optionsContainer}>
                  {category.options.map((option) => {
                    const isSelected = isTagSelected(key, option);

                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.tagChip,
                          {
                            backgroundColor: isSelected ? category.color : hexToRgba(category.color, 0.25),
                            borderColor: category.color,
                          },
                        ]}
                        onPress={() => handleTagSelect(key, option)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            { color: isSelected ? TEXT.white : category.color },
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Clear All Button */}
      {Object.keys(selected).length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (onChange) onChange({});
          }}
        >
          <Ionicons name="close-circle" size={18} color={MOOD_PALETTE.stressed.base} />
          <Text style={[styles.clearButtonText, { color: MOOD_PALETTE.stressed.base }]}>Clear All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  categoriesContainer: {
    maxHeight: 400,
  },
  categorySection: {
    marginBottom: SPACING[3],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  selectionBadge: {
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
  },
  selectionBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  tagChip: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    borderWidth: 2,
  },
  tagText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    marginTop: SPACING[2],
  },
  clearButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});

export default MoodJournalTags;
