import { useState, useCallback, useMemo } from 'react';
import apiClient from '../services/apiClient';

/**
 * useIngredientEditor Hook
 *
 * Manages ingredient editing state and API integration for the
 * EnhancedIngredientEditor component.
 *
 * Features:
 * - Local state management for ingredients
 * - API calls for ingredient modifications
 * - Real-time nutrition recalculation
 * - Undo/redo support
 * - Optimistic updates
 *
 * @param {Object} options
 * @param {Object} options.editableIngredients - Initial editable ingredients from resolve
 * @param {Object} options.originalNutrition - Original nutrition values
 * @param {Function} options.onNutritionUpdate - Callback when nutrition changes
 * @returns {Object} Hook state and methods
 */
export function useIngredientEditor({
  editableIngredients,
  originalNutrition,
  onNutritionUpdate,
} = {}) {
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Current breakdown state
  const [breakdown, setBreakdown] = useState(editableIngredients || null);

  // History for undo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Track modifications
  const [modifications, setModifications] = useState([]);

  /**
   * Fetch ingredient breakdown for a food
   */
  const fetchBreakdown = useCallback(async (foodName, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/ingredients/breakdown', {
        foodName,
        brand: options.brand,
        region: options.region || 'US',
        existingNutrition: options.existingNutrition,
      });

      if (response.data?.success) {
        setBreakdown(response.data.breakdown);
        // Reset history
        setHistory([response.data.breakdown]);
        setHistoryIndex(0);
        return response.data.breakdown;
      } else {
        throw new Error(response.data?.error || 'Failed to get breakdown');
      }
    } catch (err) {
      console.error('[useIngredientEditor] fetchBreakdown error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove an ingredient
   */
  const removeIngredient = useCallback(async (ingredientId) => {
    if (!breakdown) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/ingredients/remove', {
        breakdown,
        ingredientId,
      });

      if (response.data?.success) {
        const updatedBreakdown = response.data.breakdown;

        // Update state
        setBreakdown(updatedBreakdown);

        // Add to history
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), updatedBreakdown]);
        setHistoryIndex((prev) => prev + 1);

        // Track modification
        setModifications((prev) => [
          ...prev,
          { action: 'remove', ingredientId, timestamp: Date.now() },
        ]);

        // Notify parent
        if (onNutritionUpdate) {
          onNutritionUpdate({
            calories: updatedBreakdown.totalNutrition?.calories || 0,
            protein: updatedBreakdown.totalNutrition?.protein || 0,
            carbs: updatedBreakdown.totalNutrition?.carbs || 0,
            fat: updatedBreakdown.totalNutrition?.fat || 0,
            isModified: true,
          });
        }

        return {
          success: true,
          breakdown: updatedBreakdown,
          removed: response.data.removed,
          summary: response.data.summary,
        };
      } else {
        throw new Error(response.data?.error || 'Failed to remove ingredient');
      }
    } catch (err) {
      console.error('[useIngredientEditor] removeIngredient error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [breakdown, historyIndex, onNutritionUpdate]);

  /**
   * Add an ingredient
   */
  const addIngredient = useCallback(async (ingredient) => {
    if (!breakdown) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/ingredients/add', {
        breakdown,
        ingredient: {
          name: ingredient.name,
          nutrition: ingredient.nutrition,
          portion: ingredient.portion,
          category: ingredient.category,
        },
      });

      if (response.data?.success) {
        const updatedBreakdown = response.data.breakdown;

        // Update state
        setBreakdown(updatedBreakdown);

        // Add to history
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), updatedBreakdown]);
        setHistoryIndex((prev) => prev + 1);

        // Track modification
        setModifications((prev) => [
          ...prev,
          { action: 'add', ingredient: ingredient.name, timestamp: Date.now() },
        ]);

        // Notify parent
        if (onNutritionUpdate) {
          onNutritionUpdate({
            calories: updatedBreakdown.totalNutrition?.calories || 0,
            protein: updatedBreakdown.totalNutrition?.protein || 0,
            carbs: updatedBreakdown.totalNutrition?.carbs || 0,
            fat: updatedBreakdown.totalNutrition?.fat || 0,
            isModified: true,
          });
        }

        return {
          success: true,
          breakdown: updatedBreakdown,
          added: response.data.added,
          summary: response.data.summary,
        };
      } else {
        throw new Error(response.data?.error || 'Failed to add ingredient');
      }
    } catch (err) {
      console.error('[useIngredientEditor] addIngredient error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [breakdown, historyIndex, onNutritionUpdate]);

  /**
   * Apply a customization string (e.g., "no pickles", "extra cheese")
   */
  const applyCustomization = useCallback(async (customization) => {
    if (!breakdown) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/ingredients/customize', {
        breakdown,
        customization,
      });

      if (response.data?.success) {
        const updatedBreakdown = response.data.breakdown;

        // Update state
        setBreakdown(updatedBreakdown);

        // Add to history
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), updatedBreakdown]);
        setHistoryIndex((prev) => prev + 1);

        // Track modification
        setModifications((prev) => [
          ...prev,
          { action: 'customize', customization, timestamp: Date.now() },
        ]);

        // Notify parent
        if (onNutritionUpdate) {
          onNutritionUpdate({
            calories: updatedBreakdown.totalNutrition?.calories || 0,
            protein: updatedBreakdown.totalNutrition?.protein || 0,
            carbs: updatedBreakdown.totalNutrition?.carbs || 0,
            fat: updatedBreakdown.totalNutrition?.fat || 0,
            isModified: true,
          });
        }

        return {
          success: true,
          breakdown: updatedBreakdown,
          summary: response.data.summary,
        };
      } else {
        throw new Error(response.data?.error || 'Failed to apply customization');
      }
    } catch (err) {
      console.error('[useIngredientEditor] applyCustomization error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [breakdown, historyIndex, onNutritionUpdate]);

  /**
   * Apply multiple modifications at once
   */
  const applyModifications = useCallback(async (mods) => {
    if (!breakdown || !Array.isArray(mods) || mods.length === 0) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/ingredients/modify', {
        breakdown,
        modifications: mods,
      });

      if (response.data?.success) {
        const updatedBreakdown = response.data.breakdown;

        // Update state
        setBreakdown(updatedBreakdown);

        // Add to history
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), updatedBreakdown]);
        setHistoryIndex((prev) => prev + 1);

        // Track modifications
        setModifications((prev) => [
          ...prev,
          ...mods.map((m) => ({ ...m, timestamp: Date.now() })),
        ]);

        // Notify parent
        if (onNutritionUpdate) {
          onNutritionUpdate({
            calories: updatedBreakdown.totalNutrition?.calories || 0,
            protein: updatedBreakdown.totalNutrition?.protein || 0,
            carbs: updatedBreakdown.totalNutrition?.carbs || 0,
            fat: updatedBreakdown.totalNutrition?.fat || 0,
            isModified: true,
          });
        }

        return {
          success: true,
          breakdown: updatedBreakdown,
          summary: response.data.summary,
        };
      } else {
        throw new Error(response.data?.error || 'Failed to apply modifications');
      }
    } catch (err) {
      console.error('[useIngredientEditor] applyModifications error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [breakdown, historyIndex, onNutritionUpdate]);

  /**
   * Undo last modification
   */
  const undo = useCallback(() => {
    if (historyIndex <= 0) return false;

    const newIndex = historyIndex - 1;
    const previousBreakdown = history[newIndex];

    setBreakdown(previousBreakdown);
    setHistoryIndex(newIndex);

    // Notify parent
    if (onNutritionUpdate) {
      onNutritionUpdate({
        calories: previousBreakdown.totalNutrition?.calories || 0,
        protein: previousBreakdown.totalNutrition?.protein || 0,
        carbs: previousBreakdown.totalNutrition?.carbs || 0,
        fat: previousBreakdown.totalNutrition?.fat || 0,
        isModified: newIndex > 0,
      });
    }

    return true;
  }, [history, historyIndex, onNutritionUpdate]);

  /**
   * Redo undone modification
   */
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return false;

    const newIndex = historyIndex + 1;
    const nextBreakdown = history[newIndex];

    setBreakdown(nextBreakdown);
    setHistoryIndex(newIndex);

    // Notify parent
    if (onNutritionUpdate) {
      onNutritionUpdate({
        calories: nextBreakdown.totalNutrition?.calories || 0,
        protein: nextBreakdown.totalNutrition?.protein || 0,
        carbs: nextBreakdown.totalNutrition?.carbs || 0,
        fat: nextBreakdown.totalNutrition?.fat || 0,
        isModified: true,
      });
    }

    return true;
  }, [history, historyIndex, onNutritionUpdate]);

  /**
   * Reset to original state
   */
  const reset = useCallback(() => {
    if (history.length === 0) return;

    const originalBreakdown = history[0];
    setBreakdown(originalBreakdown);
    setHistoryIndex(0);
    setModifications([]);

    // Notify parent
    if (onNutritionUpdate) {
      onNutritionUpdate({
        calories: originalBreakdown.totalNutrition?.calories || originalNutrition?.calories || 0,
        protein: originalBreakdown.totalNutrition?.protein || originalNutrition?.protein || 0,
        carbs: originalBreakdown.totalNutrition?.carbs || originalNutrition?.carbs || 0,
        fat: originalBreakdown.totalNutrition?.fat || originalNutrition?.fat || 0,
        isModified: false,
      });
    }
  }, [history, originalNutrition, onNutritionUpdate]);

  /**
   * Get suggested add-ons for current food
   */
  const getSuggestions = useCallback(async () => {
    if (!breakdown) return [];

    try {
      const response = await apiClient.post('/ingredients/suggestions', {
        breakdown,
      });

      return response.data?.suggestions || [];
    } catch (err) {
      console.warn('[useIngredientEditor] getSuggestions error:', err);
      return [];
    }
  }, [breakdown]);

  // Computed values
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isModified = modifications.length > 0;

  const currentNutrition = useMemo(() => {
    if (!breakdown?.totalNutrition) {
      return originalNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    return breakdown.totalNutrition;
  }, [breakdown, originalNutrition]);

  const nutritionDiff = useMemo(() => {
    if (!originalNutrition || !currentNutrition) return null;

    return {
      calories: currentNutrition.calories - (originalNutrition.calories || 0),
      protein: currentNutrition.protein - (originalNutrition.protein || 0),
      carbs: currentNutrition.carbs - (originalNutrition.carbs || 0),
      fat: currentNutrition.fat - (originalNutrition.fat || 0),
    };
  }, [originalNutrition, currentNutrition]);

  return {
    // State
    breakdown,
    isLoading,
    error,
    isModified,
    canUndo,
    canRedo,
    currentNutrition,
    nutritionDiff,
    modifications,

    // Actions
    fetchBreakdown,
    removeIngredient,
    addIngredient,
    applyCustomization,
    applyModifications,
    getSuggestions,
    undo,
    redo,
    reset,

    // Direct state setters (for local-only modifications)
    setBreakdown,
    setError,
  };
}

export default useIngredientEditor;
