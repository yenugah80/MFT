/**
 * TreasureChest
 * Horizontally-scrolled card wrapping an AI recommendation as a "chest" to open.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { InlineFeedback } from '../feedback/RecommendationFeedback';
import { TYPOGRAPHY, TEXT, RADIUS, SHADOWS } from '../../constants/premiumTheme';
import { ACHIEVEMENT_COLORS } from './data';

const TreasureChest = ({ chest, onOpen, onLike, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const rarity = ACHIEVEMENT_COLORS.chestRarity[chest.rarity] || ACHIEVEMENT_COLORS.chestRarity.common;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(!isOpen);
    if (!isOpen && onOpen) onOpen(chest);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(chest);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: rarity.light, borderColor: rarity.primary }]}>
        <View style={styles.header}>
          <Text style={styles.icon}>{isOpen ? '📜' : rarity.icon}</Text>
          <View style={[styles.rarityTag, { backgroundColor: rarity.primary }]}>
            <Text style={styles.rarityTagText}>{rarity.name}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>{chest.name}</Text>
          {isOpen ? (
            <>
              <Text style={styles.food}>{chest.food}</Text>
              <View style={styles.benefitRow}>
                <Ionicons name="sparkles" size={11} color={rarity.secondary} />
                <Text style={[styles.benefitText, { color: rarity.secondary }]}>{chest.benefit}</Text>
              </View>
              <View style={styles.feedback}>
                <InlineFeedback onLike={handleLike} onDismiss={() => onDismiss?.(chest)} isLiked={isLiked} />
              </View>
            </>
          ) : (
            <Text style={styles.hint}>Tap to reveal</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  card: { width: 140, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1.5, ...SHADOWS.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  icon: { fontSize: 22 },
  rarityTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  rarityTagText: { fontSize: 8, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { backgroundColor: '#FFFFFF', padding: 10 },
  name: { fontSize: 13, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  food: { fontSize: 11, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary, marginTop: 2 },
  hint: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium, color: TEXT.muted, fontStyle: 'italic', marginTop: 3 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  benefitText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.medium },
  feedback: { marginTop: 8, alignItems: 'center' },
});

export default TreasureChest;
