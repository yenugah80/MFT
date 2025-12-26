# MFT Mobile - Architecture Documentation

## Overview

This mobile application follows **industry-standard architectural patterns** with a focus on:
- **Offline-first** data persistence
- **Type-safe** API interactions
- **Resilient** error handling
- **User-friendly** notification system
- **Production-ready** scalability

## Technology Stack

### Core Framework
- **React Native** 0.81.5 with **Expo** ~54.0
- **Expo Router** for file-based navigation
- **TypeScript** for type safety

### State Management & Data Fetching
- **React Query** v5 (@tanstack/react-query)
- **AsyncStorage** for persistence
- Custom hooks for local state

### Authentication
- **Clerk** for OAuth and session management
- **expo-secure-store** for token storage

### UI/UX
- **React Native Paper** for Material Design components
- **Moti** for animations
- **NativeWind** for Tailwind-like styling

## Application Architecture

### Provider Hierarchy

```
ErrorBoundary                    ← Catches all unhandled errors
└── NotificationProvider         ← Global notification system
    └── QueryProvider            ← React Query with persistence
        └── ClerkProvider        ← Authentication
            └── ApiInitializer   ← Wire auth token to API client
                └── SafeScreen   ← Safe area handling
                    └── App Routes
```

### Directory Structure

```
mobile/
├── app/                         # Expo Router pages
│   ├── (tabs)/                  # Tab navigation screens
│   │   ├── dashboard.jsx        # Main dashboard
│   │   └── favorites.jsx        # Favorites screen
│   └── _layout.jsx              # Root layout with providers
│
├── components/                  # Reusable components
│   ├── notifications/           # Notification UI components
│   │   ├── Toast.jsx            # Toast notifications
│   │   ├── Modal.jsx            # Modal dialogs
│   │   └── InlineError.jsx      # Form validation errors
│   ├── ErrorBoundary.jsx        # Error boundary component
│   ├── ApiInitializer.jsx       # API client setup
│   ├── DashboardContent.jsx     # Dashboard UI
│   └── ...
│
├── providers/                   # Context providers
│   ├── NotificationProvider.jsx # Notification state management
│   └── QueryProvider.jsx        # React Query configuration
│
├── services/                    # API and business logic
│   └── apiClient.js             # Enhanced fetch client
│
├── hooks/                       # Custom React hooks
│   ├── useDashboard.ts          # Dashboard data hook
│   ├── usePreferences.js        # User preferences hook
│   └── usePersistedState.js     # Persisted state hook
│
├── utils/                       # Utility functions
│   ├── notify.js                # Notification API
│   ├── errorHandler.js          # Global error handling
│   ├── storage.js               # AsyncStorage wrapper
│   ├── queryPersistence.js      # React Query persistence
│   ├── preferences.js           # Preference management
│   └── offlineQueue.js          # Offline request queue
│
├── types/                       # TypeScript definitions
│   └── api.ts                   # API response types
│
└── docs/                        # Documentation
    ├── ARCHITECTURE.md          # This file
    └── PERSISTENCE.md           # Persistence guide
```

## Core Systems

### 1. Notification System

**Location**: `providers/NotificationProvider.jsx`, `utils/notify.js`

**Hierarchy** (as per requirements):
1. **Inline messages** - Form validation, expected errors
2. **Toasts** - Success, transient failures, info
3. **Modals** - Destructive actions, critical decisions
4. **Error Boundary** - Unrenderable screens

**Usage**:
```javascript
import notify from '@/utils/notify';

notify.success('Profile saved!');
notify.error('Failed to connect');
notify.warning('Unsaved changes');
notify.info('Tip: Use barcode scanner');

notify.modal({
  title: 'Delete Item?',
  message: 'This cannot be undone',
  destructive: true,
  onConfirm: () => deleteItem(),
});
```

**Features**:
- Auto-dismiss with configurable duration
- Queue management (no duplicate toasts)
- Animated entrance/exit
- Portal-based rendering (always on top)
- Accessible with screen readers

### 2. Error Handling System

**Location**: `utils/errorHandler.js`, `components/ErrorBoundary.jsx`

**Error Classification**:
- Network errors (offline, timeout)
- Validation errors (400, 422)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500+)

**Features**:
- User-friendly error messages
- Automatic error reporting hooks
- Integration with notification system
- Error boundary fallback UI
- Retry mechanisms

