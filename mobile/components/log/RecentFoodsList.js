import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export const RecentFoodsList = ({ onSelectFood, onQuickAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: recentFoods, isLoading, error } = useQuery({
    queryKey: ['recentFoods'],
    queryFn: async () => {
      // Assuming an endpoint exists or we fetch history and deduplicate
      // For now, let's fetch history and process it client-side if no dedicated endpoint
      const response = await apiClient.get('/food/history?limit=50');
      const history = response.data || [];

      // Deduplicate by food name
      const uniqueFoods = [];
      const seenNames = new Set();

      for (const item of history) {
        const name = item.foodName?.trim();
        if (name && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          uniqueFoods.push(item);
        }
      }

      return uniqueFoods.slice(0, 20); // Return top 20 unique recent foods
    },
    staleTime: 60000, // 1 minute
  });

  const filteredFoods = useMemo(() => {
    if (!recentFoods) return [];
    if (!searchQuery.trim()) return recentFoods;
    return recentFoods.filter(item =>
      item.foodName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recentFoods, searchQuery]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading recent foods...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load recent foods.</Text>
      </View>
    );
  }

  if (!recentFoods || (recentFoods.length === 0 && !searchQuery)) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={48} color="#E5E7EB" />
        <Text style={styles.emptyText}>No recent foods found.</Text>
        <Text style={styles.emptySubtext}>Foods you log will appear here.</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.rowContainer}>
      <TouchableOpacity
        style={styles.foodItem}
        onPress={() => onSelectFood(item)}
        activeOpacity={0.7}
      >
        <View style={styles.foodIcon}>
          <Ionicons name="restaurant-outline" size={20} color="#6B4EFF" />
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <Text style={styles.foodMeta}>
            {Math.round(item.calories)} kcal • {item.servingSize || '1 serving'}
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickAddButton}
        onPress={() => onQuickAdd && onQuickAdd(item)}
      >
        <Ionicons name="flash-outline" size={20} color="#6B4EFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search recent foods..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFoods}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
  },
  listContent: {
    paddingBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingRight: 8,
  },
  foodItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  foodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  foodMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  quickAddButton: {
    padding: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    marginRight: 4,
  },
});