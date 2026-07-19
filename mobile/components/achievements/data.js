/**
 * Static data + pure helpers for the Achievements ("Treasure Quest") screen.
 * Kept separate from the screen/components so the fallback content and
 * scoring rules can be edited without touching rendering code.
 */
import { BRAND } from '../../constants/premiumTheme';

// Vivid, saturated palette matching the app's brand system (BRAND.*) —
// not the soft/pastel questTheme.js, which reads as under-designed here.
export const ACHIEVEMENT_COLORS = {
  islands: {
    starter: BRAND.primary,
    builder: BRAND.secondary,
    tracker: BRAND.accent,
    storm: BRAND.primaryLight,
    reef: '#10B981',
    harbor: '#F59E0B',
    treasure: '#D97706',
  },
  chestRarity: {
    common:    { name: 'Common',    primary: '#6B7280', secondary: '#4B5563', light: '#E5E7EB', icon: '📦' },
    rare:      { name: 'Rare',      primary: BRAND.accent,  secondary: '#0891B2', light: '#CFFAFE', icon: '💫' },
    epic:      { name: 'Epic',      primary: BRAND.primary, secondary: BRAND.primaryDark, light: '#EDE9FE', icon: '✨' },
    legendary: { name: 'Legendary', primary: '#D97706', secondary: '#92400E', light: '#FEF3C7', icon: '👑' },
  },
};

export const JOURNEY_ISLANDS = [
  { key: 'STARTER',  name: 'Starter Cove',    emoji: '🏝️', minDays: 0,   color: ACHIEVEMENT_COLORS.islands.starter },
  { key: 'BUILDER',  name: 'Builder Bay',     emoji: '⚓',  minDays: 5,   color: ACHIEVEMENT_COLORS.islands.builder },
  { key: 'TRACKER',  name: 'Tracker Lagoon',  emoji: '🗺️', minDays: 14,  color: ACHIEVEMENT_COLORS.islands.tracker },
  { key: 'STORM',    name: 'Storm Peak',      emoji: '⛈️', minDays: 30,  color: ACHIEVEMENT_COLORS.islands.storm },
  { key: 'REEF',     name: 'Golden Reef',     emoji: '🐚', minDays: 60,  color: ACHIEVEMENT_COLORS.islands.reef },
  { key: 'HARBOR',   name: 'Legends Harbor',  emoji: '🏰', minDays: 120, color: ACHIEVEMENT_COLORS.islands.harbor },
  { key: 'TREASURE', name: 'Treasure Island', emoji: '💎', minDays: 365, color: ACHIEVEMENT_COLORS.islands.treasure },
];

// Shown only when the API has no daily challenges yet (e.g. first app open).
export const FALLBACK_DAILY_QUESTS = [
  { id: 'meal',  title: "Captain's Feast", desc: 'Log a nutritious meal',    xp: 25, emoji: '🍽️', color: BRAND.secondary },
  { id: 'water', title: 'Ocean Hydration',  desc: 'Track your water intake', xp: 15, emoji: '🌊', color: BRAND.accent },
  { id: 'mood',  title: 'Crew Morale',      desc: 'Check how you feel',      xp: 20, emoji: '😊', color: BRAND.primary },
];

// Shown only when the API has no weekly challenges yet.
export const FALLBACK_WEEKLY_CHALLENGE = {
  title: 'Seven Seas Voyage',
  description: 'Complete all daily quests for 7 consecutive days',
  reward: 'Mystery Chest + 500 XP',
  emoji: '🌟',
};

export const SAMPLE_TREASURES = [
  { id: 'sample-1', name: 'Greek Yogurt Bowl', food: 'High protein breakfast', rarity: 'epic',      emoji: '🌅', benefit: 'Great for muscle recovery' },
  { id: 'sample-2', name: 'Grilled Salmon',    food: 'Omega-3 rich dinner',    rarity: 'legendary', emoji: '🍽️', benefit: 'Heart-healthy fats' },
  { id: 'sample-3', name: 'Mixed Nuts',        food: 'Healthy snack',         rarity: 'rare',      emoji: '🍎', benefit: 'Sustained energy' },
  { id: 'sample-4', name: 'Quinoa Salad',      food: 'Balanced lunch',        rarity: 'epic',      emoji: '🥗', benefit: 'Complete protein source' },
];

export const CAPTAIN_TIPS = [
  'Log your meals consistently to build momentum!',
  'Great sailors drink plenty of water.',
  'Track your mood to discover patterns.',
  'Every meal logged is treasure found!',
];

export const getRarityFromScore = (score) => {
  if (score >= 0.8) return 'legendary';
  if (score >= 0.6) return 'epic';
  if (score >= 0.4) return 'rare';
  return 'common';
};
