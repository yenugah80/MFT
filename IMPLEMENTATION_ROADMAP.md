# MyFoodTracker: Behavioral Health Intelligence
## Final Implementation Roadmap

---

## 📋 DELIVERABLES COMPLETE

### ✅ Design Documents
1. **CORRELATION_ENGINE_DESIGN.md**
   - Rule-first pattern detection
   - Signal extraction from logs
   - Scoring formulas (strength, confidence, health impact)
   - Time windows (4h, 24h, 7d, 15d, 30d, 60d)
   - 5 major correlation rules

2. **LIFECYCLE_STATE_MACHINE.md**
   - 7 user stages (DISCOVERER → ELITE)
   - Stage-specific depths and thresholds
   - Transition rules
   - Message complexity by stage
   - Min confidence thresholds

3. **FRONTEND_VISUALIZATION_DESIGN.md**
   - Component hierarchy
   - Visual components (gauges, progress, sparklines)
   - Layman-friendly design (no raw data)
   - Data flow from backend to UI

4. **CRITICAL_IMPROVEMENTS.md**
   - Confounding factor classification (3 types)
   - Fixed consistency bonus formula
   - Correlation vs Recommendation separation
   - Premium UI/UX design system

5. **SYSTEM_ARCHITECTURE_SUMMARY.md**
   - End-to-end architecture
   - Data flow diagrams
   - Performance considerations
   - Testing roadmap

### ✅ Backend Code

1. **Database Schema** (`backend/src/db/schema.js`)
   - Added `user_correlations` table (stores computed patterns)
   - Added `correlation_evidence` table (individual occurrences)

2. **Correlation Engine** (`backend/src/services/correlationEngineService.js`)
   - Signal extraction (food, mood, water)
   - 5 correlation detection rules
   - Scoring logic
   - Database persistence

3. **API Routes** (`backend/src/routes/correlations.js`)
   - POST /api/correlations/compute
   - GET /api/correlations
   - GET /api/correlations/:id/evidence
   - DELETE /api/correlations/:id

4. **Recommendation Orchestrator** (`backend/src/services/recommendationOrchestratorService.js`)
   - Lifecycle stage detection
   - Decision logic (Speak/Reinforce/Predict/Silent)
   - Message generation
   - Batch processing

5. **Orchestrator Routes** (`backend/src/routes/orchestrator.js`)
   - POST /api/orchestrator/run
   - POST /api/orchestrator/batch

6. **Server Registration** (`backend/src/server.js`)
   - Routes registered
   - Ready for deployment

---

## 🚀 NEXT STEPS (Implementation)

### Phase 1: Backend Refinement (1-2 days)
**Priority: HIGH** - Foundation must be solid

#### 1.1: Fix Confounding Factor Logic
```javascript
// File: backend/src/services/correlationEngineService.js
// Location: Add classifyConfoundingFactors() function

Task:
- Implement 3-type classification (CONFOUNDER, AMPLIFIER, MEDIATOR)
- Create penalties object with multiplicative factors (0.70, 0.85, etc.)
- Add to scoreCorrelation() logic
- Test: Verify penalties apply correctly

Expected Time: 2-3 hours
```

#### 1.2: Fix Consistency Bonus Formula
```javascript
// File: Same as above
// Formula: confidence = base * (1 + bonus) NOT base * bonus

Task:
- Update calculateConfidence() function
- Change: confidence *= consistency_bonus
- To: confidence *= (1 + consistency_bonus)
- Test: Unit test the formula with known values

Expected Time: 1 hour
```

#### 1.3: Create Recommendation Object Schema
```javascript
// File: backend/src/services/recommendationOrchestratorService.js
// Add new function: generateRecommendationObject()

Task:
- Create Recommendation interface/type
- Transform Correlation → Recommendation in orchestrator
- Include: headline, subtitle, actions, visual, confidence, decision
- Add baseCorrelationId for traceability
- Ensure no technical language in user-facing fields

Expected Time: 3-4 hours
```

#### 1.4: Database Migrations
```bash
Task:
- Run migration to create user_correlations table
- Run migration to create correlation_evidence table
- Verify indexes created
- Backup production database before running

Expected Time: 1-2 hours
```

