import { useReducer, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
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
} from "../services/profileAPI";

// Action types
const ACTIONS = {
  LOAD_PROFILE: 'LOAD_PROFILE',
  UPDATE_FIELD: 'UPDATE_FIELD',
  TOGGLE_EDIT: 'TOGGLE_EDIT',
  SAVE_SECTION_START: 'SAVE_SECTION_START',
  SAVE_SECTION_SUCCESS: 'SAVE_SECTION_SUCCESS',
  SAVE_SECTION_ERROR: 'SAVE_SECTION_ERROR',
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
  validationErrors: {},
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
        validationErrors: {},
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
        validationErrors: {},
      };
    }

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        validationErrors: action.payload,
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        validationErrors: {},
      };

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
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const hasBootstrappedRef = useRef(false);

  // Helper to bootstrap profile (runs only once)
  const bootstrapProfile = async (user, token) => {
    // Try to fetch profile
    const profile = await fetchUserProfile(token);
    if (profile) {
      return profile;
    }
    // If not found, create from Clerk info
    const profileWithUser = {
      ...DEFAULT_PROFILE,
      basics: {
        ...DEFAULT_PROFILE.basics,
        fullName: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
      },
    };
    await saveProfileBasics(token, sanitizeBasicsForApi(profileWithUser.basics));
    return profileWithUser;
  };

  // One-time bootstrap effect
  useEffect(() => {
    if (!user || hasBootstrappedRef.current) return;

    const run = async () => {
      try {
        console.log('[Profile] Waiting for Clerk token...');

        // Wait for token with retry logic
        let token = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (!token && attempts < maxAttempts) {
          token = await getToken({ template: "backend" });
          if (!token) {
            attempts++;
            console.warn(`[Profile] Token not ready, attempt ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between attempts
          }
        }

        if (!token) {
          console.error('[Profile] Failed to get token after retries');
          // Don't mark as bootstrapped - will retry on next render
          return;
        }

        console.log('[Profile] Token acquired, bootstrapping profile...');
        hasBootstrappedRef.current = true;

        const profile = await bootstrapProfile(user, token);
        dispatch({ type: ACTIONS.LOAD_PROFILE, payload: profile });
        console.log('[Profile] Bootstrap complete');
      } catch (err) {
        console.error("[Profile] Bootstrap failed:", err);
        hasBootstrappedRef.current = true;
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

    // Small delay to ensure Clerk is fully initialized
    const timer = setTimeout(run, 100);
    return () => clearTimeout(timer);
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
        dispatch({ type: ACTIONS.SET_ERROR, payload: errors });
        Alert.alert(
          "Validation Error",
          Object.values(errors)[0]
        );
        return false;
      }

      dispatch({ type: ACTIONS.SAVE_SECTION_START });

      try {
        const token = await getToken({ template: "backend" });
        const dataToSave = state.draft[section];
        
        switch (section) {
          case 'basics':
            await saveProfileBasics(token, sanitizeBasicsForApi(dataToSave));
            break;
          case 'dietary':
            await saveDietaryPreferences(token, sanitizeDietaryForApi(dataToSave));
            break;
          case 'goals':
            await saveNutritionGoals(token, sanitizeGoalsForApi(dataToSave));
            break;
          case 'gamification':
            await saveGamificationStats(token, dataToSave);
            break;
          default:
            throw new Error(`Unknown section: ${section}`);
        }

        dispatch({
          type: ACTIONS.SAVE_SECTION_SUCCESS,
          payload: { section },
        });

        Alert.alert("Saved", `${SECTION_LABELS[section]} updated.`);
        return true;
      } catch (error) {
        console.error("Save section error:", error);

        // Detect 401 Unauthorized (Stale Token)
        if (error.message && error.message.includes('401')) {
          Alert.alert(
            "Session Expired", 
            "Your security keys have changed. Please Sign Out and Sign In again to refresh your session."
          );
        } else {
          Alert.alert("Error", "Failed to save profile. Please try again.");
        }

        dispatch({
          type: ACTIONS.SAVE_SECTION_ERROR,
          payload: error.message || "Failed to save",
        });
        return false;
      }
    },
    [state.draft, validateSection, getToken]
  );

  // Cancel edit
  const cancelEdit = useCallback((section) => {
    dispatch({ type: ACTIONS.CANCEL_EDIT, payload: { section } });
  }, []);

  return {
    state,
    updateField,
    toggleEdit,
    saveSection,
    cancelEdit,
  };
}
