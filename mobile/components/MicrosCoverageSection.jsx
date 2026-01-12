import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CircularProgress from './CircularProgress';
import MicroBar from './MicroBar';
import {
  calculateMicrosCoverage,
  getMicrosWithPercentages,
  getMicrosCoverageColor,
} from '../utils/microsCalculations';

/**
 * Micros coverage section with ring + top 3 bars
 * Expands to show all micros on tap
 */
const MicrosCoverageSection = ({ micros, onViewAll }) => {
  const coverage = calculateMicrosCoverage(micros);
  const microsData = getMicrosWithPercentages(micros);
  const top3 = microsData.slice(0, 3);
  const coverageColor = getMicrosCoverageColor(coverage);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Micronutrients</Text>
        <Text style={styles.sectionNote}>Estimated</Text>
      </View>

      {/* Coverage Ring */}
      <View style={styles.ringSection}>
        <CircularProgress
          value={coverage}
          maxValue={100}
          size={120}
          strokeWidth={12}
          color={coverageColor}
          backgroundColor=TEXT.tertiary
        >
          <View style={styles.ringCenter}>
            <Text style={styles.coverageValue}>{coverage}%</Text>
            <Text style={styles.coverageLabel}>Coverage</Text>
          </View>
        </CircularProgress>
        <View style={styles.coverageInfo}>
          <Text style={styles.coverageTitle}>Daily Micronutrients</Text>
          <Text style={styles.coverageSubtitle}>
            {microsData.length} nutrients tracked
          </Text>
          <Text style={[styles.coverageStatus, { color: coverageColor }]}>
            {coverage >= 70
              ? 'Well covered'
              : coverage >= 50
              ? 'Improving'
              : 'Needs attention'}
          </Text>
        </View>
      </View>

      {/* Top 3 Micros */}
      {top3.length > 0 && (
        <View style={styles.barsSection}>
          <Text style={styles.barsTitle}>Top Priority</Text>
          {top3.map((micro) => (
            <MicroBar
              key={micro.key}
              label={micro.label}
              value={micro.value}
              unit={micro.unit}
              percentage={micro.percentage}
              rdi={micro.rdi}
            />
          ))}
        </View>
      )}

      {/* View All Link */}
      {microsData.length > 3 && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>
            View all {microsData.length} micronutrients →
          </Text>
        </TouchableOpacity>
      )}

      {/* Empty State */}
      {microsData.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No micronutrient data yet. Log foods to see coverage.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  sectionNote: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ringSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ringCenter: {
    alignItems: 'center',
  },
  coverageValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  coverageLabel: {
    fontSize: 12,
    color: TEXT.secondary,
    marginTop: 2,
  },
  coverageInfo: {
    flex: 1,
    marginLeft: 20,
  },
  coverageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  coverageSubtitle: {
    fontSize: 13,
    color: TEXT.secondary,
    marginBottom: 4,
  },
  coverageStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  barsSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  barsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: 16,
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
});

export default MicrosCoverageSection;