#### 1.5: Unit Testing
```javascript
Task:
- Test signal extraction (food, mood, water → signals)
- Test correlation rules (5 major rules)
- Test scoring (strength, confidence, impact)
- Test confounding factor classification
- Test consistency bonus formula
- Test orchestrator decision logic

Files to create:
- backend/src/services/__tests__/correlationEngine.test.js
- backend/src/services/__tests__/orchestrator.test.js

Expected Time: 4-6 hours
```

---

### Phase 2: Frontend Components (3-5 days)
**Priority: HIGH** - User-facing experience

#### 2.1: Premium Color System & Theme
```javascript
// File: mobile/constants/premiumDesignSystem.js (already exists)
// File: mobile/constants/luxuryTheme.js (NEW)

Task:
- Define luxury color palette (emerald brand, WCAG AAA contrast)
- Define shadow system (glass-morphism effects)
- Define typography (hierarchy, letter-spacing)
- Create theme provider
- Test contrast ratios with accessibility tools

Expected Time: 2-3 hours
```

#### 2.2: Visual Components
```javascript
// Location: mobile/components/insights/

Components to build:
1. PatternGauge.jsx
   - Half-circle gauge (0-180°)
   - Confidence-based coloring
   - Smooth needle animation

2. ProgressBar.jsx
   - Linear progress with label
   - Segmented variant
   - Checkpoint markers

3. Sparkline.jsx
   - Minimal line chart (7/14/30 days)
   - No axis labels
   - Hover tooltips

4. ActionItem.jsx
   - Icon + text + description
   - Navigation on tap
   - Premium styling

Expected Time: 4-6 hours total
```

#### 2.3: DailyIntelligenceCard
```javascript
// File: mobile/components/insights/DailyIntelligenceCard.jsx

Task:
- Accept Recommendation object (not Correlation)
- Layout: header (icon + headline) → subtitle → visual → actions → confidence
- Style with luxury card design (glass-morphism, shadow)
- Show loading/empty states
- Lifecycle-aware color tinting

Expected Time: 3-4 hours
```

#### 2.4: CorrelationCard & DetailSheet
```javascript
// Files:
// - mobile/components/insights/CorrelationCard.jsx (compact)
// - mobile/components/insights/CorrelationDetailSheet.jsx (expanded)

Task:
- Compact card: pattern icon, headline, confidence gauge, expand button
- Detail sheet (bottom sheet modal):
  - WHAT'S HAPPENING
  - WHY THIS HAPPENS
  - WHEN WE SEE IT
  - HOW IT AFFECTS HEALTH
  - WHAT'S RECOMMENDED
  - Evidence timeline
  - Dismiss/Keep watching buttons

Expected Time: 4-5 hours
```

#### 2.5: LifecycleStageIndicator
```javascript
// File: mobile/components/insights/LifecycleStageIndicator.jsx

Task:
- Show current stage with color coding
- Show next milestone
- Progress bar to next stage
- Subtle footer placement (no interruption)

Expected Time: 2-3 hours
```

#### 2.6: Dashboard Integration
```javascript
// File: mobile/components/DashboardContent.jsx

Task:
- Fetch orchestration result: POST /api/orchestrator/run
- Display DailyIntelligenceCard with message
- Display CorrelationCards with top N correlations
- Display LifecycleStageIndicator
- Handle loading/error states
- Refresh daily (not on every mount)

Expected Time: 3-4 hours
```

---

### Phase 3: Integration & Testing (2-3 days)
**Priority: HIGH**

#### 3.1: API Integration Testing
```javascript
Task:
- Mock orchestrator responses
- Test all API endpoints
- Verify data types match expectations
- Test error handling (no data, user not found, etc.)

Expected Time: 2-3 hours
```

#### 3.2: Visual Testing
```javascript
Task:
- Test on iOS (iPhone 12, 14, 15)
- Test on Android (pixel 6, 7)
- Verify color contrast (WCAG AAA)
- Test animations and transitions
- Test dark mode (if enabled)

Expected Time: 2-3 hours
```

