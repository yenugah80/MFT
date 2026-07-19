/**
 * QuestCard
 * Single row card used for both static daily quests and API-driven
 * daily/weekly challenges — the two previously had near-identical,
 * separately-maintained implementations (QuestCard + ChallengeCard).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, TYPOGRAPHY, TEXT, RADIUS, SHADOWS } from '../../constants/premiumTheme';

/**
 * @param {string} icon - emoji shown in the leading icon chip
 * @param {string} title
 * @param {string} description
 * @param {number} xp - XP reward shown when not completed
 * @param {string} color - accent color for the icon chip + progress fill
 * @param {boolean} completed
 * @param {{ current: number, target: number }} [progress] - renders a progress bar when provided and not completed
 * @param {() => void} onPress
 */
const QuestCard = ({ icon, title, description, xp, color, completed, progress, onPress }) => {
  const accent = color || BRAND.primary;
  const progressPercent = progress ? Math.min((progress.current / Math.max(progress.target, 1)) * 100, 100) : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, completed && styles.cardCompleted]}>
        <View style={[styles.iconWrap, { backgroundColor: completed ? '#D1FAE5' : `${accent}20` }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, completed && styles.titleDone]} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
          {!!progress && !completed && (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accent }]} />
              </View>
              <Text style={styles.progressText}>{progress.current}/{progress.target}</Text>
            </View>
          )}
        </View>
        <View style={styles.reward}>
          {completed ? (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          ) : (
            <View style={styles.xpChip}>
              <Text style={styles.xpValue}>+{xp}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 13,
    ...SHADOWS.sm,
  },
  cardCompleted: { backgroundColor: '#ECFDF5' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  content: { flex: 1, marginLeft: 11 },
  title: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  titleDone: { textDecorationLine: 'line-through', color: TEXT.tertiary },
  description: { fontSize: 11, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary, marginTop: 1 },
  progressRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.tertiary },
  reward: { alignItems: 'center', marginLeft: 8 },
  checkBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  xpChip: { alignItems: 'center' },
  xpValue: { fontSize: 15, fontFamily: TYPOGRAPHY.family.bold, color: BRAND.primary },
  xpLabel: { fontSize: 8, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.muted },
});

export default QuestCard;
