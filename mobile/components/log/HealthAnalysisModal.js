import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SURFACES, TEXT, SEMANTIC_ACTIONS, TYPOGRAPHY, NUTRISCORE } from '../../constants/premiumTheme';

export const HealthAnalysisModal = ({ visible, onClose, data }) => {
  if (!data) return null;

  const { healthScore, nutriScore, cookingMethod, analysis, foodName, protein, carbs, fat } = data;

  const getNutriScoreColor = (score) => {
    switch (score?.toUpperCase()) {
      case 'A': return NUTRISCORE.A.base;
      case 'B': return NUTRISCORE.B.base;
      case 'C': return NUTRISCORE.C.base;
      case 'D': return NUTRISCORE.D.base;
      case 'E': return NUTRISCORE.E.base;
      default: return TEXT.tertiary;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return SEMANTIC_ACTIONS.success;
    if (score >= 50) return SEMANTIC_ACTIONS.warning;
    return SEMANTIC_ACTIONS.danger;
  };

  const handleShare = async () => {
    try {
      const message = `Health Analysis for ${foodName}\n\n` +
        `Health Score: ${healthScore}/100\n` +
        `Nutri-Score: ${nutriScore}\n` +
        `Cooking Method: ${cookingMethod || 'Unknown'}\n\n` +
        `AI Analysis:\n${analysis || 'No analysis available.'}`;

      await Share.share({
        message,
        title: `Health Analysis: ${foodName}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Calculate macro percentages for chart
  const totalMacros = (protein || 0) + (carbs || 0) + (fat || 0);
  const pPct = totalMacros ? ((protein || 0) / totalMacros) * 100 : 0;
  const cPct = totalMacros ? ((carbs || 0) / totalMacros) * 100 : 0;
  const fPct = totalMacros ? ((fat || 0) / totalMacros) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Health Analysis</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                <Ionicons name="share-social-outline" size={24} color={SEMANTIC_ACTIONS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={24} color={TEXT.tertiary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.foodName}>{foodName}</Text>

            <View style={styles.scoresRow}>
              {/* Health Score */}
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Health Score</Text>
                <View style={[styles.scoreCircle, { borderColor: getScoreColor(healthScore) }]}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(healthScore) }]}>
                    {healthScore ?? '?'}
                  </Text>
                </View>
              </View>

              {/* NutriScore */}
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Nutri-Score</Text>
                <View style={[styles.nutriBadge, { backgroundColor: getNutriScoreColor(nutriScore) }]}>
                  <Text style={styles.nutriValue}>{nutriScore || '?'}</Text>
                </View>
              </View>
            </View>

            {/* Nutrient Balance Chart */}
            {totalMacros > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pie-chart-outline" size={20} color={SEMANTIC_ACTIONS.primary} />
                  <Text style={styles.sectionTitle}>Nutrient Balance</Text>
                </View>
                
                <View style={styles.chartContainer}>
                  <View style={styles.chartBar}>
                    {pPct > 0 && <View style={[styles.chartSegment, { flex: pPct, backgroundColor: SEMANTIC_ACTIONS.success }]} />}
                    {cPct > 0 && <View style={[styles.chartSegment, { flex: cPct, backgroundColor: SEMANTIC_ACTIONS.warning }]} />}
                    {fPct > 0 && <View style={[styles.chartSegment, { flex: fPct, backgroundColor: SEMANTIC_ACTIONS.danger }]} />}
                  </View>

                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: SEMANTIC_ACTIONS.success }]} />
                      <Text style={styles.legendText}>Protein ({Math.round(pPct)}%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: SEMANTIC_ACTIONS.warning }]} />
                      <Text style={styles.legendText}>Carbs ({Math.round(cPct)}%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: SEMANTIC_ACTIONS.danger }]} />
                      <Text style={styles.legendText}>Fat ({Math.round(fPct)}%)</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Cooking Method */}
            {cookingMethod && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flame-outline" size={20} color={SEMANTIC_ACTIONS.primary} />
                  <Text style={styles.sectionTitle}>Cooking Method</Text>
                </View>
                <Text style={styles.sectionText}>
                  Detected as <Text style={styles.highlight}>{cookingMethod}</Text>
                </Text>
              </View>
            )}

            {/* AI Analysis */}
            {analysis && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="analytics-outline" size={20} color={SEMANTIC_ACTIONS.primary} />
                  <Text style={styles.sectionTitle}>AI Reasoning</Text>
                </View>
                <Text style={styles.analysisText}>{analysis}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: SURFACES.card.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: SURFACES.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  content: {
    paddingBottom: 40,
  },
  foodName: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  scoreCard: {
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontFamily: TYPOGRAPHY.family.bold,
  },
  nutriBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutriValue: {
    fontSize: TYPOGRAPHY.size['5xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
  },
  section: {
    backgroundColor: SURFACES.card.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  highlight: {
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC_ACTIONS.primary,
  },
  analysisText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 24,
  },
  chartContainer: {
    marginTop: 8,
  },
  chartBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: SURFACES.divider,
  },
  chartSegment: {
    height: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
});