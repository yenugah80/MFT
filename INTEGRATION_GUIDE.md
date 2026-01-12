# Integration Guide: Behavioral Health Intelligence System

Complete guide for wiring frontend components to backend services.

## Architecture Overview

```
Frontend Components
    ↓
Integration Hooks (useOrchestrator)
    ↓
API Client (with Clerk auth)
    ↓
Backend Routes
    ↓
Business Logic Services
    ↓
Database
```

## Frontend Components

### 1. DailyIntelligenceCard
**Location:** `mobile/components/dashboard/DailyIntelligenceCard.jsx`

**Purpose:** Main recommendation display card

**Props:**
```javascript
{
  type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT',
  headline: string,
  subtitle?: string,
  actions?: Array<{ icon, text, description, onTap, onSuccess }>,
  confidence: number (0-1),
  confidenceLabel: string,
  lifecycleStage: string,
  visualComponent?: ReactNode
}
```

**Usage in DashboardContent:**
```javascript
import { DailyIntelligenceCard } from './DailyIntelligenceCard';
import { useOrchestrator } from '../../hooks/useOrchestrator';

export function Dashboard() {
  const { data: orchestratorData, isLoading } = useOrchestrator();

  if (!orchestratorData?.decision) {
    return <Text>No intelligence available</Text>;
  }

  const decision = orchestratorData.decision;

  return (
    <DailyIntelligenceCard
      type={decision.type}
      headline={decision.headline}
      subtitle={decision.subtitle}
      confidence={decision.confidence}
      confidenceLabel={decision.confidenceLabel}
      lifecycleStage={orchestratorData.stage}
      actions={decision.actions}
    />
  );
}
```

### 2. DismissReasonSelector
**Location:** `mobile/components/dashboard/DismissReasonSelector.jsx`

**Purpose:** Modal for capturing dismissal feedback

**Props:**
```javascript
{
  visible: boolean,
  headline: string,
  onDismiss: (reasonId: string) => void,
  onCancel: () => void
}
```

**Reason IDs → Override Types Mapping:**
```javascript
const reasonToOverrideType = {
  'not_relevant': 'USER_DISMISSED',
  'temporary': 'TEMPORARY_DISMISS',
  'fixed': 'RESOLVED',
  'never_show': 'DEACTIVATION'
};
```

**Usage in Parent Component:**
```javascript
import { DismissReasonSelector } from './DismissReasonSelector';
import { useCorrelationFeedback } from '../../hooks/useOrchestrator';

export function PatternCard({ correlation }) {
  const [showDismissModal, setShowDismissModal] = useState(false);
  const { mutate: sendFeedback } = useCorrelationFeedback();

  const handleDismiss = (reasonId) => {
    const reasonToOverrideType = {
      'not_relevant': 'USER_DISMISSED',
      'temporary': 'TEMPORARY_DISMISS',
      'fixed': 'RESOLVED',
      'never_show': 'DEACTIVATION'
    };

    sendFeedback({
      correlationId: correlation.id,
      overrideType: reasonToOverrideType[reasonId],
      userReason: 'User dismissed via modal'
    });

    setShowDismissModal(false);
  };

  return (
    <>
      <Button onPress={() => setShowDismissModal(true)}>
        Dismiss Pattern
      </Button>

      <DismissReasonSelector
        visible={showDismissModal}
        headline={`Why dismiss "${correlation.pattern}"?`}
        onDismiss={handleDismiss}
        onCancel={() => setShowDismissModal(false)}
      />
    </>
  );
}
```

### 3. CorrelationCard
**Location:** `mobile/components/insights/CorrelationCard.jsx`

**Purpose:** Display individual patterns with expansion

**Shows:**
- Compact view: Icon, headline, progress, occurrences
- Expanded view: Full WHAT/WHY/WHEN/HOW/RECOMMENDED sections
- EvidenceTimeline in expanded state

### 4. EvidenceTimeline
**Location:** `mobile/components/dashboard/EvidenceTimeline.jsx`

**Purpose:** Timeline visualization of pattern observations

**Props:**
```javascript
{
  evidence: Array<{ date, strength, context, tags }>,
  pattern: string,
  limit?: number  // default: 7
}
```

**Usage:**
```javascript
<EvidenceTimeline
  evidence={correlation.evidence}
  pattern={correlation.pattern}
  limit={7}
/>
```

