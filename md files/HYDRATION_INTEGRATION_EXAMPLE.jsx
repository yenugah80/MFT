/**
 * ============================================================================
 * HYDRATION WELLNESS INTEGRATION EXAMPLE
 * ============================================================================
 *
 * This file shows how to integrate the new HydrationWellnessDashboard
 * into your existing DashboardContent.jsx
 *
 * Copy the relevant parts into your actual dashboard file.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import HydrationWellnessDashboard from './components/dashboard/HydrationWellnessDashboard';
import HydrationTracker from './components/HydrationTracker';

// ============================================================================
// OPTION 1: Dashboard Card Only (Recommended)
// ============================================================================

export function DashboardWithWellnessCard({ navigation }) {
  // Assume you have these from your existing hooks
  const { currentIntake, dailyGoal, streak, logWater } = useWaterLog();

  const handleQuickAdd = async (ml) => {
    // Log the water directly from the dashboard
    await logWater({
      amount: ml,
      type: 'water',
      effectiveAmount: ml,
      timestamp: Date.now(),
    });
  };

  const handleOpenFullTracker = () => {
    // Navigate to full tracker screen
    navigation.navigate('HydrationTracker');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Your existing dashboard components */}
      {/* ... */}

      {/* NEW: Hydration Wellness Dashboard */}
      <HydrationWellnessDashboard
        currentIntake={currentIntake}
        dailyGoal={dailyGoal}
        streak={streak}
        onQuickAdd={handleQuickAdd}
        onOpenFullTracker={handleOpenFullTracker}
      />

      {/* Your other dashboard components */}
      {/* ... */}
    </ScrollView>
  );
}

// ============================================================================
// OPTION 2: Replace Existing EnhancedHydrationCard
// ============================================================================

export function DashboardReplacingOldCard() {
  const { currentIntake, dailyGoal, streak, logWater } = useWaterLog();

  return (
    <ScrollView style={styles.container}>
      {/* BEFORE: */}
      {/* <EnhancedHydrationCard ... /> */}

      {/* AFTER: */}
      <HydrationWellnessDashboard
        currentIntake={currentIntake}
        dailyGoal={dailyGoal}
        streak={streak}
        onQuickAdd={async (ml) => {
          await logWater({
            amount: ml,
            type: 'water',
            effectiveAmount: ml,
            timestamp: Date.now(),
          });
        }}
        onOpenFullTracker={() => navigation.navigate('HydrationTracker')}
      />
    </ScrollView>
  );
}

// ============================================================================
// OPTION 3: Modal/Full-Screen Tracker (Best UX)
// ============================================================================

