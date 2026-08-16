import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal, RefreshControl, Animated, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import useProfileForm from '../../hooks/useProfileForm';
import { useActivityLog } from '../../hooks/useActivityLog';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  EXERCISE_CATEGORIES,
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
  BRAND,
} from '../../constants/premiumTheme';

/**
 * Activity & Fitness Tracker
 *
 * Logging surface only: pick an exercise, set duration and intensity, log it.
 * Analytics (today's log, trends, recommendations) live on the Insights screen
 * reached from the Dashboard.
 */
function ActivityScreen() {
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
        <Ionicons name={item.icon} size={24} color={BRAND.primary} />
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
          <ActivityIndicator size="large" color={BRAND.primary} />
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
          colors={[BRAND.primary, `${BRAND.primary}CC`]}
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
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
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
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedExercise && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name={selectedExercise.icon} size={32} color={BRAND.primary} />
                  </View>
                  <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedExercise.description}</Text>
                </View>

                {/* Duration Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor={TEXT.tertiary}
                  />
                </View>

                {/* Intensity Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Intensity Level</Text>
                  <View style={styles.intensityButtons}>
                    {Object.entries(INTENSITY_LEVELS).map(([key, value]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.intensityButton,
                          intensity === key && { backgroundColor: value.color + '20', borderColor: value.color }
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIntensity(key);
                        }}
                      >
                        <Text style={[
                          styles.intensityButtonText,
                          intensity === key && { color: value.color, fontFamily: TYPOGRAPHY.family.bold }
                        ]}>
                          {value.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Calories Preview */}
                {/* Only estimate once both inputs are real — otherwise this
                    rendered "~0 calories burned", which reads as a result. */}
                <View style={styles.caloriesPreview}>
                  <Ionicons name="flame" size={24} color={SEMANTIC.warning.base} />
                  <Text style={styles.caloriesPreviewText}>
                    {isValidDuration && intensity
                      ? `~${calculateCalories(selectedExercise, durationValue, userWeight, intensity)} calories burned`
                      : 'Enter a duration and intensity to estimate calories'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logButton, (!canLogActivity || isLogging) && styles.logButtonDisabled]}
                    onPress={handleLogActivity}
                    disabled={!canLogActivity || isLogging}
                    accessibilityHint={
                      !isValidDuration
                        ? 'Enter a duration in minutes to log'
                        : (!intensity ? 'Choose an intensity to log' : undefined)
                    }
                  >
                    <LinearGradient
                      colors={[BRAND.primary, `${BRAND.primary}CC`]}
                      style={styles.logButtonGradient}
                    >
                      {isLogging ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#fff" />
                          <Text style={styles.logButtonText}>Log Activity</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
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
    backgroundColor: BRAND.primary,
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
    backgroundColor: `${BRAND.primary}15`,
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
    backgroundColor: BRAND.primary,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${BRAND.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.primary,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intensityButtonText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  caloriesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${SEMANTIC.warning.base}15`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  caloriesPreviewText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC.warning.base,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  logButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logButtonDisabled: {
    opacity: 0.7,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
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
