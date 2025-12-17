# Persistence Layer Documentation

This app implements a comprehensive offline-first persistence strategy using AsyncStorage and React Query.

## Architecture Overview

### 1. **AsyncStorage Wrapper** (`utils/storage.js`)

Safe wrapper around React Native AsyncStorage with automatic error handling:

```javascript
import { getItem, setItem, removeItem } from '@/utils/storage';

// Get item
const value = await getItem('my-key');

// Set item (auto-serializes to JSON)
await setItem('my-key', { foo: 'bar' });

// Remove item
await removeItem('my-key');
```

**Features:**
- Automatic JSON serialization/deserialization
- Error recovery and logging
- Multi-get/set operations
- Namespaced storage instances
- Storage size utilities

### 2. **React Query Persistence** (`utils/queryPersistence.js`)

Automatically persists React Query cache to AsyncStorage:

```javascript
// Configured in QueryProvider - no manual setup required
// Cache is automatically saved and restored on app restart
```

**Configuration:**
- 24-hour cache TTL
- Only persists successful queries (no errors)
- Automatic hydration on app start
- Graceful degradation if storage fails

### 3. **User Preferences** (`utils/preferences.js`)

Typed preference management for app settings:

```javascript
import { getPreferences, updatePreferences, setPreference } from '@/utils/preferences';

// Get all preferences
const prefs = await getPreferences();

// Update multiple preferences
await updatePreferences({
  theme: 'dark',
  notifications: { enabled: true },
});

// Set single preference
await setPreference('theme', 'dark');
```

**Default Preferences:**
- `theme`: 'light' | 'dark' | 'auto'
- `notifications`: Settings object
- `units`: Weight, height, water units
- `privacy`: Analytics and crash reporting
- `accessibility`: Font size, reduce motion
- `onboardingCompleted`: Boolean flag
- `lastViewedScreen`: Navigation state

### 4. **usePreferences Hook** (`hooks/usePreferences.js`)

React hook for reactive preferences:

```javascript
import { usePreferences } from '@/hooks/usePreferences';

function SettingsScreen() {
  const { preferences, isLoading, update, set } = usePreferences();

  const toggleTheme = async () => {
    await set('theme', preferences.theme === 'light' ? 'dark' : 'light');
  };

  if (isLoading) return <Loading />;

  return (
    <View>
      <Text>Theme: {preferences.theme}</Text>
      <Button onPress={toggleTheme}>Toggle Theme</Button>
    </View>
  );
}
```

### 5. **usePersistedState Hook** (`hooks/usePersistedState.js`)

Like `useState`, but persisted to AsyncStorage:

```javascript
import { usePersistedState } from '@/hooks/usePersistedState';

function MyComponent() {
  const [count, setCount, { isLoading }] = usePersistedState('counter', 0);

  // Works exactly like useState, but persists automatically
  return <Button onPress={() => setCount(count + 1)}>Count: {count}</Button>;
}
```

### 6. **Offline Queue** (`utils/offlineQueue.js`)

Queue API requests when offline for later replay:

```javascript
import { enqueue, processQueue } from '@/utils/offlineQueue';

// When offline, enqueue the action
await enqueue('LOG_FOOD', {
  foodName: 'Apple',
  calories: 95,
});

// When back online, process the queue
const handlers = {
  LOG_FOOD: async (payload) => {
    await apiClient.post('/nutrition/log', payload);
  },
};

await processQueue(handlers);
```

## Usage Examples

### Example 1: Caching API Data with React Query

```javascript
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';

function DashboardScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/nutrition/dashboard'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Data is automatically:
  // 1. Cached in memory
  // 2. Persisted to AsyncStorage
  // 3. Restored on app restart
  // 4. Revalidated in background
}
```

### Example 2: Storing User Preferences

```javascript
import { usePreferences } from '@/hooks/usePreferences';

function SettingsScreen() {
  const { preferences, update } = usePreferences();

  const handleSave = async () => {
    await update({
      notifications: {
        ...preferences.notifications,
        dailyReminder: true,
        reminderTime: '09:00',
      },
      units: {
        weight: 'kg',
        height: 'cm',
      },
    });
  };

  return (
    <Button onPress={handleSave}>Save Settings</Button>
  );
}
```

### Example 3: Offline-First Food Logging

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enqueue } from '@/utils/offlineQueue';
import apiClient from '@/services/apiClient';
import NetInfo from '@react-native-community/netinfo';