### 5. ActionItem
**Location:** `mobile/components/dashboard/ActionItem.jsx`

**Purpose:** Individual recommendation action with haptic feedback

**Features:**
- Haptic feedback on press
- Scale animation (1.0 → 0.98 → 1.0)
- Success state with checkmark
- Post-action confirmation

### 6. QuietConfidenceCard
**Location:** `mobile/components/dashboard/QuietConfidenceCard.jsx`

**Purpose:** SILENT decision display (no new patterns)

**Shows:**
- "You're On Track Today" message
- Green gradient background
- Calm confirmation state

## Integration Hooks

**Location:** `mobile/hooks/useOrchestrator.ts`

### useOrchestrator()
Fetches daily intelligence from orchestrator.

```javascript
const { data, isLoading, error, refetch } = useOrchestrator();

// data structure:
{
  success: true,
  userId: string,
  stage: 'DISCOVERER' | 'BUILDER' | ... | 'ELITE',
  daysSinceStart: number,
  decision: {
    type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT',
    headline: string,
    subtitle?: string,
    confidence: number,
    confidenceLabel: string,
    correlationId?: number,
    actions?: Array<{ icon, text, description, type, metadata }>
  },
  correlations?: Array<{ id, pattern, confidence, isHidden }>,
  recommendations?: Array<{ id, type, food, reason, confidence }>,
  timestamp: string
}
```

**Cache:** 60 seconds (staleTime), 10 minutes (gcTime)

### useCorrelationFeedback()
Send feedback on correlations.

```javascript
const { mutate: sendFeedback, isPending } = useCorrelationFeedback();

sendFeedback({
  correlationId: 123,
  overrideType: 'USER_DISMISSED' | 'TEMPORARY_DISMISS' | 'RESOLVED' | 'DEACTIVATION' | 'HELPFUL_FEEDBACK' | 'NOT_HELPFUL_FEEDBACK',
  userReason?: string
});
```

### useLearningFeedback()
Update learning model with feedback.

```javascript
const { mutate: sendLearningFeedback } = useLearningFeedback();

sendLearningFeedback({
  feedbackType: 'correction' | 'validation' | 'dismissal',
  correlationId?: number,
  reason?: string
});
```

### useLearningState()
Get user's learning readiness.

```javascript
const { data: learningState } = useLearningState();

// data structure:
{
  learning: {
    stage: string,
    learningStage: string,
    observations: number,
    correlations: number,
    daysActive: number
  },
  readiness: {
    canShowCorrelations: boolean,
    canShowPredictions: boolean,
    nextMilestone: { threshold, name, progress, remaining }
  }
}
```

### useResolveIntent()
Map generic intents to foods.

```javascript
const { mutate: resolveIntent, data: recommendations } = useResolveIntent();

resolveIntent({
  intent: 'improve sleep',
  count: 3
});

// returns:
{
  success: true,
  intent: string,
  recommendations: Array<{
    food: string,
    reason: string,
    quantity: string,
    timing: string,
    resolverScore: number
  }>,
  confidence: number
}
```

### useExpiryStats()
Get expiry information.

```javascript
const { data: expiryStats } = useExpiryStats();

// data structure:
{
  stats: {
    total: number,
    expired: number,
    expiringToday: number,
    expiringThisWeek: number,
    byType: { SPEAK: number, REINFORCE: number, ... }
  }
}
```

### useRevalidateCorrelation()
Unhide a dismissed pattern.

```javascript
const { mutate: revalidate } = useRevalidateCorrelation();

revalidate({ correlationId: 123 });
```

## Backend API Endpoints

### Orchestrator Route
**File:** `backend/src/routes/orchestrator.js`

#### POST /api/orchestrator/run
Trigger daily orchestration and get intelligence decisions.

**Request:**
```javascript
POST /api/orchestrator/run
Content-Type: application/json
Authorization: Bearer <clerk-token>

{}
```

