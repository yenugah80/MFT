# MyFoodTracker User Flow & UX Design Guide

## 1. Authentication Flow

```
User Opens App
    ↓
Has Session? → NO → Clerk Sign In/Sign Up
    ↓ YES
    ↓
Load Clerk User Data
    ├─ Email
    ├─ Full Name
    └─ User ID (used for all database queries)
    ↓
Check if Profile Exists (GET /api/profile/{userId})
    ├─ YES → Load saved preferences → Show Dashboard
    └─ NO → Show Onboarding Flow → Create Profile
```

---

## 2. Onboarding Flow (First Time Users)

### Screen 1: Personal Information
```
┌─────────────────────────────────┐
│  Welcome to MyFoodTracker! 👋   │
│                                 │
│  Let's set up your profile      │
│                                 │
│  Full Name: [____________]      │
│  Email: [______________]        │
│  Age: [___]   Gender: [F/M/O]   │
│  Weight: [___]kg Height: [___]cm│
│  Activity Level: [Select]       │
│                                 │
│  [Continue →]                   │
└─────────────────────────────────┘
```
**Action**: Save to `profiles` table

---

### Screen 2: Dietary Preferences
```
┌─────────────────────────────────┐
│  What's your diet style? 🥗    │
│                                 │
│  [Balanced] [Vegan] [Keto]      │
│  [Vegetarian] [Pescatarian]     │
│  [Paleo] [Low-carb]             │
│  [Gluten-free]                  │
│                                 │
│  Any allergies? ⚠️             │
│  [____________] [Add]           │
│                                 │
│  Foods you dislike? ✕          │
│  [Broccoli] ✕                   │
│                                 │
│  [Continue →]                   │
└─────────────────────────────────┘
```
**Action**: Save to `dietary_preferences` table

---

### Screen 3: Nutrition Goals
```
┌─────────────────────────────────┐
│  What's your goal? 🎯           │
│                                 │
│  [Lose Weight] [Maintain]       │
│  [Gain Muscle]                  │
│                                 │
│  Daily Targets:                 │
│  Calories: [2200] kcal          │
│  Protein: [140]g  Carbs: [230]g │
│  Fats: [70]g      Water: [3]L   │
│                                 │
│  [💡 Auto-calculate] or manual  │
│                                 │
│  [Start Tracking →]             │
└─────────────────────────────────┘
```
**Action**: Save to `nutrition_goals` table, initialize `gamification` row with xp: 0, level: 1

---

## 3. Main Dashboard (Gamified)

```
┌─────────────────────────────────────────────────────┐
│  Your Progress Today                                │
│                                                     │
│  Level 4    🔥 5 Day Streak    ⭐ 1250 XP          │
│  ████████░░ (1250/2000 to Level 5)                 │
│                                                     │
│  Nutrition                      Water                │
│  ├─ Calories: 1840 / 2200 ✓     ├─ 2.0L / 3L 🥗   │
│  ├─ Protein: 120g / 140g ✓      └─ (67%)           │
│  ├─ Carbs: 210g / 230g ✓                           │
│  └─ Fats: 65g / 70g ✓                              │
│                                                     │
│  [📸 Scan Food]  [💧 Log Water]  [🏆 Badges]      │
│                                                     │
│  Recent Achievements:                               │
│  ✓ Consistency Champ    ✓ Hydration Hero           │
│  🎯 Next Badge: Macro Master (1 more day!)         │
│                                                     │
│  [Profile] [Dashboard] [Food Log] [More]           │
└─────────────────────────────────────────────────────┘
```

---

## 4. Food Logging Flow (Gamified)