export function DashboardWithModal() {
  const [showFullTracker, setShowFullTracker] = useState(false);
  const {
    currentIntake,
    dailyGoal,
    streak,
    beverageHistory,
    logWater,
    removeWater,
  } = useWaterLog();

  return (
    <>
      <ScrollView style={styles.container}>
        <HydrationWellnessDashboard
          currentIntake={currentIntake}
          dailyGoal={dailyGoal}
          streak={streak}
          onQuickAdd={async (ml) => {
            await logWater({
              amount: ml,
              type: 'water',
              effectiveAmount: ml,
              timestamp: Date.now(),
            });
          }}
          onOpenFullTracker={() => setShowFullTracker(true)}
        />
      </ScrollView>

      {/* Full-screen modal for detailed tracking */}
      {showFullTracker && (
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFullTracker(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <HydrationTracker
            currentIntake={currentIntake}
            dailyGoal={dailyGoal}
            onLogWater={logWater}
            onRemoveWater={removeWater}
            beverageHistory={beverageHistory}
          />
        </View>
      )}
    </>
  );
}

// ============================================================================
// OPTION 4: Tab Navigation (For Advanced Users)
// ============================================================================

export function DashboardWithTabs() {
  const [activeTab, setActiveTab] = useState('wellness');
  const { currentIntake, dailyGoal, streak, beverageHistory, logWater, removeWater } =
    useWaterLog();

  return (
    <View style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wellness' && styles.activeTab]}
          onPress={() => setActiveTab('wellness')}
        >
          <Text style={styles.tabText}>Wellness</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'tracker' && styles.activeTab]}
          onPress={() => setActiveTab('tracker')}
        >
          <Text style={styles.tabText}>Full Tracker</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.tabContent}>
        {activeTab === 'wellness' ? (
          <HydrationWellnessDashboard
            currentIntake={currentIntake}
            dailyGoal={dailyGoal}
            streak={streak}
            onQuickAdd={async (ml) => {
              await logWater({
                amount: ml,
                type: 'water',
                effectiveAmount: ml,
                timestamp: Date.now(),
              });
            }}
            onOpenFullTracker={() => setActiveTab('tracker')}
          />
        ) : (
          <HydrationTracker
            currentIntake={currentIntake}
            dailyGoal={dailyGoal}
            onLogWater={logWater}
            onRemoveWater={removeWater}
            beverageHistory={beverageHistory}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// SAMPLE HOOK IMPLEMENTATION
// ============================================================================

// If you don't have useWaterLog yet, here's a simple implementation
function useWaterLog() {
  const [currentIntake, setCurrentIntake] = useState(0);
  const [dailyGoal] = useState(2.0);
  const [streak, setStreak] = useState(0);
  const [beverageHistory, setBeverageHistory] = useState([]);

  const logWater = async (entry) => {
    try {
      // Add to local state
      const newEntry = {
        ...entry,
        id: Date.now().toString(),
        amountLiters: entry.amount / 1000,
      };

      setBeverageHistory((prev) => [...prev, newEntry]);
      setCurrentIntake((prev) => prev + newEntry.amountLiters);

      // TODO: Sync with backend
      // await api.logHydration(newEntry);

      // Check if goal reached
      if (currentIntake + newEntry.amountLiters >= dailyGoal) {
        // Update streak (implement your logic)
        setStreak((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error logging water:', error);
      throw error;
    }
  };

  const removeWater = async (id, amountLiters) => {
    try {
      setBeverageHistory((prev) => prev.filter((entry) => entry.id !== id));
      setCurrentIntake((prev) => Math.max(0, prev - amountLiters));

      // TODO: Sync with backend
      // await api.removeHydration(id);
    } catch (error) {
      console.error('Error removing water:', error);
      throw error;
    }
  };

  return {
    currentIntake,
    dailyGoal,
    streak,
    beverageHistory,
    logWater,
    removeWater,
  };
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Modal styles
  fullScreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  // Tab styles
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#6B4EFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  tabContent: {
    flex: 1,
  },
});

// ============================================================================
// QUICK START GUIDE
// ============================================================================

/*

STEP 1: Import the component
────────────────────────────────────────────────────────────────
import HydrationWellnessDashboard from './components/dashboard/HydrationWellnessDashboard';


STEP 2: Get your hydration data
────────────────────────────────────────────────────────────────
const { currentIntake, dailyGoal, streak } = useWaterLog();
// Or however you're managing hydration state


STEP 3: Add to your dashboard
────────────────────────────────────────────────────────────────
<HydrationWellnessDashboard
  currentIntake={currentIntake}  // in liters
  dailyGoal={dailyGoal}          // in liters
  streak={streak}                // number of days
  onQuickAdd={(ml) => {
    // Handle quick add
    logWater({ amount: ml, type: 'water' });
  }}
  onOpenFullTracker={() => {
    // Navigate to full tracker
    navigation.navigate('HydrationTracker');
  }}
/>


STEP 4: Test it out! 🎉
────────────────────────────────────────────────────────────────
Try different hydration levels:
- 0.5L → See "Needs Attention" wellness score
- 1.0L → See "Fair" wellness score
- 1.5L → See "Good" wellness score
- 2.0L → See "Excellent" wellness score
- 2.5L → See "Exceptional" wellness score

Watch the health metrics update in real-time!


HEALTH CORRELATIONS:
────────────────────────────────────────────────────────────────
The component automatically calculates:
✅ Energy Level (0-100%)
✅ Mental Clarity (0-100%)
✅ Skin Health (0-100%)
✅ Physical Performance (0-100%)
✅ Focus (0-100%)
✅ Mood (0-100%)
✅ Stress Relief (0-85%)
✅ Overall Wellness Score (0-100)

All based on real hydration science! 🧬


PREMIUM FEATURES:
────────────────────────────────────────────────────────────────
🌊 Animated wave progress with color transitions
💎 Gradient health rings (no boring icons!)
✨ Pulsing wellness score card
🔥 Animated streak counter
🎯 Real-time health correlations
💪 Physical + Mental wellness tracking
🚀 Quick add buttons (250ml, 500ml)
🎨 Premium gradients throughout

*/
