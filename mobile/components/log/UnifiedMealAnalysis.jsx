/**
 * UnifiedMealAnalysis - Premium Meal Analysis Display
 *
 * A comprehensive, unified meal analysis component with professional
 * SVG visualizations. All charts are rendered as vector graphics for
 * crisp display at any resolution.
 *
 * CHART VISUALIZATIONS:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1. MacroDonutChart    - Donut for P/C/F calorie distribution│
 * │ 2. MealScoreGauge     - Half-gauge speedometer (0-100)      │
 * │ 3. NutriScoreBadge    - European A-E grade system           │
 * │ 4. MacroRingsRow      - Individual circular rings per macro │
 * │ 5. MicroBarChart      - Horizontal bars for micros (%DV)    │
 * │ 6. NutrientIcon       - 15+ custom SVG icons for nutrients  │
 * │ 7. AllergensSection   - Color-coded allergen warning badges │
 * │ 8. StatPills          - Fiber/Sugar/Sodium with icons       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────────────────────┐
 * │  [Macro Donut]    │  [Score Gauge]      │  Hero Section
 * │   with kcal       │  [Nutri-Score]      │
 * ├─────────────────────────────────────────┤
 * │  ⭕ Protein  ⭕ Carbs   ⭕ Fat           │  Macro Rings
 * │     32g        45g       18g            │  (%DV shown)
 * ├─────────────────────────────────────────┤
 * │  ⚠️ Contains: [🥛Dairy] [🥜Nuts]        │  Allergens
 * ├─────────────────────────────────────────┤
 * │  [🌿Fiber] [📦Sugar] [🧂Sodium⚠️]       │  Stat Pills
 * ├─────────────────────────────────────────┤
 * │  Micronutrients (%DV)                   │  Micro Bars
 * │  [💪Calcium ████████ 45%]               │
 * ├─────────────────────────────────────────┤
 * │  Meal Breakdown (3 items)               │  Food Items
 * │  1. Grilled chicken...                  │
 * └─────────────────────────────────────────┘
 *
 * DESIGN PRINCIPLES:
 * - ONE score, ONE truth (no conflicting grades)
 * - Industry-standard visualizations (donut, gauge, bars, rings)
 * - Honest data display (shows confidence, marks estimates)
 * - Allergen safety (prominent warnings)
 * - No external image dependencies (all SVG)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { DAILY_VALUES } from '../../constants/dailyValues';
// Import unified scoring function for consistency with MealSummaryScreen
import { calculateMealScore as calculateUnifiedMealScore, getScoreLabel } from './MealSummary/MealScoreDial';

// ============== UTILITY FUNCTIONS ==============

/**
 * Extract sodium from micros object (handles multiple formats)
 * Returns sodium value in mg, or 0 if not found
 */
function extractSodiumFromMicros(micros) {
  if (!micros) return 0;

  // Try various key formats: sodium, sodium_mg, Sodium
  const sodiumKeys = ['sodium', 'sodium_mg', 'Sodium'];
  for (const key of sodiumKeys) {
    const val = micros[key];
    if (val !== undefined && val !== null) {
      // Handle both {sodium: 1700} and {sodium: {value: 1700}}
      if (typeof val === 'object' && val.value !== undefined) {
        return val.value;
      }
      if (typeof val === 'number') {
        return val;
      }
    }
  }
  return 0;
}

function calculateMacroPercentages(protein, carbs, fat) {
  const proteinCal = (protein || 0) * 4;
  const carbsCal = (carbs || 0) * 4;
  const fatCal = (fat || 0) * 9;
  const totalCal = proteinCal + carbsCal + fatCal;

  if (totalCal === 0) return { protein: 0, carbs: 0, fat: 0 };

  return {
    protein: Math.round((proteinCal / totalCal) * 100),
    carbs: Math.round((carbsCal / totalCal) * 100),
    fat: Math.round((fatCal / totalCal) * 100),
  };
}

// NOTE: calculateMealScore is imported from MealScoreDial for unified scoring
// getScoreLabel is also imported for consistent label/color mapping

/**
 * Convert meal score (0-100) to Nutri-Score grade (A-E)
 * Based on European Nutri-Score thresholds
 */
function scoreToNutriGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'E';
}

// ============== COLOR CONSTANTS ==============

const COLORS = {
  protein: '#6B4EFF',
  carbs: '#3B82F6',
  fat: '#F59E0B',
  fiber: '#10B981',
  sugar: '#EC4899',
  sodium: '#EF4444',
};

const MICRO_COLORS = {
  calcium: '#8B5CF6',
  iron: '#6366F1',
  vitaminC: '#F97316',
  vitaminA: '#14B8A6',
  potassium: '#06B6D4',
  magnesium: '#10B981',
  zinc: '#F59E0B',
  vitaminD: '#EC4899',
  vitaminB12: '#8B5CF6',
  folate: '#84CC16',
};

// Nutri-Score official colors (European standard)
const NUTRI_COLORS = {
  A: { bg: '#038141', text: '#FFFFFF' },
  B: { bg: '#85BB2F', text: '#FFFFFF' },
  C: { bg: '#FECB02', text: '#000000' },
  D: { bg: '#EE8100', text: '#FFFFFF' },
  E: { bg: '#E63E11', text: '#FFFFFF' },
};

// ============== CUSTOM NUTRIENT SVG ICONS ==============

/**
 * NutrientIcon - Custom SVG icons for macros and micronutrients
 * Professional vector illustrations for nutrition dashboard
 */