**Usage**:
```javascript
import { handleApiError } from '@/utils/errorHandler';

try {
  await apiClient.post('/endpoint', data);
} catch (error) {
  handleApiError(error, 'Save Profile');
}
```

### 3. Data Fetching & Caching

**Location**: `providers/QueryProvider.jsx`, `hooks/useDashboard.ts`

**Configuration**:
- **Stale time**: 5 minutes (customizable per query)
- **Cache time**: 10 minutes
- **Retry**: 2 attempts with exponential backoff
- **Persistence**: 24-hour TTL in AsyncStorage

**Features**:
- Automatic background refetching
- Optimistic updates support
- Request deduplication
- Cache invalidation
- Offline persistence
- Hydration on app start

**Usage**:
```javascript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch data
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['dashboard'],
  queryFn: fetchDashboard,
});

// Mutate data
const mutation = useMutation({
  mutationFn: updateProfile,
  onSuccess: () => {
    queryClient.invalidateQueries(['profile']);
  },
});
```

### 4. API Client

**Location**: `services/apiClient.js`

**Features**:
- Automatic Clerk token injection
- Retry with exponential backoff (3 attempts)
- Request/response logging (dev mode)
- Type-safe responses with TypeScript
- Support for all HTTP methods
- File upload support
- Error transformation

**Retry Configuration**:
- Initial delay: 1 second
- Max delay: 10 seconds
- Retryable status codes: 408, 429, 500, 502, 503, 504
- Network errors: Always retryable

**Usage**:
```javascript
import apiClient from '@/services/apiClient';

// GET request
const data = await apiClient.get('/nutrition/dashboard');

// POST with body
const result = await apiClient.post('/nutrition/log', {
  foodName: 'Apple',
  calories: 95,
});

// File upload
const formData = new FormData();
formData.append('image', file);
await apiClient.upload('/upload', formData);
```

### 5. Persistence Layer

**Location**: `utils/storage.js`, `utils/queryPersistence.js`

**Storage Strategy**:
- **React Query cache**: Auto-persisted, 24h TTL
- **User preferences**: Manual persistence
- **Offline queue**: Persistent until processed
- **Auth tokens**: SecureStore (encrypted)

**Features**:
- Automatic JSON serialization
- Error recovery (graceful degradation)
- Namespaced storage
- Multi-get/set operations
- Storage size monitoring

**Usage**:
```javascript
import { getItem, setItem } from '@/utils/storage';

// Simple key-value
await setItem('theme', 'dark');
const theme = await getItem('theme');

// Complex objects (auto-serialized)
await setItem('user-prefs', {
  notifications: true,
  units: 'metric',
});
```

### 6. Offline Queue

**Location**: `utils/offlineQueue.js`

**Purpose**: Queue API mutations when offline, replay when online

**Features**:
- Automatic queuing on network failure
- Retry with backoff
- User notifications
- Action prioritization
- Queue persistence

**Usage**:
```javascript
import { enqueue, processQueue } from '@/utils/offlineQueue';

// Queue action when offline
await enqueue('LOG_FOOD', {
  foodName: 'Apple',
  calories: 95,
});

// Process queue when back online
const handlers = {
  LOG_FOOD: async (payload) => {
    await apiClient.post('/nutrition/log', payload);
  },
};

await processQueue(handlers);
```

## Data Flow

### Normal Request Flow (Online)

```
User Action
    ↓
React Component
    ↓
React Query (useMutation)
    ↓
API Client
    ↓
[Automatic Token Injection]
    ↓
Backend API
    ↓
Success Response
    ↓
React Query Cache Update
    ↓
AsyncStorage Persistence
    ↓
UI Update
    ↓
Success Notification
```

### Offline Request Flow

```
User Action
    ↓
Network Check (Failed)
    ↓
Offline Queue (enqueue)
    ↓
AsyncStorage Persistence
    ↓
Offline Notification
    ↓
[User comes back online]
    ↓
Process Queue
    ↓
Retry All Queued Actions
    ↓
Success Notification
```

### Error Flow

```
API Error
    ↓
Error Classification
    ↓
User-Friendly Message
    ↓
┌────────────────┐
│  Error Type?   │
└───┬────────┬───┘
    │        │
    ▼        ▼
Network   Validation
Error       Error
    │        │
    ▼        ▼
Toast     Inline
          Message
```

