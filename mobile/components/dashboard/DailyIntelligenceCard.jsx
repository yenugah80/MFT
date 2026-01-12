import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { ActionItem } from './ActionItem';
import { QuietConfidenceCard } from './QuietConfidenceCard';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

/**
 * DailyIntelligenceCard
 *
 * Main recommendation display component.
 * Shows orchestrator decisions (SPEAK, REINFORCE, PREDICT, SILENT).
 *
 * For SILENT: Shows QuietConfidenceCard instead
 * For others: Shows main insight + actions + confidence label
 *
 * @param {Object} props
 * @param {string} props.type - 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT'
 * @param {string} props.headline - Main insight headline
 * @param {string} props.subtitle - Supporting text (2 lines max)
 * @param {Object} props.visual - { type: 'gauge'|'progress'|'sparkline', data: {...} }
 * @param {Array} props.actions - [{ icon, text, description, onTap, onSuccess }, ...]
 * @param {number} props.confidence - 0-1 confidence value
 * @param {string} props.confidenceLabel - 'Low' | 'Moderate' | 'High' | 'Very High'
 * @param {string} props.lifecycleStage - User's current stage for styling
 * @param {React.ReactNode} props.visualComponent - Pre-rendered visual component (optional)
 * @returns {JSX.Element}
 */
export function DailyIntelligenceCard({
  type = 'SPEAK',
  headline,
  subtitle,
  visual,
  actions = [],
  confidence,
  confidenceLabel = 'Moderate',
  lifecycleStage = 'TRACKER',
  visualComponent,
}) {
  const { buttonLayout, padding, gap, actionColumns } = useResponsiveLayout();

  // SILENT decision: Show quiet confirmation instead
  if (type === 'SILENT') {
    return <QuietConfidenceCard />;
  }

  // Get color based on decision type
  const getTypeColor = () => {
    switch (type) {
      case 'SPEAK':
        return '#3B82F6'; // Blue - new insight
      case 'REINFORCE':
        return BRAND.emerald; // Green - keep going
      case 'PREDICT':
        return '#F59E0B'; // Amber - heads up
      default:
        return '#6B7280'; // Gray - neutral
    }
  };

  // Get icon based on decision type
  const getTypeIcon = () => {
    switch (type) {
      case 'SPEAK':
        return '🔗'; // Pattern link
      case 'REINFORCE':
        return '✓'; // Checkmark
      case 'PREDICT':
        return '🔮'; // Crystal ball
      default:
        return '💡'; // Lightbulb
    }
  };

  return (
    <View style={[styles.container, { marginHorizontal: padding }]}>
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header: Icon + Headline */}
          <View style={styles.header}>
            <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
            <Text
              style={[
                styles.headline,
                lifecycleStage === 'DISCOVERER' && styles.headlineDiscoverer,
              ]}
              numberOfLines={2}
            >
              {headline}
            </Text>
          </View>

          {/* Subtitle */}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )}

          {/* Visual Component (Gauge / Progress / Sparkline) */}
          {visualComponent && (
            <View style={styles.visualContainer}>
              {visualComponent}
            </View>
          )}

          {/* Actions - Responsive Layout */}
          {actions && actions.length > 0 && (
            <View style={[
              styles.actionsContainer,
              buttonLayout === 'stack' && styles.actionsStack,
              buttonLayout === 'twoCol' && styles.actionsTwoCol,
              buttonLayout === 'threeCol' && styles.actionsThreeCol,
              { gap },
            ]}>
              {actions.map((action, index) => (
                <ActionItem
                  key={index}
                  icon={action.icon}
                  text={action.text}
                  description={action.description}
                  onTap={action.onTap}
                  onSuccess={action.onSuccess}
                />
              ))}
            </View>
          )}

          {/* Confidence Label + Metadata */}
          <View style={styles.footer}>
            <Text style={styles.confidenceLabel}>
              Confidence: <Text style={styles.confidenceBold}>{confidenceLabel}</Text>
            </Text>
            {confidence && (
              <Text style={styles.confidencePercent}>
                {Math.round(confidence * 100)}%
              </Text>
            )}
          </View>

          {/* Type Badge */}
          <View
            style={[
              styles.typeBadge,
              { borderLeftColor: getTypeColor() },
            ]}
          >
            <Text style={styles.typeBadgeText}>{type}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',

    // Shadow iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    // Shadow Android
    elevation: 2,
  },
  gradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  content: {
    gap: 12,
  },

  // Header: Icon + Headline
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  headline: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: TEXT.primary,
    lineHeight: 24,
  },
  headlineDiscoverer: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Subtitle
  subtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    lineHeight: 20,
    marginTop: 4,
  },

  // Visual Container
  visualContainer: {
    marginVertical: 12,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions Container - Responsive Layouts
  actionsContainer: {
    marginVertical: 12,
  },
  actionsStack: {
    // Mobile <375px: Vertical stack
    flexDirection: 'column',
  },
  actionsTwoCol: {
    // Mobile 375-600px: 2 columns
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionsThreeCol: {
    // Tablet 600px+: 3 columns
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  // Footer: Confidence + Metadata
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  confidenceLabel: {
    fontSize: 13,
    color: TEXT.tertiary,
  },
  confidenceBold: {
    fontWeight: '600',
    color: TEXT.secondary,
  },
  confidencePercent: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.emerald,
  },

  // Type Badge (left border indicator)
  typeBadge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderLeftWidth: 4,
  },
  typeBadgeText: {
    // Hidden, only for accessibility
    fontSize: 0,
  },
});