const NutrientIcon = ({ type, size = 20, color = '#6B7280' }) => {
  const icons = {
    // Macros
    protein: (
      // Dumbbell icon for protein
      <Path
        d="M6.5 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm11 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-11-5a2.5 2.5 0 00-2.45 2H3a1 1 0 000 2h1.05a2.5 2.5 0 004.9 0h6.1a2.5 2.5 0 004.9 0H21a1 1 0 100-2h-1.05a2.5 2.5 0 00-4.9 0H8.95a2.5 2.5 0 00-2.45-2z"
        fill={color}
      />
    ),
    carbs: (
      // Wheat/grain icon for carbs
      <G>
        <Path d="M12 2c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2z" fill={color} />
        <Path d="M12 10c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2z" fill={color} />
        <Path d="M12 18v4M9 21h6" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Path d="M7 6c0-1.5 2-3 5-3s5 1.5 5 3" stroke={color} strokeWidth={1.5} fill="none" opacity={0.5} />
      </G>
    ),
    fat: (
      // Oil droplet icon for fat
      <Path
        d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z"
        fill={color}
        opacity={0.9}
      />
    ),
    fiber: (
      // Leaf icon for fiber
      <G>
        <Path
          d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </G>
    ),
    sugar: (
      // Cube icon for sugar
      <G>
        <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" fill={color} opacity={0.3} />
        <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth={2} fill="none" />
      </G>
    ),
    sodium: (
      // Salt shaker icon
      <G>
        <Rect x={6} y={10} width={12} height={10} rx={2} fill={color} opacity={0.8} />
        <Path d="M8 10V6a4 4 0 018 0v4" stroke={color} strokeWidth={2} fill="none" />
        <Circle cx={9} cy={14} r={1} fill="#FFFFFF" />
        <Circle cx={12} cy={16} r={1} fill="#FFFFFF" />
        <Circle cx={15} cy={14} r={1} fill="#FFFFFF" />
      </G>
    ),

    // Vitamins
    vitaminA: (
      // Eye icon for vitamin A (vision)
      <G>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill={color} opacity={0.3} />
        <Circle cx={12} cy={12} r={3} fill={color} />
      </G>
    ),
    vitaminC: (
      // Citrus/orange icon for vitamin C
      <G>
        <Circle cx={12} cy={12} r={9} fill={color} opacity={0.3} />
        <Path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" stroke={color} strokeWidth={2} opacity={0.6} />
        <Circle cx={12} cy={12} r={4} fill={color} />
      </G>
    ),
    vitaminD: (
      // Sun icon for vitamin D
      <G>
        <Circle cx={12} cy={12} r={5} fill={color} />
        <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </G>
    ),
    vitaminB12: (
      // Lightning bolt for vitamin B12 (energy)
      <Path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        fill={color}
      />
    ),

    // Minerals
    calcium: (
      // Bone icon for calcium
      <G>
        <Path
          d="M18.5 5.5a3.5 3.5 0 00-4.95 0L12 7.05l-1.55-1.55a3.5 3.5 0 00-4.95 4.95l1.55 1.55-1.55 1.55a3.5 3.5 0 004.95 4.95L12 16.95l1.55 1.55a3.5 3.5 0 004.95-4.95L16.95 12l1.55-1.55a3.5 3.5 0 000-4.95z"
          fill={color}
        />
      </G>
    ),
    iron: (
      // Shield/strength icon for iron
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        fill={color}
      />
    ),
    potassium: (
      // Banana icon for potassium
      <Path
        d="M4 12c0-4 2-8 8-8 4 0 6 2 7.5 5.5C21 13 19 18 14 20c-3 1-6-1-7.5-3.5S4 13 4 12z"
        fill={color}
      />
    ),
    zinc: (
      // Hexagon shield for zinc
      <Path
        d="M12 2l8 4v6c0 5.5-3.84 10.74-8 12-4.16-1.26-8-6.5-8-12V6l8-4z"
        fill={color}
        opacity={0.85}
      />
    ),
    magnesium: (
      // Spark/energy icon for magnesium
      <G>
        <Path d="M12 2v6l4-2-4 8v6l-4 2 4-8V8l-4 2 4-8z" fill={color} />
      </G>
    ),
    folate: (
      // DNA/helix for folate
      <G>
        <Path d="M2 12c2-2 4-2 6-1s4 1 6 0 4-1 6 1" stroke={color} strokeWidth={2} fill="none" />
        <Path d="M2 8c2 2 4 2 6 1s4-1 6 0 4 1 6-1" stroke={color} strokeWidth={2} fill="none" />
        <Path d="M2 16c2 2 4 2 6 1s4-1 6 0 4 1 6-1" stroke={color} strokeWidth={2} fill="none" />
      </G>
    ),

    // Default fallback
    default: (
      <Circle cx={12} cy={12} r={8} fill={color} opacity={0.5} />
    ),
  };

  // Normalize key names
  const normalizedType = type
    ?.toLowerCase()
    .replace(/vitamin_?/gi, 'vitamin')
    .replace(/_/g, '');

  const icon = icons[normalizedType] || icons[type] || icons.default;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {icon}
    </Svg>
  );
};

// ============== SVG CHART COMPONENTS ==============

/**
 * Donut Chart for Macro Distribution
 */
