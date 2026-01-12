# Behavioral Health Intelligence - Technical Reference

Complete technical documentation for integrating behavioral health components into DashboardContent.jsx.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Hierarchy](#component-hierarchy)
3. [Data Flow](#data-flow)
4. [Hook Reference](#hook-reference)
5. [State Management](#state-management)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategy](#testing-strategy)
9. [API Contracts](#api-contracts)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Design Principles

**1. Composition over Modification**
- DashboardContent.jsx orchestrates layout (unchanged core logic)
- Wrapper components (DailyIntelligenceBehaviorSection, LifecycleStageFooter) encapsulate behavioral health logic
- New features integrate without modifying existing sections

**2. Graceful Degradation**
- If orchestrator API fails, show nothing (not an error)
- Core features (nutrition, mood, water) unaffected
- Behavioral features are optional enhancements

**3. Single Responsibility**
- DailyIntelligenceCard: Display main decision
- CorrelationCard: Display individual pattern
- DismissReasonSelector: Capture dismissal feedback
- LifecycleStageIndicator: Show stage progression

---

## Component Hierarchy

```
DashboardContent.jsx (orchestrator)
│
├─ DailyIntelligenceBehaviorSection (wrapper)
│  │
│  ├─ DailyIntelligenceCard (main decision display)
│  │  ├─ QuietConfidenceCard (if type === SILENT)
│  │  ├─ ConfidenceIndicator
│  │  ├─ ActionItem[] (for actions)
│  │  └─ LinearGradient (styling)
│  │
│  ├─ FlatList (correlations container)
│  │  └─ CorrelationCard[] (individual patterns)
│  │     ├─ ProgressBar (confidence visualization)
│  │     ├─ EvidenceTimeline (when expanded)
│  │     └─ DismissReasonSelector (modal)
│  │
│  └─ DismissReasonSelector (modal at top level)
│     ├─ TouchableOpacity[] (reason buttons)
│     └─ Modal (animation wrapper)
│
└─ LifecycleStageFooter (wrapper)
   └─ LifecycleStageIndicator (stage + progress)
      └─ ProgressBar (progress to next stage)
```

---

## Data Flow

### Initialization Flow

```
1. DashboardContent mounts
   ├─ useOrchestrator() hook called
   │  └─ Fetches POST /orchestrator/run
   │     └─ Returns OrchestratorResult (decision + correlations + stage)
   │
   ├─ useCorrelationFeedback() hook initialized
   │  └─ Ready to send POST /correlations/{id}/feedback
   │
   └─ State initialized
      ├─ dismissingCorrelationId = null
      ├─ orchestratorData = null (initially)
      └─ learningState = null (initially)

2. DailyIntelligenceBehaviorSection receives props
   ├─ orchestratorData from useOrchestrator
   ├─ onDismiss handler
   ├─ onAccept handler
   └─ Renders DailyIntelligenceCard + CorrelationCard list

3. LifecycleStageFooter receives props
   ├─ stage = orchestratorData.stage
   ├─ daysSinceStart = orchestratorData.daysSinceStart
   └─ Renders LifecycleStageIndicator
```

### User Interaction Flow (Dismiss Pattern)

```
1. User taps "Dismiss" on CorrelationCard
   │
   ├─ CorrelationCard.onDismiss(id) called
   ├─ DailyIntelligenceBehaviorSection.handleCorrelationDismissPress(id)
   │  └─ Sets dismissingCorrelationId state
   │  └─ Shows DismissReasonSelector modal
   │
2. Modal presents 4 dismiss reasons
   ├─ "Not relevant to me"
   ├─ "Just temporary situation"
   ├─ "Already fixed it"
   └─ "Don't want to see this again"

3. User selects reason
   │
   ├─ DismissReasonSelector.onDismiss(reason) called
   ├─ DailyIntelligenceBehaviorSection.handleDismissReasonSelected(reason)
   │  ├─ Calls DashboardContent.handleCorrelationDismiss(id, reason)
   │  └─ Clears dismissingCorrelationId state
   │
4. Backend handler (in DashboardContent)
   │
   ├─ Maps reason to overrideType
   │  ├─ 'not_relevant' → 'USER_DISMISSED'
   │  ├─ 'temporary' → 'TEMPORARY_DISMISS'
   │  ├─ 'fixed' → 'RESOLVED'
   │  └─ 'never_show' → 'DEACTIVATION'
   │
   ├─ Calls sendCorrelationFeedback mutation
   │  └─ POST /correlations/{id}/feedback
   │     └─ { overrideType, userReason }
   │
   └─ Shows success notification
```

---

## Hook Reference

### useOrchestrator()

**Purpose:** Fetch daily decision engine results

**Returns:**
```typescript
{
  data: OrchestratorResult | undefined,
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  refetch: () => Promise<OrchestratorResult>,
}
```

**OrchestratorResult:**
```typescript
{
  success: boolean,
  userId: string,
  stage: 'DISCOVERER' | 'BUILDER' | 'TRACKER' | 'OPTIMIZER' | 'MASTER' | 'CHAMPION' | 'ELITE',
  daysSinceStart: number,
  decision: {
    type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT',
    headline: string,              // e.g., "High-NOVA meals → mood crashes"
    subtitle?: string,             // e.g., "Try adding protein to your carbs"
    confidence: number,            // 0-1
    confidenceLabel: string,       // 'Low' | 'Moderate' | 'High' | 'Very High'
    actions?: Array<{
      icon: string,
      text: string,
      description: string,
      type: string,                // 'food_suggestion' | 'hydration_nudge' | etc.
      metadata?: Record<string, any>,
    }>,
  },
  correlations?: Array<{
    id: number,
    pattern: string,
    confidence: number,
    isHidden?: boolean,
    icon?: string,
    occurrences?: number,
    affectedDomains?: string[],
    whatHappens?: string,
    whyHappens?: string,
    whenSeeIt?: string,
    healthImpact?: string,
    recommendations?: string[],
    evidence?: Array<{ date, strength, context, tags }>,
  }>,
  recommendations?: Array<...>,
  timestamp: string,              // ISO 8601
}
```

**Cache Configuration:**
```typescript
staleTime: 60 * 1000,             // Fresh data important - 60 seconds
gcTime: 10 * 60 * 1000,           // Cache for 10 minutes
refetchOnMount: true,              // Always check for new data on mount
```

**Usage:**
```jsx
const { data: orchestratorData, isLoading, error } = useOrchestrator();

if (isLoading) return <SkeletonLoader />;
if (error) return null;  // Fail silently
if (!orchestratorData) return null;

const { decision, correlations, stage, daysSinceStart } = orchestratorData;
```

---

### useCorrelationFeedback()

**Purpose:** Send user feedback on a pattern (dismiss, helpful, etc.)

**Returns:**
```typescript
{
  mutate: (feedback: FeedbackPayload) => Promise<Response>,
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  data: any,
}
```

**FeedbackPayload:**
```typescript
{
  correlationId: number,
  overrideType: 'USER_DISMISSED' | 'TEMPORARY_DISMISS' | 'RESOLVED' | 'DEACTIVATION' | 'HELPFUL_FEEDBACK' | 'NOT_HELPFUL_FEEDBACK',
  userReason?: string,             // Optional free-text reason
}
```

**Backend Mapping:**
| overrideType | Effect | Duration |
|---|---|---|
| USER_DISMISSED | Confidence → 0, hidden | 7 days |
| TEMPORARY_DISMISS | Hidden, revalidate | 7 days |
| RESOLVED | Marked resolved, refresh | 30 days |
| DEACTIVATION | Permanently hidden | Forever |
| HELPFUL_FEEDBACK | Boost confidence | Incremental |
| NOT_HELPFUL_FEEDBACK | Reduce confidence | Incremental |

**Usage:**
```jsx
const { mutate: sendFeedback } = useCorrelationFeedback();

const handleDismiss = async (correlationId, reason) => {
  try {
    await sendFeedback({
      correlationId,
      overrideType: 'USER_DISMISSED',
      userReason: reason,
    });
    notify.info('Feedback recorded');
  } catch (error) {
    console.error('Feedback error:', error);
    // Fail silently
  }
};
```

---

### useLearningState()

**Purpose:** Get user's learning readiness and pattern comprehension level

**Returns:**
```typescript
{
  data: {
    readiness: 'novice' | 'intermediate' | 'advanced',
    patternsUnderstood: number,
    patternsExplored: number,
    nextLearningMilestone?: string,
    suggestedNextTopic?: string,
  },
  isLoading: boolean,
  isError: boolean,
}
```

**Cache Configuration:**
```typescript
staleTime: 5 * 60 * 1000,          // 5 minutes
gcTime: 30 * 60 * 1000,             // 30 minutes
```

**Usage:**
```jsx
const { data: learningState } = useLearningState();

if (learningState?.readiness === 'novice') {
  // Show simpler explanations
}
```

---

### useLearningFeedback()

**Purpose:** Send learning feedback to improve recommendations

**Payload:**
```typescript
{
  feedbackType: 'correction' | 'clarification' | 'request',
  correlationId?: number,
  reason?: string,
  metadata?: Record<string, any>,
}
```

---

### useResolveIntent()

**Purpose:** Convert a user intent into specific food recommendations

**Payload:**
```typescript
{
  intent: string,                  // e.g., "improve sleep", "boost energy"
  count?: number,                  // Number of recommendations (default: 3)
}
```

---

### useExpiryStats()

**Purpose:** Get statistics on pattern expiry and revalidation

**Returns:**
```typescript
{
  totalPatterns: number,
  expiredPatterns: number,
  patternsRevalidatingIn7Days: number,
  nextRevalidationDate?: string,
}
```

---

### useRevalidateCorrelation()

**Purpose:** Revalidate a previously dismissed pattern

**Payload:**
```typescript
{
  correlationId: number,
}
```

---

## State Management

### New State in DashboardContent.jsx

```javascript
// From useOrchestrator hook
const {
  data: orchestratorData,         // OrchestratorResult | undefined
  isLoading: orchestratorLoading,  // boolean
  error: orchestratorError,        // Error | null
} = useOrchestrator();

// From useCorrelationFeedback hook
const { mutate: sendCorrelationFeedback } = useCorrelationFeedback();

// From useLearningState hook
const { data: learningState } = useLearningState();

// Local state for managing dismiss modal
const [dismissingCorrelationId, setDismissingCorrelationId] = useState(null);
```

### Event Handlers

```javascript
const handleCorrelationDismiss = useCallback(
  async (correlationId, reason) => {
    const overrideTypeMap = {
      'not_relevant': 'USER_DISMISSED',
      'temporary': 'TEMPORARY_DISMISS',
      'fixed': 'RESOLVED',
      'never_show': 'DEACTIVATION',
    };

    try {
      await sendCorrelationFeedback({
        correlationId,
        overrideType: overrideTypeMap[reason] || 'USER_DISMISSED',
        userReason: reason,
      });
      notify.info('Pattern feedback recorded');
    } catch (error) {
      console.error('[Dashboard] Feedback error:', error);
      // Fail silently for behavioral features
    }
  },
  [sendCorrelationFeedback, notify]
);

const handleCorrelationAccept = useCallback(
  async (action) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // TODO: Implement action handling based on action.type
      notify.success('Action recorded!');
    } catch (error) {
      console.error('[Dashboard] Action error:', error);
      notify.error('Failed to process action');
    }
  },
  [notify]
);
```

---

## Error Handling

### Strategy: Fail Silently for Behavioral Features

```javascript
// If orchestrator API fails
if (orchestratorError) {
  console.error('[Dashboard] Orchestrator error:', orchestratorError);
  return null;  // Show nothing, not an error
}

// If correlation feedback fails
try {
  await sendCorrelationFeedback(...);
} catch (error) {
  console.error('[Dashboard] Feedback error:', error);
  // Don't disrupt UX - this is secondary to core features
}
```

### Error Boundary Pattern

```jsx
import React from 'react';

export function withErrorBoundary(Component, fallback = null) {
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return fallback;
      }

      return <Component {...this.props} />;
    }
  };
}

// Usage
const SafeDailyIntelligenceBehaviorSection = withErrorBoundary(
  DailyIntelligenceBehaviorSection,
  null  // If error, render nothing
);
```

---

## Performance Optimization

### React Query Cache Strategy

**useOrchestrator Hook Configuration:**
```typescript
{
  queryKey: ['orchestrator'],
  queryFn: fetchOrchestrator,
  staleTime: 60 * 1000,              // Data fresh for 60 seconds
  gcTime: 10 * 60 * 1000,            // Cache in memory for 10 minutes
  refetchOnMount: true,               // Always check for new data on mount
  refetchOnWindowFocus: false,        // Don't refetch on tab focus
  retry: 1,                           // Retry once on failure
}
```

**Why staleTime = 60 seconds?**
- Orchestrator decisions should be reasonably fresh (not hourly)
- But constant refetching wastes battery + data
- 60-second window balances freshness vs. performance

### Memoization

```javascript
// Wrap handlers in useCallback to prevent child re-renders
const handleCorrelationDismiss = useCallback(
  async (correlationId, reason) => { ... },
  [sendCorrelationFeedback, notify]  // Dependencies
);

// Wrap components in React.memo if re-render heavy
const MemoizedCorrelationCard = React.memo(CorrelationCard);
```

### FlatList Optimization

```jsx
<FlatList
  scrollEnabled={false}              // Disable if within ScrollView
  data={correlations}
  keyExtractor={(item) => `correlation-${item.id}`}
  renderItem={({ item }) => <CorrelationCard {...item} />}
  initialNumToRender={5}             // Render first 5, then lazy load
  maxToRenderPerBatch={5}
  updateCellsBatchingPeriod={50}
/>
```

---

## Testing Strategy

### Unit Tests

**DailyIntelligenceBehaviorSection.test.js**
```javascript
describe('DailyIntelligenceBehaviorSection', () => {
  test('renders DailyIntelligenceCard when data exists', () => {
    const mockData = {
      decision: { type: 'SPEAK', headline: 'Test insight' },
      correlations: [],
    };
    render(
      <DailyIntelligenceBehaviorSection orchestratorData={mockData} />
    );
    expect(screen.getByText('Test insight')).toBeTruthy();
  });

  test('renders CorrelationCard list when correlations exist', () => {
    const mockData = {
      decision: { type: 'SPEAK', headline: 'Test' },
      correlations: [
        { id: 1, pattern: 'Pattern 1', confidence: 0.8 },
        { id: 2, pattern: 'Pattern 2', confidence: 0.6 },
      ],
    };
    render(
      <DailyIntelligenceBehaviorSection orchestratorData={mockData} />
    );
    expect(screen.getByText('Pattern 1')).toBeTruthy();
    expect(screen.getByText('Pattern 2')).toBeTruthy();
  });

  test('calls onDismiss when dismiss reason selected', async () => {
    const mockOnDismiss = jest.fn();
    const mockData = {
      decision: { type: 'SPEAK', headline: 'Test' },
      correlations: [{ id: 1, pattern: 'Test pattern', confidence: 0.8 }],
    };

    const { getByTestId } = render(
      <DailyIntelligenceBehaviorSection
        orchestratorData={mockData}
        onDismiss={mockOnDismiss}
      />
    );

    // Simulate dismiss flow
    fireEvent.press(getByTestId('dismiss-button-1'));
    fireEvent.press(getByTestId('dismiss-reason-not-relevant'));

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith(1, 'not_relevant');
    });
  });
});
```

### Integration Tests

**DashboardContent.integration.test.js**
```javascript
describe('DashboardContent with Behavioral Health', () => {
  test('DailyIntelligenceBehaviorSection appears between CompactTiles and Achievements', () => {
    const mockDashboardData = {...};
    const mockOrchestratorData = {...};

    render(
      <DashboardContent
        dashboardData={mockDashboardData}
        orchestratorData={mockOrchestratorData}
      />
    );

    const scrollView = screen.getByTestId('dashboard-scroll-view');
    const children = scrollView.findAllByType(View);

    const compactTilesIndex = children.findIndex(
      child => child.testID === 'compact-tiles'
    );
    const intelligenceIndex = children.findIndex(
      child => child.testID === 'daily-intelligence-section'
    );

    expect(intelligenceIndex).toBeGreaterThan(compactTilesIndex);
  });

  test('LifecycleStageFooter appears at bottom of ScrollView', () => {
    const mockData = {...};
    render(<DashboardContent {...mockData} />);

    const footer = screen.getByTestID('lifecycle-stage-footer');
    expect(footer).toBeTruthy();
  });
});
```

### E2E Tests

```javascript
// Using Detox or similar E2E framework
describe('Behavioral Health E2E Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('Should show DailyIntelligenceCard after logging meal', async () => {
    // 1. Navigate to log screen
    await element(by.id('log-tab')).tap();

    // 2. Log a meal
    await element(by.id('add-meal-button')).tap();
    await typeIntoElement('Rice with chicken', by.id('meal-input'));
    await element(by.id('log-button')).tap();

    // 3. Return to dashboard
    await element(by.id('dashboard-tab')).tap();

    // 4. Verify DailyIntelligenceCard appears
    await waitFor(element(by.testID('daily-intelligence-section')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('Should show dismiss modal when dismissing pattern', async () => {
    // 1. Dashboard open with correlations
    await element(by.id('dashboard-tab')).tap();

    // 2. Tap dismiss on first correlation
    await element(by.id('correlation-card-1-dismiss')).tap();

    // 3. Verify modal appears
    await waitFor(element(by.testID('dismiss-reason-modal')))
      .toBeVisible()
      .withTimeout(2000);

    // 4. Select reason
    await element(by.id('dismiss-reason-not-relevant')).tap();

    // 5. Verify modal closes
    await waitFor(element(by.testID('dismiss-reason-modal')))
      .not.toBeVisible()
      .withTimeout(2000);
  });
});
```

---

## API Contracts

### Backend Endpoints Used

#### POST /orchestrator/run

**Request:**
```json
{
  // Empty body - uses authenticated user context
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user_123",
  "stage": "TRACKER",
  "daysSinceStart": 42,
  "decision": {
    "type": "SPEAK",
    "headline": "High-NOVA meals → mood crashes",
    "subtitle": "Try adding protein to your carbs",
    "confidence": 0.82,
    "confidenceLabel": "High",
    "actions": [
      {
        "icon": "🥚",
        "text": "Add egg to breakfast",
        "description": "Protein with carbs stabilizes mood",
        "type": "food_suggestion",
        "metadata": { "foodId": 456 }
      }
    ]
  },
  "correlations": [
    {
      "id": 1,
      "pattern": "High-NOVA meals → mood crashes",
      "confidence": 0.82,
      "occurrences": 5,
      "affectedDomains": ["mood", "energy"],
      "whatHappens": "You feel a mood dip 2-3 hours after eating",
      "whyHappens": "Blood sugar spike then crash",
      "whenSeeIt": "After pasta, bread, processed foods",
      "healthImpact": "Affects focus and productivity",
      "recommendations": ["Add protein", "Include fiber"],
      "evidence": [
        {
          "date": "2026-01-10T14:30:00Z",
          "strength": 0.9,
          "context": "Pasta lunch, mood crash at 3pm"
        }
      ]
    }
  ],
  "timestamp": "2026-01-11T10:00:00Z"
}
```

#### POST /correlations/{id}/feedback

**Request:**
```json
{
  "correlationId": 1,
  "overrideType": "USER_DISMISSED",
  "userReason": "not_relevant"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback recorded",
  "correlationId": 1,
  "newStatus": "dismissed",
  "revalidationDate": "2026-01-18T00:00:00Z"
}
```

---

## Troubleshooting

### Issue: DailyIntelligenceBehaviorSection Not Showing

**Checklist:**
1. ✅ Is `hasAnyData` true? (User has logged at least once)
2. ✅ Is `!isOnboarding` true? (User past onboarding phase)
3. ✅ Is `hasLoggedToday` true? (User logged today)
4. ✅ Is orchestrator API responding? (Check Network tab in DevTools)
5. ✅ Is `orchestratorData` not null? (Check React DevTools state)

**Debug:**
```javascript
console.log('hasAnyData:', hasAnyData);
console.log('isOnboarding:', isOnboarding);
console.log('hasLoggedToday:', hasLoggedToday);
console.log('orchestratorData:', orchestratorData);
console.log('orchestratorError:', orchestratorError);
```

**Solution:**
- If `hasAnyData` is false, user hasn't logged any data yet
- If `orchestratorError` is truthy, orchestrator API is down (fail silently expected)
- Verify useOrchestrator hook is correctly installed

---

### Issue: Dismiss Modal Not Appearing

**Checklist:**
1. ✅ DismissReasonSelector component exists?
2. ✅ dismissingCorrelationId state being updated?
3. ✅ Modal `visible` prop connected to state?
4. ✅ onDismiss callback defined?

**Debug:**
```javascript
console.log('dismissingCorrelationId:', dismissingCorrelationId);
console.log('DismissReasonSelector visible:', dismissingCorrelationId !== null);
```

---

### Issue: Lifecycle Footer Not Showing

**Checklist:**
1. ✅ orchestratorData.stage exists?
2. ✅ LifecycleStageFooter component exists?
3. ✅ Component mounted inside ScrollView?
4. ✅ Not hidden by `!isOnboarding` guard?

**Debug:**
```javascript
console.log('orchestratorData.stage:', orchestratorData?.stage);
console.log('orchestratorData.daysSinceStart:', orchestratorData?.daysSinceStart);
```

---

### Issue: Feedback Not Being Sent to Backend

**Checklist:**
1. ✅ sendCorrelationFeedback mutation called?
2. ✅ Correct correlationId passed?
3. ✅ overrideType mapped correctly?
4. ✅ Network request showing in DevTools?

**Debug:**
```javascript
const handleDismiss = async (id, reason) => {
  console.log('Sending feedback:', { id, reason });
  try {
    const result = await sendCorrelationFeedback({
      correlationId: id,
      overrideType: 'USER_DISMISSED',
      userReason: reason,
    });
    console.log('Feedback result:', result);
  } catch (error) {
    console.error('Feedback error:', error);
  }
};
```

**Check Network:**
- Open DevTools Network tab
- Look for POST request to `/correlations/{id}/feedback`
- Verify payload matches expected format
- Check response status (should be 200 or 201)

---

### Issue: Performance Regression

**Symptoms:**
- Dashboard scrolling laggy
- Frequent re-renders
- Memory usage increasing

**Solutions:**
1. Check React DevTools Profiler for render bottlenecks
2. Verify FlatList has proper keyExtractor
3. Ensure handlers are wrapped in useCallback
4. Check if orchestrator data is refetching too often (staleTime too low)
5. Profile with React Native Debugger

```javascript
// Enable React DevTools Profiler
console.log('React DevTools Profiler enabled');

// Check rendering
console.render = (...args) => {
  console.log('[RENDER]', ...args);
};
```

---

### Issue: Orchestrator API Timeout

**Symptoms:**
- Spinner shows indefinitely
- orchestratorLoading stays true

**Checklist:**
1. ✅ Backend `/orchestrator/run` endpoint implemented?
2. ✅ Endpoint responding within 5 seconds?
3. ✅ API URL correctly configured?
4. ✅ Authentication token valid?

**Solution:**
- Check backend logs for `/orchestrator/run` errors
- Verify API response time with curl/Postman
- Set timeout on useQuery hook:

```javascript
const { data } = useQuery({
  queryKey: ['orchestrator'],
  queryFn: fetchOrchestrator,
  timeout: 5000,  // 5 second timeout
});
```

---

## Appendix: Configuration Checklists

### Pre-Deployment Checklist

- [ ] All imports added to DashboardContent.jsx
- [ ] All state variables initialized
- [ ] All handlers defined
- [ ] DailyIntelligenceBehaviorSection rendered at correct location
- [ ] LifecycleStageFooter rendered at correct location
- [ ] No TypeScript/ESLint errors
- [ ] Test suite passes
- [ ] No visual regressions (compare before/after screenshots)
- [ ] Responsive on mobile devices
- [ ] Haptic feedback working
- [ ] Error boundaries in place
- [ ] API endpoints implemented on backend
- [ ] Feature flag configured (if using)

### Post-Deployment Monitoring

- [ ] Error tracking: Watch for useOrchestrator errors
- [ ] Analytics: Track DailyIntelligenceBehaviorSection impressions
- [ ] Performance: Monitor React DevTools for slow renders
- [ ] User feedback: Collect feedback on new features
- [ ] Backend metrics: Monitor /orchestrator/run response time
- [ ] Backend metrics: Monitor /correlations/{id}/feedback success rate

---

**End of Technical Reference**
*For implementation guide, see DASHBOARDCONTENT_MODIFICATIONS.md*
*For architecture overview, see BEHAVIORAL_HEALTH_INTEGRATION_PLAN.md*
