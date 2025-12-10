import { useReducer, useEffect, useCallback } from "react";
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

  // Load profile data on mount
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const token = await getToken();
        const profile = await fetchUserProfile(token);
        
        if (profile) {
          dispatch({ type: ACTIONS.LOAD_PROFILE, payload: profile });
        } else {
          // Fallback for new users or 404
          const profileWithUser = {
            ...DEFAULT_PROFILE,
            basics: {
              ...DEFAULT_PROFILE.basics,
              fullName: user.fullName || "",
              email: user.primaryEmailAddress?.emailAddress || "",
            },
          };

          // AUTO-SYNC: If profile is missing in backend but exists in Clerk, create it now.
          // This handles cases where the initial sign-up webhook/call failed.
          if (token) {
             try {
               console.log("Profile missing in backend. Syncing from Clerk...");
               const sanitizedBasics = sanitizeBasicsForApi(profileWithUser.basics);
               await saveProfileBasics(token, sanitizedBasics);
               console.log("Profile synced successfully.");
             } catch (syncErr) {
               console.error("Failed to sync profile:", syncErr);
             }
          }

          dispatch({ type: ACTIONS.LOAD_PROFILE, payload: profileWithUser });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        // Still load default so UI doesn't break
        const profileWithUser = {
          ...DEFAULT_PROFILE,
          basics: {
            ...DEFAULT_PROFILE.basics,
            fullName: user.fullName || "",
            email: user.primaryEmailAddress?.emailAddress || "",
          },
        };
        dispatch({ type: ACTIONS.LOAD_PROFILE, payload: profileWithUser });
      }
    };
    
    loadProfile();
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
        const token = await getToken();
        const dataToSave = state.draft[section];
        
        switch (section) {
          case 'basics':
            await saveProfileBasics(token, sanitizeBasicsForApi(dataToSave));
            break;
          case 'dietary':
            await saveDietaryPreferences(token, dataToSave);
            break;
          case 'goals':
            await saveNutritionGoals(token, dataToSave);
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
        dispatch({
          type: ACTIONS.SAVE_SECTION_ERROR,
          payload: error.message || "Failed to save",
        });
        Alert.alert("Error", "Failed to save profile. Please try again.");
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
