# Integrated Learning System
## Learning Model + User Profile + Historical Data + Complete Architecture

---

## 🎯 THE UNIFIED APPROACH

**Not**: Learning model as isolated service
**But**: Learning model deeply integrated with user's complete context

```
User Creates Account
        ↓
Profile Data Captured
├─ Age, gender, activity level
├─ Cuisine preferences
├─ Region, dietary restrictions
├─ Allergies, dislikes
├─ Goals (lose/maintain/gain)
└─ Cost sensitivity
        ↓
Learning State Initialized (NOT from zero)
├─ Load profile constraints into knowledge base
├─ Initialize food preferences from dietary profile
├─ Set expected learning stage based on profile
└─ Prime with common foods in user's region/cuisine
        ↓
User Logs Historical Data
├─ Import past meals (if available)
├─ Analyze past logs for patterns
├─ Bootstrap learning state from history
└─ Estimate learning stage from log count
        ↓
System Starts Learning (actively)
├─ Each new log updates learning
├─ Feedback refines preferences
├─ Contradictions resolved with user input
└─ System evolves with user
```

---

## 📊 LEARNING STATE: PROFILE-AWARE INITIALIZATION

### From User's Profile to Learning State

```javascript
export async function initializeLearningStateFromProfile(userId) {
  // 1. Get user profile
  const profile = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId))
    .limit(1);

  const dietary = await db
    .select()
    .from(dietaryPreferencesTable)
    .where(eq(dietaryPreferencesTable.userId, userId))
    .limit(1);

  const goals = await db
    .select()
    .from(nutritionGoalsTable)
    .where(eq(nutritionGoalsTable.userId, userId))
    .limit(1);

  // 2. Initialize knowledge base from profile
  const knowledgeBase = {
    // From profile
    age: profile.age,
    gender: profile.gender,
    activityLevel: profile.activityLevel,  // sedentary, light, moderate, active, athlete
    region: profile.region,  // India, USA, UK, etc.
    cuisinePreferences: profile.cuisinePreference,  // ["South Indian", "Punjabi"]
    cookingStyle: profile.cookingStyle,  // home-style, restaurant

    // From dietary preferences
    dietaryRestrictions: dietary.preferences,  // ["Vegan", "Gluten-free"]
    allergies: dietary.allergies,  // ["Peanuts", "Shellfish"]
    dislikes: dietary.dislikes,  // ["Bitter greens", "Mushrooms"]

    // From goals
    primaryGoal: goals.primaryGoal,  // lose, maintain, gain
    targetCalories: goals.dailyCalories,
    targetMacros: {
      protein: goals.proteinG,
      carbs: goals.carbsG,
      fats: goals.fatsG,
    },

    // Food preferences (initially from profile, will be refined)
    food_preferences: initializeFromCuisineProfile(profile),
    // {
    //   paneer: 0.7 (south indian, likely high protein),
    //   tofu: 0.3 (vegan preference if applicable, not regional),
    //   chickpeas: 0.8 (vegetarian, common),
    //   chicken: 0.0 (if vegetarian),
    // }

    // Cuisine preferences (from profile)
    cuisine_preferences: {
      [profile.region]: 0.9,  // Home region preferred
      ...initializeOtherCuisines(profile.region),
    },

    // Effort tolerance (from activity level and age)
    effort_tolerance: initializeEffortTolerance(profile.activityLevel, profile.age),
    // {
    //   quick: 0.8 (if active, likely busy),
    //   moderate: 0.7,
    //   involved: 0.4,
    // }

    // Cost sensitivity (inferred from region/context)
    cost_sensitivity: inferCostSensitivity(profile),
    // 0.3 = willing to pay premium
    // 0.6 = moderate, budget-conscious
    // 0.9 = very cost-sensitive

    // Time availability (from activity level)
    time_available: inferTimeAvailability(profile.activityLevel),
    // "minimal" (athlete, busy),
    // "moderate",
    // "plenty" (sedentary)

    // Preparation constraints
    hasKitchen: true,  // Assume yes, can be updated
    canCook: true,     // Default, refine by user
  };

  return knowledgeBase;
}

function initializeFromCuisineProfile(profile) {
  const regionalFoods = getRegionalFoods(profile.region, profile.cuisinePreference);
  // South India: paneer, dosa, sambar, dal, rice, etc.
  // North India: tandoori, naan, paneer, dal, etc.
  // USA: chicken, salad, pasta, burger, etc.

  const preferences = {};

  for (const food of regionalFoods) {
    const likelihood = getRegionalFoodLikelihood(food, profile.region);
    // Common regional foods: 0.7-0.8
    // Less common but available: 0.4-0.5
    // Rarely eaten: 0.1-0.2

    const matchesDiet = !profile.dietaryRestrictions.some(
      d => conflictsWith(food, d)
    );

    const isAllergenic = profile.allergies.some(a => containsAllergen(food, a));

    if (matchesDiet && !isAllergenic) {
      preferences[food] = likelihood;
    } else if (matchesDiet && isAllergenic) {
      preferences[food] = 0.0;  // Never recommend
    }
  }

  return preferences;
}

function initializeEffortTolerance(activityLevel, age) {
  // Active people: prefer quick meals
  // Sedentary: may have time for cooking
  // Age 65+: easier meals preferred

  const baseEffort = {
    sedentary: { quick: 0.4, moderate: 0.7, involved: 0.8 },
    light: { quick: 0.6, moderate: 0.7, involved: 0.5 },
    moderate: { quick: 0.8, moderate: 0.7, involved: 0.4 },
    active: { quick: 0.9, moderate: 0.6, involved: 0.2 },
    athlete: { quick: 0.95, moderate: 0.4, involved: 0.1 },
  };

  let tolerance = baseEffort[activityLevel];

  if (age >= 65) {
    tolerance.quick += 0.1;  // Prefer simpler
    tolerance.involved -= 0.2;
  }

  return tolerance;
}
```

