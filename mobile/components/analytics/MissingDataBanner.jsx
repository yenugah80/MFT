/**
 * MissingDataBanner Component
 *
 * Shows a friendly message when user has gaps in their logged data.
 * Explains impact on analytics and encourages consistent logging.
 * Supports different severity levels and actionable suggestions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, SEMANTIC } from '../../constants/premiumTheme';

// Severity levels for missing data
const SEVERITY = {
  info: {
    icon: 'information-circle',
    color: SEMANTIC.info,
    bgColor: '#3B82F610',
  },
  warning: {
    icon: 'alert-circle',
    color: SEMANTIC.warning,
    bgColor: '#F59E0B10',
  },
  critical: {
    icon: 'warning',
    color: SEMANTIC.error,
    bgColor: '#EF444410',
  },
};

const MissingDataBanner = ({
  gaps = [],
  severity = 'info',
  domain,
  onLogNow,
  onDismiss,
  compact = false,
}) => {
  const config = SEVERITY[severity] || SEVERITY.info;

  // Generate friendly, engaging messages based on gaps
  const getMessage = () => {
    if (!gaps || gaps.length === 0) {
      return "We're missing some entries to give you the full picture";
    }

    // If gaps is an array of date ranges
    if (typeof gaps[0] === 'object' && gaps[0].startDate) {
      const totalDays = gaps.reduce((sum, gap) => sum + (gap.days || 1), 0);
      if (totalDays === 1) {
        return "Looks like you missed a day - no worries, we've got you covered!";
      }
      if (totalDays <= 3) {
        return `We missed you for ${totalDays} days! Let's get back on track`;
      }
      return `Welcome back! It's been ${totalDays} days - ready to pick up where we left off?`;
    }

    // If gaps is an array of domains
    if (typeof gaps[0] === 'string') {
      const domainMessages = {
        nutrition: "Haven't logged any meals yet",
        hydration: "No drinks tracked yet",
        mood: "No mood check-ins yet",
        activity: "No activities logged yet",
      };
      const messages = gaps.map(d => domainMessages[d] || d);
      return messages.length === 1 ? messages[0] : `${messages.join(' and ')} - let's change that!`;
    }

    return gaps[0].message || "We're missing some entries";
  };

  const getSuggestion = () => {
    if (domain === 'hydration') {
      return 'Pro tip: Log water right after meals - it becomes a habit fast!';
    }
    if (domain === 'mood') {
      return 'Quick 5-second check-ins reveal powerful patterns over time';
    }
    if (domain === 'nutrition') {
      return 'Even a quick "had lunch" helps us spot your eating rhythms';
    }
    if (domain === 'activity') {
      return 'Every step counts! Even a short walk is worth celebrating';
    }
    return 'The more you log, the smarter your insights become';
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
        <Text style={[styles.compactText, { color: config.color }]} numberOfLines={1}>
          {getMessage()}
        </Text>
        {onLogNow && (
          <TouchableOpacity onPress={onLogNow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.compactAction}>Log</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={styles.header}>
        <View style={styles.iconTitleRow}>
          <Ionicons name={config.icon} size={22} color={config.color} />
          <Text style={[styles.title, { color: config.color }]}>
            {severity === 'critical' ? 'Quick heads up!' : "Here's the thing..."}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={TEXT.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.message}>{getMessage()}</Text>

      <View style={styles.suggestionRow}>
        <Ionicons name="bulb-outline" size={14} color={TEXT.secondary} />
        <Text style={styles.suggestion}>{getSuggestion()}</Text>
      </View>

      {/* Gap Details */}
      {gaps && gaps.length > 0 && typeof gaps[0] === 'object' && gaps[0].startDate && (
        <View style={styles.gapDetails}>
          {gaps.slice(0, 3).map((gap, index) => (
            <View key={index} style={styles.gapItem}>
              <Ionicons name="calendar-outline" size={12} color={TEXT.tertiary} />
              <Text style={styles.gapText}>
                {gap.startDate === gap.endDate
                  ? formatDate(gap.startDate)
                  : `${formatDate(gap.startDate)} - ${formatDate(gap.endDate)}`}
              </Text>
            </View>
          ))}
          {gaps.length > 3 && (
            <Text style={styles.moreGaps}>+{gaps.length - 3} more periods</Text>
          )}
        </View>
      )}

      {/* Action Button */}
      {onLogNow && (
        <TouchableOpacity style={styles.actionButton} onPress={onLogNow}>
          <Ionicons name="add-circle" size={18} color={BRAND.primary} />
          <Text style={styles.actionText}>Let's Go!</Text>
        </TouchableOpacity>
      )}

      {/* Interpolation Notice */}
      {severity === 'info' && gaps && gaps.length > 0 && (
        <View style={styles.notice}>
          <Ionicons name="sparkles" size={12} color={TEXT.tertiary} />
          <Text style={styles.noticeText}>
            We've filled in some estimates based on your usual patterns
          </Text>
        </View>
      )}
    </View>
  );
};

// Helper to format dates nicely
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: TEXT.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  suggestion: {
    flex: 1,
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  gapDetails: {
    backgroundColor: SURFACES.card.primary,
    padding: 12,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  gapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gapText: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  moreGaps: {
    fontSize: 12,
    color: TEXT.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.primary + '15',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: TEXT.tertiary,
    lineHeight: 14,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  compactAction: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
});

export default MissingDataBanner;
