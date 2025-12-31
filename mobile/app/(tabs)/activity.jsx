import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal, RefreshControl, Animated } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import useProfileForm from '../../hooks/useProfileForm';
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

const STORAGE_KEY = '@activity_log';

/**
 * Activity & Fitness Tracker
 * Track exercises, yoga, and physical activities with persistence
 */
function ActivityScreen() {
  // Hooks - Get user profile for weight calculation
  const { user } = useUser();
  const { state: profileState } = useProfileForm(user);

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
  const [todayActivities, setTodayActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]); // Last 30 days for insights
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load activities from storage on mount
  useEffect(() => {
    loadActivities();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Save activities whenever they change
  useEffect(() => {
    if (todayActivities.length > 0) {
      saveActivities();
    }
  }, [todayActivities]);

  const loadActivities = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Filter to only today's activities
        const today = new Date().toDateString();
        const todaysData = data.filter(
          (activity) => new Date(activity.timestamp).toDateString() === today
        );
        setTodayActivities(todaysData);

        // Load last 30 days for insights
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentActivities = data.filter(
          (activity) => new Date(activity.timestamp).getTime() >= thirtyDaysAgo
        );
        setAllActivities(recentActivities);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const saveActivities = async () => {
    try {
      // Merge today's activities with all activities
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let allData = stored ? JSON.parse(stored) : [];

      // Remove today's old data and add new
      const today = new Date().toDateString();
      allData = allData.filter(
        (activity) => new Date(activity.timestamp).toDateString() !== today
      );
      allData = [...allData, ...todayActivities];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  };

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

  // Calculate total calories burned today
  const totalCalories = todayActivities.reduce((sum, activity) => sum + activity.calories, 0);
  const totalDuration = todayActivities.reduce((sum, activity) => sum + activity.duration, 0);

  // Get today's date formatted
  const getTodayFormatted = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Handlers
  const handleExercisePress = (exercise) => {
    setSelectedExercise(exercise);
    setModalVisible(true);
  };

  const handleLogActivity = () => {
    if (!selectedExercise || !duration) return;

    const durationNum = parseInt(duration);
    const calories = calculateCalories(selectedExercise, durationNum, userWeight, intensity);

    const newActivity = {
      id: Date.now().toString(),
      name: selectedExercise.name, // For analytics
      exercise: selectedExercise, // For display (keep for backward compatibility)
      category: selectedExercise.category, // For analytics breakdown
      duration: durationNum,
      intensity,
      calories,
      timestamp: new Date().toISOString(),
    };

    setTodayActivities(prev => [newActivity, ...prev]);
    setAllActivities(prev => [newActivity, ...prev]); // Also update insights data
    setModalVisible(false);
    setDuration('30');
    setIntensity('MODERATE');
  };

  const handleDeleteActivity = (activityId) => {
    setTodayActivities(prev => prev.filter(a => a.id !== activityId));
    setAllActivities(prev => prev.filter(a => a.id !== activityId));
  };

  const handleClearToday = () => {
    // Clear today's activities from both states
    const today = new Date().toDateString();
    setTodayActivities([]);
    setAllActivities(prev => prev.filter(
      activity => new Date(activity.timestamp).toDateString() !== today
    ));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  // Render functions
  const renderCategory = useCallback(({ item }) => {
    const isSelected = selectedCategory === item;
    return (
      <TouchableOpacity
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => setSelectedCategory(isSelected ? null : item)}
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
        <Ionicons name={item.icon} size={24} color="#6366f1" />
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDescription}>{item.description}</Text>
        <View style={styles.exerciseMetaRow}>
          <Ionicons name="flame" size={14} color="#F59E0B" />
          <Text style={styles.exerciseCalories}>~{item.caloriesPer30Min} cal</Text>
          <Text style={styles.exerciseDuration}> / 30 min</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </TouchableOpacity>
  ), []);

  const renderActivity = useCallback(({ item }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityLeft}>
        <View style={[styles.activityIcon, { backgroundColor: INTENSITY_LEVELS[item.intensity].color + '20' }]}>
          <Ionicons name={item.exercise.icon} size={20} color={INTENSITY_LEVELS[item.intensity].color} />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityName}>{item.exercise.name}</Text>
          <Text style={styles.activityDetails}>
            {item.duration} min • {INTENSITY_LEVELS[item.intensity].label}
          </Text>
        </View>
      </View>
      <View style={styles.activityRight}>
        <View style={styles.caloriesBadge}>
          <Ionicons name="flame" size={16} color="#F59E0B" />
          <Text style={styles.activityCalories}>{item.calories}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteActivity(item.id)}
          style={styles.deleteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="fitness-outline" size={64} color="#cbd5e1" />
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.screenTitle}>Activity</Text>
              <Text style={styles.dateText}>{getTodayFormatted()}</Text>
            </View>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => {}}
            >
              <Ionicons name="help-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
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
              <Text style={styles.statValue}>{todayActivities.length}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Mode Selector Pills */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modePill, viewMode === 'log' && styles.modePillActive]}
          onPress={() => setViewMode('log')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={viewMode === 'log' ? 'barbell' : 'barbell-outline'}
            size={18}
            color={viewMode === 'log' ? '#fff' : '#64748b'}
          />
          <Text style={[styles.modePillText, viewMode === 'log' && styles.modePillTextActive]}>
            Log Workout
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modePill, viewMode === 'insights' && styles.modePillActive]}
          onPress={() => setViewMode('insights')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={viewMode === 'insights' ? 'analytics' : 'analytics-outline'}
            size={18}
            color={viewMode === 'insights' ? '#fff' : '#64748b'}
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
            <Text style={styles.sectionTitle}>Today's Activities</Text>
            <TouchableOpacity onPress={handleClearToday}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={todayActivities}
            renderItem={renderActivity}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activitiesList}
          />
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
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
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
        </>
      ) : (
        <ActivityInsightsView
          activities={allActivities}
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
                    <Ionicons name={selectedExercise.icon} size={32} color="#6366f1" />
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
                        onPress={() => setIntensity(key)}
                      >
                        <Text style={[
                          styles.intensityButtonText,
                          intensity === key && { color: value.color, fontWeight: '700' }
                        ]}>
                          {value.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Calories Preview */}
                <View style={styles.caloriesPreview}>
                  <Ionicons name="flame" size={24} color="#F59E0B" />
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
                    style={styles.logButton}
                    onPress={handleLogActivity}
                  >
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      style={styles.logButtonGradient}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.logButtonText}>Log Activity</Text>
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
    backgroundColor: '#f8fafc',
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
    fontWeight: '800',
    color: '#fff',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  helpButton: {
    padding: 4,
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
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
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
    fontWeight: '700',
    color: '#1e293b',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  activitiesList: {
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 300,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    fontWeight: '700',
    color: '#1e293b',
  },
  activityDetails: {
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityCalories: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  filterSection: {
    marginTop: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
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
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#6366f1',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  exerciseDescription: {
    fontSize: 12,
    color: '#64748b',
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
    color: '#F59E0B',
    fontWeight: '700',
  },
  exerciseDuration: {
    fontSize: 12,
    color: '#94a3b8',
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
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intensityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  caloriesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  caloriesPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  logButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
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
    fontWeight: '700',
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
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modePillActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  modePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modePillTextActive: {
    color: '#fff',
  },
  // Insights View Styles
  insightsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  insightsPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
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