---

## 📈 BOOTSTRAP FROM HISTORICAL LOGS

### If User Has Past Data

```javascript
export async function bootstrapLearningFromHistory(userId) {
  // 1. Fetch all historical food logs
  const foodLogs = await db
    .select()
    .from(foodLogTable)
    .where(eq(foodLogTable.userId, userId));

  if (foodLogs.length === 0) return;  // No history

  // 2. Fetch all recommendations + outcomes
  const recommendations = await db
    .select()
    .from(recommendationsHistoryTable)
    .where(eq(recommendationsHistoryTable.userId, userId));

  // 3. Fetch all user feedback
  const feedback = await db
    .select()
    .from(userCorrelationFeedbackTable)
    .where(eq(userCorrelationFeedbackTable.userId, userId));

  // 4. Analyze food preferences from history
  const foodFrequency = analyzeFoodFrequency(foodLogs);
  // {
  //   paneer: 45 times (most frequent),
  //   rice: 120 times (staple),
  //   tofu: 2 times (rare),
  //   ...
  // }

  const learningState = await getLearningState(userId);

  // 5. Update food preferences based on history
  for (const [food, frequency] of Object.entries(foodFrequency)) {
    if (frequency > 30) {
      // User logs this often
      learningState.knowledgeBase.food_preferences[food] = 0.85;  // High preference
    } else if (frequency > 10) {
      learningState.knowledgeBase.food_preferences[food] = 0.6;   // Moderate
    } else if (frequency > 2) {
      learningState.knowledgeBase.food_preferences[food] = 0.3;   // Low
    } else if (frequency === 1) {
      learningState.knowledgeBase.food_preferences[food] = 0.1;   // Tried once
    }
  }

  // 6. Analyze recommendation acceptance
  const acceptanceRate = recommendations
    .filter(r => r.wasLogged === true).length / recommendations.length;
  learningState.feedbackAccuracy = acceptanceRate;

  // 7. Extract behavioral patterns from feedback
  for (const fb of feedback) {
    if (fb.feedbackType === 'accept') {
      // User confirmed this pattern
      const correlation = await getCorrelation(fb.correlationId);
      learningState.knowledgeBase.behavioral_triggers[correlation.ruleName] = true;
    }
  }

  // 8. Estimate learning stage from history
  learningState.learningStage = estimateLearningStage(
    foodLogs.length,
    feedback.length,
    acceptanceRate
  );
  // 0-20 logs: MINIMAL
  // 20-100: LEARNING
  // 100-300: PROFICIENT
  // 300-600: EXPERT
  // 600+: PLATEAU

  // 9. Save updated state
  await saveLearningState(userId, learningState);

  return learningState;
}

function estimateLearningStage(logCount, feedbackCount, acceptanceRate) {
  // Composite score
  const logScore = Math.min(logCount / 100, 1.0);  // Capped at 100
  const feedbackScore = Math.min(feedbackCount / 30, 1.0);  // Capped at 30
  const acceptanceScore = acceptanceRate;  // 0-1

  const compositeScore = (logScore * 0.5) + (feedbackScore * 0.3) + (acceptanceScore * 0.2);

  if (compositeScore < 0.2) return 'MINIMAL';
  if (compositeScore < 0.4) return 'LEARNING';
  if (compositeScore < 0.6) return 'PROFICIENT';
  if (compositeScore < 0.8) return 'EXPERT';
  return 'PLATEAU';
}
```

