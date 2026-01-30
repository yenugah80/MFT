import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal, RefreshControl, Animated, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import useProfileForm from '../../hooks/useProfileForm';
import {
  useActivityLog,
  ACTIVITY_TYPES,
  INTENSITY_LEVELS as API_INTENSITY_LEVELS,
} from '../../hooks/useActivityLog';
import ErrorBoundary from '../../components/ErrorBoundary';
import {
  EXERCISES,
  EXERCISE_CATEGORIES,
  INTENSITY_LEVELS,
  searchExercises,
  getExercisesByCategory,
  calculateCalories
} from '../../services/exerciseDatabase';
import ActivityInsightsView from '../../components/ActivityInsightsView';
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
 * Track exercises with real-time backend sync and MET-based calorie calculation
 */
function ActivityScreen() {
  // Hooks - Get user profile for weight calculation
  const { user } = useUser();
  const { state: profileState } = useProfileForm(user);

  // Real API hook - replaces AsyncStorage
  const {
    activities,
    todaySummary,
    weeklyProgress,
    isLoading,
    isFetching,
    error,
    refetch,
    logActivity,
    deleteActivity,
    isLogging,
    isDeleting,
  } = useActivityLog();

  // Get user's weight from profile, default to 70kg if not set
  const userWeight = profileState?.savedProfile?.basics?.weightKg
    ? parseFloat(profileState.savedProfile.basics.weightKg)
    : 70;

  // State
  const [viewMode, setViewMode] = useState('log'); // 'log' or 'insights'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState('MODERATE');
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

  // Get filtered exercises
  const getFilteredExercises = () => {
    if (searchQuery) {
      return searchExercises(searchQuery);
    }
    if (selectedCategory) {
      return getExercisesByCategory(selectedCategory);
    }
    return EXERCISES;
  };

  const filteredExercises = getFilteredExercises();

  // Use real data from API, fallback to 0 during loading
  const totalCalories = todaySummary?.totalCalories || 0;
  const totalDuration = todaySummary?.totalMinutes || 0;
  const activityCount = todaySummary?.activityCount || 0;

  // Get today's activities from API data
  const todayActivities = activities?.filter(a => {
    const today = new Date().toDateString();
    return new Date(a.loggedAt || a.createdAt).toDateString() === today;
  }) || [];

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

  const handleLogActivity = async () => {
    if (!selectedExercise || !duration) return;

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
        // Optional fields
        distanceKm: null,
        heartRateAvg: null,
      });

      setModalVisible(false);
      setDuration('30');
      setIntensity('MODERATE');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error logging activity:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await deleteActivity(activityId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error deleting activity:', error);
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
  };

  // Map local exercise database to API activity types
  const mapExerciseToApiType = (exercise) => {
    const typeMap = {
      'Running': 'running',
      'Jogging': 'running',
      'Cycling': 'cycling',
      'Indoor Cycling': 'cycling',
      'Walking': 'walking',
      'Power Walking': 'walking',
      'Swimming': 'swimming',
      'Yoga': 'yoga',
      'Pilates': 'yoga',
      'Weight Training': 'strength',
      'Strength Training': 'strength',
      'Resistance Training': 'strength',
      'HIIT': 'hiit',
      'CrossFit': 'hiit',
      'Circuit Training': 'hiit',
      'Stretching': 'flexibility',
      'Flexibility': 'flexibility',
      'Dance': 'dancing',
      'Zumba': 'dancing',
      'Hiking': 'hiking',
      'Trail Running': 'hiking',
      'Basketball': 'sports',
      'Soccer': 'sports',
      'Tennis': 'sports',
      'Volleyball': 'sports',
      'Gym Workout': 'gym',
      'Elliptical': 'cardio',
      'Stair Climber': 'cardio',
      'Rowing': 'cardio',
    };

    return typeMap[exercise.name] || 'general';
  };

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
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
    </TouchableOpacity>
  ), []);

  const renderActivity = useCallback(({ item }) => {
    const intensityKey = item.intensity?.toUpperCase() || 'MODERATE';
    const intensityInfo = INTENSITY_LEVELS[intensityKey] || INTENSITY_LEVELS.MODERATE;

    // Get icon based on activity type
    const getActivityIcon = (type) => {
      const iconMap = {
        running: 'walk',
        cycling: 'bicycle',
        walking: 'footsteps',
        swimming: 'water',
        yoga: 'leaf',
        strength: 'barbell',
        hiit: 'flash',
        flexibility: 'body',
        dancing: 'musical-notes',
        hiking: 'trail-sign',
        sports: 'football',
        gym: 'fitness',
        cardio: 'pulse',
        general: 'fitness',
      };
      return iconMap[type] || 'fitness';
    };

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityLeft}>
          <View style={[styles.activityIcon, { backgroundColor: `${intensityInfo.color}20` }]}>
            <Ionicons
              name={getActivityIcon(item.type)}
              size={20}
              color={intensityInfo.color}
            />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityName}>
              {ACTIVITY_TYPES.find(t => t.id === item.type)?.name || item.type}
            </Text>
            <Text style={styles.activityDetails}>
              {item.durationMinutes} min • {intensityInfo.label}
            </Text>
          </View>
        </View>
        <View style={styles.activityRight}>
          <View style={styles.caloriesBadge}>
            <Ionicons name="flame" size={16} color={SEMANTIC.warning.base} />
            <Text style={styles.activityCalories}>{item.caloriesBurned || 0}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteActivity(item.id)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={18} color={SEMANTIC.danger.base} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isDeleting]);

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
                  {weeklyProgress.currentMinutes}/{weeklyProgress.targetMinutes} min
                </Text>
                <Text style={styles.weeklyBadgeLabel}>This Week</Text>
              </View>
            )}
          </View>

          {/* Stats Summary */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="flame" size={24} color="#fff" />
              <Text style={styles.statValue}>{totalCalories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="time" size={24} color="#fff" />
              <Text style={styles.statValue}>{totalDuration}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="fitness" size={24} color="#fff" />
              <Text style={styles.statValue}>{activityCount}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Mode Selector Pills */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modePill, viewMode === 'log' && styles.modePillActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('log');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={viewMode === 'log' ? 'barbell' : 'barbell-outline'}
            size={18}
            color={viewMode === 'log' ? '#fff' : TEXT.secondary}
          />
          <Text style={[styles.modePillText, viewMode === 'log' && styles.modePillTextActive]}>
            Log Workout
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modePill, viewMode === 'insights' && styles.modePillActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('insights');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={viewMode === 'insights' ? 'analytics' : 'analytics-outline'}
            size={18}
            color={viewMode === 'insights' ? '#fff' : TEXT.secondary}
          />
          <Text style={[styles.modePillText, viewMode === 'insights' && styles.modePillTextActive]}>
            Insights
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conditional Rendering Based on View Mode */}
      {viewMode === 'log' ? (
        <>
          {/* Today's Activities */}
          {todayActivities.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today&apos;s Activities</Text>
                {isFetching && <ActivityIndicator size="small" color={BRAND.primary} />}
              </View>
              <FlatList
                data={todayActivities}
                renderItem={renderActivity}
                keyExtractor={(item) => item.id?.toString() || item.clientEventId}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activitiesList}
              />
            </View>
          )}

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

          {/* Category Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Categories</Text>
            <FlatList
              data={Object.values(EXERCISE_CATEGORIES)}
              renderItem={renderCategory}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
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
        </>
      ) : (
        <ActivityInsightsView
          activities={activities || []}
          onLogWorkout={() => setViewMode('log')}
        />
      )}

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
                <View style={styles.caloriesPreview}>
                  <Ionicons name="flame" size={24} color={SEMANTIC.warning.base} />
                  <Text style={styles.caloriesPreviewText}>
                    ~{calculateCalories(selectedExercise, parseInt(duration) || 0, userWeight, intensity)} calories burned
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
                    style={[styles.logButton, isLogging && styles.logButtonDisabled]}
                    onPress={handleLogActivity}
                    disabled={isLogging}
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
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  activitiesList: {
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 300,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  activityDetails: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${SEMANTIC.warning.base}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityCalories: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC.warning.base,
  },
  deleteButton: {
    padding: 4,
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
    marginTop: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  filterList: {
    paddingHorizontal: 20,
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
  // Mode Selector Styles
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modePillActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  modePillText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  modePillTextActive: {
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
