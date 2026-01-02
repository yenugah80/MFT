# Onboarding Backend Implementation Guide

## Overview
This guide provides the backend implementation required to complete the premium onboarding questionnaire flow.

---

## 1. Database Schema Updates

### Add `onboarding_completed_at` field to Users table

```sql
-- PostgreSQL Migration
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP NULL;
```

Or using your ORM (Drizzle/Prisma):

```javascript
// Drizzle Schema
export const users = pgTable('users', {
  // ... existing fields
  onboarding_completed_at: timestamp('onboarding_completed_at'),
});
```

---

## 2. Backend Endpoints

### Endpoint 1: Mark Onboarding as Complete
**POST** `/api/profile/onboarding-complete`

**Purpose**: Called when user completes all 4 onboarding steps

**Authentication**: Required (Bearer Token)

**Request Body**: None required

**Response**:
```json
{
  "success": true,
  "onboardingCompleted": true,
  "completedAt": "2024-01-15T10:30:00Z"
}
```

**Implementation**:

```javascript
// Express/Node.js Backend

router.post('/api/profile/onboarding-complete', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id; // From Clerk token

    // Update user record with completion timestamp
    const updatedUser = await db.users.update(
      { where: { user_id: userId } },
      {
        data: {
          onboarding_completed_at: new Date(),
        }
      }
    );

    // Log the completion for analytics
    console.log(`[Onboarding] User ${userId} completed onboarding`);

    res.json({
      success: true,
      onboardingCompleted: true,
      completedAt: updatedUser.onboarding_completed_at,
    });
  } catch (error) {
    console.error('[Onboarding] Error marking completion:', error);
    res.status(500).json({
      error: 'Failed to complete onboarding',
      message: error.message,
    });
  }
});
```

---

### Endpoint 2: Update GET /api/profile/me

**Purpose**: Include onboarding completion status in profile response

**Current Behavior**: Returns profile data

**New Behavior**: Add `onboardingCompletedAt` field