#### 3.3: Component Testing
```javascript
Task:
- Unit tests for all React components
- Snapshot tests (visual regression)
- Interaction tests (expand, tap, scroll)
- Accessibility tests (screen reader, keyboard nav)

Files to create:
- mobile/components/insights/__tests__/

Expected Time: 3-4 hours
```

#### 3.4: End-to-End Testing
```javascript
Task:
- Test full flow: log food → compute correlations → show recommendation
- Test with different user lifecycle stages
- Test decision types (SPEAK, REINFORCE, PREDICT, SILENT)
- Verify UI matches design specs

Expected Time: 2-3 hours
```

---

### Phase 4: Cron Job & Deployment (1-2 days)
**Priority: MEDIUM** - Not critical for MVP

#### 4.1: Daily Orchestration Cron
```javascript
// File: backend/src/jobs/dailyOrchestration.js (NEW)

Task:
- Create cron job that runs once per day
- Process all users in batches (100 at a time)
- Error handling & retry logic
- Logging for debugging
- Scheduled for low-traffic hours (2am UTC)

Expected Time: 2-3 hours
```

#### 4.2: Push Notifications (Optional)
```javascript
Task:
- When orchestration generates SPEAK recommendation
- Send push notification with headline
- Tap → Navigate to dashboard
- Respect user notification preferences

Expected Time: 3-4 hours
```

#### 4.3: Deployment
```bash
Task:
- Deploy backend to Render
- Run database migrations
- Verify all endpoints working
- Monitor error rates

Expected Time: 1-2 hours
```

---

### Phase 5: Polish & Launch (1-2 days)
**Priority: LOW** - Refinement

#### 5.1: Animations & Micro-interactions
```javascript
Task:
- Add fade-in animations for cards
- Add scroll reveal for bottom sheet
- Add haptic feedback (iOS Haptics)
- Smooth gauge needle animation
- Button press feedback

Expected Time: 2-3 hours
```

#### 5.2: Error States & Fallbacks
```javascript
Task:
- Empty state: "Keep logging to discover patterns"
- Loading state: Skeleton cards
- Error state: "Something went wrong"
- No internet: Offline fallback
- Permission errors: Clear messaging

Expected Time: 2-3 hours
```

#### 5.3: A/B Testing Setup (Optional)
```javascript
Task:
- Feature flag for new insights section
- Measure: engagement, time spent, taps
- Compare: old dashboard vs new intelligence
- Gradually rollout to 100% of users

Expected Time: 2-3 hours
```

---

## 📊 TIMELINE SUMMARY

```
Phase 1: Backend Refinement     2-3 days
Phase 2: Frontend Components    3-5 days
Phase 3: Integration & Testing  2-3 days
Phase 4: Cron & Deployment      1-2 days
Phase 5: Polish & Launch        1-2 days
                                ─────────
TOTAL (Critical Path):          9-15 days

Phase 4-5 can be deferred for MVP.
With just phases 1-3: 7-11 days
```

---

## 🎯 MVP DEFINITION

**Minimum Viable Product** (for launch):
- ✅ Correlation engine computing patterns
- ✅ Daily orchestration deciding what to show
- ✅ Beautiful UI showing recommendations (no raw data)
- ✅ Lifecycle-aware messaging
- ✅ Premium design system

**Nice-to-Have** (after MVP):
- Cron job automation (currently manual POST endpoint)
- Push notifications
- Email digests
- A/B testing

---

## 🧪 TESTING CHECKLIST

### Backend
- [ ] Correlation computation produces expected correlations
- [ ] Scoring formula (confidence) ranges 0-1 correctly
- [ ] Confounding factors reduce confidence appropriately
- [ ] Orchestrator generates correct decision types
- [ ] Message generation produces layman-friendly text
- [ ] Batch processing handles errors gracefully
- [ ] Database queries are performant (test with 1M+ correlations)

### Frontend
- [ ] Recommendation object renders correctly
- [ ] All UI components match design specs
- [ ] Color contrast meets WCAG AAA
- [ ] Responsive on mobile devices
- [ ] Actions navigate correctly
- [ ] Lifecycle stage colors apply
- [ ] Empty/loading/error states display
- [ ] No raw data shown to user
- [ ] Only correlations shown on dashboard (no duplication)

