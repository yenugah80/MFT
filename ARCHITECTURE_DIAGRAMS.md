# Architecture & Flow Diagrams

## 1. Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MYFOODTRACKER APP STACK                     │
└─────────────────────────────────────────────────────────────────┘

                    ┌────────────────────────────┐
                    │   MOBILE APP (Expo/RN)    │
                    │  iOS & Android             │
                    └────────────┬───────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
          ┌─────▼─────┐    ┌─────▼─────┐   ┌────▼──────┐
          │  Profile  │    │   Food    │   │  Water    │
          │  Screen   │    │   Log     │   │  Tracker  │
          └─────┬─────┘    └─────┬─────┘   └────┬──────┘
                │                │                │
                │ HTTP(S)        │ HTTP(S)       │ HTTP(S)
                │                │                │
          ┌─────▼──────────────────────────────────────┐
          │         BACKEND API (Express.js)           │
          │         Cloudflare Worker / Render         │
          │                                            │
          │  ├─ GET /api/profile/{userId}             │
          │  ├─ POST /api/profile/{userId}/basics     │
          │  ├─ POST /api/profile/{userId}/dietary    │
          │  ├─ POST /api/profile/{userId}/goals      │
          │  ├─ POST /api/profile/{userId}/gamif.     │
          │  ├─ POST /api/favorites                   │
          │  ├─ POST /api/food-log                    │
          │  └─ POST /api/water-log                   │
          └─────┬──────────────────────────────────────┘
                │
                │ Drizzle ORM
                │
          ┌─────▼────────────────────────────┐
          │   PostgreSQL Database             │
          │   (AWS RDS / Neon)               │
          │                                  │
          │  ├─ profiles                    │
          │  ├─ dietary_preferences         │
          │  ├─ nutrition_goals             │
          │  ├─ gamification                │
          │  ├─ food_log                    │
          │  ├─ daily_nutrition_summary     │
          │  ├─ water_log                   │
          │  ├─ weight_history              │
          │  ├─ achievements                │
          │  ├─ user_achievements           │
          │  └─ user_notifications          │
          └────────────────────────────────┘

                    ┌──────────────────────┐
                    │   EXTERNAL APIs     │
                    │                      │
                    │ ├─ Clerk Auth       │
                    │ ├─ Spoonacular      │
                    │ ├─ OpenFoodFacts    │
                    │ ├─ USDA Database    │
                    │ └─ OpenAI           │
                    └──────────────────────┘
```

---

## 2. Profile Data Flow

```
                       USER INTERACTION
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                            │
        ▼                                            ▼
   [EDIT MODE]                               [VIEW MODE]
        │                                            │
        │ Edit fields                                │
        │ (savedProfile → draft)                     │
        │                                            Display
        │                                       saved data
   [SAVE BUTTON]                           (read-only)
        │
        ├─ Validation
        │  └─ Check required fields
        │
        ├─ API CALL
        │  └─ POST /api/profile/{userId}/dietary
        │
        ├─ BACKEND PROCESSING
        │  ├─ Validate input
        │  ├─ Parse/format data
        │  ├─ Check user exists
        │  └─ Update/Insert database
        │
        ├─ DATABASE UPDATE
        │  └─ UPDATE dietary_preferences
        │      SET preferences = [...]
        │      WHERE user_id = 'clerk_123'
        │
        ├─ RESPONSE
        │  └─ Return updated data
        │
        ├─ LOCAL STATE UPDATE
        │  ├─ setSavedProfile(newData)
        │  ├─ setEditing({ dietary: false })
        │  └─ setDraft(clone(newData))
        │
        └─ UI UPDATE
           ├─ Show success alert
           ├─ Disable edit mode
           ├─ Display updated values
           └─ Data now persists!
```

---

## 3. User Authentication & Profile Creation

```
┌──────────────────────────────────────────────────────────────┐
│                    NEW USER JOURNEY                          │
└──────────────────────────────────────────────────────────────┘

