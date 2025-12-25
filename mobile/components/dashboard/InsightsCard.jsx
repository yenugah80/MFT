/**
 * InsightsCard Component
 * Displays smart, contextual insights based on nutrition, hydration, and time of day
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SEMANTIC,
} from '../../constants/premiumTheme';

const InsightItem = ({ insight, onAction }) => {
  const getInsightStyle = (type) => {
    switch (type) {
      case 'urgent':
        return {
          backgroundColor: `${SEMANTIC.danger.base}10`,
          borderColor: `${SEMANTIC.danger.base}30`,
          iconColor: SEMANTIC.danger.base,
          gradientColors: [SEMANTIC.danger.base, SEMANTIC.danger.dark],
        };
      case 'warning':
        return {
          backgroundColor: `${SEMANTIC.warning.base}10`,
          borderColor: `${SEMANTIC.warning.base}30`,
          iconColor: SEMANTIC.warning.base,
          gradientColors: [SEMANTIC.warning.base, '#D97706'],
        };
      case 'info':
        return {
          backgroundColor: `${SEMANTIC.info.base}10`,
          borderColor: `${SEMANTIC.info.base}30`,
          iconColor: SEMANTIC.info.base,
          gradientColors: [SEMANTIC.info.base, '#2563EB'],
        };
      case 'reminder':
        return {
          backgroundColor: `${BRAND.primary}10`,
          borderColor: `${BRAND.primary}30`,
          iconColor: BRAND.primary,
          gradientColors: SURFACES.gradient.primary,
        };
      default:
        return {
          backgroundColor: `${SEMANTIC.info.base}10`,
          borderColor: `${SEMANTIC.info.base}30`,
          iconColor: SEMANTIC.info.base,
          gradientColors: [SEMANTIC.info.base, '#2563EB'],
        };
    }
  };

  const style = getInsightStyle(insight.type);

  return (
    <View
      style={[
        styles.insightItem,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        },
      ]}
    >
      <View style={styles.insightContent}>
        <View style={[styles.insightIconContainer, { backgroundColor: `${style.iconColor}20` }]}>
          <Ionicons name={insight.icon} size={24} color={style.iconColor} />
        </View>

        <View style={styles.insightTextContainer}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </View>
      </View>

      {insight.action && onAction && (
        <TouchableOpacity
          style={styles.actionButtonContainer}
          onPress={() => onAction(insight)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={style.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>{insight.action}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function InsightsCard({ insights = [], onActionPress }) {
  if (!insights || insights.length === 0) {
    return null;
  }

  // Sort insights by priority (urgent > warning > info > reminder)
  const priorityOrder = { urgent: 0, warning: 1, info: 2, reminder: 3 };
  const sortedInsights = [...insights].sort(
    (a, b) => (priorityOrder[a.type] || 99) - (priorityOrder[b.type] || 99)
  );

  return (
    <GlassCard padding="md" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={SURFACES.gradient.primary}
            style={styles.headerIconGradient}
          >
            <Ionicons name="bulb" size={20} color="#FFF" />
          </LinearGradient>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Smart Insights</Text>
          <Text style={styles.headerSubtitle}>
            {sortedInsights.length} {sortedInsights.length === 1 ? 'recommendation' : 'recommendations'} for you
          </Text>
        </View>
      </View>

      <View style={styles.insightsList}>
        {sortedInsights.map((insight, index) => (
          <InsightItem
            key={`${insight.type}-${index}`}
            insight={insight}
            onAction={onActionPress}
          />
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerIcon: {
    marginRight: SPACING[3],
  },
  headerIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  insightsList: {
    gap: SPACING[3],
  },
  insightItem: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  insightContent: {
    flexDirection: 'row',
    padding: SPACING[3],
    alignItems: 'flex-start',
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  actionButtonContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFF',
  },
});
