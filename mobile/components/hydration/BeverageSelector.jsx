/**
 * BeverageSelector - Modern Categorized Beverage Selection
 *
 * Features:
 * - Organized by category (Water, Hot, Cold, Dairy, Sports, Alcohol)
 * - Caffeine badges for caffeinated drinks
 * - Alcohol warnings
 * - Dynamic health notes based on time and context
 * - Smooth animations and haptic feedback
 * - Research-backed hydration information
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SURFACES,
} from '../../constants/premiumTheme';

import {
  BEVERAGE_TYPES,
  BEVERAGE_CATEGORIES,
  DAILY_CAFFEINE_LIMIT,
  getDynamicHealthNote,
  getCaffeineStatus,
  isAlcoholicBeverage,
  getPairingRecommendation,
  shouldAvoidBeverage,
  getTimeBasedRecommendation,
} from '../../constants/beverageConstants';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// BEVERAGE CHIP COMPONENT
// ============================================================================
function BeverageChip({ bevKey, bev, selected, onSelect, totalCaffeine = 0 }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: selected ? 1 : 0,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [selected, bgAnim]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect(bevKey);
  };

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SURFACES.background.secondary, `${bev.color}15`],
  });

  const isAlcohol = isAlcoholicBeverage(bevKey);
  const hasCaffeine = bev.caffeine > 0;
  const wouldExceedLimit = hasCaffeine && (totalCaffeine + bev.caffeine > DAILY_CAFFEINE_LIMIT);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.beverageChip,
          selected && {
            borderColor: bev.color,
            ...SHADOWS.sm,
          },
        ]}
        onPress={handlePress}
        activeOpacity={1}
        accessibilityLabel={`${bev.label}, ${Math.round(bev.hydrationFactor * 100)}% hydration${hasCaffeine ? `, ${bev.caffeine}mg caffeine` : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor, borderRadius: RADIUS.lg },
          ]}
        />

        <View style={styles.beverageChipContent}>
          <Text style={styles.beverageEmoji}>{bev.emoji}</Text>
          <View style={styles.beverageInfo}>
            <Text
              style={[
                styles.beverageChipLabel,
                selected && {
                  color: bev.color,
                  fontWeight: TYPOGRAPHY.weight.bold,
                  fontFamily: TYPOGRAPHY.family.bold,
                },
              ]}
            >
              {bev.label}
            </Text>
            <Text style={styles.hydrationText}>
              {Math.round(bev.hydrationFactor * 100)}% hydration
            </Text>
          </View>

          {/* Badges */}
          <View style={styles.badgeContainer}>
            {hasCaffeine && (
              <View style={[
                styles.caffeineBadge,
                wouldExceedLimit && styles.caffeineBadgeWarning,
              ]}>
                <Ionicons
                  name="cafe"
                  size={10}
                  color={wouldExceedLimit ? SEMANTIC.warning.base : '#78350F'}
                />
                <Text style={[
                  styles.caffeineBadgeText,
                  wouldExceedLimit && styles.caffeineBadgeTextWarning,
                ]}>
                  {bev.caffeine}mg
                </Text>
              </View>
            )}
            {isAlcohol && (
              <View style={styles.alcoholBadge}>
                <Ionicons name="wine" size={10} color="#7C3AED" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// CATEGORY TAB COMPONENT
// ============================================================================
function CategoryTab({ category, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selected && { backgroundColor: `${category.color}20` },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onSelect(category.id);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={category.label}
    >
      <Ionicons
        name={category.icon}
        size={18}
        color={selected ? category.color : TEXT.tertiary}
      />
      <Text
        style={[
          styles.categoryTabText,
          selected && { color: category.color, fontWeight: TYPOGRAPHY.weight.semibold },
        ]}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// CAFFEINE TRACKER COMPONENT
// ============================================================================
function CaffeineTracker({ totalCaffeine }) {
  const status = getCaffeineStatus(totalCaffeine);
  const percentage = Math.min((totalCaffeine / DAILY_CAFFEINE_LIMIT) * 100, 100);

  if (totalCaffeine === 0) return null;

  return (
    <View style={styles.caffeineTracker}>
      <View style={styles.caffeineHeader}>
        <View style={styles.caffeineIconContainer}>
          <Ionicons name="cafe" size={16} color={status.color} />
        </View>
        <View style={styles.caffeineInfo}>
          <Text style={styles.caffeineLabel}>Today's Caffeine</Text>
          <Text style={[styles.caffeineValue, { color: status.color }]}>
            {totalCaffeine}mg / {DAILY_CAFFEINE_LIMIT}mg
          </Text>
        </View>
      </View>
      <View style={styles.caffeineProgressBg}>
        <Animated.View
          style={[
            styles.caffeineProgressFill,
            {
              width: `${percentage}%`,
              backgroundColor: status.color,
            },
          ]}
        />
      </View>
      {status.level !== 'low' && (
        <Text style={[styles.caffeineMessage, { color: status.color }]}>
          <Ionicons name={status.icon} size={12} /> {status.message}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// DYNAMIC NOTE COMPONENT
// ============================================================================
function DynamicNote({ beverageType, totalCaffeine }) {
  const note = useMemo(() => {
    const hour = new Date().getHours();
    return getDynamicHealthNote(beverageType, { totalCaffeine, hour });
  }, [beverageType, totalCaffeine]);

  const shouldAvoid = shouldAvoidBeverage(beverageType);
  const pairing = getPairingRecommendation(beverageType);
  const timeRec = getTimeBasedRecommendation();

  // Priority: Avoid warning > Pairing tip > Dynamic note > Time suggestion
  if (shouldAvoid) {
    return (
      <View style={styles.noteContainer}>
        <LinearGradient
          colors={['#FEF3C7', '#FDE68A']}
          style={styles.noteGradient}
        >
          <Ionicons name="warning" size={16} color={SEMANTIC.warning.base} />
          <Text style={styles.noteTextWarning}>
            Consider a different beverage at this time
          </Text>
        </LinearGradient>
      </View>
    );
  }

  if (pairing) {
    return (
      <View style={styles.noteContainer}>
        <LinearGradient
          colors={['#DBEAFE', '#BFDBFE']}
          style={styles.noteGradient}
        >
          <Ionicons name="water" size={16} color={SEMANTIC.info.base} />
          <Text style={styles.noteTextInfo}>
            {pairing.reason} • Pair {pairing.ratio} with water
          </Text>
        </LinearGradient>
      </View>
    );
  }

  if (note) {
    const isWarning = note.toLowerCase().includes('limit') ||
                      note.toLowerCase().includes('affect') ||
                      note.toLowerCase().includes('not recommended');
    return (
      <View style={styles.noteContainer}>
        <LinearGradient
          colors={isWarning ? ['#FEF3C7', '#FDE68A'] : ['#D1FAE5', '#A7F3D0']}
          style={styles.noteGradient}
        >
          <Ionicons
            name={isWarning ? 'information-circle' : 'leaf'}
            size={16}
            color={isWarning ? SEMANTIC.warning.base : SEMANTIC.success.base}
          />
          <Text style={isWarning ? styles.noteTextWarning : styles.noteTextSuccess}>
            {note}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  // Show time-based suggestion for water
  if (beverageType === 'water' && timeRec) {
    return (
      <View style={styles.noteContainer}>
        <LinearGradient
          colors={['#E0E7FF', '#C7D2FE']}
          style={styles.noteGradient}
        >
          <Ionicons name="time" size={16} color="#6366F1" />
          <Text style={[styles.noteTextInfo, { color: '#6366F1' }]}>
            {timeRec.suggestion}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return null;
}

// ============================================================================
// MAIN BEVERAGE SELECTOR COMPONENT
// ============================================================================
export default function BeverageSelector({
  selectedBeverage,
  onSelectBeverage,
  totalCaffeine = 0,
  showCaffeineTracker = true,
}) {
  const [selectedCategory, setSelectedCategory] = useState('water');

  // Get beverages for selected category
  const categoryBeverages = useMemo(() => {
    const category = BEVERAGE_CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return [];
    return category.beverages.map(key => ({
      key,
      ...BEVERAGE_TYPES[key],
    })).filter(Boolean);
  }, [selectedCategory]);

  // Handle category change with animation
  const handleCategoryChange = useCallback((categoryId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(categoryId);
  }, []);

  return (
    <View style={styles.container}>
      {/* Caffeine Tracker */}
      {showCaffeineTracker && totalCaffeine > 0 && (
        <CaffeineTracker totalCaffeine={totalCaffeine} />
      )}

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryContainer}
      >
        {BEVERAGE_CATEGORIES.map(category => (
          <CategoryTab
            key={category.id}
            category={category}
            selected={selectedCategory === category.id}
            onSelect={handleCategoryChange}
          />
        ))}
      </ScrollView>

      {/* Beverage Grid */}
      <View style={styles.beverageGrid}>
        {categoryBeverages.map(bev => (
          <BeverageChip
            key={bev.key}
            bevKey={bev.key}
            bev={bev}
            selected={selectedBeverage === bev.key}
            onSelect={onSelectBeverage}
            totalCaffeine={totalCaffeine}
          />
        ))}
      </View>

      {/* Dynamic Note */}
      <DynamicNote
        beverageType={selectedBeverage}
        totalCaffeine={totalCaffeine}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    ...SHADOWS.sm,
  },

  // Category Tabs
  categoryContainer: {
    marginBottom: SPACING[3],
  },
  categoryScroll: {
    gap: SPACING[2],
    paddingRight: SPACING[2],
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1.5],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
  },
  categoryTabText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Beverage Grid
  beverageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },

  // Beverage Chip
  beverageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: '45%',
  },
  beverageChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    flex: 1,
    zIndex: 1,
  },
  beverageEmoji: {
    fontSize: 24,
  },
  beverageInfo: {
    flex: 1,
  },
  beverageChipLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  hydrationText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: 1,
  },

  // Badges
  badgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  caffeineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING[1.5],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  caffeineBadgeWarning: {
    backgroundColor: '#FEE2E2',
  },
  caffeineBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#78350F',
  },
  caffeineBadgeTextWarning: {
    color: SEMANTIC.warning.base,
  },
  alcoholBadge: {
    backgroundColor: '#EDE9FE',
    padding: 4,
    borderRadius: RADIUS.full,
  },

  // Caffeine Tracker
  caffeineTracker: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  caffeineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  caffeineIconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caffeineInfo: {
    flex: 1,
  },
  caffeineLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caffeineValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  caffeineProgressBg: {
    height: 6,
    backgroundColor: SURFACES.divider,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  caffeineProgressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  caffeineMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING[2],
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Dynamic Note
  noteContainer: {
    marginTop: SPACING[3],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  noteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    padding: SPACING[3],
  },
  noteTextWarning: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.warning.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  noteTextSuccess: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  noteTextInfo: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.info.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});
