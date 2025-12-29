import React from 'react';
import { View, Text } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import GlassCard from './GlassCard';
import NutritionOverviewCard from './NutritionOverviewCard';
import MicronutrientsGrid from './MicronutrientsGrid';
import MacroBalanceCard from './MacroBalanceCard';
import EmptyState from '../EmptyState';
import { parseCalories, parseGoal, parseMacro, parseDecimal } from '../../utils/safeNumbers';

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
      title="Nutrition"
      icon="nutrition"
      expanded={expanded}
      onToggle={onToggle}
    >
      <View style={styles.sectionCard}>
        <NutritionOverviewCard
          calories={parseCalories(today.nutrition.totalCalories)}
          calorieGoal={parseGoal(goals?.dailyCalories, 2000, 800, 10000)}
          protein={parseMacro(today.nutrition.totalProtein)}
          proteinGoal={parseGoal(goals?.proteinG, 150, 20, 500)}
          carbs={parseMacro(today.nutrition.totalCarbs)}
          carbsGoal={parseGoal(goals?.carbsG, 250, 50, 600)}
          fat={parseMacro(today.nutrition.totalFats)}
          fatGoal={parseGoal(goals?.fatsG, 65, 20, 200)}
          fiber={parseDecimal(aggregatedMicros.fiber, 0)}
          fiberGoal={30}
          sugar={parseMacro(today.nutrition.totalSugars)}
          sugarGoal={50}
        />
      </View>

      {macroAssessment && macroAssessment.quality !== 'none' && (
        <MacroBalanceCard assessment={macroAssessment} />
      )}

      <View style={styles.sectionCard}>
        <MicronutrientsGrid micros={aggregatedMicros} showAll={false} />
      </View>

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
