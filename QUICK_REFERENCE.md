# Quick Reference: Profile Integration Summary

## ✅ What's Been Done

### 1. Frontend Update
- **File**: `mobile/app/(tabs)/profile.jsx`
- **Change**: Updated dietary preference buttons with proper `onPress` handlers
- **Effect**: Buttons now toggle dietary preferences in the draft state instead of adding as tags

```jsx
onPress={() => {
  if (editing.dietary) {
    setDraft((prev) => ({
      ...prev,
      dietary: {
        ...prev.dietary,
        preferences: prev.dietary.preferences.includes(opt)
          ? prev.dietary.preferences.filter((p) => p !== opt)
          : [...prev.dietary.preferences, opt],
      },
    }));
  }
}}
```

---

### 2. Backend API Created
- **File**: `backend/src/server.js`
- **New Endpoints**:
  - `GET /api/profile/{userId}` - Fetch complete profile
  - `POST /api/profile/{userId}/basics` - Save personal info
  - `POST /api/profile/{userId}/dietary` - Save dietary preferences
  - `POST /api/profile/{userId}/goals` - Save nutrition goals
  - `POST /api/profile/{userId}/gamification` - Save XP/level/badges

---

### 3. Database Schema Expanded
- **File**: `backend/src/db/schema.js`
- **New Tables**: 10+ tables covering entire user flow
  - `profiles` - Personal information
  - `dietary_preferences` - Diet choices (JSON arrays)
  - `nutrition_goals` - Calorie & macro targets
  - `gamification` - XP, levels, badges
  - `food_log` - Individual meal entries
  - `daily_nutrition_summary` - Daily aggregates
  - `water_log` - Water intake tracking
  - `weight_history` - Weight progression
  - `achievements` - Badge master list
  - `user_achievements` - Unlocked badges
  - `user_notifications` - Notifications

---

### 4. API Service Layer
- **File**: `mobile/services/profileAPI.js` (NEW)
- **Functions**:
  - `fetchUserProfile(userId)` - Get all profile data
  - `saveProfileBasics(userId, data)` - Save personal info
  - `saveDietaryPreferences(userId, data)` - Save diet choices
  - `saveNutritionGoals(userId, data)` - Save goals
  - `saveGamificationStats(userId, data)` - Save XP/badges

---

### 5. Documentation
- **PROFILE_INTEGRATION_GUIDE.md** - Comprehensive integration guide
- **USER_FLOW_UX_GUIDE.md** - Complete user journey with UI examples
- **PROFILE_API_INTEGRATION_EXAMPLE.js** - Code examples for frontend integration

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────┐
│         MOBILE APP (React Native)       │
│  profile.jsx + profileAPI.js            │
└────────────┬────────────────────────────┘
             │
             │ HTTP POST/GET
             ↓
