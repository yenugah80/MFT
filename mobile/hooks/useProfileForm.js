import { useReducer, useEffect, useCallback, useRef } from "react";
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
import { readCachedProfile, writeCachedProfile, clearCachedProfile } from "../services/profileCache";

// Keyed by userId so logout→re-login (different user) always bootstraps,
// while multiple mounts for the same user don't double-fetch.
const _bootstrappedUsers = new Set();

// Floor between profile loads. The server allows 200 requests/minute per user;
// this keeps even a pathological caller well under that.
const MIN_RELOAD_INTERVAL_MS = 1500;

// ─── Shared request state ────────────────────────────────────────────────────
// This hook is mounted by THREE tab screens at once (profile, activity, log),
// and Expo Router keeps tabs mounted. Per-instance refs therefore guard three
// independent copies and multiply the request rate by three — which is how a
// retry loop here saturated the server's 200 req/min limiter.
//
// These live at module scope so every mounted instance shares one budget.
let _inFlightRequest = null; // de-dupes concurrent callers onto one fetch
let _lastAttemptAt = 0;
let _cooldownUntil = 0; // set from a 429's retryAfter; no requests until then

/**
 * Fetches the profile at most once at a time, no matter how many hook instances
 * ask. Concurrent callers all await the same promise and get the same result.
 */
function fetchProfileOnce(token, getToken) {
  if (_inFlightRequest) return _inFlightRequest;

  _lastAttemptAt = Date.now();
  _inFlightRequest = (async () => {
    try {
      return await fetchUserProfile(token, getToken);
    } finally {
      _inFlightRequest = null;
    }
  })();

  return _inFlightRequest;
}