---

## 🔗 LEARNING STATE IN COMPLETE SYSTEM FLOW

### Full Integration

```
User Profile (Age, Region, Cuisine, Allergies, Goals)
        ↓
Initialize Learning State
├─ Load profile constraints (allergies → never recommend)
├─ Load cuisine preferences (south indian → higher for local foods)
├─ Load activity level (athlete → prefer quick meals)
└─ Load dietary goals (protein target → track in learning)
        ↓
Bootstrap from History (if exists)
├─ Analyze past 100+ logs → food preferences
├─ Analyze past recommendations → acceptance rate
├─ Analyze feedback → behavioral triggers
└─ Estimate learning stage
        ↓
Daily Event (user logs food/mood/feedback)
        ↓
Update Learning State
├─ Add to evidence
├─ Update confidence
├─ Detect contradictions
├─ Respect profile constraints (allergies never 1.0)
└─ Update learning stage
        ↓
Correlation Engine
├─ Detects patterns using rules
├─ Uses learnt factors (e.g., "this user loves paneer")
└─ Generates correlation
        ↓
Orchestrator
├─ Decides SPEAK/REINFORCE/PREDICT
├─ Checks learning stage (MINIMAL: generic, EXPERT: specific)
└─ Generates message
        ↓
Resolver
├─ Maps intent using knowledge base
├─ Ranks by food preferences (paneer: 0.85 vs tofu: 0.15)
├─ Filters by allergies/diet (never recommend peanuts if allergic)
└─ Returns specific action
        ↓
Intent Override
├─ User gives feedback
├─ Updates learning state
├─ Respects profile constraints (can't override allergy)
└─ Refines preference
        ↓
Expiry Model
├─ Checks if correlation still valid
├─ Uses learning stage (PLATEAU: low priority)
└─ Asks revalidation if needed
        ↓
Frontend
├─ Shows recommendation
├─ Shows learning stage ("Still learning" vs "Expert")
├─ Shows confidence (0.92 for paneer, 0.15 for tofu)
└─ Asks for feedback
```

---

## 👥 LEARNING PERSONALIZED BY USER SEGMENT

### Different Users, Different Learning

#### Segment 1: **New Vegetarian, South India, Age 25**
```
Profile:
- Region: South India
- Dietary: Vegetarian
- Activity: Moderate
- Goal: Maintain
- Allergies: None

Initial Knowledge Base:
├─ food_preferences initialized from South Indian vegetarian foods
│  ├─ paneer: 0.8 (staple)
│  ├─ dal: 0.8 (staple)
│  ├─ dosa: 0.7 (south indian, vegetarian)
│  ├─ idli: 0.7
│  └─ tofu: 0.3 (less common in region)
├─ effort_tolerance: { quick: 0.6, moderate: 0.8, involved: 0.6 }
├─ cuisine_preferences: { south_indian: 0.95, north_indian: 0.4 }
└─ cost_sensitivity: 0.6

Learning Progression:
Day 1-7: MINIMAL
  System: "Let's find what you like"
  Shows: Regional vegetarian options
  Learns: Which specific veggies you prefer

Day 7-30: LEARNING
  System: "You love paneer curries"
  Shows: Paneer-based meals
  Learns: Preferred cooking styles (sambar vs curry)

Day 30-90: PROFICIENT
  System: "Your go-to: paneer + dal + greens"
  Shows: Your learned preferences
  Learns: Meal timing preferences (breakfast vs dinner)

Day 90+: EXPERT
  System: "You consistently choose: home-style south indian"
  Shows: Highly personalized
  Learns: Seasonal variations (prefer lighter in summer)
```

