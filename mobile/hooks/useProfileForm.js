import { useReducer, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_PROFILE, SECTION_LABELS } from "../constants/profileConfig";
import {
  validateBasics,
  validateDietary,
  validateGoals,
  validateGamification,
  hasValidationErrors,
  sanitizeBasicsForApi,
  sanitizeGoalsForApi,
  sanitizeDietaryForApi,
} from "../utils/profileValidation";
import {
  fetchUserProfile,
  saveProfileBasics,
  saveDietaryPreferences,
  saveNutritionGoals,
  saveGamificationStats,
  invalidateProfileCache,
} from "../services/profileAPI";

// Keyed by userId so logout→re-login (different user) always bootstraps,
// while multiple mounts for the same user don't double-fetch.
const _bootstrappedUsers = new Set();

// Action types
const ACTIONS = {
  LOAD_PROFILE: 'LOAD_PROFILE',
  UPDATE_FIELD: 'UPDATE_FIELD',
  TOGGLE_EDIT: 'TOGGLE_EDIT',
  SAVE_SECTION_START: 'SAVE_SECTION_START',
  SAVE_SECTION_SUCCESS: 'SAVE_SECTION_SUCCESS',
  SAVE_SECTION_ERROR: 'SAVE_SECTION_ERROR',
  SAVE_FIELD_SUCCESS: 'SAVE_FIELD_SUCCESS', // NEW: For inline single-field saves
  CANCEL_EDIT: 'CANCEL_EDIT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Initial state
const initialState = {
  savedProfile: DEFAULT_PROFILE,
  draft: DEFAULT_PROFILE,
  editing: {
    basics: false,
    dietary: false,
    goals: false,
    gamification: false,
  },
  status: 'idle', // 'idle' | 'loading' | 'saving' | 'error'
  error: null,
  validationErrors: {
    basics: {},
    dietary: {},
    goals: {},
    gamification: {},
  },
};

// Reducer
function profileReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_PROFILE:
      return {
        ...state,
        savedProfile: action.payload,
        draft: action.payload,
        status: 'idle',
      };

    case ACTIONS.UPDATE_FIELD: {
      const { section, key, value } = action.payload;
      return {
        ...state,
        draft: {
          ...state.draft,
          [section]: {
            ...state.draft[section],
            [key]: value,
          },
        },
      };
    }

    case ACTIONS.TOGGLE_EDIT: {
      const { section } = action.payload;
      return {
        ...state,
        editing: {
          ...state.editing,
          [section]: !state.editing[section],
        },
      };
    }

    case ACTIONS.SAVE_SECTION_START:
      return {
        ...state,
        status: 'saving',
        error: null,
      };

    case ACTIONS.SAVE_SECTION_SUCCESS: {
      const { section } = action.payload;
      return {
        ...state,
        savedProfile: {
          ...state.savedProfile,
          [section]: structuredClone(state.draft[section]),
        },
        editing: {
          ...state.editing,
          [section]: false,
        },
        status: 'idle',
        validationErrors: {
          ...state.validationErrors,
          [section]: {},
        },
      };
    }

    case ACTIONS.SAVE_SECTION_ERROR:
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };

    case ACTIONS.CANCEL_EDIT: {
      const { section } = action.payload;
      return {
        ...state,
        draft: {
          ...state.draft,
          [section]: structuredClone(state.savedProfile[section]),
        },
        editing: {
          ...state.editing,
          [section]: false,
        },
        validationErrors: {
          ...state.validationErrors,
          [section]: {},
        },
      };
    }

    case ACTIONS.SET_ERROR: {
      const { section, errors } = action.payload;
      return {
        ...state,
        validationErrors: {
          ...state.validationErrors,
          [section]: errors,
        },
      };
    }

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        validationErrors: {},
      };

    case ACTIONS.SAVE_FIELD_SUCCESS: {
      const { section, field, value } = action.payload;
      return {
        ...state,
        savedProfile: {
          ...state.savedProfile,
          [section]: {
            ...state.savedProfile[section],
            [field]: value,
          },
        },
        draft: {
          ...state.draft,
          [section]: {
            ...state.draft[section],
            [field]: value,
          },
        },
        status: 'idle',
      };
    }

    default:
      return state;
  }
}

/**
 * Custom hook for profile form management
 * Handles state, validation, and API integration
 */
