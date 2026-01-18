/**
 * StoryCard
 *
 * Displays "Remember when" and pattern discovery stories
 * to help users understand their wellness patterns.
 *
 * Features:
 * - Animated entrance
 * - Domain-themed styling
 * - Expandable for more details
 * - Reaction buttons for user feedback
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { TEXT, SURFACES } from '../../constants/premiumTheme';

// Story type configurations
const STORY_CONFIGS = {
  pattern_discovered: {
    icon: 'analytics',
    gradientColors: ['#8B5CF6', '#6366F1'],
    actionLabel: 'Got it!',
  },
  learning: {
    icon: 'bulb',
    gradientColors: ['#F59E0B', '#EAB308'],
    actionLabel: 'Interesting!',
  },
  milestone: {
    icon: 'trophy',
    gradientColors: ['#10B981', '#059669'],
    actionLabel: 'Celebrate!',
  },
  cross_domain_insight: {
    icon: 'link',
    gradientColors: ['#EC4899', '#F43F5E'],
    actionLabel: 'Cool!',
  },
  remember_when: {
    icon: 'time',
    gradientColors: ['#3B82F6', '#0EA5E9'],
    actionLabel: 'I remember!',
  },
};

// Acknowledge story API
async function acknowledgeStory(storyId, reaction) {
  const response = await apiClient.post(
    `/predictions/stories/${storyId}/acknowledge`,
    { reaction }
  );
  return response.data;
}

export default function StoryCard({
  story,
  onDismiss,
  animationDelay = 0,
  style,
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const queryClient = useQueryClient();

  // Mutation for acknowledging story
  const acknowledgeMutation = useMutation({
    mutationFn: ({ storyId, reaction }) => acknowledgeStory(storyId, reaction),
    onSuccess: () => {
      queryClient.invalidateQueries(['predictions-stories']);
    },
  });

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleReaction = (reaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDismissed(true);
      acknowledgeMutation.mutate({ storyId: story.id, reaction });
      onDismiss?.(story.id, reaction);
    });
  };

  const handleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  if (dismissed) return null;

  const config = STORY_CONFIGS[story.storyType] || STORY_CONFIGS.pattern_discovered;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.emoji}>{story.storyEmoji || '✨'}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{story.storyTitle}</Text>

        {/* Body */}
        <TouchableOpacity onPress={handleExpand} activeOpacity={0.8}>
          <Text
            style={styles.body}
            numberOfLines={expanded ? undefined : 2}
          >
            {story.storyBody}
          </Text>
          {!expanded && story.storyBody?.length > 100 && (
            <Text style={styles.readMore}>Tap to read more</Text>
          )}
        </TouchableOpacity>

        {/* Related dates if available */}
        {expanded && story.relatedDates?.length > 0 && (
          <View style={styles.datesContainer}>
            <Text style={styles.datesLabel}>Based on:</Text>
            <Text style={styles.dates}>
              {story.relatedDates.slice(0, 3).join(', ')}
            </Text>
          </View>
        )}

        {/* Reaction buttons */}
        <View style={styles.reactionsContainer}>
          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReaction('helpful')}
          >
            <Text style={styles.reactionButtonText}>
              {config.actionLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleReaction('already_knew')}
          >
            <Text style={styles.secondaryButtonText}>Already knew</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissIconButton}
            onPress={() => handleReaction('dismissed')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  readMore: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  datesLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 6,
  },
  dates: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  reactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  reactionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  reactionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dismissIconButton: {
    marginLeft: 'auto',
    padding: 4,
  },
});
