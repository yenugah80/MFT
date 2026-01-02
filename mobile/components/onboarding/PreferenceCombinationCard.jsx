/**
 * Preference Combination Card
 * Shows explanation of how selected dietary and cuisine preferences work together
 * Premium design with gradient and smooth animations
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, TEXT, SURFACES, SHADOWS } from '../../constants/premiumTheme';

export default function PreferenceCombinationCard({
  title = 'Your Preferences',
  description = 'Exploring your preferences...',
  dietaryPrefs = [],
  cuisinePrefs = [],
  sampleDishes = []
}) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, [title, description]);

  if (!dietaryPrefs.length && !cuisinePrefs.length) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#F3E8FF', '#E9D5FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="sparkles"
              size={20}
              color="#8B5CF6"
            />
          </View>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: TEXT.primary }]}>
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: TEXT.secondary }]}>
              Smart Recommendations
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, { color: TEXT.secondary }]}>
            {description}
          </Text>
        </View>

        {/* Preference Tags */}
        {(dietaryPrefs.length > 0 || cuisinePrefs.length > 0) && (
          <View style={styles.tagsContainer}>
            {/* Dietary Preferences */}
            {dietaryPrefs.length > 0 && (
              <View style={styles.tagGroup}>
                <Text style={[styles.tagGroupLabel, { color: TEXT.tertiary }]}>
                  Dietary
                </Text>
                <View style={styles.tags}>
                  {dietaryPrefs.map((pref) => (
                    <LinearGradient
                      key={pref}
                      colors={['#DBEAFE', '#BFDBFE']}
                      style={styles.tag}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.tagText, { color: BRAND.blue[700] }]}>
                        {typeof pref === 'string' ? pref.replace(/([A-Z])/g, ' $1').trim() : pref.id}
                      </Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}

            {/* Cuisine Preferences */}
            {cuisinePrefs.length > 0 && (
              <View style={styles.tagGroup}>
                <Text style={[styles.tagGroupLabel, { color: TEXT.tertiary }]}>
                  Cuisines
                </Text>
                <View style={styles.tags}>
                  {cuisinePrefs.map((cuisine) => (
                    <LinearGradient
                      key={cuisine}
                      colors={['#FEF3C7', '#FCD34D']}
                      style={styles.tag}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.tagText, { color: '#92400E' }]}>
                        {typeof cuisine === 'string' ? cuisine.replace(/([A-Z])/g, ' $1').trim() : cuisine.id}
                      </Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Sample Dishes */}
        {sampleDishes && sampleDishes.length > 0 && (
          <View style={styles.samplesContainer}>
            <Text style={[styles.sampleTitle, { color: TEXT.primary }]}>
              Example Foods
            </Text>
            <View style={styles.samplesList}>
              {sampleDishes.slice(0, 3).map((dish, idx) => (
                <View key={idx} style={styles.sampleItem}>
                  <View style={styles.sampleDot} />
                  <View style={styles.sampleContent}>
                    <Text style={[styles.sampleName, { color: TEXT.primary }]}>
                      {dish.name}
                    </Text>
                    {dish.protein && (
                      <Text style={[styles.sampleProtein, { color: TEXT.tertiary }]}>
                        {dish.protein}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom accent line */}
        <View style={[styles.bottomAccent, { backgroundColor: '#D8B4FE' }]} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 0
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    ...SHADOWS.lg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleSection: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500'
  },
  descriptionContainer: {
    marginBottom: 16,
    paddingHorizontal: 4
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18
  },
  tagsContainer: {
    marginBottom: 16,
    gap: 12
  },
  tagGroup: {
    gap: 8
  },
  tagGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 2
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    ...SHADOWS.sm
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  samplesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10
  },
  samplesList: {
    gap: 8
  },
  sampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  sampleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C084FC'
  },
  sampleContent: {
    flex: 1
  },
  sampleName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2
  },
  sampleProtein: {
    fontSize: 11,
    fontWeight: '500'
  },
  bottomAccent: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    marginHorizontal: -16,
    marginBottom: -16
  }
});
