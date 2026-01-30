/**
 * MicrosGrid Component
 * Displays estimated micronutrient content for a meal
 *
 * DESIGN PRINCIPLES:
 * 1. HONESTY: All values are estimates - show this clearly
 * 2. NO FALSE PRECISION: Use "~" prefix, avoid exact percentages
 * 3. SODIUM AS LIMIT: High sodium is bad, not an achievement
 * 4. NEUTRAL COLORS: Don't celebrate partial intake as "wins"
 * 5. SURFACE GAPS: Show "not detected" instead of hiding zeros
 * 6. UPPER-LIMIT AWARENESS: Warn when nutrients exceed safe limits
 * 7. COLLAPSED DEFAULT: Reduce cognitive load, expand on intent
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { DAILY_VALUES } from '../../../constants/dailyValues';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Micronutrient configuration with semantic context
 * - isLimit: true = DV is upper limit (sodium, iron excess is bad)
 * - upperLimit: warn when meal exceeds this % of DV
 */
const MICRO_CONFIG = {
  // Minerals
  calcium: { label: 'Calcium', key: 'calcium', isLimit: false },
  iron: { label: 'Iron', key: 'iron', isLimit: false, upperLimit: 50 },
  magnesium: { label: 'Magnesium', key: 'magnesium', isLimit: false },
  potassium: { label: 'Potassium', key: 'potassium', isLimit: false },
  zinc: { label: 'Zinc', key: 'zinc', isLimit: false, upperLimit: 60 },
  sodium: { label: 'Sodium', key: 'sodium', isLimit: true, upperLimit: 40 },
  // Vitamins
  vitamina: { label: 'Vitamin A', key: 'vitaminA', isLimit: false, upperLimit: 100 },
  vitaminc: { label: 'Vitamin C', key: 'vitaminC', isLimit: false },
  vitamind: { label: 'Vitamin D', key: 'vitaminD', isLimit: false, upperLimit: 100 },
  vitaminb12: { label: 'Vitamin B12', key: 'vitaminB12', isLimit: false },
  folate: { label: 'Folate', key: 'folate', isLimit: false },
};

// Display order (deficiency-prone first)
const DISPLAY_ORDER = [
  'calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'sodium',
  'vitamina', 'vitaminc', 'vitamind', 'vitaminb12', 'folate',
];

/**
 * Calculate %DV for a micronutrient
 */
function calculateDVPercentage(microKey, value) {
  const config = MICRO_CONFIG[microKey];
  if (!config) return 0;

  const dv = DAILY_VALUES[config.key];
  if (!dv || !dv.value) return 0;

  return Math.round((value / dv.value) * 100);
}

/**
 * Get semantic color for micronutrient bar
 * - Neutral by default (gray)
 * - Warning for upper-limit concerns (amber/red)
 * - Limit nutrients (sodium) use inverse logic
 */
function getBarColor(microKey, dvPercentage) {
  const config = MICRO_CONFIG[microKey];
  if (!config) return '#9CA3AF'; // Gray default

  // Sodium and limit nutrients: high is BAD
  if (config.isLimit) {
    if (dvPercentage >= 50) return '#EF4444'; // Red - excessive
    if (dvPercentage >= 30) return '#F59E0B'; // Amber - high
    return '#9CA3AF'; // Gray - acceptable
  }

  // Check upper limit warnings (iron, vitamin A can be toxic in excess)
  if (config.upperLimit && dvPercentage >= config.upperLimit) {
    return '#F59E0B'; // Amber - approaching limit
  }

  // Default: neutral gray (avoid "achievement" colors)
  return '#6B7280'; // Neutral gray
}

/**
 * Get status label for accessibility and context
 */
function getStatusLabel(microKey, dvPercentage, detected) {
  if (!detected) return 'Not detected';

  const config = MICRO_CONFIG[microKey];

  if (config?.isLimit) {
    if (dvPercentage >= 50) return 'High (limit)';
    if (dvPercentage >= 30) return 'Moderate';
    return 'Low';
  }

  if (config?.upperLimit && dvPercentage >= config.upperLimit) {
    return 'High';
  }

  return 'Detected';
}

/**
 * Single micronutrient cell - honest display
 */