**Response:**
```javascript
{
  "success": true,
  "userId": "user_123",
  "stage": "TRACKER",
  "daysSinceStart": 15,
  "decision": {
    "type": "SPEAK",
    "headline": "High-NOVA foods linked to mood crashes",
    "subtitle": "You've noticed this pattern 4 times this week",
    "confidence": 0.78,
    "confidenceLabel": "High",
    "correlationId": 5,
    "actions": [
      {
        "icon": "📊",
        "text": "View Pattern",
        "description": "See detailed evidence",
        "type": "VIEW_CORRELATION"
      },
      {
        "icon": "🍎",
        "text": "Get Alternatives",
        "description": "Lower-NOVA food options",
        "type": "GET_RECOMMENDATIONS"
      }
    ]
  },
  "correlations": [...],
  "recommendations": [...],
  "timestamp": "2024-01-11T10:30:00Z"
}
```

### Resolver Route
**File:** `backend/src/routes/resolver.js`

#### POST /api/resolver/resolve
Map intent to specific foods.

**Request:**
```javascript
{
  "intent": "improve sleep",
  "count": 3
}
```

**Response:**
```javascript
{
  "success": true,
  "intent": "improve sleep",
  "recommendations": [
    {
      "food": "almonds",
      "reason": "High in magnesium",
      "quantity": "1 oz",
      "timing": "1 hour before bed",
      "resolverScore": 0.92
    },
    ...
  ],
  "confidence": 0.88,
  "timestamp": "2024-01-11T10:30:00Z"
}
```

### Learning Route
**File:** `backend/src/routes/learning.js`

#### GET /api/learning/state
Get learning state and readiness.

**Response:**
```javascript
{
  "success": true,
  "learning": {
    "stage": "TRACKER",
    "learningStage": "LEARNING",
    "observations": {
      "food": 25,
      "mood": 18,
      "water": 22,
      "total": 65
    },
    "correlations": {
      "discovered": 4,
      "validated": 2,
      "active": 4
    },
    "evidence": {
      "total": 120,
      "avgPerCorrelation": 30
    }
  },
  "readiness": {
    "canShowCorrelations": true,
    "canShowPredictions": false,
    "nextMilestone": {
      "threshold": 90,
      "name": "Three Months",
      "progress": 72,
      "remaining": 25
    },
    "recommendedActions": [
      {
        "priority": "high",
        "action": "Review discovered patterns",
        "reason": "You have enough data to see initial patterns"
      }
    ]
  },
  "timestamp": "2024-01-11T10:30:00Z"
}
```

#### POST /api/learning/feedback
Send learning feedback.

**Request:**
```javascript
{
  "feedbackType": "correction",
  "correlationId": 5,
  "reason": "This doesn't match my experience"
}
```

### Correlations Route (Enhanced)
**File:** `backend/src/routes/correlations.js`

#### POST /api/correlations/:id/feedback
Send dismissal feedback.

**Request:**
```javascript
{
  "overrideType": "USER_DISMISSED",
  "userReason": "Not relevant to me"
}
```

**Response:**
```javascript
{
  "success": true,
  "correlationId": 5,
  "overrideType": "USER_DISMISSED",
  "previousConfidence": 0.78,
  "newConfidence": 0.58,
  "action": "lower_confidence",
  "description": "User said \"not relevant to me\"",
  "revalidateAfter": "Never"
}
```

### Expiry Route
**File:** `backend/src/routes/expiry.js`

#### GET /api/expiry/pending
Get expiring and revalidating items.

**Response:**
```javascript
{
  "success": true,
  "expiring": [
    {
      "id": 1,
      "type": "SPEAK",
      "daysRemaining": 2,
      "createdAt": "2024-01-09T10:30:00Z"
    }
  ],
  "needingRevalidation": [
    {
      "id": 5,
      "pattern": "High-NOVA → Mood Crashes",
      "revalidateAt": "2024-01-20T10:30:00Z"
    }
  ],
  "stats": {
    "total": 15,
    "expired": 2,
    "expiringToday": 1,
    "expiringThisWeek": 3
  }
}
```

#### POST /api/expiry/:id/revalidate
Unhide a dismissed pattern.

**Response:**
```javascript
{
  "success": true,
  "correlationId": 5,
  "message": "Correlation revalidated and unhidden",
  "confidence": 0.65
}
```

## Backend Services

### Resolver Service
**File:** `backend/src/services/recommendationResolverService.js`

Maps generic intents to specific foods using AI and user preferences.

**Key Functions:**
- `resolveIntent(userId, intent, count)` - Main resolver
- `getResolverConfidence(recommendations, intent)` - Confidence score
- `parseAIRecommendations(content, count)` - Parse AI response
- `rankRecommendations(foods, correlations, acceptedFoods)` - Rank by relevance