App Launch
    │
    ├─ Check Session
    │  └─ Clerk Auth State?
    │
    ├─ NO SESSION
    │  │
    │  └─► Clerk Sign In Screen
    │      │
    │      └─► User Authenticates
    │          ├─ Email/Password
    │          ├─ Google/Apple
    │          └─ Magic Link
    │
    ├─ SESSION EXISTS
    │  │
    │  ├─► GET /api/profile/{userId}
    │  │
    │  ├─ Profile Found?
    │  │
    │  ├─ YES
    │  │  └─► Load Dashboard with saved data
    │  │
    │  └─ NO
    │     └─► Start Onboarding
    │         │
    │         ├─ SCREEN 1: Personal Info
    │         │  ├─ Name, Email (from Clerk)
    │         │  ├─ Age, Gender
    │         │  ├─ Weight, Height
    │         │  ├─ Activity Level
    │         │  └─ POST /api/profile/{userId}/basics
    │         │     └─ INSERT INTO profiles
    │         │
    │         ├─ SCREEN 2: Dietary Preferences
    │         │  ├─ Select diet presets
    │         │  ├─ Add allergies
    │         │  ├─ Mark dislikes
    │         │  └─ POST /api/profile/{userId}/dietary
    │         │     └─ INSERT INTO dietary_preferences
    │         │
    │         ├─ SCREEN 3: Nutrition Goals
    │         │  ├─ Primary goal
    │         │  ├─ Daily calories
    │         │  ├─ Macro targets
    │         │  ├─ Water intake
    │         │  └─ POST /api/profile/{userId}/goals
    │         │     └─ INSERT INTO nutrition_goals
    │         │
    │         └─ SCREEN 4: Initialize Gamification
    │            ├─ XP: 0
    │            ├─ Level: 1
    │            ├─ Streak: 0
    │            ├─ Badges: []
    │            └─ POST /api/profile/{userId}/gamification
    │               └─ INSERT INTO gamification
    │
    └─► Dashboard Ready
        └─ User can start logging meals & water
```

---

## 4. Food Logging & Achievement Flow

```
USER SCANS FOOD
    │
    ▼
┌─────────────────────────────────────────┐
│ FOOD RECOGNITION SYSTEM                 │
│ (Spoonacular / OpenFoodFacts / USDA)    │
│                                         │
│ Input: Image or Barcode                 │
│ Output: {                               │
│   name, calories, protein,              │
│   carbs, fats, servingSize              │
│ }                                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ USER CONFIRMATION                       │
│                                         │
│ Display nutrition info                  │
│ Allow edit servings                     │
│ Select meal type (breakfast/lunch...)   │
└────────────┬────────────────────────────┘
             │
             ▼
POST /api/food-log
{
  userId, foodName, calories, protein,
  carbs, fats, servingSize, mealType
}
             │
             ▼
┌─────────────────────────────────────────┐
│ DATABASE WRITES                         │
│                                         │
│ 1. INSERT food_log
│    └─ New meal entry stored
│                                         │
│ 2. UPDATE daily_nutrition_summary
│    ├─ Recalculate daily totals
│    └─ totalCalories += 350
│                                         │
│ 3. SELECT nutrition_goals
│    └─ Get user's daily targets
│                                         │
│ 4. UPDATE gamification
│    ├─ xp += 50 (base)
│    ├─ IF dailyGoalMet: xp += 100
│    ├─ Recalculate level
│    └─ IF xp >= nextThreshold: level++
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ ACHIEVEMENT CHECK                       │
│                                         │
│ Check against achievement conditions:  │
│ ├─ macroGoalMet_3days?
│ ├─ streak_5days?
│ ├─ water_2L_5days?
│ ├─ calorieLogged_100times?
│ └─ ... more conditions
│                                         │
│ If achievement earned:                 │
│ ├─ INSERT user_achievements
│ ├─ INSERT user_notifications
│ ├─ UPDATE gamification.badges[]
│ └─ Trigger UI notification
└────────────┬────────────────────────────┘
             │
             ▼
SEND RESPONSE TO FRONTEND
{
  success: true,
  xpGained: 50,
  newLevel: 4,
  achievementUnlocked: {
    name: "Macro Master",
    description: "Hit all macros 3+ days"
  }
}
             │
             ▼
