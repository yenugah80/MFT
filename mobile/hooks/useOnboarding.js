/**
 * useOnboarding Hook
 * Manages the entire onboarding questionnaire flow with draft persistence
 */

import { useReducer, useEffect, useCallback, useRef } from 'react';
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
  status: 'idle', // 'idle' | 'loading' | 'saving' | 'error'
  error: null,
  savedSteps: 0, // Track which steps have been saved to backend (0-4)
  isFirstLoad: true, // Track if this is the first load of the app session
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
        // Convert height/weight to consistent units (kg, cm)
        let weightKg = parseFloat(step2.weight);
        if (isNaN(weightKg)) {
          throw new Error('Invalid weight value - must be a number');
        }
        if (step2.weightUnit === 'lbs') {
          weightKg = weightKg / 2.20462;
        }

        let heightCm = parseFloat(step2.height);
        if (step2.heightUnit === 'ft') {
          const feet = parseFloat(step2.heightFeet);
          const inches = parseFloat(step2.heightInches);
          if (isNaN(feet) || isNaN(inches)) {
            throw new Error('Invalid height value - feet and inches must be numbers');
          }
          heightCm = feet * 30.48 + inches * 2.54;
        } else if (isNaN(heightCm)) {
          throw new Error('Invalid height value - must be a number');
        }

        const age = parseInt(step2.age, 10);
        if (isNaN(age)) {
          throw new Error('Invalid age value - must be a number');
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
        isFirstLoad: false, // Mark that we've already loaded once
      };

    default:
      return state;
  }
}

