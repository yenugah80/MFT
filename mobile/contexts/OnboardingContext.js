/**
 * OnboardingContext
 * Provides shared onboarding state across all step screens
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  calculateNutritionTargets,
  validateNutritionTargets,
} from '../utils/onboardingCalculations';
import {
  saveProfileBasics,
  saveDietaryPreferences,
  saveNutritionGoals,
} from '../services/profileAPI';
import { API_URL } from '../constants/api';

// Action types
const ACTIONS = {
  LOAD_DRAFT: 'LOAD_DRAFT',
  SET_STEP: 'SET_STEP',
  UPDATE_STEP_DATA: 'UPDATE_STEP_DATA',
  CALCULATE_GOALS: 'CALCULATE_GOALS',
  UPDATE_GOALS: 'UPDATE_GOALS',
  SAVE_START: 'SAVE_START',
  SAVE_SUCCESS: 'SAVE_SUCCESS',
  SAVE_ERROR: 'SAVE_ERROR',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET: 'RESET',
};

// Initial state
const initialState = {
  step: 1,
  draft: {
    step1: {
      primaryGoal: null,
    },
    step2: {
      age: '',
      weight: '',
      weightUnit: 'kg',
      height: '',
      heightUnit: 'cm',
      heightFeet: '',
      heightInches: '',
      gender: null,
      activityLevel: null,
    },
    step3: {
      dietaryPreferences: [],
      allergies: [],
      cuisinePreferences: [],
    },
    step4: {
      dailyCalories: null,
      proteinG: null,
      carbsG: null,
      fatsG: null,
      waterLiters: 2.0,
    },
  },
  calculatedGoals: null,
  status: 'idle',
  error: null,
  savedSteps: 0,
  isLoaded: false,
};

// Reducer
function onboardingReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_DRAFT:
      return {
        ...state,
        draft: action.payload.draft,
        step: action.payload.step,
        status: 'idle',
        isLoaded: true,
      };

    case ACTIONS.SET_STEP:
      return {
        ...state,
        step: action.payload,
        error: null,
      };

    case ACTIONS.UPDATE_STEP_DATA: {
      const { step, data } = action.payload;
      return {
        ...state,
        draft: {
          ...state.draft,
          [step]: {
            ...state.draft[step],
            ...data,
          },
        },
      };
    }

    case ACTIONS.CALCULATE_GOALS: {
      const { step2 } = state.draft;

      try {
        let weightKg = parseFloat(step2.weight);
        if (isNaN(weightKg)) {
          throw new Error('Invalid weight value');
        }
        if (step2.weightUnit === 'lbs') {
          weightKg = weightKg / 2.20462;
        }

        let heightCm = parseFloat(step2.height);
        if (step2.heightUnit === 'ft') {
          const feet = parseFloat(step2.heightFeet);
          const inches = parseFloat(step2.heightInches);
          if (isNaN(feet) || isNaN(inches)) {
            throw new Error('Invalid height value');
          }
          heightCm = feet * 30.48 + inches * 2.54;
        } else if (isNaN(heightCm)) {
          throw new Error('Invalid height value');
        }

        const age = parseInt(step2.age, 10);
        if (isNaN(age)) {
          throw new Error('Invalid age value');
        }

        const calculated = calculateNutritionTargets({
          age,
          weightKg,
          heightCm,
          gender: step2.gender,
          activityLevel: step2.activityLevel,
          primaryGoal: state.draft.step1.primaryGoal,
        });

        return {
          ...state,
          calculatedGoals: calculated,
          draft: {
            ...state.draft,
            step4: {
              dailyCalories: calculated.dailyCalories,
              proteinG: calculated.proteinG,
              carbsG: calculated.carbsG,
              fatsG: calculated.fatsG,
              waterLiters: calculated.waterLiters,
            },
          },
        };
      } catch (error) {
        return {
          ...state,
          error: error.message,
          status: 'error',
        };
      }
    }

    case ACTIONS.UPDATE_GOALS: {
      const { step4 } = action.payload;
      const validation = validateNutritionTargets(step4);

      if (!validation.isValid) {
        return {
          ...state,
          error: Object.values(validation.errors)[0],
          status: 'error',
        };
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          step4,
        },
        error: null,
      };
    }

    case ACTIONS.SAVE_START:
      return {
        ...state,
        status: 'saving',
        error: null,
      };

    case ACTIONS.SAVE_SUCCESS:
      return {
        ...state,
        status: 'idle',
        savedSteps: action.payload,
      };

    case ACTIONS.SAVE_ERROR:
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        status: 'error',
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        status: 'idle',
      };

    case ACTIONS.RESET:
      return {
        ...initialState,
        isLoaded: true,
      };

    default:
      return state;
  }
}

// Create Context
const OnboardingContext = createContext(null);

// Provider Component
export function OnboardingProvider({ children }) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const { getToken, user } = useAuth();
  const router = useRouter();
  const hasLoadedDraft = useRef(false);

  // Load draft from AsyncStorage on mount
  useEffect(() => {
    if (hasLoadedDraft.current) return;

    const loadDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem('@onboarding_draft');
        const savedStep = await AsyncStorage.getItem('@onboarding_current_step');

        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            let step = savedStep ? parseInt(savedStep, 10) : 1;

            if (step < 1 || step > 4 || isNaN(step)) {
              step = 1;
            }

            dispatch({
              type: ACTIONS.LOAD_DRAFT,
              payload: { draft, step },
            });
          } catch (parseError) {
            console.warn('[OnboardingContext] Failed to parse saved draft:', parseError);
            dispatch({ type: ACTIONS.RESET });
          }
        } else {
          dispatch({ type: ACTIONS.RESET });
        }
      } catch (error) {
        console.warn('[OnboardingContext] Error loading draft:', error);
        dispatch({ type: ACTIONS.RESET });
      }

      hasLoadedDraft.current = true;
    };

    loadDraft();
  }, []);

  // Save draft to AsyncStorage whenever it changes
  useEffect(() => {
    if (!state.isLoaded) return;

    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem('@onboarding_draft', JSON.stringify(state.draft));
        await AsyncStorage.setItem('@onboarding_current_step', state.step.toString());
      } catch (error) {
        console.warn('[OnboardingContext] Error saving draft:', error);
      }
    };

    saveDraft();
  }, [state.draft, state.step, state.isLoaded]);

  const updateStepData = useCallback((step, data) => {
    dispatch({
      type: ACTIONS.UPDATE_STEP_DATA,
      payload: { step, data },
    });
  }, []);

  const setStep = useCallback((step) => {
    dispatch({ type: ACTIONS.SET_STEP, payload: step });
  }, []);

  const goToNextStep = useCallback(() => {
    if (state.step < 4) {
      const nextStep = state.step + 1;
      dispatch({ type: ACTIONS.SET_STEP, payload: nextStep });
      router.replace(`/onboarding/step-${nextStep}`);
    }
  }, [state.step, router]);

  const goToPreviousStep = useCallback(() => {
    if (state.step > 1) {
      const previousStep = state.step - 1;
      dispatch({ type: ACTIONS.SET_STEP, payload: previousStep });
      router.replace(`/onboarding/step-${previousStep}`);
    }
  }, [state.step, router]);

  const calculateGoals = useCallback(() => {
    dispatch({ type: ACTIONS.CALCULATE_GOALS });
  }, []);

  const updateGoals = useCallback((step4Data) => {
    dispatch({
      type: ACTIONS.UPDATE_GOALS,
      payload: { step4: step4Data },
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    dispatch({ type: ACTIONS.SAVE_START });

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      const { draft } = state;

      let weightKg = parseFloat(draft.step2.weight);
      if (isNaN(weightKg)) {
        throw new Error('Invalid weight value');
      }
      if (draft.step2.weightUnit === 'lbs') {
        weightKg = weightKg / 2.20462;
      }

      let heightCm = parseFloat(draft.step2.height);
      if (draft.step2.heightUnit === 'ft') {
        const feet = parseFloat(draft.step2.heightFeet);
        const inches = parseFloat(draft.step2.heightInches);
        if (isNaN(feet) || isNaN(inches)) {
          throw new Error('Invalid height value');
        }
        heightCm = feet * 30.48 + inches * 2.54;
      } else if (isNaN(heightCm)) {
        throw new Error('Invalid height value');
      }

      const age = parseInt(draft.step2.age, 10);
      if (isNaN(age)) {
        throw new Error('Invalid age value');
      }

      const fullName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.firstName || user?.emailAddresses?.[0]?.emailAddress || '';

      // Step 1: Save profile basics
      try {
        await saveProfileBasics(
          token,
          {
            fullName,
            age,
            weightKg: Math.round(weightKg * 100) / 100,
            heightCm: Math.round(heightCm),
            gender: draft.step2.gender,
            activityLevel: draft.step2.activityLevel,
          },
          getToken
        );
      } catch (profileError) {
        console.error('[OnboardingContext] Profile basics error:', profileError);
        throw new Error(profileError.details?.message || profileError.message || 'Failed to save profile information');
      }

      // Step 2: Save dietary preferences
      try {
        await saveDietaryPreferences(
          token,
          {
            preferences: draft.step3.dietaryPreferences.length > 0
              ? draft.step3.dietaryPreferences
              : ['balanced'],
            allergies: draft.step3.allergies,
            dislikes: [],
            cuisinePreference: draft.step3.cuisinePreferences.length > 0
              ? draft.step3.cuisinePreferences
              : ['mediterranean', 'american'],
          },
          getToken
        );
      } catch (dietaryError) {
        console.error('[OnboardingContext] Dietary preferences error:', dietaryError);
        throw new Error(dietaryError.details?.message || dietaryError.message || 'Failed to save dietary preferences');
      }

      // Step 3: Save nutrition goals
      try {
        await saveNutritionGoals(
          token,
          {
            primaryGoal: draft.step1.primaryGoal,
            dailyCalories: draft.step4.dailyCalories,
            proteinG: draft.step4.proteinG,
            carbsG: draft.step4.carbsG,
            fatsG: draft.step4.fatsG,
            waterLiters: draft.step4.waterLiters,
          },
          getToken
        );
      } catch (goalsError) {
        console.error('[OnboardingContext] Nutrition goals error:', goalsError);
        throw new Error(goalsError.details?.message || goalsError.message || 'Failed to save nutrition goals');
      }

      // Step 4: Mark onboarding as complete
      const completeResponse = await fetch(
        `${API_URL}/profile/onboarding-complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.message || 'Failed to complete onboarding');
      }

      const completeData = await completeResponse.json();
      if (completeData.success !== true) {
        throw new Error('Backend did not confirm onboarding completion');
      }

      await AsyncStorage.removeItem('@onboarding_draft');
      await AsyncStorage.removeItem('@onboarding_current_step');

      dispatch({
        type: ACTIONS.SAVE_SUCCESS,
        payload: 4,
      });

      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('[OnboardingContext] Error completing onboarding:', error);
      dispatch({
        type: ACTIONS.SAVE_ERROR,
        payload: error.message || 'Failed to complete onboarding.',
      });
    }
  }, [state.draft, getToken, router, user]);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('@onboarding_draft');
      await AsyncStorage.removeItem('@onboarding_current_step');
      dispatch({ type: ACTIONS.RESET });
    } catch (error) {
      console.warn('[OnboardingContext] Error resetting:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // State
    step: state.step,
    draft: state.draft,
    calculatedGoals: state.calculatedGoals,
    status: state.status,
    error: state.error,
    isSaving: state.status === 'saving',
    isLoading: !state.isLoaded,

    // Step data
    step1Data: state.draft.step1,
    step2Data: state.draft.step2,
    step3Data: state.draft.step3,
    step4Data: state.draft.step4,

    // Actions
    updateStepData,
    setStep,
    goToNextStep,
    goToPreviousStep,
    calculateGoals,
    updateGoals,
    completeOnboarding,
    resetOnboarding,
    clearError,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook to use the context
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