export default function useProfileForm(user) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(profileReducer, initialState);

  // Clear bootstrap record on sign-out so the next login fetches a fresh profile.
  // Effect runs when `user` changes; clearing only happens when it becomes null.
  useEffect(() => {
    if (user) return;
    _bootstrappedUsers.clear();
  }, [user]);

  // One-time bootstrap effect
  useEffect(() => {
    if (!user || _bootstrappedUsers.has(user.id)) return;

    let isMounted = true;

    const run = async () => {
      try {
        console.log('[Profile] Waiting for Clerk token...');

        let token = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (!token && attempts < maxAttempts) {
          token = await getToken();
          if (!token) {
            attempts++;
            console.warn(`[Profile] Token not ready, attempt ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        if (!isMounted) return;

        if (!token) {
          console.error('[Profile] Failed to get token after retries');
          _bootstrappedUsers.add(user.id);
          dispatch({
            type: ACTIONS.LOAD_PROFILE,
            payload: {
              ...DEFAULT_PROFILE,
              basics: { ...DEFAULT_PROFILE.basics, fullName: user.fullName || "" },
            },
          });
          return;
        }

        console.log('[Profile] Token acquired, bootstrapping profile...');
        _bootstrappedUsers.add(user.id);

        let profile = await fetchUserProfile(token, getToken);
        if (!profile) {
          profile = {
            ...DEFAULT_PROFILE,
            basics: {
              ...DEFAULT_PROFILE.basics,
              fullName: user.fullName || "",
              email: user.primaryEmailAddress?.emailAddress || "",
            },
          };
          await saveProfileBasics(token, sanitizeBasicsForApi(profile.basics), getToken);
        }

        if (!isMounted) return;
        dispatch({ type: ACTIONS.LOAD_PROFILE, payload: profile });
        console.log('[Profile] Bootstrap complete');
      } catch (err) {
        console.error("[Profile] Bootstrap failed:", err);
        _bootstrappedUsers.add(user.id);
        if (!isMounted) return;
        dispatch({
          type: ACTIONS.LOAD_PROFILE,
          payload: {
            ...DEFAULT_PROFILE,
            basics: {
              ...DEFAULT_PROFILE.basics,
              fullName: user.fullName || "",
              email: user.primaryEmailAddress?.emailAddress || "",
            },
          },
        });
      }
    };

    const timer = setTimeout(run, 100);
    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [user, getToken]);

  // Update field
  const updateField = useCallback((section, key, value) => {
    dispatch({
      type: ACTIONS.UPDATE_FIELD,
      payload: { section, key, value },
    });
  }, []);

  // Toggle edit mode
  const toggleEdit = useCallback((section) => {
    dispatch({ type: ACTIONS.TOGGLE_EDIT, payload: { section } });
  }, []);

  // Validate section
  const validateSection = useCallback((section, data) => {
    const validators = {
      basics: validateBasics,
      dietary: validateDietary,
      goals: validateGoals,
      gamification: validateGamification,
    };

    const validator = validators[section];
    if (!validator) return {};

    return validator(data);
  }, []);

  // Save section
  const saveSection = useCallback(
    async (section) => {
      // Validate
      const errors = validateSection(section, state.draft[section]);

      if (hasValidationErrors(errors)) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: { section, errors } });
        Alert.alert(
          "Validation Error",
          Object.values(errors)[0]
        );
        return false;
      }

      dispatch({ type: ACTIONS.SAVE_SECTION_START });

      try {
        const token = await getToken();
        const dataToSave = state.draft[section];

        switch (section) {
          case 'basics':
            await saveProfileBasics(token, sanitizeBasicsForApi(dataToSave), getToken);
            break;
          case 'dietary':
            await saveDietaryPreferences(token, sanitizeDietaryForApi(dataToSave), getToken);
            break;
          case 'goals':
            await saveNutritionGoals(token, sanitizeGoalsForApi(dataToSave), getToken);
            break;
          case 'gamification':
            await saveGamificationStats(token, dataToSave, getToken);
            break;
          default:
            throw new Error(`Unknown section: ${section}`);
        }

        dispatch({
          type: ACTIONS.SAVE_SECTION_SUCCESS,
          payload: { section },
        });

        // ✅ Invalidate profile cache after successful save
        // For basics section (onboarding-critical), refetch immediately
        const refetchImmediately = section === 'basics';
        invalidateProfileCache(queryClient, refetchImmediately);

        Alert.alert("Saved", `${SECTION_LABELS[section]} updated.`);
        return true;
      } catch (error) {
        console.error("Save section error:", error);

        // Auto token refresh handles 401 automatically, so this is a real error
        Alert.alert("Error", error.message || "Failed to save profile. Please try again.");

        dispatch({
          type: ACTIONS.SAVE_SECTION_ERROR,
          payload: error.message || "Failed to save",
        });
        return false;
      }
    },
    [state.draft, validateSection, getToken, queryClient]
  );

  // Cancel edit
  const cancelEdit = useCallback((section) => {
    dispatch({ type: ACTIONS.CANCEL_EDIT, payload: { section } });
  }, []);

  // Save individual field (for inline editing)
  const saveField = useCallback(
    async (section, field, value) => {
      dispatch({ type: ACTIONS.SAVE_SECTION_START });

      try {
        const token = await getToken();

        // Build the data object with the updated field
        const currentSectionData = state.draft[section];
        const updatedData = {
          ...currentSectionData,
          [field]: value,
        };

        // Call appropriate API based on section
        switch (section) {
          case 'basics':
            await saveProfileBasics(token, sanitizeBasicsForApi(updatedData), getToken);
            break;
          case 'dietary':
            await saveDietaryPreferences(token, sanitizeDietaryForApi(updatedData), getToken);
            break;
          case 'goals':
            await saveNutritionGoals(token, sanitizeGoalsForApi(updatedData), getToken);
            break;
          case 'gamification':
            await saveGamificationStats(token, updatedData, getToken);
            break;
          default:
            throw new Error(`Unknown section: ${section}`);
        }

        dispatch({
          type: ACTIONS.SAVE_FIELD_SUCCESS,
          payload: { section, field, value },
        });

        // ✅ Invalidate profile cache after successful inline save
        // For basics section (onboarding-critical), refetch immediately
        const refetchImmediately = section === 'basics';
        invalidateProfileCache(queryClient, refetchImmediately);

        return true;
      } catch (error) {
        console.error("Save field error:", error);

        dispatch({
          type: ACTIONS.SAVE_SECTION_ERROR,
          payload: error.message || "Failed to save",
        });
        return false;
      }
    },
    [state.draft, getToken, queryClient]
  );

  return {
    state,
    updateField,
    toggleEdit,
    saveSection,
    saveField,
    cancelEdit,
  };
}
