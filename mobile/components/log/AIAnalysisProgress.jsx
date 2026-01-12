/**
 * AIAnalysisProgress - Trust-Building Analysis Component
 * Shows transparent, step-by-step AI analysis to build user confidence
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ANALYSIS_STEPS = [
  {
    id: 1,
    icon: 'eye-outline',
    text: 'Analyzing image',
    duration: 1500,
    color: '#6B4EFF',
  },
  {
    id: 2,
    icon: 'search-outline',
    text: 'Identifying foods and portions',
    duration: 2000,
    color: '#3B82F6',
  },
  {
    id: 3,
    icon: 'calculator-outline',
    text: 'Estimating nutrition from public data',
    duration: 1500,
    color: '#10B981',
  },
  {
    id: 4,
    icon: 'checkmark-circle-outline',
    text: 'Finalizing estimate',
    duration: 1000,
    color: '#22C55E',
  },
];

export default function AIAnalysisProgress({ mode = 'photo' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate through steps
    const timer = setTimeout(() => {
      if (currentStep < ANALYSIS_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }, ANALYSIS_STEPS[currentStep]?.duration || 1500);

    // Animate progress bar
    Animated.timing(progress, {
      toValue: ((currentStep + 1) / ANALYSIS_STEPS.length) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Trust Badge */}
      <View style={styles.trustBadge}>
        <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
        <Text style={styles.trustText}>AI-assisted • Estimate in progress</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth }
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>
          {Math.round(((currentStep + 1) / ANALYSIS_STEPS.length) * 100)}%
        </Text>
      </View>

      {/* Analysis Steps */}
      <View style={styles.stepsContainer}>
        {ANALYSIS_STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <View
              key={step.id}
              style={[
                styles.stepRow,
                isActive && styles.stepRowActive
              ]}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: isActive ? `${step.color}15` : `${SEMANTIC_ACTIONS.success}0D` }
              ]}>
                <Ionicons
                  name={isComplete ? 'checkmark-circle' : step.icon}
                  size={22}
                  color={isActive || isComplete ? step.color : '#9CA3AF'}
                />
              </View>

              <View style={styles.stepTextContainer}>
                <Text style={[
                  styles.stepText,
                  isActive && styles.stepTextActive,
                  isComplete && styles.stepTextComplete
                ]}>
                  {step.text}
                </Text>

                {isActive && (
                  <View style={styles.loadingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                )}
              </View>

              {isComplete && (
                <Ionicons name="checkmark" size={18} color="#22C55E" />
              )}
            </View>
          );
        })}
      </View>

      {/* Data Sources */}
      <View style={styles.sourcesContainer}>
        <Text style={styles.sourcesTitle}>Data Sources:</Text>
        <View style={styles.sourcesList}>
          <SourceBadge icon="flask-outline" text="Public nutrition data" color="#3B82F6" />
          <SourceBadge icon="eye-outline" text="Vision model" color="#10B981" />
          <SourceBadge icon="library-outline" text="Common portion guides" color="#F59E0B" />
        </View>
      </View>

      {/* Confidence Indicator */}
      <View style={styles.confidenceContainer}>
        <LinearGradient
          colors={['#10B981', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.confidenceGradient}
        >
          <Ionicons name="analytics-outline" size={16} color="#FFFFFF" />
          <Text style={styles.confidenceText}>
            Estimate ready for review
          </Text>
        </LinearGradient>
      </View>

      {/* Help Text */}
      <Text style={styles.helpText}>
        You&apos;ll be able to review and adjust the results before saving
      </Text>
    </View>
  );
}

function SourceBadge({ icon, text, color }) {
  return (
    <View style={[styles.sourceBadge, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.sourceBadgeText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Trust Badge
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 6,
  },

  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6B4EFF',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B4EFF',
    marginLeft: 12,
    minWidth: 40,
  },

  // Steps
  stepsContainer: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  stepRowActive: {
    backgroundColor: `${SEMANTIC_ACTIONS.success}0D`,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepTextActive: {
    color: TEXT.primary,
    fontWeight: '600',
  },
  stepTextComplete: {
    color: '#9CA3AF',
  },

  // Loading Dots
  loadingDots: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B4EFF',
    marginRight: 4,
  },
  dot1: {
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },

  // Sources
  sourcesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    marginBottom: 12,
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Confidence
  confidenceContainer: {
    marginBottom: 12,
  },
  confidenceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  // Help Text
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