**Integration Points:**
- Uses user's dietary preferences and allergies
- Respects recent recommendations (avoids repetition)
- Uses correlation evidence for ranking
- Fallback recommendations for common intents

### Learning State Service
**File:** `backend/src/services/learningStateService.js`

Manages user learning progression and readiness.

**Key Functions:**
- `initializeLearningState(userId, profile)` - On signup
- `bootstrapLearningFromHistory(userId, fromDaysAgo)` - Learn from existing data
- `updateLearningFromFeedback(userId, feedbackType, metadata)` - Update on feedback
- `getLearningReadiness(userId)` - Check feature eligibility
- `getLearningStateSummary(userId)` - Quick summary

**Learning Stages:**
- NEW_USER (0-1 days): Just onboarded
- INITIALIZING (2-7 days): Building habits
- LEARNING (8-30 days): Active discovery
- MATURE (31-90 days): Optimization phase
- EXPERT (91+ days): Predictive phase

### Intent Override Service
**File:** `backend/src/services/userIntentOverrideService.js`

Processes user feedback and adjusts recommendations.

**Key Functions:**
- `processIntentOverride(userId, correlationId, overrideType, metadata)` - Main handler
- `processRecommendationFeedback(userId, recommendationId, feedbackType, metadata)` - Rec feedback
- `getUserIntentOverrideHistory(userId, limit)` - User's feedback history
- `shouldHideCorrelation(correlation)` - Filter logic
- `getIntentOverrideStats(userId)` - Statistics

**Override Types & Effects:**
- USER_DISMISSED: Confidence -0.2, permanent
- TEMPORARY_DISMISS: Confidence -0.1, 7-day revalidation
- RESOLVED: Confidence -0.05, 30-day refresh
- DEACTIVATION: No change, permanent hide
- HELPFUL_FEEDBACK: Confidence +0.15
- NOT_HELPFUL_FEEDBACK: Confidence -0.25
- ACCURACY_CORRECTION: Confidence -0.3

### Expiry Service
**File:** `backend/src/services/recommendationExpiryService.js`

Manages recommendation lifecycle.

**Key Functions:**
- `isExpired(recommendation)` - Check expiry status
- `getDaysUntilExpiry(recommendation)` - Days remaining
- `getExpiredRecommendations(userId, limit)` - Get expired items
- `archiveExpiredRecommendations(userId)` - Archive old items
- `getCorrelationsNeedingRevalidation(userId)` - Get revalidation candidates
- `revalidateCorrelation(userId, correlationId)` - Unhide pattern
- `getExpiryStats(userId)` - Statistics

**Expiry Rules:**
- SPEAK: 24 hours (immediate insights)
- REINFORCE: 7 days (behavioral patterns)
- PREDICT: 3 days (predictions degrade quickly)
- SILENT: Never expires (implicit "good to go")
- Observation: 14 days
- Deficiency: 30 days
- Seasonal: 60 days

## Complete Integration Example