## Type Safety

### API Response Types

**Location**: `types/api.ts`

**Coverage**:
- All backend models (Profile, FoodLog, etc.)
- Dashboard aggregated data
- Pagination wrappers
- Error responses
- Validation errors

**Benefits**:
- IDE autocomplete
- Compile-time error checking
- Self-documenting code
- Refactoring safety

## Performance Optimizations

### 1. Query Stale Time Strategy

| Data Type | Stale Time | Rationale |
|-----------|------------|-----------|
| Dashboard | 2 minutes | Frequently changing |
| Profile | 10 minutes | Rarely changes |
| Goals | 10 minutes | User-controlled |
| Achievements | 1 hour | Static data |

### 2. Code Splitting

- Lazy loading of screens
- Route-based code splitting via Expo Router
- Dynamic imports for heavy components

### 3. Cache Management

- Automatic garbage collection of unused queries
- LRU eviction for memory management
- Selective persistence (only successful queries)

### 4. Network Optimization

- Request deduplication
- Parallel requests with Promise.all
- Retry with exponential backoff
- Connection-aware requests

## Security Considerations

### 1. Authentication

- **Tokens**: Stored in SecureStore (encrypted keychain)
- **Auto-refresh**: Handled by Clerk
- **Expiration**: Automatic re-authentication flow

### 2. Data Storage

- **Sensitive data**: SecureStore only
- **Cache**: AsyncStorage (not encrypted)
- **PII**: Minimal storage, server-authoritative

### 3. API Security

- HTTPS only
- Token in Authorization header
- CORS configured on backend
- Rate limiting respected

## Testing Strategy

### Unit Tests
- Utility functions (storage, errorHandler)
- Pure functions in hooks
- Type guards and validators

### Integration Tests
- API client with mocked responses
- React Query hooks
- Provider integration

### E2E Tests
- Critical user flows
- Offline scenarios
- Error recovery

## Monitoring & Observability

### Error Tracking
- Console logging (dev mode)
- Error boundary capture
- Integration points for Sentry

### Performance Metrics
- Query success/failure rates
- Retry counts
- Cache hit rates
- Storage usage

### User Analytics
- Screen views
- Feature usage
- Error frequency
- Offline duration

## Deployment Considerations

### Environment Variables

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_URL=https://api.example.com
```

### Build Optimization

- Minification enabled
- Tree shaking for unused code
- Asset optimization
- Hermes engine for Android

### Update Strategy

- Over-the-air updates via Expo
- Feature flags for gradual rollout
- Version compatibility checks

## Migration & Versioning

### Cache Versioning

```javascript
// Increment buster to invalidate all cached data
export const persistOptions = {
  buster: 'v1', // Change to 'v2' to clear cache
};
```

### Data Migration

- Preference schema versioning
- Backward compatibility checks
- Safe default fallbacks

## Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| App crashes on error | Check ErrorBoundary logs |
| Cache not restoring | Verify AsyncStorage permissions |
| Offline queue stuck | Call clearQueue() to reset |
| Slow app startup | Reduce cache size, check hydration |
| API calls failing | Verify token, check network |
| Notifications not showing | Check NotificationProvider mounting |

## Future Enhancements

### Planned Features
- [ ] Push notifications
- [ ] Background sync
- [ ] Offline-first mutations
- [ ] Advanced caching strategies
- [ ] Image optimization
- [ ] Analytics dashboard

### Technical Debt
- [ ] Add comprehensive test coverage
- [ ] Implement Sentry integration
- [ ] Add performance monitoring
- [ ] Document all API endpoints
- [ ] Create component storybook

## Contributing Guidelines

### Code Style
- ESLint configuration
- Prettier for formatting
- TypeScript strict mode
- JSDoc comments for utilities

### Pull Request Process
1. Feature branch from `main`
2. Write tests for new features
3. Update documentation
4. Pass all checks
5. Request review

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Clerk React Native Docs](https://clerk.com/docs/quickstarts/expo)
- [AsyncStorage Docs](https://react-native-async-storage.github.io/async-storage/)

## License

Proprietary - All rights reserved

---

**Last Updated**: December 2024
**Architecture Version**: 1.0
**Maintained by**: Development Team
