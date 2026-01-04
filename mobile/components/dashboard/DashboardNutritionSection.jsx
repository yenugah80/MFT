import React from 'react';
import { View, Text } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import GlassCard from './GlassCard';
import MacroBalanceCard from './MacroBalanceCard';
import EmptyState from '../EmptyState';
import { parseCalories } from '../../utils/safeNumbers';

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
      {/* Macro Balance Assessment */}
      {macroAssessment && macroAssessment.quality !== 'none' && (
        <MacroBalanceCard assessment={macroAssessment} />
      )}

      {uniqueFoodLogs.length > 0 ? (
        <GlassCard style={styles.sectionCard} padding="md">
          <Text style={styles.sectionTitle}>Recent Meals</Text>
          {uniqueFoodLogs.slice(0, 3).map((log) => (
            <View key={log.id} style={styles.mealItem}>
              <View style={styles.mealDot} />
              <View style={styles.mealContent}>
                <Text style={styles.mealName}>{log.foodName}</Text>
                <Text style={styles.mealMeta}>
                  {log.mealType} · {Math.round(parseCalories(log.calories))} kcal
                </Text>
              </View>
            </View>
          ))}
        </GlassCard>
      ) : (
        <EmptyState
          icon="restaurant"
          title="No meals logged yet"
          description="Track your first meal to start building your nutrition insights and discover patterns in your eating habits"
          actionLabel="Log Your First Meal"
          onAction={onLogMeal}
          variant="compact"
        />
      )}
    </CollapsibleSection>
  );
}