```javascript
// DashboardContent.jsx - Main integration point

import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { DailyIntelligenceCard } from './DailyIntelligenceCard';
import { CorrelationCard } from './CorrelationCard';
import { DismissReasonSelector } from './DismissReasonSelector';
import { LifecycleStageIndicator } from './LifecycleStageIndicator';
import {
  useOrchestrator,
  useCorrelationFeedback,
} from '../../hooks/useOrchestrator';

export function DashboardContent() {
  const [dismissModalState, setDismissModalState] = useState(null);
  const {
    data: orchestratorData,
    isLoading,
    refetch,
  } = useOrchestrator();
  const { mutate: sendFeedback, isPending: isSubmitting } =
    useCorrelationFeedback();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (!orchestratorData?.decision) {
    return <Text>No intelligence available</Text>;
  }

  const { decision, correlations, stage, daysSinceStart } = orchestratorData;

  /**
   * Handle correlation dismissal
   */
  const handleCorrelationDismiss = (correlationId) => {
    setDismissModalState({
      correlationId,
      headline: `Dismiss pattern?`,
    });
  };

  /**
   * Handle dismiss reason selection
   */
  const handleDismissReason = (reasonId) => {
    const reasonToOverrideType = {
      'not_relevant': 'USER_DISMISSED',
      'temporary': 'TEMPORARY_DISMISS',
      'fixed': 'RESOLVED',
      'never_show': 'DEACTIVATION',
    };

    sendFeedback({
      correlationId: dismissModalState.correlationId,
      overrideType: reasonToOverrideType[reasonId],
      userReason: reasonId,
    });

    setDismissModalState(null);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Main Intelligence Card */}
      <DailyIntelligenceCard
        type={decision.type}
        headline={decision.headline}
        subtitle={decision.subtitle}
        confidence={decision.confidence}
        confidenceLabel={decision.confidenceLabel}
        lifecycleStage={stage}
        actions={decision.actions}
      />

      {/* Additional Correlations (if not SILENT) */}
      {correlations && correlations.length > 0 && (
        <View style={styles.correlationsSection}>
          <Text style={styles.sectionTitle}>Other Patterns</Text>
          {correlations.map((correlation) => (
            <CorrelationCard
              key={correlation.id}
              correlation={correlation}
              onDismiss={() => handleCorrelationDismiss(correlation.id)}
            />
          ))}
        </View>
      )}

      {/* Lifecycle Stage Footer */}
      <LifecycleStageIndicator
        stage={stage}
        daysSinceStart={daysSinceStart}
      />

      {/* Dismiss Reason Modal */}
      <DismissReasonSelector
        visible={dismissModalState !== null}
        headline={dismissModalState?.headline}
        onDismiss={handleDismissReason}
        onCancel={() => setDismissModalState(null)}
      />
    </ScrollView>
  );
}
```

## Data Flow Diagram

```
User Opens Dashboard
         ↓
useOrchestrator() calls POST /api/orchestrator/run
         ↓
Backend orchestrateDailyRecommendations()
    ├─ determineLifecycleStage()
    ├─ computeUserCorrelations()
    ├─ filterByConfidence()
    └─ makeDecision (SPEAK/REINFORCE/PREDICT/SILENT)
         ↓
Returns OrchestratorResult to frontend
         ↓
DailyIntelligenceCard displays decision
         ↓
User can:
  1. Tap Action → Haptic feedback + success state
  2. Dismiss Pattern → Shows DismissReasonSelector modal
  3. View Correlations → Shows expanded CorrelationCard + EvidenceTimeline
         ↓
On dismissal:
  1. User selects reason (e.g., "Not relevant to me")
  2. Frontend maps reason → overrideType (e.g., "USER_DISMISSED")
  3. useCorrelationFeedback() calls POST /api/correlations/:id/feedback
  4. Backend processIntentOverride() adjusts confidence
  5. Dashboard refreshes with updated data
         ↓
Learning loop completes → System learns from user feedback
```

## Testing Checklist

- [ ] DailyIntelligenceCard displays orchestrator data
- [ ] SILENT decision shows QuietConfidenceCard
- [ ] ActionItem provides haptic feedback
- [ ] ActionItem shows success state after 2 seconds
- [ ] DismissReasonSelector modal appears on dismiss
- [ ] Dismiss feedback is sent to backend
- [ ] Correlation feedback adjusts confidence (verify via /api/correlations)
- [ ] CorrelationCard expands/collapses smoothly
- [ ] EvidenceTimeline displays evidence points
- [ ] Evidence dots color-coded by strength
- [ ] LifecycleStageIndicator shows correct stage
- [ ] Lifecycle progress bar moves as days increase
- [ ] Learning state is accessible via useLearningState()
- [ ] Expiry stats show expiring recommendations
- [ ] Revalidation works (dismissed patterns can be re-shown)

## Deployment Notes

1. **Backend:** All new routes require Clerk authentication (use `requireAuth()` middleware)
2. **Database:** No new tables needed - uses existing schema with metadata fields
3. **Environment:** Ensure `/api/orchestrator/run` endpoint is accessible from mobile
4. **API Compatibility:** All endpoints follow existing response pattern (`{ success, data, timestamp }`)
5. **Caching:** React Query caching configured per endpoint freshness needs

## Next Steps

1. Integrate into DashboardContent.jsx
2. Test API communication end-to-end
3. Verify accessibility (VoiceOver, TalkBack)
4. Test haptic feedback on physical devices
5. Profile performance (React Query caching effectiveness)
6. Add error boundaries around each component
7. Implement retry logic for failed API calls
8. Set up analytics tracking for user actions