export const useOnboarding = () => {
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

            // Validate step is within valid range (1-4)
            if (step < 1 || step > 4 || isNaN(step)) {
              console.warn('[useOnboarding] Invalid saved step:', step, '- resetting to 1');
              step = 1;
              dispatch({ type: ACTIONS.RESET });
            }
            // Smart reset: If draft is stuck at max step (4), reset for fresh start
            else if (step === 4) {
              console.warn('[useOnboarding] Detected stale draft at max step 4, resetting to step 1');
              dispatch({ type: ACTIONS.RESET });
            }
            // Normal case: Load the saved draft
            else {
              console.log('[useOnboarding] Resuming onboarding from step:', step);
              dispatch({
                type: ACTIONS.LOAD_DRAFT,
                payload: { draft, step },
              });
            }
          } catch (parseError) {
            console.warn('[useOnboarding] Failed to parse saved draft, resetting:', parseError);
            dispatch({ type: ACTIONS.RESET });
          }
        } else {
          console.log('[useOnboarding] No saved draft found, starting fresh');
        }
      } catch (error) {
        console.warn('[useOnboarding] Error loading draft from AsyncStorage:', error);
      }

      hasLoadedDraft.current = true;
    };

    loadDraft();
  }, []);

  // Save draft to AsyncStorage whenever it changes
  useEffect(() => {
    if (!hasLoadedDraft.current) return;

    const saveDraft = async () => {
      try {
        await AsyncStorage.setItem('@onboarding_draft', JSON.stringify(state.draft));
        await AsyncStorage.setItem('@onboarding_current_step', state.step.toString());
      } catch (error) {
        console.warn('[useOnboarding] Error saving draft:', error);
      }
    };

    saveDraft();
  }, [state.draft, state.step]);

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
    console.log('[useOnboarding] goToNextStep called, current state.step:', state.step);
    if (state.step < 4) {
      const nextStep = state.step + 1;
      console.log('[useOnboarding] Setting step to:', nextStep);
      setStep(nextStep);
      // Navigate using absolute path to avoid route resolution conflicts
      setTimeout(() => {
        const routePath = `/onboarding/step-${nextStep}`;
        console.log('[useOnboarding] Navigating to:', routePath);
        router.push(routePath);
      }, 100); // Small delay to let state update
    } else {
      console.warn('[useOnboarding] Already at max step (4), not navigating');
    }
  }, [state.step, setStep, router]);

  const goToPreviousStep = useCallback(() => {
    if (state.step > 1) {
      const previousStep = state.step - 1;
      setStep(previousStep);
      // Navigate using absolute path to avoid route resolution conflicts
      setTimeout(() => {
        const routePath = `/onboarding/step-${previousStep}`;
        console.log('[useOnboarding] Navigating to:', routePath);
        router.push(routePath);
      }, 100); // Small delay to let state update
    }
  }, [state.step, setStep, router]);

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

      // Convert weight/height to standard units for API (with validation)
      let weightKg = parseFloat(draft.step2.weight);
      if (isNaN(weightKg)) {
        throw new Error('Invalid weight value - must be a number');
      }
      if (draft.step2.weightUnit === 'lbs') {
        weightKg = weightKg / 2.20462;
      }

      let heightCm = parseFloat(draft.step2.height);
      if (draft.step2.heightUnit === 'ft') {
        const feet = parseFloat(draft.step2.heightFeet);
        const inches = parseFloat(draft.step2.heightInches);
        if (isNaN(feet) || isNaN(inches)) {
          throw new Error('Invalid height value - feet and inches must be numbers');
        }
        heightCm = feet * 30.48 + inches * 2.54;
      } else if (isNaN(heightCm)) {
        throw new Error('Invalid height value - must be a number');
      }

      const age = parseInt(draft.step2.age, 10);
      if (isNaN(age)) {
        throw new Error('Invalid age value - must be a number');
      }

      // Step 1: Save basics (with auto token refresh on 401)
      // Get user's full name from Clerk
      const fullName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.firstName || user?.emailAddresses?.[0]?.emailAddress || '';

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

      // Step 2: Save dietary preferences (with auto token refresh on 401)
      await saveDietaryPreferences(
        token,
        {
          preferences: draft.step3.dietaryPreferences.length > 0
            ? draft.step3.dietaryPreferences
            : ['Balanced'],
          allergies: draft.step3.allergies,
          dislikes: [],
          cuisinePreference: draft.step3.cuisinePreferences.length > 0
            ? draft.step3.cuisinePreferences
            : ['Mediterranean', 'American'],
        },
        getToken
      );

      // Step 3: Save nutrition goals (with auto token refresh on 401)
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

      // Step 4: Mark onboarding as complete
      // This endpoint will be created in the backend
      const completeResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/profile/onboarding-complete`,
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
        throw new Error(errorData.message || 'Failed to mark onboarding as complete');
      }

      // Verify response contains onboarding completion timestamp
      const completeData = await completeResponse.json();
      if (!completeData.onboardingCompletedAt) {
        console.warn('⚠️ Backend did not return onboardingCompletedAt timestamp');
      }
      if (completeData.success !== true) {
        throw new Error('Backend did not confirm onboarding completion');
      }

      // Clear draft from AsyncStorage ONLY after verifying backend confirmation
      await AsyncStorage.removeItem('@onboarding_draft');
      await AsyncStorage.removeItem('@onboarding_current_step');

      dispatch({
        type: ACTIONS.SAVE_SUCCESS,
        payload: 4,
      });

      // Navigate to dashboard
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('[useOnboarding] Error completing onboarding:', error);
      dispatch({
        type: ACTIONS.SAVE_ERROR,
        payload: error.message || 'Failed to complete onboarding. Please try again.',
      });
    }
  }, [state.draft, getToken, router]);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('@onboarding_draft');
      await AsyncStorage.removeItem('@onboarding_current_step');
      dispatch({ type: ACTIONS.RESET });
    } catch (error) {
      console.warn('[useOnboarding] Error resetting onboarding:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  return {
    // State
    step: state.step,
    draft: state.draft,
    calculatedGoals: state.calculatedGoals,
    status: state.status,
    error: state.error,
    isSaving: state.status === 'saving',
    isLoading: state.status === 'loading',

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
};