const MacroDonutChart = ({ protein, carbs, fat, size = 140, strokeWidth = 20 }) => {
  const pct = calculateMacroPercentages(protein, carbs, fat);
  const totalCalories = (protein * 4) + (carbs * 4) + (fat * 9);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc lengths
  const proteinLength = (pct.protein / 100) * circumference;
  const carbsLength = (pct.carbs / 100) * circumference;
  const fatLength = (pct.fat / 100) * circumference;

  // Calculate offsets
  const carbsOffset = proteinLength;
  const fatOffset = proteinLength + carbsLength;

  const gap = 4; // Gap between segments

  return (
    <View style={styles.donutContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="proteinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.protein} />
            <Stop offset="100%" stopColor="#8B6EFF" />
          </LinearGradient>
          <LinearGradient id="carbsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.carbs} />
            <Stop offset="100%" stopColor="#60A5FA" />
          </LinearGradient>
          <LinearGradient id="fatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.fat} />
            <Stop offset="100%" stopColor="#FBBF24" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={SURFACES.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Protein arc */}
        {pct.protein > 0 && (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="url(#proteinGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${proteinLength - gap} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}

        {/* Carbs arc */}
        {pct.carbs > 0 && (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="url(#carbsGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${carbsLength - gap} ${circumference}`}
            strokeDashoffset={-carbsOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}

        {/* Fat arc */}
        {pct.fat > 0 && (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="url(#fatGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${fatLength - gap} ${circumference}`}
            strokeDashoffset={-fatOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
      </Svg>

      {/* Center content */}
      <View style={styles.donutCenter}>
        <Text style={styles.donutCalories}>{Math.round(totalCalories)}</Text>
        <Text style={styles.donutCaloriesLabel}>kcal</Text>
      </View>

      {/* Legend */}
      <View style={styles.donutLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.protein }]} />
          <Text style={styles.legendText}>P {pct.protein}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.carbs }]} />
          <Text style={styles.legendText}>C {pct.carbs}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.fat }]} />
          <Text style={styles.legendText}>F {pct.fat}%</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Half Gauge Chart for Meal Score (Speedometer style)
 */
const MealScoreGauge = ({ score, size = 120 }) => {
  const scoreInfo = getScoreLabel(score);
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - 16) / 2;

  // Arc spans 180 degrees (semi-circle)
  const scoreAngle = 180 - (score / 100) * 180;

  const polarToCartesian = (angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const describeArc = (start, end) => {
    const startPoint = polarToCartesian(start);
    const endPoint = polarToCartesian(end);
    const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
    // Sweep flag 1 = clockwise (draws arc through TOP of semicircle)
    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
  };

  // Needle position
  const needlePoint = polarToCartesian(scoreAngle);

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size / 2 + 20}>
        <Defs>
          {/* Meter gradient: red (left) → yellow (middle) → green (right) */}
          <LinearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="30%" stopColor="#F59E0B" />
            <Stop offset="50%" stopColor="#FBBF24" />
            <Stop offset="70%" stopColor="#84CC16" />
            <Stop offset="100%" stopColor="#10B981" />
          </LinearGradient>
          <LinearGradient id="meterGradFaded" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
            <Stop offset="30%" stopColor="#F59E0B" stopOpacity="0.2" />
            <Stop offset="50%" stopColor="#FBBF24" stopOpacity="0.2" />
            <Stop offset="70%" stopColor="#84CC16" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Background arc (faded meter gradient) */}
        <Path
          d={describeArc(180, 0)}
          stroke="url(#meterGradFaded)"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />

        {/* Progress arc (full meter gradient, clipped by progress) */}
        <Path
          d={describeArc(180, scoreAngle)}
          stroke="url(#meterGrad)"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />

        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={6} fill={scoreInfo.color} />

        {/* Needle */}
        <Path
          d={`M ${cx} ${cy} L ${needlePoint.x} ${needlePoint.y}`}
          stroke={scoreInfo.color}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Needle glow */}
        <Circle cx={needlePoint.x} cy={needlePoint.y} r={5} fill={scoreInfo.color} opacity={0.4} />
      </Svg>

      {/* Score value */}
      <View style={styles.gaugeValue}>
        <Text style={[styles.gaugeScore, { color: scoreInfo.color }]}>{score}</Text>
        <Text style={styles.gaugeLabel}>{scoreInfo.label}</Text>
      </View>
    </View>
  );
};

/**
 * Individual Macro Ring - Apple Watch style circular progress
 */
const MacroRing = ({ value, label, color, dailyValue, size = 64, strokeWidth = 6 }) => {
  const percentage = dailyValue ? Math.min(100, (value / dailyValue) * 100) : 0;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.macroRingItem}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={`ring-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        {/* Background ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeOpacity={0.15}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={`url(#ring-${label})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {/* Center value */}
      <View style={[styles.macroRingCenter, { width: size, height: size }]}>
        <Text style={[styles.macroRingValue, { color }]}>{Math.round(value)}</Text>
        <Text style={styles.macroRingUnit}>g</Text>
      </View>
      {/* Label below */}
      <Text style={styles.macroRingLabel}>{label}</Text>
      <Text style={[styles.macroRingPercent, { color }]}>{Math.round(percentage)}%</Text>
    </View>
  );
};

/**
 * Macro Rings Row - Three circular rings for P/C/F
 */
