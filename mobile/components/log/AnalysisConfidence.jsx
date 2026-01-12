/**
 * AnalysisConfidence - Post-Analysis Trust Display
 * Shows AI confidence scores and manual edit options
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnalysisConfidence({
  analysisResult,
  onEditIngredient,
  onEditPortion,
  onManualOverride
}) {
  if (!analysisResult) return null;

  // Calculate overall confidence (mock - you'd get this from your AI response)
  const overallConfidence = 95; // This should come from your AI response
  const confidenceLevel = overallConfidence >= 90 ? 'high' : overallConfidence >= 75 ? 'medium' : 'low';

  // eslint-disable-next-line no-unused-vars
  const confidenceColor = {
    high: '#22C55E',
    medium: '#F59E0B',
    low: '#EF4444',
  }[confidenceLevel];

  const confidenceIcon = {
    high: 'checkmark-circle',
    medium: 'alert-circle',
    low: 'warning',
  }[confidenceLevel];

  return (
    <View style={styles.container}>
      {/* Confidence Score */}
      <LinearGradient
        colors={confidenceLevel === 'high' ? ['#10B981', '#22C55E'] : ['#F59E0B', '#FBBF24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.confidenceCard}
      >
        <View style={styles.confidenceLeft}>
          <Ionicons name={confidenceIcon} size={32} color="#FFFFFF" />
          <View style={styles.confidenceText}>
            <Text style={styles.confidenceTitle}>Estimate Strength</Text>
            <Text style={styles.confidenceSubtitle}>
              {confidenceLevel === 'high' ? 'Strong estimate' : confidenceLevel === 'medium' ? 'Typical estimate' : 'Needs adjustment'}
            </Text>
          </View>
        </View>
        <View style={styles.confidenceScore}>
          <Text style={styles.confidencePercent}>{overallConfidence}%</Text>
        </View>
      </LinearGradient>

      {/* Data Source Attribution */}
      <View style={styles.attributionCard}>
        <View style={styles.attributionHeader}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          <Text style={styles.attributionTitle}>How We Estimated This</Text>
        </View>

        <View style={styles.attributionList}>
          <AttributionItem
            icon="eye-outline"
            text="Visual analysis for food identification"
          />
          <AttributionItem
            icon="nutrition-outline"
            text="Typical portions and preparation"
          />
          <AttributionItem
            icon="library-outline"
            text="Public nutrition databases"
          />
        </View>

        <View style={styles.accuracyNote}>
          <Ionicons name="flask-outline" size={14} color="#6B4EFF" />
          <Text style={styles.accuracyText}>
            Estimates are approximate and may vary by brand and preparation.
          </Text>
        </View>
      </View>

      {/* Manual Override Options */}
      <View style={styles.editOptions}>
        <Text style={styles.editTitle}>Not quite right? You can adjust:</Text>

        <View style={styles.editButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={onEditIngredient}
            activeOpacity={0.7}
          >
            <Ionicons name="leaf-outline" size={18} color="#6B4EFF" />
            <Text style={styles.editButtonText}>Edit Ingredients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={onEditPortion}
            activeOpacity={0.7}
          >
            <Ionicons name="resize-outline" size={18} color="#6B4EFF" />
            <Text style={styles.editButtonText}>Adjust Portion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, styles.editButtonSecondary]}
            onPress={onManualOverride}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#6B7280" />
            <Text style={[styles.editButtonText, styles.editButtonTextSecondary]}>
              Manual Entry
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="medical-outline" size={14} color="#9CA3AF" />
        <Text style={styles.disclaimerText}>
          This is an AI estimated result for informational purposes. Always consult a healthcare professional for medical advice.
        </Text>
      </View>
    </View>
  );
}

function AttributionItem({ icon, text }) {
  return (
    <View style={styles.attributionItem}>
      <Ionicons
        name={icon}
        size={16}
        color="#6B4EFF"
      />
      <Text style={styles.attributionItemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  // Confidence Card
  confidenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confidenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  confidenceText: {
    marginLeft: 12,
  },
  confidenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  confidenceSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  confidenceScore: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confidencePercent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Attribution Card
  attributionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  attributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginLeft: 6,
  },
  attributionList: {
    marginBottom: 12,
  },
  attributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attributionItemText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B4EFF',
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  accuracyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${SEMANTIC_ACTIONS.success}0D`,
    padding: 8,
    borderRadius: 8,
  },
  accuracyText: {
    fontSize: 11,
    color: '#6B4EFF',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },

  // Edit Options
  editOptions: {
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}33`,
  },
  editButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderColor: SURFACES.divider,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B4EFF',
    marginLeft: 6,
  },
  editButtonTextSecondary: {
    color: '#6B7280',
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