/** Resets shared throttle state — used on sign-out. */
function resetSharedRequestState() {
  _inFlightRequest = null;
  _lastAttemptAt = 0;
  _cooldownUntil = 0;
}

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
  LOAD_START: 'LOAD_START',
  LOAD_ERROR: 'LOAD_ERROR',
  LOAD_FROM_CACHE: 'LOAD_FROM_CACHE',
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
  // Starts as 'loading', not 'idle': `draft` is seeded with DEFAULT_PROFILE so it
  // is never null, which means the screen has no other way to tell "still
  // fetching" apart from "loaded and genuinely empty". Without this the profile
  // renders a full page of blank defaults before the first byte arrives.
  status: 'loading', // 'loading' | 'refreshing' | 'idle' | 'saving' | 'error'
  // hasData distinguishes "nothing to show yet" from "showing something".
  // The blocking spinner and the error screen are only correct when false.
  hasData: false,
  // True while showing cached data that has not yet been revalidated.
  isStale: false,
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
        hasData: true,
        isStale: false,
        status: 'idle',
        error: null,
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

    // 'refreshing' once we already have something on screen: a background
    // revalidation must never replace visible data with a spinner.
    case ACTIONS.LOAD_START:
      return { ...state, status: state.hasData ? 'refreshing' : 'loading', error: null };

    // Cached data paints immediately; the network result replaces it moments
    // later via LOAD_PROFILE.
    case ACTIONS.LOAD_FROM_CACHE:
      return {
        ...state,
        savedProfile: action.payload,
        draft: action.payload,
        hasData: true,
        isStale: true,
        status: 'refreshing',
      };

    // Deliberately does NOT overwrite `draft` with DEFAULT_PROFILE. Showing a
    // page of blank defaults makes a failed fetch look like an empty account,
    // and the user cannot tell the difference. The screen renders a retry
    // affordance off this status instead.
    //
    // If cached data is already on screen, keep showing it — a failed
    // revalidation is not a reason to blank out a working profile.
    case ACTIONS.LOAD_ERROR:
      return state.hasData
        ? { ...state, status: 'idle', error: action.payload }
        : { ...state, status: 'error', error: action.payload };

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

  // Seed synchronously from React Query's cache, before the first paint.
  //
  // `useProfile()` (queryKey ['profile']) already fetched this — ProfileProvider
  // gates the whole tab layout on it, so by the time any screen using this hook
  // mounts, the data is sitting in the cache. This hook used to ignore it and
  // start its own request from zero, showing a full-screen spinner for data the
  // app already had. Reading it here is synchronous, so there is no spinner at
  // all on the common path; the network load below still runs and refreshes it.
  const [state, dispatch] = useReducer(profileReducer, initialState, (base) => {
    const cached = queryClient.getQueryData(['profile']);
    if (!cached) return base;
    return {
      ...base,
      savedProfile: cached,
      draft: cached,
      hasData: true,
      isStale: true,
      status: 'refreshing',
    };
  });

  // Clear bootstrap record on sign-out so the next login fetches a fresh profile.
  // Effect runs when `user` changes; clearing only happens when it becomes null.
  const lastUserIdRef = useRef(null);
  useEffect(() => {
    if (user) {
      lastUserIdRef.current = user.id;
      return;
    }
    _bootstrappedUsers.clear();
    // Also drop any 429 cooldown / throttle window, so the next person to sign
    // in on this device isn't blocked by the previous session's state.
    resetSharedRequestState();
    // Drop the cached profile so the next account on this device cannot briefly
    // paint the previous user's data from cache.
    if (lastUserIdRef.current) {
      clearCachedProfile(lastUserIdRef.current);
      lastUserIdRef.current = null;
    }
  }, [user]);

  // `loadProfile` is memoised on [user, getToken], so reading `state.hasData`
  // inside it would capture a stale value. Mirror it into a ref that every
  // render refreshes.
  // Initialised from state, not `false` — when the reducer seeded from the query
  // cache above we already have data, and starting at `false` would let the
  // async AsyncStorage read below overwrite it with an older snapshot.
  const hasDataRef = useRef(state.hasData);
  useEffect(() => {
    hasDataRef.current = state.hasData;
  }, [state.hasData]);

  // Loads the profile from the API. Extracted from the bootstrap effect so the
  // screen can re-run it from a Retry button after a failure.
  //
  // `_bootstrappedUsers` is only marked on SUCCESS. It used to be marked before
  // the request, which meant a single failed fetch — one dropped packet on cold
  // start — permanently pinned the user to blank defaults for the rest of the
  // session, with no remount or navigation able to recover it.
  const loadProfile = useCallback(async ({ isMounted = () => true, userInitiated = false } = {}) => {
    if (!user) return;

    // Guards are shared across every mounted instance (see module scope above).
    //
    // Honour a server-imposed cooldown first: retrying inside a 429 window can
    // only extend it. Report the wait instead of firing a doomed request.
    const now = Date.now();
    if (now < _cooldownUntil) {
      const waitSeconds = Math.ceil((_cooldownUntil - now) / 1000);
      dispatch({
        type: ACTIONS.LOAD_ERROR,
        payload: `Too many requests. Retrying is paused for ${waitSeconds}s.`,
      });
      return;
    }

    // A deliberate Retry tap gets a shorter floor than an automatic load, so the
    // button stays responsive while repeated tapping still cannot outpace the
    // server's budget.
    const floorMs = userInitiated ? 500 : MIN_RELOAD_INTERVAL_MS;
    if (!_inFlightRequest && now - _lastAttemptAt < floorMs) return;

    dispatch({ type: ACTIONS.LOAD_START });

    // Paint the last known profile before touching the network. This is what
    // removes the cold-start spinner: the screen shows real data in a few
    // milliseconds and the fetch below quietly replaces it. Skipped once we
    // already have data on screen, so a refresh never regresses to older data.
    if (!hasDataRef.current) {
      const cached = await readCachedProfile(user.id);
      if (cached && isMounted() && !hasDataRef.current) {
        dispatch({ type: ACTIONS.LOAD_FROM_CACHE, payload: cached.profile });
      }
    }

    try {
      let token = null;
      for (let attempt = 1; attempt <= 3 && !token; attempt++) {
        token = await getToken();
        if (!token) {
          console.warn(`[Profile] Token not ready, attempt ${attempt}/3`);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      if (!isMounted()) return;

      if (!token) {
        throw new Error('Could not authenticate. Please check your connection.');
      }

      // Shared single-flight: three mounted instances produce one request.
      let profile = await fetchProfileOnce(token, getToken);

      // null means 404 — a genuinely new account with no profile row yet, which
      // is not an error. Seed one so later saves have a row to update.
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

      if (!isMounted()) return;

      _bootstrappedUsers.add(user.id);
      dispatch({ type: ACTIONS.LOAD_PROFILE, payload: profile });

      // Persist for the next cold start. Fire-and-forget: a cache write must
      // never delay or fail the load that just succeeded.
      writeCachedProfile(user.id, profile);
    } catch (err) {
      // Include the HTTP status — "Failed to fetch profile" alone cannot
      // distinguish an expired token (401) from a server fault (5xx) from the
      // device being offline (0), and this is the only place that knows.
      //
      // ProfileAPIError exposes it as `statusCode`; other error types use
      // `status`. Reading only one of them silently yields undefined, which
      // mislabels every failure as "no connection" and — worse — stops the 429
      // branch from ever arming the rate-limit cooldown.
      const status = err?.statusCode ?? err?.status;
      console.error(`[Profile] Load failed (status ${status ?? 'n/a'}):`, err?.message, err?.details ?? '');

      if (!isMounted()) return;

      let message;
      if (status === 401 || status === 403) {
        message = 'Your session expired. Please sign out and sign in again.';
      } else if (status === 429) {
        // The server tells us its window length. Block every instance until it
        // elapses — retrying inside the window just keeps the limiter tripped.
        const retryAfter = Number(err?.details?.retryAfter) || 60;
        _cooldownUntil = Date.now() + retryAfter * 1000;
        message = `Too many requests. Please wait ${retryAfter} seconds and try again.`;
      } else if (status === 0 || !status) {
        message = 'No connection. Check your network and try again.';
      } else if (status >= 500) {
        message = 'Our server is having trouble. Please try again in a moment.';
      } else {
        message = err?.message || 'Could not load your profile.';
      }

      // Not marked bootstrapped — revisiting the tab will try again, but not
      // before the shared floor (or 429 cooldown) has elapsed.
      dispatch({ type: ACTIONS.LOAD_ERROR, payload: message });
    }
    // No `finally` needed: fetchProfileOnce clears the shared in-flight slot in
    // its own finally, so it is released even on the early isMounted() returns.
  }, [user, getToken]);

  // `loadProfile` is rebuilt whenever Clerk hands back a new `getToken`, so it
  // must NOT be an effect dependency — the effect would re-run on every render,
  // and because a failed load intentionally leaves the user un-bootstrapped,
  // that turns into an unbounded retry loop hammering the API. Read it through a
  // ref so the effect can depend on the user alone.
  const loadProfileRef = useRef(loadProfile);
  useEffect(() => {
    loadProfileRef.current = loadProfile;
  }, [loadProfile]);

  // One bootstrap attempt per user, per mount. A failure is not retried
  // automatically — the screen surfaces a Retry button that calls reload()
  // directly, and revisiting the tab remounts and tries once more.
  const attemptedUserRef = useRef(null);
  useEffect(() => {
    if (!user) {
      attemptedUserRef.current = null;
      return;
    }
    if (_bootstrappedUsers.has(user.id) || attemptedUserRef.current === user.id) return;

    attemptedUserRef.current = user.id;
    let mounted = true;
    const timer = setTimeout(() => loadProfileRef.current({ isMounted: () => mounted }), 100);

    return () => {
      clearTimeout(timer);
      mounted = false;
    };
  }, [user]);

  // The bootstrap effect above only ever fetches once per session (see
  // _bootstrappedUsers) and never touches React Query's cache directly, so it
  // has no way to see it when something elsewhere calls
  // queryClient.invalidateQueries({ queryKey: ['profile'] }) — notably
  // OnboardingContext does exactly that right after completeOnboarding() saves
  // basics/dietary/goals, expecting the profile screen to pick up the fresh
  // data. Without this, the screen keeps showing whatever it fetched on the
  // very first mount (often still-empty defaults, if that happened before
  // onboarding finished). Subscribe to the cache directly and force a fresh
  // fetch whenever the 'profile' key changes.
  //
  // Routed through loadProfile (via the ref) rather than calling fetchUserProfile
  // directly, so this path inherits the same in-flight and rate guards. A cache
  // that invalidates in a burst would otherwise fire one request per event.
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type !== 'updated' || event?.query?.queryKey?.[0] !== 'profile') return;
      loadProfileRef.current({ isMounted: () => mounted });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user, queryClient]);

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
    reload: loadProfile,
  };
}
