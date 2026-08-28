import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal, RefreshControl, Animated, ActivityIndicator, KeyboardAvoidingView, ScrollView, Pressable, Platform } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import useProfileForm from '../../hooks/useProfileForm';
import { useActivityLog } from '../../hooks/useActivityLog';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  EXERCISE_CATEGORIES,
  EXERCISES,
  FOCUS_FILTERS,
  INTENSITY_LEVELS,
  filterExercises,
  calculateCalories
} from '../../services/exerciseDatabase';
import {
  TEXT,
  SURFACES,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const ACTIVITY_COLOR = VIBRANT_WELLNESS.activity.solid;
const QUICK_DURATIONS = [15, 30, 45, 60];
const INTENSITY_ICONS = { LIGHT: 'leaf-outline', MODERATE: 'pulse-outline', VIGOROUS: 'flash-outline' };

/**
 * Activity & Fitness Tracker
 *
 * Logging surface only: pick an exercise, set duration and intensity, log it.
 * Analytics (today's log, trends, recommendations) live on the Insights screen
 * reached from the Dashboard.
 */
export function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams();
  // Hooks - Get user profile for weight calculation
  const { user } = useUser();
  const { state: profileState } = useProfileForm(user);

  // Real API hook - replaces AsyncStorage
  const {
    activities,
    weeklyProgress,
    isLoading,
    refetch,
    logActivity,
    isLogging,
  } = useActivityLog();

  // Get user's weight from profile, default to 70kg if not set
  const userWeight = profileState?.savedProfile?.basics?.weightKg
    ? parseFloat(profileState.savedProfile.basics.weightKg)
    : 70;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFocus, setSelectedFocus] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  // Empty, not '30'. Duration is the larger multiplier in calculateCalories,
  // so a pre-filled guess put an invented figure into the day's energy balance.
  const [duration, setDuration] = useState('');
  // Null until chosen — light/moderate/vigorous is a judgement only the user
  // can make, and it feeds the calorie estimate.
  const [intensity, setIntensity] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appliedRecommendationRef = useRef(null);

  // The Insights CTA passes the live recommendation API's activity, duration,
  // intensity and focus. Exact catalogue matches can open immediately. Broad
  // activities such as "Strength" or "Walking" filter the real catalogue and
  // wait for the user to choose a specific exercise rather than guessing one.
  useEffect(() => {
    const first = (value) => Array.isArray(value) ? value[0] : value;
    const recommendationKey = first(routeParams.requestId)
      || [routeParams.activity, routeParams.type, routeParams.minutes, routeParams.intensity, routeParams.focus].map(first).join('|');
    if (!recommendationKey || appliedRecommendationRef.current === recommendationKey) return;
    appliedRecommendationRef.current = recommendationKey;

    if (first(routeParams.recommended) !== '1') {
      if (first(routeParams.source) === 'activity-insights') {
        setSearchQuery('');
        setSelectedCategory(null);
        setSelectedFocus(null);
        setSelectedExercise(null);
        setModalVisible(false);
        setDuration('');
        setIntensity(null);
      }
      return;
    }

    const requestedMinutes = Number(first(routeParams.minutes));
    if (Number.isInteger(requestedMinutes) && requestedMinutes > 0 && requestedMinutes <= 1440) {
      setDuration(String(requestedMinutes));
    }

    const requestedIntensity = String(first(routeParams.intensity) || '').toUpperCase();
    if (INTENSITY_LEVELS[requestedIntensity]) setIntensity(requestedIntensity);

    const requestedName = String(first(routeParams.activity) || '').trim();
    const requestedType = String(first(routeParams.type) || '').trim().toLowerCase();
    const exactExercise = EXERCISES.find((exercise) =>
      requestedName && exercise.name.toLowerCase() === requestedName.toLowerCase()
    ) || EXERCISES.find((exercise) => requestedType && exercise.id === requestedType);

    if (exactExercise) {
      setSelectedExercise(exactExercise);
      setModalVisible(true);
      return;
    }

    const requestedFocus = String(first(routeParams.focus) || '').trim().toLowerCase();
    const focusFilter = FOCUS_FILTERS.find((item) =>
      item.key === requestedFocus || item.label.toLowerCase() === requestedFocus
    );
    if (focusFilter) setSelectedFocus(focusFilter.key);
    if (requestedName || requestedType) setSearchQuery(requestedName || requestedType);
  }, [routeParams]);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Search text, modality category and focus (muscle group / equipment) all stack
  const filteredExercises = filterExercises({
    query: searchQuery,
    category: selectedCategory,
    focusKey: selectedFocus,
  });

  // Get today's date formatted
  const getTodayFormatted = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Handlers
  const handleExercisePress = (exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

  // Mirrors the bounds useActivityLog.logActivity already enforces, so an
  // invalid duration is a disabled button rather than a thrown error.
  const durationValue = parseInt(duration, 10);
  const isValidDuration =
    /^\d+$/.test(duration.trim()) && durationValue > 0 && durationValue <= 1440;
  const canLogActivity = !!selectedExercise && isValidDuration && !!intensity;
  const estimatedCalories = canLogActivity
    ? calculateCalories(selectedExercise, durationValue, userWeight, intensity)
    : null;

  const handleLogActivity = async () => {
    if (!canLogActivity) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const durationNum = parseInt(duration);

    // Map local exercise type to API type
    const apiType = mapExerciseToApiType(selectedExercise);

    try {
      await logActivity({
        type: apiType,
        minutes: durationNum,
        intensity: intensity.toLowerCase(),
        notes: selectedExercise.description,
        // Which catalogue movement this was. `type` is one of 14 coarse
        // buckets, so without these the insights can only ever say "Strength",
        // never "Leg Press", and cannot tell which muscle group was trained.
        // Ignored by a backend that has not deployed support yet.
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        // Optional fields
        distanceKm: null,
        heartRateAvg: null,
      });

      setModalVisible(false);
      setDuration('');
      setIntensity(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error logging activity:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedFocus(null);
  };

  // Every exercise carries its own backend activity type; 'general' is only a
  // guard for entries added without one.
  const mapExerciseToApiType = (exercise) => exercise.apiType || 'general';

  // Render functions
  const renderCategory = useCallback(({ item }) => {
    const isSelected = selectedCategory === item;
    return (
      <TouchableOpacity
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCategory(isSelected ? null : item);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory]);

  const renderFocus = useCallback(({ item }) => {
    const isSelected = selectedFocus === item.key;
    return (
      <TouchableOpacity
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedFocus(isSelected ? null : item.key);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedFocus]);

  const renderExercise = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => handleExercisePress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.exerciseIcon}>
        <Ionicons name={item.icon} size={24} color={ACTIVITY_COLOR} />
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDescription}>{item.description}</Text>
        <View style={styles.exerciseMetaRow}>
          <Ionicons name="flame" size={14} color={SEMANTIC.warning.base} />
          <Text style={styles.exerciseCalories}>~{item.caloriesPer30Min} cal</Text>
          <Text style={styles.exerciseDuration}> / 30 min</Text>
          {!!item.muscleGroup && (
            <Text style={styles.exerciseTag} numberOfLines={1}>
              • {item.muscleGroup} • {item.equipment}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
    </TouchableOpacity>
  ), []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="fitness-outline" size={64} color={TEXT.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No activities yet</Text>
      <Text style={styles.emptyText}>
        {searchQuery || selectedCategory
          ? 'Try adjusting your search or filters'
          : 'Start by logging your first activity today!'}
      </Text>
      {(searchQuery || selectedCategory) && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Loading state
  if (isLoading && !activities?.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACTIVITY_COLOR} />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={VIBRANT_WELLNESS.activity.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.screenTitle}>Activity</Text>
              <Text style={styles.dateText}>{getTodayFormatted()}</Text>
            </View>
            {weeklyProgress && (
              <View style={styles.weeklyBadge}>
                <Text style={styles.weeklyBadgeText}>
                  {weeklyProgress.weeklyMinutes}/{weeklyProgress.target} min
                </Text>
                <Text style={styles.weeklyBadgeLabel}>This Week</Text>
              </View>
            )}
          </View>

        </LinearGradient>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={TEXT.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={TEXT.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={TEXT.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters: modality categories + muscle group / equipment focus */}
      <View style={styles.filterSection}>
        <FlatList
          data={Object.values(EXERCISE_CATEGORIES)}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
        <FlatList
          data={FOCUS_FILTERS}
          renderItem={renderFocus}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterList, styles.focusList]}
        />
      </View>

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACTIVITY_COLOR}
            colors={[ACTIVITY_COLOR]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Log Exercise Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close activity log" />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {selectedExercise && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.sheetHandle} />
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name={selectedExercise.icon} size={27} color={ACTIVITY_COLOR} />
                  </View>
                  <View style={styles.modalHeaderCopy}>
                    <Text style={styles.modalEyebrow}>LOG WORKOUT</Text>
                    <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
                    <Text style={styles.modalSubtitle} numberOfLines={2}>{selectedExercise.description}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
                    <Ionicons name="close" size={21} color={TEXT.secondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.sectionLabelRow}>
                    <View>
                      <Text style={styles.inputLabel}>How long?</Text>
                      <Text style={styles.inputHint}>Enter minutes or choose a shortcut</Text>
                    </View>
                    <View style={[styles.validityPill, isValidDuration && styles.validityPillReady]}>
                      <Ionicons name={isValidDuration ? 'checkmark-circle' : 'time-outline'} size={14} color={isValidDuration ? ACTIVITY_COLOR : TEXT.tertiary} />
                      <Text style={[styles.validityText, isValidDuration && styles.validityTextReady]}>{isValidDuration ? 'Ready' : 'Required'}</Text>
                    </View>
                  </View>
                  <View style={[styles.durationInputShell, duration.length > 0 && !isValidDuration && styles.durationInputError]}>
                    <TextInput style={styles.durationInput} value={duration} onChangeText={(value) => setDuration(value.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="—" placeholderTextColor={TEXT.tertiary} maxLength={4} accessibilityLabel="Duration in minutes" />
                    <Text style={styles.durationUnit}>minutes</Text>
                  </View>
                  {duration.length > 0 && !isValidDuration && <Text style={styles.validationText}>Use a whole number from 1 to 1,440 minutes.</Text>}
                  <View style={styles.quickDurationRow}>
                    {QUICK_DURATIONS.map((minutes) => {
                      const selected = durationValue === minutes && isValidDuration;
                      return <TouchableOpacity key={minutes} style={[styles.quickDuration, selected && styles.quickDurationSelected]} onPress={() => { Haptics.selectionAsync(); setDuration(String(minutes)); }} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${minutes} minutes`}><Text style={[styles.quickDurationText, selected && styles.quickDurationTextSelected]}>{minutes}</Text></TouchableOpacity>;
                    })}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>How hard did it feel?</Text>
                  <Text style={styles.inputHint}>Choose the effort that best matches this session</Text>
                  <View style={styles.intensityButtons}>
                    {Object.entries(INTENSITY_LEVELS).map(([key, value]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.intensityButton,
                          intensity === key && { backgroundColor: `${value.color}12`, borderColor: value.color }
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIntensity(key);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: intensity === key }}
                        accessibilityLabel={`${value.label} intensity`}
                      >
                        <View style={[styles.intensityIcon, { backgroundColor: `${value.color}14` }]}><Ionicons name={INTENSITY_ICONS[key]} size={18} color={value.color} /></View>
                        <Text style={[
                          styles.intensityButtonText,
                          intensity === key && { color: value.color, fontFamily: TYPOGRAPHY.family.bold }
                        ]}>
                          {value.label}
                        </Text>
                        {intensity === key && <Ionicons name="checkmark-circle" size={16} color={value.color} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.caloriesPreview, estimatedCalories !== null && styles.caloriesPreviewReady]}>
                  <View style={styles.caloriesIcon}><Ionicons name="flame" size={21} color={SEMANTIC.warning.base} /></View>
                  <View style={styles.caloriesCopy}>
                    <Text style={styles.caloriesLabel}>ESTIMATED ENERGY</Text>
                    <Text style={styles.caloriesPreviewText}>{estimatedCalories !== null ? `About ${estimatedCalories} kcal` : 'Complete both fields for an estimate'}</Text>
                    <Text style={styles.caloriesCaveat}>Personal estimate based on your profile—not a precise measurement.</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logButton, (!canLogActivity || isLogging) && styles.logButtonDisabled]}
                    onPress={handleLogActivity}
                    disabled={!canLogActivity || isLogging}
                    accessibilityRole="button"
                    accessibilityLabel="Log activity"
                    accessibilityState={{ disabled: !canLogActivity || isLogging, busy: isLogging }}
                    accessibilityHint={
                      !isValidDuration
                        ? 'Enter a duration in minutes to log'
                        : (!intensity ? 'Choose an intensity to log' : undefined)
                    }
                  >
                    <LinearGradient
                      colors={VIBRANT_WELLNESS.activity.gradient}
                      style={styles.logButtonGradient}
                    >
                      {isLogging ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.logButtonText}>Save workout</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  headerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },
  dateText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  weeklyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  weeklyBadgeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#fff',
  },
  weeklyBadgeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
    padding: 0,
  },
  filterSection: {
    marginTop: 12,
    gap: 8,
  },
  filterList: {
    paddingHorizontal: 20,
  },
  focusList: {
    paddingBottom: 2,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACES.background.secondary,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: ACTIVITY_COLOR,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  categoryTextSelected: {
    color: '#fff',
  },
  exerciseList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.sm,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${ACTIVITY_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  exerciseDescription: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  exerciseCalories: {
    fontSize: 12,
    color: SEMANTIC.warning.base,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  exerciseDuration: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  exerciseTag: {
    flex: 1,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.secondary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: ACTIVITY_COLOR,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 31, 0.54)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '92%',
    backgroundColor: SURFACES.card.primary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: SPACING[4],
    ...SHADOWS.lg,
  },
  modalScrollContent: { paddingTop: 10 },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: SURFACES.divider,
    alignSelf: 'center',
    marginBottom: SPACING[3],
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[5],
    gap: SPACING[3],
  },
  modalIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: `${ACTIVITY_COLOR}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderCopy: { flex: 1, minWidth: 0 },
  modalEyebrow: { fontSize: 9, letterSpacing: 1, fontFamily: TYPOGRAPHY.family.bold, color: ACTIVITY_COLOR },
  modalTitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 17,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.background.tertiary,
  },
  formSection: { marginBottom: SPACING[5] },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING[3] },
  inputLabel: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  inputHint: { marginTop: 3, fontSize: 11, lineHeight: 15, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary },
  validityPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary },
  validityPillReady: { backgroundColor: `${ACTIVITY_COLOR}10` },
  validityText: { fontSize: 9, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary },
  validityTextReady: { color: ACTIVITY_COLOR },
  durationInputShell: {
    minHeight: 66,
    marginTop: SPACING[3],
    paddingHorizontal: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    borderRadius: RADIUS.xl,
    backgroundColor: SURFACES.background.primary,
  },
  durationInputError: { borderColor: SEMANTIC.danger.base },
  durationInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 27,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  durationUnit: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary },
  validationText: { marginTop: 6, fontSize: 10, color: SEMANTIC.danger.base },
  quickDurationRow: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[3] },
  quickDuration: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: SURFACES.card.border, backgroundColor: SURFACES.background.primary },
  quickDurationSelected: { borderColor: ACTIVITY_COLOR, backgroundColor: `${ACTIVITY_COLOR}10` },
  quickDurationText: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },
  quickDurationTextSelected: { color: ACTIVITY_COLOR, fontFamily: TYPOGRAPHY.family.bold },
  intensityButtons: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  intensityButton: {
    flex: 1,
    minHeight: 92,
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.xl,
    backgroundColor: SURFACES.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    gap: 5,
  },
  intensityIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  intensityButtonText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  caloriesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    padding: SPACING[3],
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    marginBottom: SPACING[5],
  },
  caloriesPreviewReady: { backgroundColor: `${SEMANTIC.warning.base}0B`, borderColor: `${SEMANTIC.warning.base}25` },
  caloriesIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${SEMANTIC.warning.base}14` },
  caloriesCopy: { flex: 1 },
  caloriesLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: TYPOGRAPHY.family.bold, color: SEMANTIC.warning.base },
  caloriesPreviewText: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  caloriesCaveat: { marginTop: 2, fontSize: 9, lineHeight: 13, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  cancelButton: {
    minWidth: 98,
    minHeight: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  logButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  logButtonDisabled: {
    opacity: 0.42,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  logButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },
});

// Export wrapped with ErrorBoundary for crash protection
export default function ActivityScreenWithErrorBoundary() {
  return (
    <ErrorBoundary onReset={() => {}}>
      <ActivityScreen />
    </ErrorBoundary>
  );
}