const MacroRingsRow = ({ protein, carbs, fat }) => {
  // Daily values (FDA 2020-2025 based on 2000 cal diet)
  const dailyValues = {
    protein: 50,   // 50g DV
    carbs: 275,    // 275g DV
    fat: 78,       // 78g DV
  };

  return (
    <View style={styles.macroRingsContainer}>
      <MacroRing
        value={protein}
        label="Protein"
        color={COLORS.protein}
        dailyValue={dailyValues.protein}
      />
      <MacroRing
        value={carbs}
        label="Carbs"
        color={COLORS.carbs}
        dailyValue={dailyValues.carbs}
      />
      <MacroRing
        value={fat}
        label="Fat"
        color={COLORS.fat}
        dailyValue={dailyValues.fat}
      />
    </View>
  );
};

// Allergen icons and colors
const ALLERGEN_CONFIG = {
  gluten: { icon: 'nutrition', label: 'Gluten', color: '#D97706' },
  wheat: { icon: 'nutrition', label: 'Wheat', color: '#D97706' },
  dairy: { icon: 'water', label: 'Dairy', color: '#3B82F6' },
  milk: { icon: 'water', label: 'Milk', color: '#3B82F6' },
  lactose: { icon: 'water', label: 'Lactose', color: '#3B82F6' },
  nuts: { icon: 'leaf', label: 'Tree Nuts', color: '#92400E' },
  treeNuts: { icon: 'leaf', label: 'Tree Nuts', color: '#92400E' },
  peanuts: { icon: 'ellipse', label: 'Peanuts', color: '#B45309' },
  eggs: { icon: 'ellipse', label: 'Eggs', color: '#FBBF24' },
  egg: { icon: 'ellipse', label: 'Eggs', color: '#FBBF24' },
  soy: { icon: 'leaf', label: 'Soy', color: '#65A30D' },
  shellfish: { icon: 'fish', label: 'Shellfish', color: '#DC2626' },
  fish: { icon: 'fish', label: 'Fish', color: '#0891B2' },
  sesame: { icon: 'ellipse', label: 'Sesame', color: '#A16207' },
  sulfites: { icon: 'flask', label: 'Sulfites', color: '#7C3AED' },
};

/**
 * Allergen Badge - Warning badge for detected allergens
 */
