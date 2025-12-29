import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swipeable } from 'react-native-gesture-handler';
import apiClient from '../../services/apiClient';

export const FavoriteMealsList = ({ onSelectMeal }) => {
  const queryClient = useQueryClient();
  const { data: favoriteMeals, isLoading, error } = useQuery({
    queryKey: ['favoriteMeals'],
    queryFn: async () => {
      const response = await apiClient.get('/savedMeals'); // Matches the route created previously
      return response.data || [];
    },
    staleTime: 300000, // 5 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/savedMeals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favoriteMeals']);
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load favorite meals.</Text>
      </View>
    );
  }

  if (!favoriteMeals || favoriteMeals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={48} color="#E5E7EB" />
        <Text style={styles.emptyText}>No favorite meals yet.</Text>
        <Text style={styles.emptySubtext}>Save meals after logging to see them here.</Text>
      </View>
    );
  }

  const renderRightActions = (progress, dragX, id) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity 
        onPress={() => deleteMutation.mutate(id)} 
        style={styles.deleteAction}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={(p, d) => renderRightActions(p, d, item._id || item.id)}>
      <TouchableOpacity
        style={styles.mealItem}
        onPress={() => onSelectMeal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.mealIcon}>
          <Ionicons name="bookmark" size={20} color="#F59E0B" />
        </View>
        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{item.name}</Text>
          <Text style={styles.mealMeta}>
            {item.items?.length || 0} items • {Math.round(item.totals?.calories || 0)} kcal
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <FlatList
      data={favoriteMeals}
      renderItem={renderItem}
      keyExtractor={(item) => item._id || item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
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
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  mealMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
  },
});