```
User Taps [📸 Scan Food] or [+ Add Food]
    ↓
┌─────────────────────────────┐
│  Scan Receipt/Photo         │
│  (Using phone camera)       │
│  [📷 Take Photo]            │
│  or [🔍 Manual Search]      │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  Food Recognized!           │
│  "Grilled Chicken Breast"   │
│  ⏳ Fetching nutrition...   │
└──────────┬──────────────────┘
           ↓
┌──────────────────────────────┐
│  Confirm Details             │
│  Food: Grilled Chicken       │
│  Serving: 100g               │
│  ├─ Calories: 350 kcal       │
│  ├─ Protein: 52g ✨          │
│  ├─ Carbs: 0g                │
│  └─ Fats: 15g                │
│                              │
│  Meal Type: [Lunch]          │
│  Time: 12:45 PM              │
│                              │
│  [Cancel]    [Log Meal ✓]   │
└──────────┬──────────────────┘
           ↓
┌──────────────────────────────┐
│  Saving...                   │
│  INSERT INTO food_log        │
│  UPDATE daily_nutrition...   │
└──────────┬──────────────────┘
           ↓
┌──────────────────────────────┐
│  ✅ Meal Logged!             │
│                              │
│  +50 XP 🎮                   │
│  New Totals:                 │
│  • Calories: 1840 / 2200     │
│  • Protein: 172g / 140g ⚡   │
│  • Carbs: 210g / 230g ✓      │
│                              │
│  🎉 Protein Goal Exceeded!   │
│  ⭐ +25 XP BONUS              │
│                              │
│  [Back to Dashboard]         │
└──────────────────────────────┘
```

**Database Actions:**
1. INSERT into `food_log` with userId, foodName, calories, macros, mealType
2. UPDATE/INSERT into `daily_nutrition_summary` for today
3. Calculate XP: base 50 + check for bonuses
4. UPDATE `gamification` table with new XP and level

---

## 5. Water Logging Flow

```
User Taps [💧 Log Water]
    ↓
┌───────────────────────────┐
│  Log Water Intake         │
│                           │
│  How much water?          │
│  [250mL] [500mL] [1L]     │
│  [Custom: ____]           │
│                           │
│  [Log]                    │
└───────┬─────────────────┘
        ↓
INSERT INTO water_log (userId, amountLiters: 0.5)
        ↓
┌───────────────────────────┐
│  💧 Water Logged!         │
│                           │
│  +30 XP 🎮                │
│  Today: 2.5L / 3L ✨      │
│                           │
│  [Log More]  [Dashboard]  │
└───────────────────────────┘
```

---

## 6. Achievement/Badge System

### Achievement Unlock Sequence:

```
User logs 3rd meal with proper macros today
        ↓
Backend checks: isDailyGoalMet() == true
        ↓
Check for achievements:
        ├─ 3-day streak? → Check daily_nutrition_summary
        ├─ 2L water today? → SUM(water_log) today
        ├─ Hit all macros? → Compare with nutrition_goals
        └─ 100+ meals logged? → COUNT food_log entries
        ↓
IF streak >= 5 days:
        ├─ Create notification
        ├─ INSERT INTO user_achievements
        ├─ INSERT INTO user_notifications
        └─ UPDATE gamification.badges = ["Consistency Champ", ...]
        ↓
Display Achievement Toast:
┌──────────────────────────┐
│  🏆 ACHIEVEMENT UNLOCKED! │
│                          │
│  "Consistency Champ"     │
│  5 consecutive days      │
│  of tracking!            │
│                          │
│  +250 XP BONUS           │
└──────────────────────────┘
```

---

## 7. Edit Profile Flow (After Onboarding)

### Editing Dietary Preferences:

```
Dashboard → [Profile Tab] → [Dietary Preferences]
        ↓
┌─────────────────────────────────┐
│  Dietary Preferences            │
│  Current: [Vegan] [Keto]        │
│                                 │
│  [Edit] ← User taps this        │
└────────┬───────────────────────┘
         ↓
┌─────────────────────────────────┐
│  Dietary Preferences [EDIT MODE]│
│                                 │
│  ✓ Vegan ✓ Keto [ ] Paleo       │
│  [ ] Vegetarian ✓ Low-carb      │
│  [ ] Gluten-free [ ] Balanced   │
│                                 │
│  Allergies:                     │
│  [Peanuts] ✕ [Shellfish] ✕     │
│  [New: ___] [Add]               │
│                                 │
│  Dislikes:                      │
│  [Broccoli] ✕                   │
│  [New: ___] [Add]               │
│                                 │
│  [Cancel]  [Save Changes]       │
└────────┬───────────────────────┘
         ↓
POST /api/profile/{userId}/dietary
{
  "preferences": ["Vegan", "Keto", "Low-carb"],
  "allergies": ["Peanuts", "Shellfish"],
  "dislikes": ["Broccoli"]
}
         ↓
UPDATE dietary_preferences table
         ↓
┌─────────────────────────────────┐
│  ✅ Preferences Saved!          │
│  These will now filter recipes  │
└─────────────────────────────────┘
```