#### Segment 2: **Busy Professional, US-Based, Omnivore, Age 35**
```
Profile:
- Region: USA
- Dietary: Omnivore
- Activity: Active (gym 4x/week)
- Goal: Lose (build muscle)
- Allergies: None

Initial Knowledge Base:
├─ food_preferences initialized from American fitness foods
│  ├─ chicken: 0.85 (lean protein, common)
│  ├─ eggs: 0.8 (quick protein)
│  ├─ salad: 0.7 (healthy perception)
│  ├─ pasta: 0.4 (high carb but tasty)
│  └─ tofu: 0.3 (not typical in US)
├─ effort_tolerance: { quick: 0.95, moderate: 0.5, involved: 0.1 }
├─ cuisine_preferences: { american: 0.9, italian: 0.5, asian: 0.4 }
├─ cost_sensitivity: 0.3 (premium OK)
└─ time_available: minimal

Learning Progression:
Day 1-7: MINIMAL
  System: "Quick high-protein meals"
  Shows: 5min meal preps
  Learns: Your macro targets (protein 150g+)

Day 7-30: LEARNING
  System: "You prefer grilled chicken"
  Shows: Quick protein options
  Learns: Post-workout timing (within 30min)

Day 30-90: PROFICIENT
  System: "Your go-to: grilled chicken + broccoli"
  Shows: Your meal pattern
  Learns: Price doesn't matter (buys premium)

Day 90+: EXPERT
  System: "You maximize protein with minimal time"
  Shows: Macro-optimized meals
  Learns: Weekend cheat pattern (pizza)
```

---

## 🎓 LEARNING RULES BY USER TYPE

### Rule: Don't Learn Contradictions to Profile

```javascript
export function shouldUpdatePreference(food, feedback, userProfile) {
  // Never let learning override hard constraints

  // Hard constraint 1: Allergies
  if (userProfile.allergies.includes(food)) {
    return false;  // Can't learn to like peanuts if allergic
  }

  // Hard constraint 2: Dietary restrictions
  if (userProfile.dietaryRestrictions.includes('Vegan') &&
      isAnimalProduct(food)) {
    return false;  // Can't learn to like chicken if vegan
  }

  // Hard constraint 3: Goals (don't learn away from goals)
  if (userProfile.primaryGoal === 'lose' &&
      food.calories > 500 &&
      feedback === 'accept') {
    // Log it, but confidence cap at 0.5 (conflict with goal)
    return true;  // But: knowledge_base[food] = Math.min(0.5, ...);
  }

  // Soft constraint: Religion/culture
  if (userProfile.region === 'India' &&
      userProfile.religion === 'Hindu' &&
      isBeef(food) &&
      feedback === 'accept') {
    // Unusual, ask user to confirm
    return true;  // But: trigger confirmation dialog
  }

  return true;  // Learn this preference
}
```

---

## 💾 LEARNING STATE STORAGE & EFFICIENCY

### Storage Optimization

```javascript
// Don't store 100 individual preferences
// Store aggregates + patterns

user_learning_state {
  userId,

  // Aggregates
  knowledgeBase: {
    food_preferences: { paneer: 0.92, tofu: 0.15, ... },  // Only confident ones
    cuisine_preferences: { south_indian: 0.95, ... },
    effort_tolerance: { quick: 0.85, ... },
    // NOT individual food history
  },

  // Meta
  learningStage: "PROFICIENT",
  overallConfidence: 0.78,
  learningRate: 0.3,

  // Efficient evidence tracking
  evidenceSummary: {
    total_foods_tried: 47,
    total_feedback_points: 23,
    acceptance_rate: 0.78,
    unique_cuisines: 5,
    // NOT individual logs (use learning_evidence table for those)
  },
}
```

---

## 🔄 LIFECYCLE AWARE LEARNING

### Learning Speed by Stage