function LogFoodScreen() {
  const queryClient = useQueryClient();

  const logFoodMutation = useMutation({
    mutationFn: async (foodData) => {
      const netInfo = await NetInfo.fetch();

      if (!netInfo.isConnected) {
        // Queue for later if offline
        await enqueue('LOG_FOOD', foodData);
        return { queued: true };
      }

      // Send immediately if online
      return await apiClient.post('/nutrition/log', foodData);
    },
    onSuccess: () => {
      // Invalidate dashboard to refresh
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  const handleLogFood = () => {
    logFoodMutation.mutate({
      foodName: 'Apple',
      calories: 95,
      protein: 0,
      carbs: 25,
      fats: 0,
    });
  };

  return <Button onPress={handleLogFood}>Log Food</Button>;
}
```

### Example 4: Persistent Component State

```javascript
import { usePersistedState } from '@/hooks/usePersistedState';

function OnboardingScreen() {
  const [currentStep, setCurrentStep] = usePersistedState('onboarding-step', 0);

  // If user closes app, they'll resume from the same step
  return (
    <View>
      <OnboardingStep step={currentStep} />
      <Button onPress={() => setCurrentStep(currentStep + 1)}>Next</Button>
    </View>
  );
}
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│ User Action (e.g., log food)                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Online?        │
        └───┬────────┬───┘
            │        │
         Yes│        │No
            │        │
            ▼        ▼
    ┌──────────┐  ┌──────────────┐
    │ API Call │  │ Enqueue      │
    └────┬─────┘  └──────┬───────┘
         │               │
         │               ▼
         │        ┌──────────────┐
         │        │ AsyncStorage │
         │        └──────────────┘
         │
         ▼
    ┌──────────────┐
    │ React Query  │
    │ Cache        │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ AsyncStorage │
    │ (persist)    │
    └──────────────┘
```

## Best Practices

### 1. **Cache Invalidation**

Always invalidate queries after mutations:

```javascript
const mutation = useMutation({
  mutationFn: updateProfile,
  onSuccess: () => {
    queryClient.invalidateQueries(['profile']);
  },
});
```

### 2. **Optimistic Updates**

Update UI immediately for better UX:

```javascript
const mutation = useMutation({
  mutationFn: updateGoal,
  onMutate: async (newGoal) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['goals']);

    // Snapshot current value
    const previous = queryClient.getQueryData(['goals']);

    // Optimistically update
    queryClient.setQueryData(['goals'], newGoal);

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['goals'], context.previous);
  },
});
```

### 3. **Stale Time Strategy**

- **Fast-changing data** (dashboard): 2-5 minutes
- **Slow-changing data** (profile): 10-15 minutes
- **Static data** (achievements): 1 hour+

### 4. **Error Handling**

Always handle storage errors gracefully:

```javascript
try {
  await setItem('key', value);
} catch (error) {
  // App continues to work even if storage fails
  console.error('Storage failed, using in-memory only:', error);
}
```

### 5. **Cache Cleanup**

Periodically clear old cache:

```javascript
import { clearPersistedCache } from '@/utils/queryPersistence';

// On user logout
await clearPersistedCache();
queryClient.clear();
```

## Debugging

### Check Storage Contents

```javascript
import { getAllKeys, multiGet, getStorageSize } from '@/utils/storage';

// List all keys
const keys = await getAllKeys();
console.log('Storage keys:', keys);

// Get storage size
const size = await getStorageSize();
console.log('Storage usage:', size);

// View cache
import { STORAGE_KEYS } from '@/utils/storage';
const cache = await getItem(STORAGE_KEYS.REACT_QUERY_CACHE);
console.log('React Query cache:', cache);
```

### Clear All Data

```javascript
import { clear } from '@/utils/storage';
import { queryClient } from '@/providers/QueryProvider';

// Nuclear option - clear everything
await clear();
queryClient.clear();
```

## Performance Considerations

1. **Lazy Loading**: Query cache hydration happens in background
2. **Debouncing**: Preferences update debounced by 500ms
3. **Size Limits**: AsyncStorage limited to ~6MB on iOS, ~10MB on Android
4. **Compression**: Large datasets should be compressed before storage
5. **TTL**: Old cache entries auto-expire after 24 hours

## Security

- **Sensitive Data**: Use SecureStore (Keychain/Keystore) instead of AsyncStorage
- **Encryption**: AsyncStorage is not encrypted by default
- **PII**: Avoid storing personally identifiable information in preferences
- **Tokens**: Auth tokens stored in SecureStore via Clerk

## Migration Strategy

When updating cache structure:

```javascript
// In queryPersistence.js
export const persistOptions = {
  maxAge: 1000 * 60 * 60 * 24,
  buster: 'v2', // Increment to invalidate all cached data
};
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cache not restoring | Check console for hydration errors |
| Storage full | Clear old data with `clear()` |
| Slow app startup | Reduce persisted cache size |
| Data corruption | Clear cache and start fresh |
| Offline queue stuck | Call `clearQueue()` to reset |

## API Reference

See individual file JSDoc comments for detailed API documentation:

- `utils/storage.js` - Low-level storage operations
- `utils/queryPersistence.js` - React Query persistence config
- `utils/preferences.js` - Preference management
- `utils/offlineQueue.js` - Offline queue management
- `hooks/usePreferences.js` - Preferences hook
- `hooks/usePersistedState.js` - Persisted state hook
