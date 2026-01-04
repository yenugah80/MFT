import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NutritionCard } from './NutritionCard';
import { FoodItemsList } from './FoodItemsList';
import { MealTotalsCard } from './MealTotalsCard';

export default function LogResultsSection({
  styles,
  analyzedFood,
  analysisResult,
  dailyValues,
  onSaveLog,
  onSaveSingleItem,
  onSaveMeal,
  onCancel,
  onUpdateQuantity,
  onRemoveItem,
  onApplySuggestion,
  onShare,
  onReportIssue,
  onViewDetails,
  buildLegacyFoodLog,
}) {
  if (!analyzedFood && (!analysisResult?.items || analysisResult.items.length === 0)) {
    return null;
  }

  const items = analysisResult?.items || [];

  return (
    <View style={styles.resultsContainer}>
      {analyzedFood ? (
        <NutritionCard
          foodLog={analyzedFood}
          onSave={onSaveLog}
          dailyValues={dailyValues}
          onCancel={onCancel}
        />
      ) : items.length === 1 ? (
        <NutritionCard
          foodLog={buildLegacyFoodLog(items[0])}
          dailyValues={dailyValues}
          onSave={onSaveSingleItem}
          onCancel={onCancel}
        />
      ) : (
        <>
          <FoodItemsList
            items={items}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveItem}
            dailyValues={dailyValues}
          />
          <MealTotalsCard
            totals={analysisResult?.totals}
            itemCount={items.length}
            onSave={onSaveMeal}
          />
        </>
      )}

      {items.some(item => item.suggestions?.length > 0) && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeader}>
            <Ionicons name="help-buoy-outline" size={18} color="#F59E0B" />
            <Text style={styles.suggestionsTitle}>Did you mean?</Text>
          </View>
          {items.map(item => (
            item.suggestions?.length > 0 && (
              <View key={item.itemId} style={styles.suggestionGroup}>
                <Text style={styles.suggestionLabel}>For &quot;{item.name}&quot;:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionChips}
                >
                  {item.suggestions.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => onApplySuggestion(item.itemId, suggestion)}
                    >
                      <Text style={styles.suggestionChipText}>{suggestion.canonical}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )
          ))}
        </View>
      )}

      {analysisResult && (
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={onViewDetails}
          activeOpacity={0.8}
          accessibilityLabel="View detailed nutrition analysis"
        >
          <LinearGradient
            colors={['#6B4EFF', '#8B6EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewDetailsGradient}
          >
            <Ionicons name="analytics" size={20} color="#FFFFFF" />
            <Text style={styles.viewDetailsText}>View Detailed Analysis</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {analysisResult && (
        <View style={styles.resultsActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onShare}
            activeOpacity={0.8}
            accessibilityLabel="Share meal analysis results"
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={onReportIssue}
            activeOpacity={0.7}
            accessibilityLabel="Report incorrect nutrition"
          >
            <Ionicons name="flag-outline" size={16} color="#EF4444" />
            <Text style={styles.reportButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