---

## 8. Profile Edit for Goals

```
Dashboard → [Profile Tab] → [Nutrition Goals]
        ↓
┌─────────────────────────────────┐
│  Current Goals                  │
│  Primary Goal: Maintain         │
│  Daily Calories: 2200 kcal      │
│  Protein: 140g | Carbs: 230g    │
│  Fats: 70g | Water: 3L          │
│  [Edit]                         │
└────────┬───────────────────────┘
         ↓
┌─────────────────────────────────┐
│  Edit Nutrition Goals [EDIT]    │
│                                 │
│  Goal: [Lose] [Maintain] [Gain] │
│  Daily Calories: [2200]         │
│  [🔄 Auto-calculate using TDEE] │
│                                 │
│  Macros (g):                    │
│  Protein: [140]  Carbs: [230]   │
│  Fats: [70]      Water: [3]L    │
│                                 │
│  [Cancel]  [Save Changes]       │
└────────┬───────────────────────┘
         ↓
POST /api/profile/{userId}/goals
{
  "primaryGoal": "maintain",
  "dailyCalories": 2200,
  "proteinG": 140,
  "carbsG": 230,
  "fatsG": 70,
  "waterLiters": 3
}
         ↓
UPDATE nutrition_goals table
         ↓
"Goals Updated! Your tracking will compare against these targets."
```

---

## 9. Gamification Progress Display

### On Profile Screen:

```
┌────────────────────────────────┐
│  Progress & Gamification       │
│                                │
│  Level: 4                      │
│  XP: 1250 / 2000 ████████░░   │
│  Streak: 5 days 🔥            │
│                                │
│  Badges Earned:                │
│  ├─ 🏆 Consistency Champ       │
│  ├─ 🏆 Hydration Hero          │
│  └─ 🏆 Streak Starter          │
│                                │
│  Available Badges:             │
│  ├─ ⭐ Macro Master            │
│  │  (Hit all macros 3+ days)   │
│  └─ ⭐ XP Collector            │
│     (Get 1000+ XP)             │
│                                │
│  Last Updated: Today at 8:45PM │
└────────────────────────────────┘
```

---

## 10. Real-time Updates Example

### Scenario: User logs lunch at 1:00 PM

```
TIME    ACTION                  STATE CHANGE
─────────────────────────────────────────────────
1:00 PM User taps [📸 Scan Food]
1:01 PM Scans "Caesar Salad"
1:02 PM Confirms: 450 cal, 35g protein, 25g carbs, 20g fat
        
        INSERT food_log
        └─ Creates notification: "Meal Logged ✓"
        
        UPDATE daily_nutrition_summary
        └─ New totals shown immediately
        
        Calculate XP = +50
        └─ UPDATE gamification.xp (1200 → 1250)
        
        Check: dailyGoals met?
        └─ Protein: 120 + 35 = 155 > 140 ✓
        
        Check: New Achievements?
        └─ "Macro Master" badge conditions?
        
1:03 PM Dashboard refreshes:
        ├─ XP bar: 1250 / 2000 (updated)
        ├─ Protein: 155 / 140g ✓ (highlighted in green)
        ├─ Toast: "+50 XP for logging meal"
        └─ Profile sheet: Gamification updated
```

---

## 11. Sleek UI Patterns (Smooth & Gamified)

### Progress Ring (Circular Progress):
```
         ↗
    Carbs: 210g
    of 230g (91%)
         ↖
         
    ╭─────────╮
    │  91% 📊 │
    │ ╱ ═══ ╲ │  ← Circular progress
    │ │  ═══ │ │     filled 91%
    │ ╲ ═══ ╱ │
    ╰─────────╯
```

