import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const fonts = {
  display: Platform.select({ ios: 'HelveticaNeue-Bold', android: 'Roboto-Bold', default: 'System' }),
  strong: Platform.select({ ios: 'HelveticaNeue-Medium', android: 'Roboto-Medium', default: 'System' }),
  regular: Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' }),
};

export const HealthAnalysisModal = ({ visible, onClose, data }) => {
  if (!data) return null;

  const { healthScore, nutriScore, cookingMethod, analysis, foodName, protein, carbs, fat } = data;

  const getNutriScoreColor = (score) => {
    switch (score?.toUpperCase()) {
      case 'A': return '#038141'; // Dark Green
      case 'B': return '#85BB2F'; // Light Green
      case 'C': return '#FECB02'; // Yellow
      case 'D': return '#EE8100'; // Orange
      case 'E': return '#E63E11'; // Red
      default: return '#9CA3AF';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
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
                <Ionicons name="share-social-outline" size={24} color="#6B4EFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
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
                  <Ionicons name="pie-chart-outline" size={20} color="#6B4EFF" />
                  <Text style={styles.sectionTitle}>Nutrient Balance</Text>
                </View>
                
                <View style={styles.chartContainer}>
                  <View style={styles.chartBar}>
                    {pPct > 0 && <View style={[styles.chartSegment, { flex: pPct, backgroundColor: '#10B981' }]} />}
                    {cPct > 0 && <View style={[styles.chartSegment, { flex: cPct, backgroundColor: '#F59E0B' }]} />}
                    {fPct > 0 && <View style={[styles.chartSegment, { flex: fPct, backgroundColor: '#EF4444' }]} />}
                  </View>
                  
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.legendText}>Protein ({Math.round(pPct)}%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.legendText}>Carbs ({Math.round(cPct)}%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
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
                  <Ionicons name="flame-outline" size={20} color="#6B4EFF" />
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
                  <Ionicons name="analytics-outline" size={20} color="#6B4EFF" />
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fonts.display,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: fonts.display,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: fonts.strong,
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
    fontSize: 28,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  nutriBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutriValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: fonts.display,
  },
  section: {
    backgroundColor: '#F9FAFB',
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
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    fontFamily: fonts.strong,
  },
  sectionText: {
    fontSize: 15,
    color: TEXT.secondary,
    fontFamily: fonts.regular,
  },
  highlight: {
    fontWeight: '700',
    color: '#6B4EFF',
  },
  analysisText: {
    fontSize: 15,
    color: TEXT.secondary,
    lineHeight: 24,
    fontFamily: fonts.regular,
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
    fontSize: 12,
    color: '#6B7280',
    fontFamily: fonts.strong,
  },
});