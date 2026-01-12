import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Mood chip for dashboard
 * Shows today's mood or prompts to log
 */
const MoodChip = ({ mood, note, onLogMood }) => {
  const moodEmoji = {
    happy: '😊',
    sad: '😔',
    neutral: '😐',
    stressed: '😰',
    excited: '🤩',
    tired: '😴',
    angry: '😠',
    calm: '😌',
  };

  const hasMood = mood && mood.length > 0;

  if (!hasMood) {
    return (
      <TouchableOpacity style={styles.emptyContainer} onPress={onLogMood}>
        <Text style={styles.emptyIcon}>😊</Text>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>How are you feeling?</Text>
          <Text style={styles.emptyCta}>Tap to log your mood</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const moodLog = mood[0]; // Latest mood
  const emoji = moodEmoji[moodLog.mood.toLowerCase()] || '😊';

  return (
    <TouchableOpacity style={styles.container} onPress={onLogMood}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.content}>
        <Text style={styles.mood}>{moodLog.mood}</Text>
        {moodLog.note && (
          <Text style={styles.note} numberOfLines={1}>
            {moodLog.note}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emoji: {
    fontSize: 36,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  mood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  note: {
    fontSize: 13,
    color: TEXT.secondary,
    marginTop: 2,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  emptyContent: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
  },
  emptyCta: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 2,
  },
});

export default MoodChip;
