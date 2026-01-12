/**
 * EvidenceTimeline
 *
 * Visual timeline showing when a pattern was observed
 * Displayed in expanded CorrelationCard to show evidence history
 *
 * Shows:
 * - Dates when pattern occurred
 * - Confidence level at that time
 * - Key contextual information
 *
 * @param {Object} props
 * @param {Array} props.evidence - Array of evidence points: { date, strength, context, tags }
 * @param {string} props.pattern - Pattern name (e.g., "High-NOVA Food → Mood Crashes")
 * @param {number} props.limit - Max evidence points to show (default: 7)
 * @returns {JSX.Element}
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { TEXT, SURFACES } from '../../constants/premiumTheme';

export function EvidenceTimeline({
  evidence = [],
  pattern = '',
  limit = 7,
}) {
  const screenWidth = Dimensions.get('window').width;

  if (!evidence || evidence.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No evidence yet</Text>
      </View>
    );
  }

  // Sort by date descending (most recent first) and limit
  const sortedEvidence = evidence
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  /**
   * Format date for display
   */
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // For older dates, show day of week + date
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Get color based on strength (confidence)
   */
  const getStrengthColor = (strength) => {
    if (strength >= 0.8) return '#10B981'; // Strong - Green
    if (strength >= 0.6) return '#F59E0B'; // Moderate - Amber
    if (strength >= 0.4) return '#EF4444'; // Weak - Red
    return '#9CA3AF'; // Very Weak - Gray
  };

  /**
   * Render single evidence item
   */
  const renderEvidenceItem = ({ item, index }) => {
    const isLast = index === sortedEvidence.length - 1;
    const strength = item.strength || 0.5;
    const strengthPercent = Math.round(strength * 100);

    return (
      <View style={[styles.evidenceItem, !isLast && styles.evidenceItemNotLast]}>
        {/* Timeline Dot */}
        <View style={styles.dotContainer}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: getStrengthColor(strength),
                width: 12 + strength * 8, // Dot size scales with strength
                height: 12 + strength * 8,
              },
            ]}
          />
          {/* Vertical Line to Next Item */}
          {!isLast && <View style={styles.verticalLine} />}
        </View>

        {/* Evidence Content */}
        <View style={styles.evidenceContent}>
          <View style={styles.evidenceHeader}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <View style={[
              styles.strengthBadge,
              { backgroundColor: getStrengthColor(strength) },
            ]}>
              <Text style={styles.strengthText}>{strengthPercent}%</Text>
            </View>
          </View>

          {/* Context Information */}
          {item.context && (
            <Text style={styles.contextText}>{item.context}</Text>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Timeline Header */}
      <Text style={styles.timelineTitle}>Evidence Timeline</Text>
      <Text style={styles.timelineSubtitle}>
        {sortedEvidence.length} observation{sortedEvidence.length !== 1 ? 's' : ''} of this pattern
      </Text>

      {/* Evidence List */}
      <FlatList
        scrollEnabled={false}
        data={sortedEvidence}
        renderItem={renderEvidenceItem}
        keyExtractor={(item, index) => `evidence-${index}`}
        contentContainerStyle={styles.listContent}
      />

      {/* Show More Info */}
      {evidence.length > limit && (
        <Text style={styles.moreText}>
          +{evidence.length - limit} more observation{evidence.length - limit !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginVertical: 8,
  },

  // Header
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginBottom: 12,
  },

  // List Container
  listContent: {
    paddingVertical: 8,
  },

  // Evidence Item
  evidenceItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  evidenceItemNotLast: {
    // Padding for vertical line
  },

  // Timeline Dot & Line
  dotContainer: {
    width: 28,
    alignItems: 'center',
    paddingTop: 4,
    position: 'relative',
  },
  dot: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  verticalLine: {
    position: 'absolute',
    top: 28,
    left: 13,
    width: 2,
    height: 24,
    backgroundColor: '#D1D5DB',
  },

  // Evidence Content
  evidenceContent: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 4,
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.primary,
  },

  // Strength Badge
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: SURFACES.divider,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Context Text
  contextText: {
    fontSize: 12,
    color: TEXT.secondary,
    lineHeight: 16,
    marginBottom: 6,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  tagText: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },

  // More Text
  moreText: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