**Updated Response**:

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileBasics": {
    "fullName": "John Doe",
    "age": 28,
    "weightKg": 75,
    "heightCm": 180,
    "gender": "male",
    "activityLevel": "moderate"
  },
  "dietaryPreferences": {
    "preferences": ["balanced"],
    "allergies": [],
    "dislikes": []
  },
  "nutritionGoals": {
    "primaryGoal": "lose",
    "dailyCalories": 2000,
    "proteinG": 150,
    "carbsG": 200,
    "fatsG": 67,
    "waterLiters": 2.0
  },
  "gamification": {
    "xp": 0,
    "level": 1,
    "streak": 0,
    "badges": []
  },
  "onboardingCompletedAt": "2024-01-15T10:30:00Z"
}
```

**Implementation**:

```javascript
router.get('/api/profile/me', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all profile data
    const user = await db.users.findUnique({
      where: { user_id: userId },
      include: {
        profile_basics: true,
        dietary_preferences: true,
        nutrition_goals: true,
        gamification: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform and return
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileBasics: user.profile_basics,
      dietaryPreferences: user.dietary_preferences,
      nutritionGoals: user.nutrition_goals,
      gamification: user.gamification,
      onboardingCompletedAt: user.onboarding_completed_at, // NEW FIELD
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
```

---

## 3. Drizzle ORM Example (if applicable)

```typescript
// schema.ts
import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').unique().notNull(), // Clerk user ID
  email: text('email').notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  // ... other fields
  onboarding_completed_at: timestamp('onboarding_completed_at'), // NEW FIELD
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
```

---

## 4. Middleware Setup

Ensure you have authentication middleware that validates Clerk JWT tokens:

```javascript
import { ClerkExpressRequireAuth } from '@clerk/express';

const authenticateUser = ClerkExpressRequireAuth();

router.get('/api/profile/me', authenticateUser, (req, res) => {
  const userId = req.auth.userId; // Clerk user ID
  // ... rest of endpoint
});
```

---

## 5. Error Handling

The backend should handle these errors gracefully:

```javascript
// 401 Unauthorized
{ error: 'Unauthorized', message: 'Invalid or missing authentication token' }

// 404 Not Found
{ error: 'User not found', message: 'User profile does not exist' }

// 500 Server Error
{ error: 'Database error', message: 'Failed to update onboarding status' }
```

---

## 6. Analytics Integration (Optional)

Track onboarding completion for insights:

```javascript
// After marking onboarding complete
const onboardingData = {
  userId,
  completedAt: new Date(),
  primaryGoal: profile.nutritionGoals.primaryGoal,
  timeToComplete: calculateTimeSpent(user.created_at, new Date()),
  platformDevice: req.headers['user-agent'],
};

// Send to analytics service (Mixpanel, Amplitude, etc.)
analytics.track('onboarding_completed', onboardingData);
```

---

## 7. Testing

### Unit Test Example (Jest)

```javascript
describe('Onboarding Endpoints', () => {
  describe('POST /api/profile/onboarding-complete', () => {
    it('should mark onboarding as complete', async () => {
      const response = await request(app)
        .post('/api/profile/onboarding-complete')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        onboardingCompleted: true,
        completedAt: expect.any(String),
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/profile/onboarding-complete')
        .expect(401);
    });
  });

  describe('GET /api/profile/me', () => {
    it('should include onboardingCompletedAt in response', async () => {
      const response = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('onboardingCompletedAt');
    });
  });
});
```

---

## 8. Deployment Checklist

- [ ] Database migration deployed
- [ ] `onboarding_completed_at` field added to users table
- [ ] `POST /api/profile/onboarding-complete` endpoint created
- [ ] `GET /api/profile/me` endpoint updated to include `onboardingCompletedAt`
- [ ] Authentication middleware configured with Clerk
- [ ] Error handling tested
- [ ] Response formats validated
- [ ] Analytics integrated (if applicable)
- [ ] Tests passing
- [ ] Staging environment tested with real onboarding flow
- [ ] Production deployment

---

## 9. Frontend Integration (Already Implemented)

The frontend is configured to:

1. **After Step 4 completion**, call `POST /api/profile/onboarding-complete`
2. **Verify response** to ensure `onboardingCompleted: true`
3. **Navigate to dashboard** on success
4. **On tabs load**, check `profile.onboardingCompletedAt` to guard against skipping

All API calls in `mobile/hooks/useOnboarding.js` handle:
- Token refresh on 401 errors
- Retry logic for failed requests
- Error states and user notifications

---

## 10. Environment Variables

Ensure these are configured:

```bash
# .env or .env.local
EXPO_PUBLIC_API_URL=https://your-api.com
CLERK_SECRET_KEY=your_clerk_secret
DATABASE_URL=postgresql://...
```

---

## 11. Common Issues & Solutions

**Issue**: Onboarding endpoint returns 401
- **Solution**: Verify Clerk token is being sent in Authorization header
- **Check**: Token format is `Bearer <token>`

**Issue**: `onboardingCompletedAt` always null
- **Solution**: Ensure migration ran successfully
- **Check**: Column exists in database with correct name

**Issue**: User redirects back to onboarding after completion
- **Solution**: Verify endpoint returns `onboardingCompleted: true`
- **Check**: Frontend guard in `(tabs)/_layout.jsx` has 2-3 second delay for API response

---

## 12. API Contract

### Profile Completion Request
```
POST /api/profile/onboarding-complete
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
Content-Type: application/json

{}
```

### Profile Completion Response
```
HTTP 200 OK
{
  "success": true,
  "onboardingCompleted": true,
  "completedAt": "2024-01-15T10:30:00Z"
}
```

---

## Questions?

Refer to the onboarding implementation plan at: `/Users/harikayenuga/.claude/plans/effervescent-plotting-dewdrop.md`

All frontend code is in: `/mobile/app/onboarding/` and `/mobile/components/onboarding/`
