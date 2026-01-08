/**
 * Cuisine Preferences Section
 * Displays user's cuisine preferences with visual indicators and strength levels
 * Shows emoji-based cuisine indicators with heart strength ratings
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, SHADOWS } from '../../constants/premiumTheme';

const CUISINE_EMOJI = {
  mediterranean: '🌍',
  asian: '🥢',
  indian: '🍛',
  italian: '🍝',
  mexican: '🌮',
  thai: '🌶️',
  japanese: '🍣',
  american: '🍔',
  french: '🥖',
  korean: '🔥',
  chinese: '🍜',
  middle_eastern: '🫔',
  vegetarian: '🥗',
  vegan: '🌱',
};

const STRENGTH_LABELS = {
  1: 'Open to it',
  2: 'Prefer it',
  3: 'Like it',
  4: 'Really like it',
  5: 'Essential',
};

const STRENGTH_COLORS = {
  1: '#94A3B8',
  2: '#CBD5E1',
  3: '#FCD34D',
  4: '#FBBF24',
  5: '#F97316',
};

export default function CuisinePreferencesSection({ preferences = [], isEditing = false, onUpdate = () => {} }) {
  const [expandedCuisine, setExpandedCuisine] = useState(null);

  const getCuisineEmoji = useCallback((cuisineId) => {
    return CUISINE_EMOJI[cuisineId] || '🍽️';
  }, []);

  const renderStrengthHearts = useCallback((strength) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Text
        key={index}
        style={{
          fontSize: 16,
          marginRight: 2,
          opacity: index < strength ? 1 : 0.3,
        }}
      >
        ❤️
      </Text>
    ));
  }, []);

  const renderCuisineChip = useCallback((pref) => {
    const strength = pref.strength || 3;
    const isExpanded = expandedCuisine === pref.id;

    return (
      <TouchableOpacity
        key={pref.id}
        onPress={() => setExpandedCuisine(isExpanded ? null : pref.id)}
        style={styles.cuisineChip}
      >
        <LinearGradient
          colors={isExpanded ? ['#F3E8FF', '#E9D5FF'] : [SURFACES.card.background.default, SURFACES.card.background.elevated]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipGradient}
        >
          <View style={styles.chipContent}>
            <Text style={styles.cuisineEmoji}>{getCuisineEmoji(pref.id)}</Text>
            <View style={styles.cuisineInfo}>
              <Text style={[styles.cuisineName, { color: TEXT.secondary }]}>
                {pref.id.replace(/_/g, ' ')}
              </Text>
              {isExpanded ? (
                <View style={styles.expandedContent}>
                  <View style={styles.strengthRow}>
                    {renderStrengthHearts(strength)}
                  </View>
                  <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                    {STRENGTH_LABELS[strength]}
                  </Text>
                </View>
              ) : (
                <View style={styles.strengthIndicator}>
                  <View style={styles.strengthDots}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.strengthDot,
                          {
                            backgroundColor:
                              index < strength ? STRENGTH_COLORS[strength] : '#E2E8F0',
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
          {isExpanded && (
            <Ionicons
              name="chevron-up"
              size={20}
              color="#8B5CF6"
            />
          )}
          {!isExpanded && (
            <Ionicons
              name="chevron-down"
              size={20}
              color={TEXT.tertiary}
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [expandedCuisine, getCuisineEmoji, renderStrengthHearts]);

  if (preferences.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="restaurant-outline" size={40} color={TEXT.tertiary} />
        <Text style={[styles.emptyStateText, { color: TEXT.secondary }]}>
          No cuisine preferences set yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {preferences.map(renderCuisineChip)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  cuisineChip: {
    minWidth: 160,
    maxWidth: 200,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  chipGradient: {
    padding: 12,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cuisineEmoji: {
    fontSize: 28,
  },
  cuisineInfo: {
    flex: 1,
    gap: 4,
  },
  cuisineName: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  expandedContent: {
    gap: 4,
  },
  strengthRow: {
    flexDirection: 'row',
    gap: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  strengthIndicator: {
    gap: 4,
  },
  strengthDots: {
    flexDirection: 'row',
    gap: 3,
  },
  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