```javascript
// Learning rate varies by user's lifecycle stage

const LEARNING_RATE_BY_LIFECYCLE = {
  DISCOVERER: 0.9,    // Day 0-1: Learn everything eagerly
  BUILDER: 0.8,       // Day 2-6: Still absorbing
  TRACKER: 0.6,       // Day 7-29: Selective learning
  OPTIMIZER: 0.4,     // Day 30-89: Refining only
  MASTER: 0.2,        // Day 90-179: Very selective
  CHAMPION: 0.1,      // Day 180-364: Almost plateaued
  ELITE: 0.05,        // Day 365+: Minimal change
};

// Higher rate = learns faster, lower rate = more stable
// Master users don't change preferences often
// Builders change quickly (still discovering themselves)
```

---

## 📊 LEARNING STATE DASHBOARD

```
┌─────────────────────────────────────┐
│ 🧠 MY PERSONALIZED PROFILE         │
├─────────────────────────────────────┤
│                                     │
│ Age: 25 | Region: South India      │
│ Goal: Maintain | Activity: Moderate │
│ Dietary: Vegetarian                │
│                                     │
│ Learning Progress                  │
│ Stage: [████████░░] PROFICIENT     │
│ Confidence: 78%                    │
│ Days tracking: 45                  │
│                                     │
│ What I've Learned About You:       │
│ ✓ Love paneer (92%)                │
│ ✓ Prefer home-style south indian   │
│ ✓ Choose quick meals (15min)       │
│ ✓ Skip heavy meals when stressed   │
│ ? Still learning: Sweetness pref   │
│                                     │
│ Your Constraints:                  │
│ 🚫 Allergic: Peanuts               │
│ 🌱 Vegetarian: No meat             │
│ 🎯 Goal: 2000 cal, 60g protein    │
│                                     │
│ Next Milestone:                    │
│ → Expert stage in 45 days          │
│ → 9 more preferences to learn      │
│                                     │
└─────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION APPROACH

### Phase 0: Integration Foundation
```
Week 1:
- [ ] Modify user_learning_state table to include profile fields
- [ ] Create initialization function (profile → knowledge base)
- [ ] Create bootstrap function (history → learning state)
- [ ] Link learning state to user profile at account creation
- [ ] Update correlation engine to respect learning state constraints
```

### Phase 1: Resolver Integration
```
Week 2:
- [ ] Resolver uses knowledge base for ranking
- [ ] Allergies/diet filtering enforced
- [ ] Cost sensitivity applied
- [ ] Effort tolerance applied
- [ ] Recommendation confidence reflects learning
```

### Phase 2: Complete System
```
Week 3:
- [ ] Intent override updates learning (respects constraints)
- [ ] Expiry model uses learning stage
- [ ] Dashboard shows learning progress
- [ ] Lifecycle-aware personalization
- [ ] Segment-specific learning rates
```

---

## 🎯 SUMMARY TABLE

| Layer | Uses Learning State | How |
|-------|-------------------|-----|
| **Profile** | Initialize | Load cuisine, region, allergies, goals |
| **Correlation Engine** | Constraints | Never learn "user likes peanuts" if allergic |
| **Orchestrator** | Stage-based depth | MINIMAL: generic, EXPERT: specific |
| **Resolver** | Ranking | paneer: 0.92 ranked higher than tofu: 0.15 |
| **Intent Override** | Learning update | User feedback updates confidence |
| **Expiry** | Revalidation priority | PLATEAU stage: low priority |
| **Uncertainty States** | Label selection | "Still learning" if MINIMAL/LEARNING stage |
| **Frontend** | Display personalization | Show "your go-to" vs "still learning" |
| **Analytics** | User segmentation | Compare learning across similar users (privacy-safe) |

---

## ✅ BENEFITS OF INTEGRATED APPROACH

1. **No Cold Start**: Initialize from profile + history
2. **Respects Constraints**: Never learn away from allergies/diet
3. **Personalized by Segment**: Vegetarian learns differently than omnivore
4. **Efficient Storage**: Aggregates, not individual history
5. **Complete Context**: Learning aware of lifecycle stage, goals, region
6. **User Centered**: Profile + feedback drives learning
7. **Trustworthy**: Transparent about what system knows and learned
8. **Actionable**: Learning directly used by resolver to recommend

---

**Status**: Complete integrated architecture. Learning model is NOT standalone—it's deeply woven into user profile, historical data, and all system layers.

Ready to implement alongside all other components (Resolver, Intent, Expiry, Uncertainty).