### Streak Counter with Animation:
```
           ↓ bounce animation when streak increases
        ┌──────┐
        │ 🔥 5 │
        │ DAYS │
        └──────┘
```

### XP Bar with Level-up Animation:
```
Level 3 ─────────────────────────── Level 4
   │                                    │
   └─ 750 XP ──────────────────────────┘
      Old Progress (was at 750)
      
AFTER LOGGING MEAL:
   
   └─ 1250 XP ════════════════════════════════ (new XP bar fills)
      ✨ Animation plays ✨
      "+50 XP" toast appears
```

### Badge Showcase:
```
╔═══════════════════════════╗
║  🏆 EARNED BADGES 🏆     ║
╠═══════════════════════════╣
║  ✓ Consistency Champ      ║
║    5+ day streak          ║
║                           ║
║  ✓ Hydration Hero         ║
║    2L+ water 5+ days      ║
╚═══════════════════════════╝
```

---

## 12. Notifications

### Push Notification Examples:

```
📱 Achievement Unlocked!
   "Consistency Champ - 5 day streak! 🏆 +250 XP"

📱 Daily Goal Met!
   "You hit all your macros today! Great job! 🎯"

📱 Water Reminder
   "You've logged only 1L of water. Keep it up! 💧"

📱 New Badge Available!
   "Macro Master awaits - 1 more day of hitting macros!"
```

---

## 13. Performance Optimization

### Caching Strategy:
```
App Launch
├─ Load user profile from cache (localStorage/AsyncStorage)
├─ Fetch fresh data from API
├─ Compare timestamps, update if new
└─ Display cached while fetching (optimistic UI)
```

### Lazy Loading:
```
Dashboard initially loads:
├─ Profile header ✓
├─ Today's progress ✓
└─ Food log list (paginated, load more on scroll)

Detailed sections load on demand:
├─ Weight history graph (when user taps)
├─ Full achievement list (when user taps)
└─ Weekly trends (when user taps)
```

---

## 14. Summary: Complete User Journey

```
┌─ SIGN UP ─────────────┐
│ Clerk Authentication  │
└───────────┬───────────┘
            ↓
┌─ ONBOARDING ─────────────────────────┐
│ 1. Personal Info → Save to profiles  │
│ 2. Dietary Prefs → Save to dietary   │
│ 3. Nutrition Goals → Save to goals   │
│ 4. Initialize gamification (XP=0)    │
└───────────┬───────────────────────────┘
            ↓
┌─ DASHBOARD ─────────────────────────┐
│ View daily progress                  │
│ All data from database               │
│ Real-time XP/level                   │
└───────────┬───────────────────────────┘
            ↓
┌─ DAILY USAGE ─────────────────────┐
│ Scan/Log Meals                      │
│ ├─ food_log INSERT                  │
│ ├─ daily_nutrition_summary UPDATE   │
│ ├─ gamification UPDATE (XP)         │
│ └─ Check achievements & badges      │
│                                     │
│ Log Water                           │
│ ├─ water_log INSERT                 │
│ ├─ gamification UPDATE (streak)     │
│ └─ Check hydration badge            │
│                                     │
│ Edit Profile                        │
│ ├─ Update personal info             │
│ ├─ Update dietary prefs             │
│ ├─ Adjust nutrition goals           │
│ └─ View/share achievements          │
└───────────────────────────────────┘
            ↓
┌─ ANALYTICS & GROWTH ────────────────┐
│ Track weight over time              │
│ View macro trends                   │
│ Celebrate milestones                │
│ Unlock advanced features (Level 5)  │
└────────────────────────────────────┘
```

---

## Next Steps for Implementation

1. **Add API calls** to profile.jsx using profileAPI.js service
2. **Test database flow** - Log a meal and verify it saves to food_log
3. **Implement achievement checking** - Award XP and badges
4. **Add push notifications** - Notify on achievements
5. **Create achievement list screen** - Show all earned and available badges
6. **Implement analytics screens** - Weight history, macro trends, etc.
