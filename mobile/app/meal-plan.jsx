import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../services/apiClient';
import {
  BRAND, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS,
} from '../constants/premiumTheme';

const MEAL_TYPE_COLOR = {
  breakfast: '#F59E0B',
  lunch:     '#3B82F6',
  dinner:    '#8B5CF6',
  snack:     '#10B981',
};

const MEAL_TYPE_ICON = {
  breakfast: 'sunny-outline',
  lunch:     'restaurant-outline',
  dinner:    'moon-outline',
  snack:     'cafe-outline',
};

const GROCERY_ICONS = {
  produce:  'leaf-outline',
  proteins: 'fish-outline',
  grains:   'grid-outline',
  dairy:    'water-outline',
  pantry:   'cube-outline',
};

// ─── Day card ────────────────────────────────────────────────────────────────

function DayCard({ day, expanded, onToggle }) {
  return (
    <View style={styles.dayCard}>
      <TouchableOpacity style={styles.dayHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.dayHeaderLeft}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{day.day}</Text>
          </View>
          <Text style={styles.dayLabel}>{day.date_label}</Text>
        </View>
        <View style={styles.dayHeaderRight}>
          <Text style={styles.dayCalories}>{day.day_totals?.calories ?? '—'} kcal</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT.tertiary} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mealsContainer}>
          {(day.meals || []).map((meal, i) => (
            <View key={i} style={[styles.mealRow, i > 0 && styles.mealBorder]}>
              <View style={[styles.mealTypeDot, { backgroundColor: MEAL_TYPE_COLOR[meal.meal_type] || '#6B7280' }]} />
              <View style={styles.mealInfo}>
                <View style={styles.mealTitleRow}>
                  <Ionicons name={MEAL_TYPE_ICON[meal.meal_type] || 'restaurant-outline'} size={13} color={MEAL_TYPE_COLOR[meal.meal_type] || TEXT.tertiary} />
                  <Text style={styles.mealType}>{meal.meal_type}</Text>
                  {meal.prep_time_min && (
                    <View style={styles.prepBadge}>
                      <Ionicons name="time-outline" size={11} color={TEXT.tertiary} />
                      <Text style={styles.prepText}>{meal.prep_time_min}m</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.mealName}>{meal.name}</Text>
                {meal.description && <Text style={styles.mealDesc}>{meal.description}</Text>}
                <View style={styles.mealMacros}>
                  <MacroPill label="Cal" value={meal.calories} color="#EF4444" />
                  <MacroPill label="P" value={`${meal.protein_g}g`} color="#10B981" />
                  <MacroPill label="C" value={`${meal.carbs_g}g`} color="#F59E0B" />
                  <MacroPill label="F" value={`${meal.fat_g}g`} color="#8B5CF6" />
                </View>
              </View>
            </View>
          ))}
          {/* Day totals footer */}
          <View style={styles.dayTotalsRow}>
            <Text style={styles.dayTotalsLabel}>Daily total</Text>
            <Text style={styles.dayTotalsValues}>
              {day.day_totals?.calories} kcal · P {day.day_totals?.protein_g}g · C {day.day_totals?.carbs_g}g · F {day.day_totals?.fat_g}g
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function MacroPill({ label, value, color }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '18' }]}>
      <Text style={[styles.macroPillText, { color }]}>{label}: {value}</Text>
    </View>
  );
}

// ─── Grocery list ────────────────────────────────────────────────────────────