### Integration
- [ ] API /orchestrator/run returns correct structure
- [ ] Frontend receives data without errors
- [ ] All 4 decision types tested
- [ ] All 7 lifecycle stages tested
- [ ] End-to-end: log food → correlation detected → recommendation shown

### User Testing
- [ ] DISCOVERER users: Understand what to do
- [ ] BUILDER users: Feel encouraged to continue
- [ ] TRACKER users: Patterns make sense
- [ ] OPTIMIZER+ users: Predictions feel relevant
- [ ] No user sees raw technical data
- [ ] Language is accessible (no jargon)

---

## 📚 FILE STRUCTURE

### Backend Files (Created/Modified)
```
backend/src/
├── db/
│   └── schema.js (MODIFIED: added 2 tables)
├── services/
│   ├── correlationEngineService.js (NEW)
│   └── recommendationOrchestratorService.js (NEW)
├── routes/
│   ├── correlations.js (NEW)
│   ├── orchestrator.js (NEW)
│   └── (other existing routes)
├── jobs/
│   └── dailyOrchestration.js (TODO: create for cron)
└── server.js (MODIFIED: added route registrations)
```

### Frontend Files (To Create)
```
mobile/components/insights/
├── DailyIntelligenceCard.jsx (NEW)
├── CorrelationCard.jsx (NEW)
├── CorrelationDetailSheet.jsx (NEW)
├── PatternGauge.jsx (NEW)
├── ProgressBar.jsx (NEW)
├── Sparkline.jsx (NEW)
├── ActionItem.jsx (NEW)
├── LifecycleStageIndicator.jsx (NEW)
└── __tests__/ (NEW)
    └── [component tests]

mobile/constants/
├── luxuryTheme.js (NEW: premium design tokens)
└── [existing tokens]

mobile/components/
└── DashboardContent.jsx (MODIFIED: integrate new components)
```

---

## 🔐 DATABASE MIGRATIONS

```sql
-- Migration 1: Create correlations table
CREATE TABLE user_correlations (
  [columns defined in schema.js]
);

-- Migration 2: Create evidence table
CREATE TABLE correlation_evidence (
  [columns defined in schema.js]
);
```

---

## 🚨 CRITICAL REMINDERS

1. **Correlations ≠ Recommendations**
   - Don't render user_correlations directly
   - Transform to Recommendation object for UI
   - Add baseCorrelationId for traceability

2. **Confounding Factors**
   - Three types: CONFOUNDER, AMPLIFIER, MEDIATOR
   - Apply as multiplicative penalties, not additive
   - Example: 0.70 penalty = 30% confidence reduction

3. **Consistency Bonus**
   - Formula: `confidence *= (1 + bonus)`, NOT `confidence *= bonus`
   - Bonus adds to multiplier, doesn't replace it

4. **No Raw Data to User**
   - No "0.78 confidence", show "Pattern strength: 78%"
   - No "5 occurrences", show "Seen 5 times this week"
   - No "signal_a", show "After high-sugar meals"

5. **Premium Design**
   - Use WCAG AAA contrast (not just AA)
   - Emerald brand color (#10B981)
   - Glass-morphism cards (backdrop blur)
   - Luxury shadows and spacing

6. **Lifecycle Awareness**
   - DISCOVERER: Celebrate only, no patterns
   - BUILDER: Simple patterns with "early signal" label
   - TRACKER: Patterns with evidence count
   - OPTIMIZER+: Sophisticated language

---

## 📞 QUESTIONS FOR TEAM

1. **Database**: Should we archive old correlations after 6 months?
2. **Performance**: Any users with 1000+ days of logs? Need pagination?
3. **Notifications**: Push notification approval? Email approval?
4. **Privacy**: User consent for pattern analysis in legal?
5. **Analytics**: Track which recommendations users find helpful?

---

**Status**: System design complete, ready for implementation.
**Owner**: Development team can now proceed with phases 1-5.
**Duration**: 9-15 days (critical path), 7-11 days (MVP only).