┌─────────────────────────────────────────┐
│         BACKEND (Express.js)            │
│  server.js + schema.js                  │
│  /api/profile/* endpoints               │
└────────────┬────────────────────────────┘
             │
             │ Drizzle ORM
             ↓
┌─────────────────────────────────────────┐
│      DATABASE (PostgreSQL)              │
│  profiles, dietary_preferences, etc.    │
└─────────────────────────────────────────┘
```

---

## 🚀 Next Steps to Complete Integration

### Step 1: Connect Frontend to API
```
1. Copy profileAPI.js service to your mobile/services/
2. Update profile.jsx with API integration (see PROFILE_API_INTEGRATION_EXAMPLE.js)
3. Add useEffect to load profile on mount
4. Update handleSaveSection to call API before local update
5. Add error handling and loading states
```

### Step 2: Deploy Database
```
1. Run: npm run migrate (in backend folder)
2. Verify tables created in PostgreSQL
3. Test with sample data
```

### Step 3: Test End-to-End
```
1. Sign up new user
2. Complete onboarding
3. Save profile sections
4. Check database for saved data
5. Refresh app - verify data persists
```

### Step 4: Implement Food Logging
```
1. Create food_log endpoints
2. Update daily_nutrition_summary on each log
3. Calculate and award XP
4. Check for achievement conditions
5. Update gamification stats
```

### Step 5: Add Achievement System
```
1. Seed achievements table with badges
2. Create achievement checking logic
3. Insert into user_achievements on unlock
4. Create user_notifications on achievement
5. Display notifications in UI
```

---

## 📊 Database Query Examples

### Get User Profile with All Sections
```sql
SELECT * FROM profiles WHERE user_id = 'clerk_user_123';
SELECT * FROM dietary_preferences WHERE user_id = 'clerk_user_123';
SELECT * FROM nutrition_goals WHERE user_id = 'clerk_user_123';
SELECT * FROM gamification WHERE user_id = 'clerk_user_123';
```

### Get Today's Nutrition Summary
```sql
SELECT * FROM daily_nutrition_summary 
WHERE user_id = 'clerk_user_123' 
AND date::date = CURRENT_DATE;
```

### Get User's Food Log for Today
```sql
SELECT * FROM food_log 
WHERE user_id = 'clerk_user_123' 
AND logged_date::date = CURRENT_DATE
ORDER BY logged_date DESC;
```

### Get Total Water for Today
```sql
SELECT SUM(amount_liters) as total_water FROM water_log
WHERE user_id = 'clerk_user_123'
AND logged_date::date = CURRENT_DATE;
```

### Get User's Unlocked Achievements
```sql
SELECT a.name, a.description, a.icon, ua.unlocked_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.user_id = 'clerk_user_123'
ORDER BY ua.unlocked_at DESC;
```

---

## 🛠️ File Structure Summary

```
MyFoodTracker/
├── backend/
│   └── src/
│       ├── server.js (✅ UPDATED - Added profile endpoints)
│       └── db/
│           └── schema.js (✅ UPDATED - Added all tables)
│
├── mobile/
│   ├── app/(tabs)/
│   │   └── profile.jsx (✅ UPDATED - Added dietary button handlers)
│   └── services/
│       └── profileAPI.js (✅ NEW - API service layer)
│
├── PROFILE_INTEGRATION_GUIDE.md (✅ NEW - Full guide)
├── USER_FLOW_UX_GUIDE.md (✅ NEW - UX/Flow guide)
└── PROFILE_API_INTEGRATION_EXAMPLE.js (✅ NEW - Code examples)
```

---

## 🎯 Key Concepts

### 1. Dietary Preferences Buttons
- **Before**: Called `addTag()` which added to array
- **After**: Toggles inclusion in array - select/deselect pattern

### 2. State Management
- `draft` - Local edits before save
- `savedProfile` - Committed data
- Save to `savedProfile` only after API succeeds

### 3. Database Tables
- `userId` is the foreign key linking everything
- Use Clerk's `user?.id` to get this value
- All profile data is user-specific

### 4. XP & Gamification
- Start at XP: 0, Level: 1
- +50 XP per meal logged
- Level up at: 1000, 2000, 3000, 4000 XP
- Badges unlock based on conditions

### 5. API Pattern
```javascript
POST /api/profile/{userId}/{section}
Body: { ...sectionData }
Response: { ...updatedData }
```

---

## ⚡ Performance Tips

1. **Caching**: Cache profile data locally, sync on background
2. **Pagination**: Load food_log in pages (not all at once)
3. **Lazy Loading**: Load achievement list on demand
4. **Debouncing**: Debounce input fields before API calls
5. **Offline**: Show cached data while offline, sync when back online

---

## 🔐 Security Reminders

1. Always verify `userId` matches authenticated Clerk user
2. Never expose sensitive data in error messages
3. Validate all input on backend
4. Use HTTPS for all API calls
5. Add rate limiting on sensitive endpoints
6. Never log passwords or sensitive PII

---

## 📞 API Error Handling

```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return await response.json();
} catch (error) {
  console.error("Error:", error);
  Alert.alert("Error", "Failed to save profile. Please try again.");
}
```

---

## 🎨 UI/UX Patterns Implemented

✅ **Toggle Buttons** - Dietary preferences
✅ **Progress Bars** - Macros, water, XP
✅ **Real-time Calculations** - BMI, BMR, TDEE
✅ **Section-based Editing** - Each profile section editable separately
✅ **Gamification Display** - Level, XP, streak, badges
✅ **Achievement Badges** - Earned and available

---

## 📝 Notes

- Dietary preference buttons now properly toggle (add/remove from array)
- API endpoints are complete and ready for testing
- Database schema is comprehensive covering all user data
- Frontend service layer ready for integration
- All documentation provided for implementation

---

## ✨ Final Checklist

- [ ] Add profileAPI.js import to profile.jsx
- [ ] Update handleSaveSection to call API endpoints
- [ ] Add useEffect to load profile from database on mount
- [ ] Add loading state while fetching/saving
- [ ] Test with sample data
- [ ] Run database migrations
- [ ] Verify data persists after app restart
- [ ] Implement food logging endpoints
- [ ] Create achievement checking logic
- [ ] Test end-to-end user flow

**Status**: Foundation complete ✅, Ready for integration 🚀
