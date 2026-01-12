/**
 * CollapsibleSection - Progressive Disclosure Component
 *
 * Used for below-the-fold content that should be accessible but not
 * compete for attention with primary dashboard cards.
 *
 * Design Principles:
 * - Reduce cognitive load: Secondary content is collapsed by default
 * - Clear affordance: Users know content is expandable
 * - Smooth animations: Native driver for 60fps
 * - Accessible: Proper labels and states
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
} from '../constants/premiumTheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * CollapsibleSection Component
 *
 * @param {string} title - Section title
 * @param {string} subtitle - Optional subtitle/description
 * @param {React.ReactNode} children - Content to show when expanded
 * @param {boolean} defaultExpanded - Initial expanded state
 * @param {string} icon - Ionicons icon name
 * @param {string} iconColor - Icon color
 * @param {function} onToggle - Callback when toggled
 * @param {boolean} disabled - Disable expansion
 * @param {string} badge - Optional badge text (e.g., "3 new")
 */
export default function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  icon,
  iconColor = TEXT.tertiary,
  onToggle,
  disabled = false,
  badge,
  testID,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpanded = useCallback(() => {
    if (disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate chevron rotation
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();

    // Animate content height
    LayoutAnimation.configureNext({
      duration: 250,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    setExpanded(!expanded);
    onToggle?.(!expanded);
  }, [expanded, disabled, rotateAnim, onToggle]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container} testID={testID}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={[styles.header, disabled && styles.headerDisabled]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}. ${expanded ? 'Tap to collapse' : 'Tap to expand'}`}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
          )}
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, disabled && styles.titleDisabled]}>
                {title}
              </Text>
              {badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={disabled ? TEXT.muted : TEXT.tertiary}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Content - Conditionally rendered */}
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

/**
 * CollapsibleSectionGroup - Groups multiple sections with dividers
 */
export function CollapsibleSectionGroup({ children, style }) {
  return (
    <View style={[styles.group, style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index}>
          {index > 0 && <View style={styles.divider} />}
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * SimpleCollapsible - Minimal version without card styling
 */
export function SimpleCollapsible({
  title,
  children,
  defaultExpanded = false,
  titleStyle,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggle = () => {
    Haptics.selectionAsync();
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View>
      <TouchableOpacity
        style={styles.simpleHeader}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.simpleTitle, titleStyle]}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={16} color={TEXT.tertiary} />
        </Animated.View>
      </TouchableOpacity>
      {expanded && <View style={styles.simpleContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
    padding: 0,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
  },
  headerDisabled: {
    opacity: 0.5,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  titleDisabled: {
    color: TEXT.muted,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Badge
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },

  // Content
  content: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    padding: SPACING[4],
  },

  // Group
  group: {
    ...CARD_SYSTEM.standard,
    padding: 0,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: SPACING[4],
  },

  // Simple variant
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
  },
  simpleTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  simpleContent: {
    paddingTop: SPACING[2],
  },
});
