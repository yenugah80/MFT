/**
 * Allergen Warning Card
 * Shows urgent warnings when allergens are detected in logged meals
 * Premium design with red gradient, pulse animation
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  AccessibilityInfo
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, TEXT, SHADOWS, RADIUS, SPACING } from '../../constants/premiumTheme';

export default function AllergenWarningCard({ warnings = [], onRemoveMeal }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for urgent alerts
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulseAnim]);

  // Announce for accessibility
  useEffect(() => {
    if (warnings && warnings.length > 0) {
      AccessibilityInfo.announceForAccessibility(
        `Warning: ${warnings.length} meal(s) contain your allergens`
      );
    }
  }, [warnings.length]);

  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={['#FEE2E2', '#FECACA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, styles.urgentCard]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
          </View>
          <Text style={styles.title}>⚠️ Allergen Alert</Text>
        </View>

        {/* Warning message */}
        <Text style={styles.message}>
          {warnings.length} meal{warnings.length > 1 ? 's' : ''} logged today contain
          your allergen{warnings.length > 1 ? 's' : ''}
        </Text>

        {/* Warnings list */}
        <ScrollView style={styles.warningsList} scrollEnabled={warnings.length > 2}>
          {warnings.map((warning, idx) => (
            <View key={warning.id || idx} style={styles.warningItem}>
              <View style={styles.warningItemLeft}>
                <View style={styles.allergenBadge}>
                  <Ionicons name="alert" size={14} color="#DC2626" />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{warning.meal}</Text>
                  <View style={styles.allergenTags}>
                    {warning.allergens.slice(0, 2).map((allergen, i) => (
                      <View key={i} style={styles.allergenTag}>
                        <Text style={styles.allergenTagText}>{allergen}</Text>
                      </View>
                    ))}
                    {warning.allergens.length > 2 && (
                      <View style={styles.allergenTag}>
                        <Text style={styles.allergenTagText}>
                          +{warning.allergens.length - 2}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Remove button */}
              <Pressable
                onPress={() => onRemoveMeal?.(warning.mealId)}
                style={({ pressed }) => [
                  styles.removeBtn,
                  pressed && styles.removeBtnPressed
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${warning.meal}`}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* Action note */}
        <View style={styles.actionNote}>
          <Ionicons name="information-circle" size={14} color="#DC2626" />
          <Text style={styles.actionNoteText}>
            Please review and remove these meals immediately
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING[4]
  },
  container: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    ...SHADOWS.sm
  },
  urgentCard: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
    gap: SPACING[2]
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: SPACING[3],
    lineHeight: 18
  },
  warningsList: {
    maxHeight: 200,
    marginBottom: SPACING[3]
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2]
  },
  warningItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2]
  },
  allergenBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mealInfo: {
    flex: 1
  },
  mealName: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: SPACING[1]
  },
  allergenTags: {
    flexDirection: 'row',
    gap: SPACING[1],
    flexWrap: 'wrap'
  },
  allergenTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
    minHeight: 20,
    justifyContent: 'center'
  },
  allergenTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeBtnPressed: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)'
  },
  actionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
    borderRadius: RADIUS.md
  },
  actionNoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
    flex: 1,
    lineHeight: 16
  }
});