function MicroCell({ microKey, value, unit, detected = true }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  const config = MICRO_CONFIG[microKey] || { label: microKey };
  const dvPercentage = detected ? calculateDVPercentage(microKey, value) : 0;
  const barColor = getBarColor(microKey, dvPercentage);
  const statusLabel = getStatusLabel(microKey, dvPercentage, detected);

  // Check for warnings
  const hasUpperWarning = config.upperLimit && dvPercentage >= config.upperLimit;
  const isLimitExceeded = config.isLimit && dvPercentage >= 50;

  return (
    <View
      style={[
        styles.microCell,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
        (hasUpperWarning || isLimitExceeded) && styles.microCellWarning,
      ]}
      accessibilityLabel={`${config.label}: ${detected ? `approximately ${dvPercentage}% of daily value` : 'not detected'}. ${statusLabel}`}
    >
      <View style={styles.microHeader}>
        <Text style={[styles.microLabel, { color: textPrimary }]} numberOfLines={1}>
          {config.label}
        </Text>
        {/* Sodium shows "limit" indicator */}
        {config.isLimit && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitBadgeText}>limit</Text>
          </View>
        )}
      </View>

      {detected ? (
        <>
          {/* Value with ~ to indicate estimation */}
          <View style={styles.valueRow}>
            <Text style={[styles.microValue, { color: textSecondary }]}>
              ~{typeof value === 'number' ? value.toFixed(0) : value}{unit || 'mg'}
            </Text>
            <Text style={[styles.dvPercentage, { color: barColor }]}>
              ~{dvPercentage}%
            </Text>
          </View>

          {/* Bar - neutral colors */}
          <View style={styles.microBarContainer}>
            <View
              style={[
                styles.microBarFill,
                {
                  width: `${Math.min(100, dvPercentage)}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>

          {/* Warning for upper limits */}
          {(hasUpperWarning || isLimitExceeded) && (
            <View style={styles.warningRow}>
              <Ionicons name="alert-circle" size={12} color="#F59E0B" />
              <Text style={styles.warningText}>
                {config.isLimit ? 'High for one meal' : 'Approaching limit'}
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.notDetected, { color: textTertiary }]}>
          Not detected
        </Text>
      )}
    </View>
  );
}

/**
 * Normalize key to match config format
 * Handles multiple formats:
 * - "calcium_mg" → "calcium"
 * - "vitaminC" → "vitaminc"
 * - "vitamin_a" → "vitamina"
 * - "vitaminA" → "vitamina"
 */
function normalizeKey(key) {
  return key
    // Handle camelCase vitamins first: vitaminA → vitamina
    .replace(/vitamin([A-Z])/g, (_, letter) => `vitamin${letter.toLowerCase()}`)
    // Remove unit suffixes: calcium_mg → calcium
    .replace(/_mg$|_g$|_mcg$|_ug$|_μg$/i, '')
    // Remove underscores: vitamin_a → vitamina
    .replace(/_/g, '')
    // Final lowercase
    .toLowerCase();
}

/**
 * Extract unit from key or value object
 */
function extractUnit(key, val) {
  if (typeof val === 'object' && val.unit) return val.unit;
  const unitMatch = key.match(/_(mg|g|mcg|ug|μg)$/i);
  if (unitMatch) return unitMatch[1];
  const normalizedKey = normalizeKey(key);
  if (['vitamina', 'vitamind', 'vitaminb12', 'folate'].includes(normalizedKey)) {
    return 'mcg';
  }
  return 'mg';
}

export default function MicrosGrid({ micros, confidence = 0.7 }) {
  const { colors, isDark } = useTheme();
  // COLLAPSED BY DEFAULT - reduces cognitive load
  const [expanded, setExpanded] = useState(false);
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  // Process micros - include ALL key nutrients (detected or not)
  const processedMicros = React.useMemo(() => {
    const microsMap = {};

    // First, populate with detected values
    if (micros && typeof micros === 'object') {
      Object.entries(micros).forEach(([key, val]) => {
        const normalizedKey = normalizeKey(key);
        if (MICRO_CONFIG[normalizedKey]) {
          const value = typeof val === 'object' ? val.value : val;
          if (value > 0) {
            microsMap[normalizedKey] = {
              key: normalizedKey,
              value,
              unit: extractUnit(key, val),
              detected: true,
            };
          }
        }
      });
    }

    // Then, fill in missing key nutrients as "not detected"
    // Only show a few "not detected" to avoid overwhelming
    const detectedCount = Object.keys(microsMap).length;
    let notDetectedShown = 0;
    const maxNotDetected = 2; // Show max 2 "not detected" nutrients

    DISPLAY_ORDER.forEach((key) => {
      if (!microsMap[key] && notDetectedShown < maxNotDetected && detectedCount > 0) {
        // Only show "not detected" if we have SOME data (not all missing)
        microsMap[key] = {
          key,
          value: 0,
          unit: ['vitamina', 'vitamind', 'vitaminb12', 'folate'].includes(key) ? 'mcg' : 'mg',
          detected: false,
        };
        notDetectedShown++;
      }
    });

    // Sort by display order
    return DISPLAY_ORDER
      .filter((key) => microsMap[key])
      .map((key) => microsMap[key]);
  }, [micros]);

  // Count detected nutrients
  const detectedCount = processedMicros.filter((m) => m.detected).length;

  // Don't render if no micros at all
  if (processedMicros.length === 0 || detectedCount === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Key nutrients detected in this meal. ${expanded ? 'Tap to collapse' : 'Tap to expand'}`}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="leaf-outline" size={18} color="#6B7280" />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Key Nutrients
          </Text>
          {/* Estimated badge instead of count */}
          <View style={styles.estimatedBadge}>
            <Text style={styles.estimatedText}>estimated</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={textSecondary}
        />
      </TouchableOpacity>

      {/* Collapsed summary */}
      {!expanded && (
        <Text style={[styles.collapsedSummary, { color: textTertiary }]}>
          {detectedCount} nutrients detected in this meal
        </Text>
      )}

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={textTertiary} />
            <Text style={[styles.disclaimerText, { color: textTertiary }]}>
              Values are AI estimates. Actual content may vary based on preparation.
            </Text>
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {processedMicros.map((micro) => (
              <MicroCell
                key={micro.key}
                microKey={micro.key}
                value={micro.value}
                unit={micro.unit}
                detected={micro.detected}
              />
            ))}
          </View>

          {/* Footer note */}
          <Text style={[styles.footerNote, { color: textTertiary }]}>
            % DV = % of Daily Value (2000 cal diet). ~{' '}indicates estimate.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING[4],
    marginVertical: SPACING[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  estimatedBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  estimatedText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collapsedSummary: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING[1],
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[1],
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  disclaimerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING[2],
    gap: SPACING[2],
  },
  microCell: {
    width: '48%',
    borderRadius: 10,
    padding: SPACING[3],
  },
  microCellWarning: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  microHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  microLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    flex: 1,
  },
  limitBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  limitBadgeText: {
    color: '#D97706',
    fontSize: 8,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING[1],
  },
  microValue: {
    fontSize: 11,
  },
  dvPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  microBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  microBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  notDetected: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: SPACING[1],
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING[1],
  },
  warningText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  footerNote: {
    fontSize: 10,
    marginTop: SPACING[3],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