function GrocerySection({ groceryList }) {
  if (!groceryList) return null;
  const sections = Object.entries(groceryList).filter(([, items]) => Array.isArray(items) && items.length > 0);
  if (sections.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="cart-outline" size={20} color={BRAND.primary} />
        <Text style={styles.sectionTitle}>Grocery List</Text>
      </View>
      {sections.map(([category, items]) => (
        <View key={category} style={styles.groceryCategory}>
          <View style={styles.groceryCategoryHeader}>
            <Ionicons name={GROCERY_ICONS[category] || 'list-outline'} size={15} color={TEXT.secondary} />
            <Text style={styles.groceryCategoryTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.groceryItem}>
              <View style={styles.groceryDot} />
              <Text style={styles.groceryItemText}>{item}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Generate options modal ──────────────────────────────────────────────────

function GenerateModal({ visible, onClose, onGenerate, loading }) {
  const [days, setDays] = useState('7');
  const [meals, setMeals] = useState('3');
  const [cuisine, setCuisine] = useState('');
  const [goal, setGoal] = useState('');

  const handleGenerate = () => {
    onGenerate({
      days: parseInt(days, 10) || 7,
      mealsPerDay: parseInt(meals, 10) || 3,
      cuisine: cuisine.trim() || undefined,
      goal: goal.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generate Meal Plan</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={TEXT.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Days (1–7)</Text>
            <TextInput style={styles.optionInput} value={days} onChangeText={setDays} keyboardType="numeric" maxLength={1} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Meals per day (2–5)</Text>
            <TextInput style={styles.optionInput} value={meals} onChangeText={setMeals} keyboardType="numeric" maxLength={1} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Cuisine (optional)</Text>
            <TextInput style={[styles.optionInput, { width: 130 }]} value={cuisine} onChangeText={setCuisine} placeholder="e.g. Mediterranean" placeholderTextColor={TEXT.tertiary} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Goal override</Text>
            <TextInput style={[styles.optionInput, { width: 100 }]} value={goal} onChangeText={setGoal} placeholder="lose/maintain/gain" placeholderTextColor={TEXT.tertiary} />
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, loading && { opacity: 0.6 }]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Ionicons name="sparkles-outline" size={18} color="#FFF" />
                  <Text style={styles.generateBtnText}>Generate with AI</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MealPlanScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [groceryList, setGroceryList] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [expandedDay, setExpandedDay] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showGrocery, setShowGrocery] = useState(false);

  const handleGenerate = useCallback(async (options) => {
    setGenerating(true);
    setShowModal(false);
    try {
      const result = await apiClient.post('/meal-plan', options);
      if (!result?.plan) throw new Error('No plan returned');
      setPlan(result.plan);
      setGroceryList(result.grocery_list || null);
      setWeeklySummary(result.weekly_summary || null);
      setGeneratedAt(result.generatedAt);
      setExpandedDay(0);
    } catch (err) {
      Alert.alert('Generation failed', err?.message || 'Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await apiClient.post('/meal-plan/save', { plan });
      Alert.alert('Saved!', 'Your meal plan has been saved.');
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [plan]);

  const toggleDay = (idx) => setExpandedDay(prev => prev === idx ? -1 : idx);

  return (
    <View style={[{ flex: 1, backgroundColor: '#FFFFFF' }, styles.container]}>
      {/* Header */}
      <LinearGradient
        colors={[BRAND.primary, BRAND.secondary || '#6366F1']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard'))}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>AI-generated weekly plan tailored to your goals</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Empty / Loading state */}
        {!plan && !generating && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={TEXT.tertiary} />
            <Text style={styles.emptyTitle}>No meal plan yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a personalized weekly plan based on your nutrition goals, dietary restrictions, and allergens.
            </Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="sparkles-outline" size={18} color="#FFF" />
              <Text style={styles.ctaBtnText}>Generate My Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {generating && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={BRAND.primary} />
            <Text style={styles.loadingTitle}>Generating your plan…</Text>
            <Text style={styles.loadingSubtitle}>AI is crafting meals tailored to your goals</Text>
          </View>
        )}

        {plan && !generating && (
          <>
            {/* Action bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => setShowModal(true)}>
                <Ionicons name="refresh-outline" size={16} color={BRAND.primary} />
                <Text style={styles.actionBtnSecondaryText}>Regenerate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => setShowGrocery(v => !v)}>
                <Ionicons name="cart-outline" size={16} color={BRAND.primary} />
                <Text style={styles.actionBtnSecondaryText}>{showGrocery ? 'Hide' : 'Grocery'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnPrimary, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="bookmark-outline" size={16} color="#FFF" />}
                <Text style={styles.actionBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly summary */}
            {weeklySummary && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCTitle}>Weekly Average</Text>
                <View style={styles.summaryRow}>
                  <SummaryPill label="Calories" value={`${weeklySummary.avg_daily_calories}`} unit="kcal" color="#EF4444" />
                  <SummaryPill label="Protein"  value={`${weeklySummary.avg_protein_g}`} unit="g" color="#10B981" />
                  <SummaryPill label="Carbs"    value={`${weeklySummary.avg_carbs_g}`}   unit="g" color="#F59E0B" />
                  <SummaryPill label="Fat"      value={`${weeklySummary.avg_fat_g}`}     unit="g" color="#8B5CF6" />
                </View>
                {generatedAt && (
                  <Text style={styles.generatedAt}>
                    Generated {new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            )}

            {/* Grocery list (collapsible) */}
            {showGrocery && <GrocerySection groceryList={groceryList} />}

            {/* Day cards */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={20} color={BRAND.primary} />
                <Text style={styles.sectionTitle}>Your {plan.length}-Day Plan</Text>
              </View>
              {plan.map((day, idx) => (
                <DayCard
                  key={day.day || idx}
                  day={day}
                  expanded={expandedDay === idx}
                  onToggle={() => toggleDay(idx)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB to generate if plan exists */}
      {plan && !generating && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Ionicons name="sparkles-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      <GenerateModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
        loading={generating}
      />
    </View>
  );
}

function SummaryPill({ label, value, unit, color }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { paddingTop: 8, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: TYPOGRAPHY.family.bold, color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: TYPOGRAPHY.family.regular },
  scroll: { flex: 1 },

  // Empty / loading
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 22, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  emptySubtitle: { fontSize: 14, color: TEXT.secondary, textAlign: 'center', lineHeight: 22 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  ctaBtnText: { fontSize: 16, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF' },
  loadingState: { alignItems: 'center', paddingTop: 100, gap: 14 },
  loadingTitle: { fontSize: 18, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  loadingSubtitle: { fontSize: 14, color: TEXT.secondary },

  // Action bar
  actionBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: BRAND.primary },
  actionBtnSecondaryText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.semibold, color: BRAND.primary },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: BRAND.primary },
  actionBtnPrimaryText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF' },

  // Summary
  summaryCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, ...SHADOWS.sm },
  summaryCTitle: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryPill: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 18, fontFamily: TYPOGRAPHY.family.bold },
  summaryUnit: { fontSize: 10, color: TEXT.tertiary },
  summaryLabel: { fontSize: 11, color: TEXT.secondary, marginTop: 2 },
  generatedAt: { fontSize: 11, color: TEXT.tertiary, marginTop: 10, textAlign: 'center' },

  // Section
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },

  // Day card
  dayCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 10, overflow: 'hidden', ...SHADOWS.sm },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: BRAND.primary + '18', alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 13, fontFamily: TYPOGRAPHY.family.bold, color: BRAND.primary },
  dayLabel: { fontSize: 15, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayCalories: { fontSize: 13, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },

  // Meals
  mealsContainer: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  mealRow: { flexDirection: 'row', padding: 14, gap: 12 },
  mealBorder: { borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  mealTypeDot: { width: 4, borderRadius: 2, alignSelf: 'stretch', minHeight: 24 },
  mealInfo: { flex: 1, gap: 4 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mealType: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary, textTransform: 'capitalize' },
  prepBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 },
  prepText: { fontSize: 11, color: TEXT.tertiary },
  mealName: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  mealDesc: { fontSize: 12, color: TEXT.secondary, lineHeight: 18 },
  mealMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  macroPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  macroPillText: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold },

  // Day totals
  dayTotalsRow: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dayTotalsLabel: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary, marginBottom: 2 },
  dayTotalsValues: { fontSize: 12, color: TEXT.secondary },

  // Grocery
  groceryCategory: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, ...SHADOWS.sm },
  groceryCategoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  groceryCategoryTitle: { fontSize: 14, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  groceryItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  groceryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.primary },
  groceryItemText: { fontSize: 13, color: TEXT.secondary, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  optionLabel: { fontSize: 14, color: TEXT.primary, flex: 1 },
  optionInput: { width: 70, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: TEXT.primary, textAlign: 'center' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND.primary, paddingVertical: 15, borderRadius: 14, marginTop: 8 },
  generateBtnText: { fontSize: 16, fontFamily: TYPOGRAPHY.family.semibold, color: '#FFF' },

  // FAB
  fab: { position: 'absolute', right: 20, bottom: 32, width: 56, height: 56, borderRadius: 28, ...SHADOWS.lg, backgroundColor: BRAND.primary, alignItems: 'center', justifyContent: 'center' },
});
