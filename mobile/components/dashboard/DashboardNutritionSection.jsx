import React from 'react';
import { View, Text } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import GlassCard from './GlassCard';
import EmptyState from '../EmptyState';

export default function DashboardNutritionSection({
  styles,
  expanded,
  onToggle,
  today,
  goals,
  aggregatedMicros,
  macroAssessment,
  uniqueFoodLogs,
  onLogMeal,
}) {
  return (
    <CollapsibleSection
      styles={styles}
      title="Nutrition Details"
      icon="beaker"
      expanded={expanded}
      onToggle={onToggle}
    >
      {uniqueFoodLogs.length > 0 ? (
        <GlassCard style={styles.sectionCard} padding="md">
          <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>
          <Text style={styles.sectionDescription}>View detailed macro and micronutrient information in the food log</Text>
        </GlassCard>
      ) : (
        <EmptyState
          icon="restaurant"
          title="Nutrition breakdown"
          description="Log meals to see your macros and micronutrients here"
          variant="compact"
        />
      )}
    </CollapsibleSection>
  );
}