┌─────────────────────────────────────────┐
│ UI UPDATES (FRONTEND)                   │
│                                         │
│ ├─ Dismiss loading spinner
│ ├─ Update progress bars (animated)
│ ├─ Show +XP toast notification
│ ├─ IF badge: Show achievement popup
│ ├─ Refresh daily totals
│ └─ Return to dashboard
└─────────────────────────────────────────┘
```

---

## 5. Profile Edit & Save Cycle

```
USER TAPS [EDIT] BUTTON
    │
    ├─ setEditing.dietary = true
    │
    ▼
┌──────────────────────────────┐
│  EDIT MODE ENABLED           │
│                              │
│  Preset buttons interactive  │
│  Input fields editable       │
│  [Cancel] [Save] visible     │
└─────────┬────────────────────┘
          │
     USER INTERACTS
          │
    ┌─────┴──────┬─────────┬─────────┐
    │            │         │         │
    ▼            ▼         ▼         ▼
  TOGGLE      ADD NEW    REMOVE    ENTER TEXT
  PRESET      CUSTOM     TAG        INPUT
    │            │         │         │
    └─────────────┼─────────┴─────────┘
                  │
          setDraft.dietary updated
          (client-side only)
                  │
    ┌─────────────┴──────────────────┐
    │                                │
    ▼                                ▼
USER TAPS [SAVE]            USER TAPS [CANCEL]
    │                               │
    ├─ Validation Check            ├─ setDraft = clone(savedProfile)
    │                              ├─ setEditing.dietary = false
    ▼                              │
POST /api/profile                  ▼
/{userId}/dietary              Discard Changes
    │                        No DB update
    │
    ├─ Backend validates
    │
    ├─ UPDATE dietary_preferences
    │  SET preferences = [...]
    │  WHERE user_id = ...
    │
    ├─ RETURN updated data
    │
    ▼
UPDATE CLIENT STATE
    │
    ├─ setSavedProfile.dietary = response
    ├─ setDraft = clone(savedProfile)
    ├─ setEditing.dietary = false
    │
    ▼
SHOW SUCCESS
    │
    ├─ Alert: "Dietary preferences updated"
    ├─ Display saved values
    └─ Exit edit mode
```

---

## 6. Real-time Metrics Calculation

```
USER ENTERS: Age, Weight (kg), Height (cm), Gender, Activity Level
    │
    ├─ useMemo watches these values
    │
    ▼
┌──────────────────────────────────────────┐
│  BMI CALCULATION                         │
│  = weight (kg) / (height (m) ^ 2)        │
│  = 70 / (1.75 ^ 2)                       │
│  = 70 / 3.0625                           │
│  = 22.9 (Normal weight)                  │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│  BMR CALCULATION                         │
│  Female: 10*W + 6.25*H - 5*A - 161       │
│  Male:   10*W + 6.25*H - 5*A + 5         │
│                                          │
│  = 10*70 + 6.25*175 - 5*28 - 161         │
│  = 700 + 1093.75 - 140 - 161             │
│  = 1492.75 ≈ 1493 kcal/day               │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│  TDEE CALCULATION                        │
│  = BMR × Activity Factor                 │
│  = 1493 × 1.55 (moderate)                │
│  = 2314 kcal/day                         │
└──────────────────────────────────────────┘
    │
    ▼
DISPLAY IN UI (Real-time)
    │
    ├─ BMI: 22.9 (Normal) ✓
    ├─ BMR: 1493 kcal
    └─ TDEE: 2314 kcal
       (User can use this for calorie goal)
