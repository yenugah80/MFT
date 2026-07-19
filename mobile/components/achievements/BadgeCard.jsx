/**
 * BadgeCard
 * Tile for a single achievement in the horizontal Badges row. Backed by the
 * real achievements/user_achievements system (GET /gamification/achievements) —
 * each achievement is its own unlockable entry (e.g. streak_3, streak_7,
 * streak_14 are three separate cards), not a synthetic tiered badge, since
 * that's what the underlying data actually models.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, TYPOGRAPHY, TEXT, RADIUS, SHADOWS } from '../../constants/premiumTheme';

const BadgeCard = ({ achievement }) => {
  const isEarned = !!achievement.isUnlocked;

  return (
    <View style={[styles.card, isEarned && { borderColor: BRAND.primary, borderWidth: 2 }]}>
      <View style={[styles.iconWrap, { backgroundColor: isEarned ? `${BRAND.primary}20` : '#E5E7EB' }]}>
        <Text style={styles.emoji}>{achievement.icon || '🏅'}</Text>
        {isEarned && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={10} color="#FFF" />
          </View>
        )}
      </View>
      <Text style={[styles.name, !isEarned && { color: TEXT.tertiary }]} numberOfLines={1}>{achievement.name}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {isEarned ? `+${achievement.xp} XP earned` : achievement.description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { width: 110, backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 12, alignItems: 'center', ...SHADOWS.sm },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' },
  emoji: { fontSize: 22 },
  checkBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF',
  },
  name: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary, textAlign: 'center' },
  description: { fontSize: 9.5, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.muted, textAlign: 'center', marginTop: 3, lineHeight: 13 },
});

export default BadgeCard;
