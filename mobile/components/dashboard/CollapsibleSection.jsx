import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SURFACES, TEXT, BRAND } from '../../constants/premiumTheme';

export default function CollapsibleSection({
  styles,
  title,
  icon,
  expanded,
  onToggle,
  children,
  badge,
}) {
  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title} section`}
        accessibilityHint={`${expanded ? 'Collapse' : 'Expand'} to ${expanded ? 'hide' : 'show'} ${title} details`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.collapsibleLeft}>
          <LinearGradient
            colors={expanded ? SURFACES.gradient.primary : SURFACES.gradient.softPurple}
            style={styles.collapsibleIconContainer}
          >
            <Ionicons name={icon} size={20} color={expanded ? '#FFF' : BRAND.primary} />
          </LinearGradient>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {badge && (
            <View style={styles.collapsibleBadge}>
              <Text style={styles.collapsibleBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={TEXT.secondary}
        />
      </TouchableOpacity>

      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
}