const AllergenBadge = ({ allergen }) => {
  const config = ALLERGEN_CONFIG[allergen.toLowerCase()] || {
    icon: 'alert-circle',
    label: allergen,
    color: '#EF4444'
  };

  return (
    <View style={[styles.allergenBadge, { backgroundColor: config.color + '15', borderColor: config.color + '40' }]}>
      <Ionicons name={config.icon + '-outline'} size={12} color={config.color} />
      <Text style={[styles.allergenBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

/**
 * Allergens Section - Shows all detected allergens
 */
const AllergensSection = ({ allergens = [] }) => {
  if (!allergens || allergens.length === 0) return null;

  return (
    <View style={styles.allergensSection}>
      <View style={styles.allergenHeader}>
        <Ionicons name="warning" size={16} color="#EF4444" />
        <Text style={styles.allergenTitle}>Contains Allergens</Text>
      </View>
      <View style={styles.allergenBadgesRow}>
        {allergens.map((allergen, idx) => (
          <AllergenBadge key={idx} allergen={allergen} />
        ))}
      </View>
    </View>
  );
};

/**
 * Horizontal Bar Chart for Micronutrients with icons
 */
const MicroBarChart = ({ micros, maxBars = 6 }) => {
  const microsArray = Object.entries(micros || {})
    .filter(([, v]) => {
      const val = typeof v === 'object' ? v.value : v;
      return val && val > 0;
    })
    .map(([key, value]) => {
      const numVal = typeof value === 'object' ? value.value : value;
      const dailyValue = DAILY_VALUES[key]?.value || DAILY_VALUES[key] || 100;
      const pctDV = Math.round((numVal / dailyValue) * 100);
      return {
        key,
        value: numVal,
        pctDV,
        name: key.replace(/vitamin/i, 'Vit ').replace(/_/g, ' '),
        color: MICRO_COLORS[key] || BRAND.primary,
      };
    })
    .sort((a, b) => b.pctDV - a.pctDV)
    .slice(0, maxBars);

  if (microsArray.length === 0) {
    return (
      <View style={styles.noMicrosContainer}>
        <Text style={styles.noMicrosText}>No micronutrient data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.barChartContainer}>
      {microsArray.map(({ key, pctDV, name, color }) => (
        <View key={key} style={styles.barRow}>
          <View style={styles.barIconLabel}>
            <NutrientIcon type={key} size={14} color={color} />
            <Text style={styles.barLabel} numberOfLines={1}>{name}</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, pctDV)}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <Text style={[styles.barValue, pctDV >= 20 && { color: '#10B981', fontWeight: '700' }]}>
            {pctDV}%
          </Text>
        </View>
      ))}
    </View>
  );
};

/**
 * Nutri-Score Badge (European A-E grade system)
 * Recreated as SVG - matches official visual style
 */
const NutriScoreBadge = ({ grade, size = 'medium' }) => {
  const grades = ['A', 'B', 'C', 'D', 'E'];
  const activeIndex = grades.indexOf(grade);

  // Size presets
  const sizes = {
    small: { width: 120, height: 48, fontSize: 14, activeSize: 28, inactiveSize: 18 },
    medium: { width: 160, height: 56, fontSize: 16, activeSize: 36, inactiveSize: 22 },
    large: { width: 200, height: 70, fontSize: 20, activeSize: 44, inactiveSize: 28 },
  };
  const s = sizes[size] || sizes.medium;

  const segmentWidth = (s.width - 16) / 5; // 5 segments with padding
  const barHeight = s.inactiveSize + 4;
  const barY = s.height - barHeight - 8;

  return (
    <View style={styles.nutriScoreContainer}>
      <Text style={[styles.nutriScoreLabel, { fontSize: s.fontSize - 4 }]}>NUTRI-SCORE</Text>
      <Svg width={s.width} height={s.height - 12}>
        {/* Background bar with rounded ends */}
        <Rect
          x={4}
          y={barY}
          width={s.width - 8}
          height={barHeight}
          rx={barHeight / 2}
          ry={barHeight / 2}
          fill="#E5E7EB"
        />

        {/* Grade segments */}
        {grades.map((g, index) => {
          const isActive = index === activeIndex;
          const x = 8 + index * segmentWidth;
          const centerX = x + segmentWidth / 2;
          const centerY = barY + barHeight / 2;
          const radius = isActive ? s.activeSize / 2 : s.inactiveSize / 2;
          const colors = NUTRI_COLORS[g];

          // For inactive grades, show smaller circles in the bar
          // For active grade, show larger circle that pops out
          return (
            <G key={g}>
              {/* Background segment color */}
              <Rect
                x={x}
                y={barY + 2}
                width={segmentWidth - 2}
                height={barHeight - 4}
                fill={isActive ? 'transparent' : colors.bg}
                opacity={isActive ? 1 : 0.6}
              />

              {/* Active grade - large circle */}
              {isActive && (
                <>
                  {/* Shadow/glow effect */}
                  <Circle
                    cx={centerX}
                    cy={centerY - 4}
                    r={radius + 2}
                    fill={colors.bg}
                    opacity={0.3}
                  />
                  {/* Main circle */}
                  <Circle
                    cx={centerX}
                    cy={centerY - 4}
                    r={radius}
                    fill={colors.bg}
                  />
                  {/* White border */}
                  <Circle
                    cx={centerX}
                    cy={centerY - 4}
                    r={radius}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                </>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Letter labels - positioned over the SVG */}
      <View style={[styles.nutriScoreLetters, { top: barY + 2, width: s.width - 16 }]}>
        {grades.map((g, index) => {
          const isActive = index === activeIndex;
          const colors = NUTRI_COLORS[g];
          return (
            <View
              key={g}
              style={[
                styles.nutriScoreLetter,
                {
                  width: segmentWidth,
                  height: isActive ? s.activeSize : s.inactiveSize,
                  marginTop: isActive ? -8 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.nutriScoreLetterText,
                  {
                    color: isActive ? colors.text : colors.bg,
                    fontSize: isActive ? s.fontSize + 4 : s.fontSize - 2,
                    fontWeight: isActive ? '800' : '700',
                    opacity: isActive ? 1 : 0.8,
                  },
                ]}
              >
                {g}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Stat Pill for Fiber/Sugar/Sodium with custom nutrient icons
 */
const StatPill = ({ nutrient, label, value, unit, color, warning }) => (
  <View style={[styles.statPill, warning && styles.statPillWarning]}>
    <View style={[styles.statPillIcon, { backgroundColor: color + '20' }]}>
      <NutrientIcon type={nutrient} size={16} color={color} />
    </View>
    <View style={styles.statPillContent}>
      <Text style={styles.statPillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {Math.round(value)}{unit}
      </Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
    {warning && <Text style={styles.statPillWarningBadge}>!</Text>}
  </View>
);

/**
 * Ingredient Row - toggleable ingredient within a food item
 */
const IngredientRow = ({ ingredient, isIncluded, onToggle }) => (
  <TouchableOpacity
    style={[styles.ingredientRow, !isIncluded && styles.ingredientRowExcluded]}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <View style={styles.ingredientInfo}>
      <Text style={[styles.ingredientName, !isIncluded && styles.ingredientNameExcluded]} numberOfLines={1}>
        {ingredient.name}
      </Text>
      {ingredient.portion && (
        <Text style={styles.ingredientPortion}>{ingredient.portion}</Text>
      )}
    </View>
    {ingredient.calories > 0 && (
      <Text style={[styles.ingredientCalories, !isIncluded && styles.ingredientCaloriesExcluded]}>
        {Math.round(ingredient.calories)} cal
      </Text>
    )}
    <View style={[styles.ingredientToggle, isIncluded ? styles.ingredientToggleOn : styles.ingredientToggleOff]}>
      <Ionicons
        name={isIncluded ? 'checkmark' : 'close'}
        size={14}
        color={isIncluded ? '#FFFFFF' : TEXT.tertiary}
      />
    </View>
  </TouchableOpacity>
);

/**
 * Food Item Row - with delete and ingredient management
 */
const FoodItemRow = ({ item, index, isExpanded, onToggle, onRemove, isIncluded, ingredients, excludedIngredients, onToggleIngredient }) => {
  const macros = item.macros || {};
  let calories = macros.calories_kcal || macros.calories || 0;
  let protein = macros.protein_g || macros.protein || 0;
  let carbs = macros.carbs_g || macros.carbs || 0;
  let fat = macros.fat_g || macros.fat || 0;

  const confidence = item.sourceEvidence?.[0]?.confidence || item.confidence || 0.7;
  const itemIngredients = ingredients || item.ingredients || [];

  // CRITICAL FIX: Subtract excluded ingredients from displayed values
  itemIngredients.forEach((ing, ingIdx) => {
    const ingKey = `${index}-${ingIdx}`;
    if (excludedIngredients?.has(ingKey)) {
      calories -= ing.calories || 0;
      protein -= ing.protein || 0;
      carbs -= ing.carbs || 0;
      fat -= ing.fat || 0;
    }
  });
  // Ensure non-negative
  calories = Math.max(0, calories);
  protein = Math.max(0, protein);
  carbs = Math.max(0, carbs);
  fat = Math.max(0, fat);

  return (
    <View style={[styles.foodItemRow, !isIncluded && styles.foodItemRowExcluded]}>
      <TouchableOpacity style={styles.foodItemHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.foodItemIndex, !isIncluded && styles.foodItemIndexExcluded]}>
          <Text style={[styles.foodItemIndexText, !isIncluded && styles.foodItemIndexTextExcluded]}>{index + 1}</Text>
        </View>
        <View style={styles.foodItemInfo}>
          <Text style={[styles.foodItemName, !isIncluded && styles.foodItemNameExcluded]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.foodItemMacros, !isIncluded && styles.foodItemMacrosExcluded]}>
            {Math.round(protein)}P · {Math.round(carbs)}C · {Math.round(fat)}F
          </Text>
        </View>
        <View style={styles.foodItemCalories}>
          <Text style={[styles.foodItemCaloriesValue, !isIncluded && styles.foodItemCaloriesExcluded]}>
            {Math.round(calories)}
          </Text>
          <Text style={[styles.foodItemCaloriesUnit, !isIncluded && styles.foodItemCaloriesExcluded]}>cal</Text>
        </View>
        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isIncluded ? 'trash-outline' : 'add-circle-outline'}
            size={20}
            color={isIncluded ? '#EF4444' : '#10B981'}
          />
        </TouchableOpacity>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={TEXT.tertiary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.foodItemExpanded}>
          <View style={styles.portionInfo}>
            <Ionicons name="scale-outline" size={14} color={TEXT.tertiary} />
            <Text style={styles.portionText}>
              {item.portion?.amount || 1} {item.portion?.unit || 'serving'}
              {item.portion?.gramsEquivalent && ` (~${item.portion.gramsEquivalent}g)`}
              {confidence < 0.7 && <Text style={styles.estimateTag}> (estimate)</Text>}
            </Text>
          </View>

          {/* Ingredients list with toggles */}
          {itemIngredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={styles.ingredientsTitle}>Ingredients ({itemIngredients.length})</Text>
              <Text style={styles.ingredientsHint}>Tap to exclude/include</Text>
              {itemIngredients.map((ing, ingIdx) => {
                const ingKey = `${index}-${ingIdx}`;
                const isIngIncluded = !excludedIngredients?.has(ingKey);
                return (
                  <IngredientRow
                    key={ingKey}
                    ingredient={ing}
                    isIncluded={isIngIncluded}
                    onToggle={() => onToggleIngredient && onToggleIngredient(ingKey, ing)}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ============== MAIN COMPONENT ==============

export default function UnifiedMealAnalysis({
  items = [],
  totals = {},
  onSave,
  onEdit,
  onItemsChange,
  saving = false,
}) {
  const [expandedItems, setExpandedItems] = useState({});
  const [showAllMicros, setShowAllMicros] = useState(false);
  const [excludedItems, setExcludedItems] = useState(new Set());
  const [excludedIngredients, setExcludedIngredients] = useState(new Set());

  // Filter items based on exclusions
  const activeItems = useMemo(() => {
    return items.filter((_, idx) => !excludedItems.has(idx));
  }, [items, excludedItems]);

  // Toggle item inclusion
  const toggleItemExclusion = (index) => {
    setExcludedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Toggle ingredient inclusion
  const toggleIngredientExclusion = (ingredientKey, _ingredient) => {
    setExcludedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientKey)) {
        newSet.delete(ingredientKey);
      } else {
        newSet.add(ingredientKey);
      }
      return newSet;
    });
  };

  // Notify parent when active items change
  React.useEffect(() => {
    if (onItemsChange && (excludedItems.size > 0 || excludedIngredients.size > 0)) {
      onItemsChange(activeItems, calculatedTotals);
    }
  }, [activeItems, calculatedTotals, onItemsChange, excludedItems.size, excludedIngredients.size]);

  const calculatedTotals = useMemo(() => {
    // If user has modified items, always recalculate from activeItems
    const hasExclusions = excludedItems.size > 0 || excludedIngredients.size > 0;

    if (!hasExclusions && totals && (totals.calories > 0 || totals.calories_kcal > 0)) {
      // If sodium is missing from totals, try to extract from micros
      let sodium = totals.sodium || totals.sodium_mg || 0;
      if (sodium === 0 && totals.micros) {
        sodium = extractSodiumFromMicros(totals.micros);
      }
      return {
        calories: totals.calories || totals.calories_kcal || 0,
        protein: totals.protein || totals.protein_g || 0,
        carbs: totals.carbs || totals.carbs_g || 0,
        fat: totals.fat || totals.fat_g || 0,
        fiber: totals.fiber || totals.fiber_g || 0,
        sugar: totals.sugar || totals.sugar_g || 0,
        sodium,
        micros: totals.micros || {},
      };
    }

    // Calculate from active items only (exclude removed items)
    // Also need original item indices to check excluded ingredients
    const activeIndices = items.map((_, idx) => idx).filter(idx => !excludedItems.has(idx));

    const result = activeItems.reduce((acc, item, arrIdx) => {
      const macros = item.macros || {};
      const itemMicros = item.micros || {};
      const originalIndex = activeIndices[arrIdx]; // Map back to original index

      // Start with item's base macros
      let itemCalories = macros.calories_kcal || macros.calories || 0;
      let itemProtein = macros.protein_g || macros.protein || 0;
      let itemCarbs = macros.carbs_g || macros.carbs || 0;
      let itemFat = macros.fat_g || macros.fat || 0;
      let itemFiber = macros.fiber_g || macros.fiber || 0;
      let itemSugar = macros.sugar_g || macros.sugar || 0;

      // CRITICAL FIX: Subtract excluded ingredients' nutrients
      const itemIngredients = item.ingredients || [];
      itemIngredients.forEach((ing, ingIdx) => {
        const ingKey = `${originalIndex}-${ingIdx}`;
        if (excludedIngredients.has(ingKey)) {
          // Subtract this ingredient's calories and macros
          itemCalories -= ing.calories || 0;
          itemProtein -= ing.protein || 0;
          itemCarbs -= ing.carbs || 0;
          itemFat -= ing.fat || 0;
          itemFiber -= ing.fiber || 0;
          itemSugar -= ing.sugar || 0;
        }
      });

      // Ensure we don't go negative
      acc.calories += Math.max(0, itemCalories);
      acc.protein += Math.max(0, itemProtein);
      acc.carbs += Math.max(0, itemCarbs);
      acc.fat += Math.max(0, itemFat);
      acc.fiber += Math.max(0, itemFiber);
      acc.sugar += Math.max(0, itemSugar);

      // FIX: Get sodium from macros first, fallback to micros
      let itemSodium = macros.sodium_mg || macros.sodium || 0;
      if (itemSodium === 0) {
        itemSodium = extractSodiumFromMicros(itemMicros);
      }
      acc.sodium += itemSodium;

      // Aggregate micros
      Object.entries(itemMicros).forEach(([key, val]) => {
        const numVal = typeof val === 'object' ? val.value : val;
        if (!acc.micros[key]) {
          acc.micros[key] = { value: 0, unit: typeof val === 'object' ? val.unit : 'mg' };
        }
        acc.micros[key].value += numVal || 0;
      });

      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, micros: {} });

    return result;
  }, [activeItems, totals, excludedItems, excludedIngredients]);

  // Calculate average confidence first (needed for unified scoring)
  const avgConfidence = items.reduce((sum, i) => sum + (i.sourceEvidence?.[0]?.confidence || i.confidence || 0.7), 0) / (items.length || 1);

  // Use unified scoring function (same as MealSummaryScreen) for consistency
  const mealScore = calculateUnifiedMealScore({
    macros: {
      protein_g: calculatedTotals.protein,
      carbs_g: calculatedTotals.carbs,
      fat_g: calculatedTotals.fat,
      fiber_g: calculatedTotals.fiber,
      sugar_g: calculatedTotals.sugar,
      calories_kcal: calculatedTotals.calories,
    },
    micros: calculatedTotals.micros,
    confidence: avgConfidence,
  });
  const nutriGrade = scoreToNutriGrade(mealScore);
  const hasHighSodium = calculatedTotals.sodium > 800;

  // Extract allergens from all items
  const allAllergens = useMemo(() => {
    const allergenSet = new Set();
    items.forEach(item => {
      const itemAllergens = item.allergens || item.potentialAllergens || [];
      itemAllergens.forEach(a => allergenSet.add(a.toLowerCase()));
    });
    return Array.from(allergenSet);
  }, [items]);

  const toggleItem = (index) => {
    setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <View style={styles.container}>
      {/* === HERO: Donut + Score/NutriScore === */}
      <View style={styles.heroSection}>
        <MacroDonutChart
          protein={calculatedTotals.protein}
          carbs={calculatedTotals.carbs}
          fat={calculatedTotals.fat}
          size={140}
        />
        <View style={styles.scoreSection}>
          <MealScoreGauge score={mealScore} size={110} />
          <NutriScoreBadge grade={nutriGrade} size="small" />
        </View>
      </View>

      {/* === MACRO RINGS (Apple Watch style) === */}
      <MacroRingsRow
        protein={calculatedTotals.protein}
        carbs={calculatedTotals.carbs}
        fat={calculatedTotals.fat}
      />

      {/* === ALLERGENS WARNING === */}
      <AllergensSection allergens={allAllergens} />

      {/* === MEAL BREAKDOWN === */}
      {/* Moved up for better visibility - users want to see ingredients immediately */}
      <View style={styles.itemsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Meal Items ({activeItems.length}/{items.length})
          </Text>
          {excludedItems.size > 0 && (
            <Text style={styles.excludedCount}>
              {excludedItems.size} removed
            </Text>
          )}
        </View>
        {items.map((item, index) => (
          <FoodItemRow
            key={item.itemId || index}
            item={item}
            index={index}
            isExpanded={expandedItems[index]}
            isIncluded={!excludedItems.has(index)}
            onToggle={() => toggleItem(index)}
            onRemove={() => toggleItemExclusion(index)}
            excludedIngredients={excludedIngredients}
            onToggleIngredient={toggleIngredientExclusion}
          />
        ))}
      </View>

      {/* === ADDITIONAL: Fiber/Sugar/Sodium === */}
      <View style={styles.statPillsRow}>
        <StatPill nutrient="fiber" label="Fiber" value={calculatedTotals.fiber} unit="g" color={COLORS.fiber} />
        <StatPill nutrient="sugar" label="Sugar" value={calculatedTotals.sugar} unit="g" color={COLORS.sugar} />
        <StatPill nutrient="sodium" label="Sodium" value={calculatedTotals.sodium} unit="mg" color={COLORS.sodium} warning={hasHighSodium} />
      </View>

      {/* === MICRONUTRIENTS BAR CHART === */}
      {Object.keys(calculatedTotals.micros || {}).length > 0 && (
        <View style={styles.microsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Micronutrients (%DV)</Text>
            {Object.keys(calculatedTotals.micros).length > 6 && (
              <TouchableOpacity onPress={() => setShowAllMicros(!showAllMicros)}>
                <Text style={styles.showMoreText}>
                  {showAllMicros ? 'Show less' : `+${Object.keys(calculatedTotals.micros).length - 6} more`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <MicroBarChart micros={calculatedTotals.micros} maxBars={showAllMicros ? 12 : 6} />
        </View>
      )}

      {/* === CONFIDENCE === */}
      {avgConfidence < 0.8 && (
        <View style={styles.confidenceBanner}>
          <Ionicons name="information-circle-outline" size={16} color={TEXT.secondary} />
          <Text style={styles.confidenceText}>
            AI estimates (confidence: {Math.round(avgConfidence * 100)}%)
          </Text>
        </View>
      )}

      {/* === ACTIONS === */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onSave && (
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            <ExpoGradient
              colors={[BRAND.primary, BRAND.secondary || '#8B6EFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Log Meal'}</Text>
            </ExpoGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============== STYLES ==============

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 24,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  // Hero Section
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreSection: {
    alignItems: 'center',
    gap: 8,
  },

  // Donut Chart
  donutContainer: {
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCalories: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT.primary,
    letterSpacing: -1,
  },
  donutCaloriesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.tertiary,
    marginTop: -2,
  },
  donutLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.secondary,
  },

  // Macro Circular Rings (Apple Watch style)
  macroRingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    marginBottom: 8,
  },
  macroRingItem: {
    alignItems: 'center',
    position: 'relative',
  },
  macroRingCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroRingValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  macroRingUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: TEXT.tertiary,
    marginTop: -2,
  },
  macroRingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.secondary,
    marginTop: 6,
  },
  macroRingPercent: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  // Allergens Section
  allergensSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  allergenTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  allergenBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  allergenBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Gauge Chart
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    alignItems: 'center',
    marginTop: -20,
  },
  gaugeScore: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
    marginTop: -2,
  },

  // Nutri-Score Badge
  nutriScoreContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  nutriScoreLabel: {
    fontWeight: '800',
    color: TEXT.secondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  nutriScoreLetters: {
    position: 'absolute',
    flexDirection: 'row',
    left: 8,
  },
  nutriScoreLetter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriScoreLetterText: {
    textAlign: 'center',
  },

  // Stat Pills
  statPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.secondary,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  statPillWarning: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  statPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPillContent: {
    flex: 1,
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
  },
  statPillUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT.tertiary,
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: TEXT.tertiary,
  },
  statPillWarningBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    width: 16,
    textAlign: 'center',
  },

  // Micronutrients Bar Chart
  microsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
  barChartContainer: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.secondary,
    flex: 1,
    textTransform: 'capitalize',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: SURFACES.card.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
    width: 35,
    textAlign: 'right',
  },
  noMicrosContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noMicrosText: {
    fontSize: 12,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },

  // Confidence Banner
  confidenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 12,
    color: TEXT.secondary,
    flex: 1,
  },

  // Items Section
  itemsSection: {
    marginBottom: 16,
  },

  // Food Item Row
  foodItemRow: {
    backgroundColor: SURFACES.card.secondary,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  foodItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  foodItemIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItemIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND.primary,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.primary,
  },
  foodItemMacros: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  foodItemCalories: {
    alignItems: 'flex-end',
  },
  foodItemCaloriesValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  foodItemCaloriesUnit: {
    fontSize: 10,
    color: TEXT.tertiary,
  },

  // Expanded Details
  foodItemExpanded: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.primary,
  },
  portionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 8,
  },
  portionText: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  estimateTag: {
    fontStyle: 'italic',
    color: '#F59E0B',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BRAND.primary,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.primary,
  },
  primaryButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Ingredient management styles
  ingredientsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  ingredientsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: 4,
  },
  ingredientsHint: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    backgroundColor: SURFACES.card.secondary,
    borderRadius: 8,
    gap: 8,
  },
  ingredientRowExcluded: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.primary,
  },
  ingredientNameExcluded: {
    textDecorationLine: 'line-through',
    color: TEXT.tertiary,
  },
  ingredientPortion: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  ingredientCalories: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  ingredientCaloriesExcluded: {
    color: TEXT.tertiary,
  },
  ingredientToggle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientToggleOn: {
    backgroundColor: '#10B981',
  },
  ingredientToggleOff: {
    backgroundColor: '#E5E7EB',
  },

  // Food item excluded states
  foodItemRowExcluded: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  foodItemIndexExcluded: {
    backgroundColor: '#E5E7EB',
  },
  foodItemIndexTextExcluded: {
    color: TEXT.tertiary,
  },
  foodItemNameExcluded: {
    textDecorationLine: 'line-through',
    color: TEXT.tertiary,
  },
  foodItemMacrosExcluded: {
    color: TEXT.tertiary,
  },
  foodItemCaloriesExcluded: {
    color: TEXT.tertiary,
  },

  // Remove button
  removeButton: {
    padding: 4,
    marginRight: 4,
  },

  // Excluded count badge
  excludedCount: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