```

---

## 7. Database Table Relationships

```
                            ┌─────────────────┐
                            │  USER (Clerk)   │
                            │   external      │
                            └────────┬────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  profiles    │  │dietary_prefs │  │nutrition_goals
            ├──────────────┤  ├──────────────┤  ├──────────────┤
            │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
            │ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │
            │ fullName     │  │ preferences[]│  │ primaryGoal  │
            │ age          │  │ allergies[]  │  │ dailyCalories
            │ weightKg     │  │ dislikes[]   │  │ proteinG     │
            │ heightCm     │  │ updatedAt    │  │ carbsG       │
            │ activityLevel│  └──────────────┘  │ fatsG        │
            └──────────────┘                     │ waterLiters  │
                                                 └──────────────┘
                     │
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌────────────┐        ┌──────────────────┐
    │gamification│        │daily_nutrition_summary
    ├────────────┤        ├──────────────────┤
    │ user_id    │        │ user_id          │
    │ xp         │        │ date             │
    │ level      │        │ totalCalories    │
    │ streak     │        │ totalProtein     │
    │ badges[]   │        │ totalCarbs       │
    └────────────┘        │ totalFats        │
        │                 └──────────────────┘
        │                         ▲
        │                         │
        │                    ┌────┴──────┐
        │                    │           │
        │                    ▼           ▼
        │              ┌─────────┐  ┌───────────┐
        │              │food_log │  │water_log  │
        │              ├─────────┤  ├───────────┤
        │              │user_id  │  │user_id    │
        │              │foodName │  │amountL    │
        │              │calories │  │loggedDate │
        │              │macros   │  └───────────┘
        │              │mealType │
        │              └─────────┘
        │
        └─ Triggers achievement checks
               │
               ▼
        ┌─────────────────┐      ┌───────────────────┐
        │achievements     │      │user_achievements  │
        ├─────────────────┤      ├───────────────────┤
        │ id (PK)         │  ◄───│ id (PK)           │
        │ name            │      │ user_id (FK)      │
        │ description     │      │ achievement_id(FK)│
        │ requiredPoints  │      │ unlockedAt        │
        │ category        │      └───────────────────┘
        └─────────────────┘
               ▲
               │
        ┌──────┴─────────────────────┐
        │                            │
        ▼                            ▼
┌──────────────────┐         ┌────────────────────┐
│weight_history    │         │user_notifications │
├──────────────────┤         ├────────────────────┤
│ user_id          │         │ user_id            │
│ weightKg         │         │ type (achievement) │
│ recordedDate     │         │ title              │
└──────────────────┘         │ message            │
                             │ read               │
                             └────────────────────┘
```

---

## 8. State Management Flow

```
┌─────────────────────────────────┐
│  COMPONENT STATE (React)        │
└─────────────────────────────────┘
           │
    ┌──────┴───────┐
    │              │
    ▼              ▼
savedProfile   draft
(DB Source)    (User Edits)
    │              │
    │              │ User modifies
    │              │ UI inputs
    │              │
    │          ┌───▼────┐
    │          │ Values │
    │          │Changed │
    │          └───┬────┘
    │              │
    │         ┌────▼─────────┐
    │         │   [CANCEL]   │
    │         │              │
    │         ├─ Revert draft├─►  draft = clone(savedProfile)
    │         │              │
    │         │   [SAVE]     │
    │         │              │
    │         └────┬─────────┘
    │              │
    │              ├─ Validate
    │              ├─ API Call
    │              ├─ Update DB
    │              │
    │         ┌────▼──────┐
    │         │ Response  │
    │         │  Success? │
    │         └────┬───┬──┘
    │              │   │
    │            YES  NO
    │              │   │
    │         ┌────▼┐  │
    │         │ OK  │  ▼
    │         │     │Error Alert
    │         └────┬┘
    │              │
    └──────────────┼─────────────────┐
                   │                 │
                   ▼                 ▼
         savedProfile = draft   draft stays same
         setEditing = false     editing mode stays
         Show success           Can retry/cancel
```

---

## 9. API Request/Response Pattern

```
FRONTEND REQUEST
────────────────────────────────────
POST /api/profile/{userId}/dietary
Content-Type: application/json

{
  "preferences": ["Vegan", "Keto"],
  "allergies": ["Peanuts"],
  "dislikes": ["Broccoli"]
}

────────────────────────────────────
         BACKEND PROCESSING
────────────────────────────────────

1. Parse request body
2. Validate userId is Clerk user
3. Check if record exists
4. UPDATE or INSERT
5. Parse JSON arrays
6. Return updated record

────────────────────────────────────
BACKEND RESPONSE
────────────────────────────────────

{
  "id": 42,
  "userId": "user_abc123",
  "preferences": ["Vegan", "Keto"],
  "allergies": ["Peanuts"],
  "dislikes": ["Broccoli"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-12-06T15:30:00Z"
}

────────────────────────────────────
         FRONTEND UPDATE
────────────────────────────────────

1. Parse response
2. Update local state
3. Show success message
4. Disable edit mode
5. Refresh UI
```

---

This comprehensive architecture shows how all components work together in your MyFoodTracker app!
