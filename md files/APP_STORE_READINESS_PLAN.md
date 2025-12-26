# App Store Readiness Plan
## MyFoodTracker - Top 1% Health & Wellness App

**Goal:** Achieve 10/10 on all testing categories for App Store and Play Store launch
**Target:** Top 1% of health & wellness applications globally
**Timeline:** 3-4 weeks intensive development

---

## Current vs Target Scores

| Category | Current | Target | Gap | Priority |
|----------|---------|--------|-----|----------|
| Functional Testing | 7.5/10 | 10/10 | +2.5 | P0 |
| Performance Testing | 8.0/10 | 10/10 | +2.0 | P1 |
| Compatibility Testing | 8.5/10 | 10/10 | +1.5 | P2 |
| Usability (UX) Testing | 8.0/10 | 10/10 | +2.0 | P0 |
| Security Testing | 4.0/10 | 10/10 | +6.0 | P0 CRITICAL |
| Localization Testing | 6.0/10 | 10/10 | +4.0 | P1 |
| Network Testing | 8.5/10 | 10/10 | +1.5 | P2 |
| Installation Testing | 7.5/10 | 10/10 | +2.5 | P1 |
| Accessibility Testing | 6.5/10 | 10/10 | +3.5 | P1 |

---

## PHASE 1: Security & Compliance (P0 - Days 1-3)

### 🔴 CRITICAL: Fix Security Vulnerabilities

#### 1.1 API Key Management (Day 1 - IMMEDIATE)

**Current Issue:** API keys exposed in .env files
**Solution:**

```bash
# 1. Revoke all exposed keys
- OpenAI API Key: DELETE and create new
- Clerk Secret Key: Rotate in dashboard
- Database Password: Reset in Neon
- USDA API Key: Request new key

# 2. Implement secure key management
npm install @dotenv/vault  # For local development
# Or use Doppler, AWS Secrets Manager, or GitHub Secrets

# 3. Remove .env from git history
git filter-repo --path backend/.env --invert-paths
git filter-repo --path mobile/.env --invert-paths

# 4. Update .gitignore
echo "
.env
.env.*
!.env.example
.env.local
.env.production
" >> .gitignore
```

**Implementation Tasks:**
- [ ] Create `.env.example` templates with placeholder values
- [ ] Set up environment variables in hosting (Render, Expo)
- [ ] Document secret rotation procedures
- [ ] Implement secret validation on app startup

#### 1.2 Add Server-Side Rate Limiting (Day 1)

```bash
cd backend
npm install express-rate-limit express-slow-down
```

**Implementation:**
```javascript
// backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for expensive AI operations
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour
  message: 'AI analysis limit reached. Please try again in an hour.',
});

// Speed limiter for abusive requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500, // Add 500ms delay per request after 50
});

// Apply to routes
// app.use('/api/', apiLimiter);
// app.use('/api/nutrition/analyze-photo', aiLimiter);
```

#### 1.3 Implement Security Headers (Day 1)

```bash
npm install helmet
```

```javascript
// backend/src/server.js
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

#### 1.4 Restrict CORS to Known Domains (Day 1)

```javascript
// backend/src/server.js
app.use(cors({
  origin: [
    'https://myfoodtracker.onrender.com',
    'https://yourdomain.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : null,
    process.env.NODE_ENV === 'development' ? 'http://10.0.2.2:8081' : null, // Android emulator
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
}));
```

#### 1.5 Add File Upload Validation (Day 2)

```javascript
// backend/src/middleware/fileValidation.js
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).slice(2);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /m4a|mp3|wav|ogg|webm|aac|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /audio/.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only audio files allowed.'));
  },
});

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image/.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images allowed.'));
  },
});
```

#### 1.6 Implement Input Sanitization (Day 2)

```bash
npm install validator xss
```

```javascript
// backend/src/middleware/sanitization.js
import validator from 'validator';
import xss from 'xss';

export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove XSS attempts
        req.body[key] = xss(req.body[key]);

        // Trim whitespace
        req.body[key] = validator.trim(req.body[key]);

        // Escape HTML entities
        req.body[key] = validator.escape(req.body[key]);
      }
    });
  }
  next();
};
```

#### 1.7 Add Security Logging & Monitoring (Day 3)

```bash
npm install winston pino pino-pretty
```

```javascript
// backend/src/utils/logger.js
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Log security events
export const logSecurityEvent = (event, details) => {
  logger.warn({
    type: 'security',
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};
```

**Security Checklist:**
- [x] API keys revoked and rotated
- [ ] Environment variables secured
- [ ] Rate limiting implemented
- [ ] Security headers added
- [ ] CORS restricted
- [ ] File upload validation added
- [ ] Input sanitization implemented
- [ ] Security logging enabled
- [ ] Penetration testing scheduled

---

## PHASE 2: Functional Excellence (P0 - Days 4-7)

### 2.1 Fix Critical Functional Bugs

#### Bug 1: Photo Analysis Error Handling

**File:** `mobile/app/(tabs)/log.js`

```javascript
// Current (line 156-162) - NO ERROR HANDLING
const analyzed = await foodAnalysis.analyzePhoto(imageUri);
setAnalyzedFood(analyzed);

// Fixed - WITH COMPREHENSIVE ERROR HANDLING
try {
  setIsAnalyzing(true);
  const analyzed = await foodAnalysis.analyzePhoto(imageUri);

  if (!analyzed || !analyzed.foodName) {
    throw new Error('Analysis returned incomplete data');
  }

  // Validate response structure
  if (analyzed.calories < 0 || analyzed.protein < 0) {
    throw new Error('Invalid nutritional values detected');
  }

  setAnalyzedFood(analyzed);
  notify.success('Photo analyzed successfully!');

} catch (error) {
  console.error('[PhotoAnalysis] Failed:', error);

  // Show user-friendly error with recovery options
  Alert.alert(
    'Photo Analysis Failed',
    `We couldn't analyze this photo: ${error.message}\n\nTry:\n• Taking a clearer photo\n• Ensuring good lighting\n• Photographing one meal at a time`,
    [
      { text: 'Retry', onPress: () => handlePhotoRetry() },
      { text: 'Manual Entry', onPress: () => switchToManualEntry() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );

  // Track error for analytics
  analytics.logEvent('photo_analysis_error', {
    error: error.message,
    imageSize: imageInfo?.size,
    timestamp: Date.now(),
  });

} finally {
  setIsAnalyzing(false);
}
```

#### Bug 2: Voice Temp File Cleanup

**File:** `backend/src/routes/nutrition.js`

```javascript
// Current (line 536) - NO ERROR HANDLING
if (req.file && fs.existsSync(req.file.path)) {
  fs.unlinkSync(req.file.path);
}

// Fixed - WITH ROBUST ERROR HANDLING
const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`Temp file deleted: ${filePath}`);
    }
  } catch (cleanupError) {
    logger.error(`Failed to delete temp file: ${filePath}`, cleanupError);
    // Continue execution - cleanup failure shouldn't break the request
  }
};

// Use finally block to ensure cleanup
try {
  // ... voice transcription logic
  const result = await openaiClient.transcribeAudio(audioBuffer);
  res.json({ success: true, text: result.text });
} catch (error) {
  logger.error('Voice transcription failed:', error);
  res.status(500).json({ error: 'Transcription failed' });
} finally {
  // Always cleanup, even on error
  cleanupTempFile(req.file?.path);
}
```

#### Bug 3: Macro Validation Implementation

**File:** `backend/src/middleware/validation.js`

```javascript
import { z } from 'zod';

// Add macro validation schema
const macroValidator = z.object({
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(300),
}).refine(
  (data) => {
    // Calculate expected calories from macros
    const calculatedCalories = (data.protein * 4) + (data.carbs * 4) + (data.fat * 9);
    const difference = Math.abs(data.calories - calculatedCalories);
    const percentageOff = (difference / data.calories) * 100;

    // Allow 20% variance for estimation
    return percentageOff <= 20;
  },
  {
    message: 'Macro values don\'t match calorie count (protein×4 + carbs×4 + fat×9 should equal calories ±20%)',
  }
);

// Enhanced food log schema
export const foodLogSchema = z.object({
  foodName: z.string().min(1).max(200),
  calories: z.coerce.number().min(0).max(10000).optional(),
  protein: z.coerce.number().min(0).max(500).optional(),
  carbs: z.coerce.number().min(0).max(1000).optional(),
  fats: z.coerce.number().min(0).max(300).optional(),
  servingSize: z.string().max(100).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  clientEventId: z.string().min(1),
  sourceMeta: z.object({
    method: z.enum(['text', 'photo', 'voice', 'barcode']),
    confidence: z.number().min(0).max(1).optional(),
    timestamp: z.number(),
  }).optional(),
}).refine(
  (data) => {
    // Only validate macros if all are provided
    if (data.calories && data.protein && data.carbs && data.fats) {
      const result = macroValidator.safeParse(data);
      return result.success;
    }
    return true;
  },
  {
    message: 'Nutritional values are inconsistent',
  }
);
```

### 2.2 Add Missing Features for Top 1% Apps

#### Feature 1: Meal Planning & Recipes (NEW)

```javascript
// backend/src/routes/mealPlanning.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Generate weekly meal plan
router.post('/generate-plan', requireAuth, async (req, res) => {
  const { userId } = req.auth;
  const { dietaryPreferences, calorieGoal, days } = req.body;

  // AI-powered meal plan generation
  const plan = await openaiClient.generateMealPlan({
    userId,
    preferences: dietaryPreferences,
    calorieGoal,
    days: days || 7,
  });

  res.json({ success: true, plan });
});

export default router;
```

#### Feature 2: Progress Photos & Body Tracking

```javascript
// New feature: Visual progress tracking
// mobile/components/progress/ProgressPhotos.jsx
import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity } from 'react-native';

export function ProgressPhotos() {
  const [photos, setPhotos] = useState([]);

  const takeProgressPhoto = async () => {
    const photo = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      aspect: [3, 4],
    });

    // Upload to backend with date tagging
    await uploadProgressPhoto(photo);
  };

  return (
    <View>
      <Text>Track your visual progress</Text>
      {/* Photo grid with before/after comparisons */}
    </View>
  );
}
```

#### Feature 3: Social Features & Sharing

```javascript
// Share achievements to social media
export const shareAchievement = async (achievement) => {
  const message = `I just earned "${achievement.name}" in MyFoodTracker! 🎉`;

  await Share.share({
    message,
    title: 'MyFoodTracker Achievement',
    url: 'https://myfoodtracker.app/download',
  }, {
    // iOS only
    subject: 'Check out my achievement!',
  });
};
```

#### Feature 4: Smart Notifications & Reminders

```bash
npm install expo-notifications @notifee/react-native
```

```javascript
// mobile/utils/notifications.js
import * as Notifications from 'expo-notifications';

export const scheduleHydrationReminder = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💧 Stay Hydrated!',
      body: 'Time to drink some water and log it!',
      data: { type: 'hydration_reminder' },
    },
    trigger: {
      hour: [9, 12, 15, 18],
      minute: 0,
      repeats: true,
    },
  });
};

export const scheduleMealReminder = async (mealType, time) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🍽️ ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Time`,
      body: 'Don\'t forget to log your meal!',
      data: { type: 'meal_reminder', mealType },
    },
    trigger: {
      hour: time.hour,
      minute: time.minute,
      repeats: true,
    },
  });
};
```

---

## PHASE 3: Premium UX Polish (P0 - Days 8-12)

### 3.1 UI/UX Improvements

#### Improvement 1: Onboarding Experience

```javascript
// mobile/components/onboarding/WelcomeFlow.jsx
import React from 'react';
import { View, Text, Image } from 'react-native';
import Swiper from 'react-native-swiper';

export function WelcomeFlow() {
  const screens = [
    {
      title: 'Track Smarter, Not Harder',
      description: 'Log meals with AI-powered photo, voice, or barcode scanning',
      image: require('../assets/onboarding-1.png'),
    },
    {
      title: 'Understand Your Body',
      description: 'See how food affects your mood, energy, and wellness',
      image: require('../assets/onboarding-2.png'),
    },
    {
      title: 'Achieve Your Goals',
      description: 'Personalized insights and gamification keep you motivated',
      image: require('../assets/onboarding-3.png'),
    },
  ];

  return (
    <Swiper
      loop={false}
      showsPagination
      paginationStyle={styles.pagination}
    >
      {screens.map((screen, index) => (
        <OnboardingScreen key={index} {...screen} />
      ))}
    </Swiper>
  );
}
```

#### Improvement 2: Empty States & Illustrations

```javascript
// mobile/components/EmptyState.jsx
export function EmptyState({ icon, title, description, action }) {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/animations/empty-food-log.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action && (
        <TouchableOpacity style={styles.actionButton} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

#### Improvement 3: Haptic Feedback

```bash
npm install expo-haptics
```

```javascript
// mobile/utils/haptics.js
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};

// Usage
const handleFoodLogged = async () => {
  await saveFoodLog();
  haptics.success(); // Satisfying feedback!
};
```

#### Improvement 4: Loading Skeletons & Animations

```bash
npm install react-native-reanimated react-native-shimmer-placeholder
```

```javascript
// mobile/components/skeletons/DashboardSkeleton.jsx
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'expo-linear-gradient';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      <ShimmerPlaceholder style={styles.header} />
      <ShimmerPlaceholder style={styles.stats} />
      <ShimmerPlaceholder style={styles.chart} />
    </View>
  );
}
```

### 3.2 Advanced Animations

```javascript
// mobile/components/animations/CalorieRing.jsx
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CalorieRing({ consumed, goal }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(consumed / goal, { duration: 1000 });
  }, [consumed, goal]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (progress.value * circumference),
  }));

  return (
    <Svg>
      <AnimatedCircle animatedProps={animatedProps} />
    </Svg>
  );
}
```

---

## PHASE 4: Accessibility & Localization (P1 - Days 13-16)

### 4.1 Full Accessibility Implementation

```bash
npm install react-native-accessibility-info
```

```javascript
// mobile/utils/accessibility.js
import { AccessibilityInfo } from 'react-native';

export const checkAccessibility = async () => {
  const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
  const isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
  const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

  return {
    isScreenReaderEnabled,
    isBoldTextEnabled,
    isReduceMotionEnabled,
  };
};
```

**All Components Must Have:**
```javascript
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Log food entry"
  accessibilityHint="Double tap to open food logging screen"
  accessibilityState={{ disabled: isLoading }}
>
  <Text>Log Food</Text>
</TouchableOpacity>
```

### 4.2 Multi-Language Support

```bash
npm install i18next react-i18next expo-localization
```

```javascript
// mobile/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import ar from './locales/ar.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
      hi: { translation: hi },
      ar: { translation: ar },
    },
    lng: Localization.locale.split('-')[0],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

**Translation Files:**
```json
// mobile/i18n/locales/en.json
{
  "dashboard": {
    "title": "Dashboard",
    "caloriesConsumed": "Calories Consumed",
    "waterIntake": "Water Intake",
    "todaysSummary": "Today's Summary"
  },
  "foodLog": {
    "title": "Log Food",
    "textInput": "Type what you ate",
    "photoInput": "Take a photo",
    "voiceInput": "Voice log",
    "barcodeInput": "Scan barcode"
  }
}
```

### 4.3 RTL (Right-to-Left) Support for Arabic/Hebrew

```javascript
// mobile/App.jsx
import { I18nManager } from 'react-native';

useEffect(() => {
  const isRTL = i18n.dir() === 'rtl';
  I18nManager.forceRTL(isRTL);
}, [i18n.language]);
```

---

## PHASE 5: Performance & Analytics (P1 - Days 17-19)

### 5.1 Performance Monitoring

```bash
npm install @sentry/react-native @sentry/cli
npx @sentry/wizard -i reactNative
```

```javascript
// mobile/App.jsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: __DEV__ ? 'development' : 'production',
});

export default Sentry.wrap(App);
```

### 5.2 Analytics Integration

```bash
npm install @react-native-firebase/analytics
npm install expo-firebase-analytics
```

```javascript
// mobile/utils/analytics.js
import analytics from '@react-native-firebase/analytics';

export const logEvent = async (eventName, params) => {
  await analytics().logEvent(eventName, params);
};

export const setUserProperties = async (properties) => {
  await analytics().setUserProperties(properties);
};

// Track key metrics
logEvent('food_logged', {
  method: 'photo',
  calories: 450,
  confidence: 0.92,
});

logEvent('goal_achieved', {
  type: 'hydration',
  streakDays: 7,
});
```

### 5.3 Performance Optimizations

```javascript
// mobile/App.jsx - Code Splitting
import React, { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./screens/Dashboard'));
const FoodLog = lazy(() => import('./screens/FoodLog'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="FoodLog" component={FoodLog} />
      </Stack.Navigator>
    </Suspense>
  );
}
```

**Image Optimization:**
```bash
npm install expo-image
```

```javascript
// Use Expo Image for better performance
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

---

## PHASE 6: App Store Requirements (P1 - Days 20-22)

### 6.1 Privacy Policy & Terms of Service

**Create:** `https://yourdomain.com/privacy-policy`
**Create:** `https://yourdomain.com/terms-of-service`

**Requirements:**
- Data collection transparency
- Cookie policy
- Third-party services (OpenAI, Clerk, Neon)
- User rights (GDPR, CCPA)
- Contact information

### 6.2 App Store Assets

**iOS App Store:**
- [ ] App Icon (1024x1024px)
- [ ] Screenshots (6.5", 5.5", 12.9" iPad)
- [ ] App Preview Video (15-30s)
- [ ] App Description (170 chars subtitle, 4000 chars description)
- [ ] Keywords (100 chars)
- [ ] Support URL
- [ ] Marketing URL

**Google Play Store:**
- [ ] App Icon (512x512px)
- [ ] Feature Graphic (1024x500px)
- [ ] Screenshots (min 2, max 8)
- [ ] Promo Video (YouTube link)
- [ ] Short Description (80 chars)
- [ ] Full Description (4000 chars)
- [ ] Privacy Policy URL

### 6.3 App Metadata

**App Name:** MyFoodTracker - AI Nutrition Log

**Subtitle/Short Description:**
"Smart food tracking with AI-powered photo, voice & barcode scanning. Achieve your wellness goals."

**Keywords:**
"food tracker, nutrition, calorie counter, diet, health, wellness, AI, photo recognition, meal planning, weight loss, fitness"

**Category:**
- Primary: Health & Fitness
- Secondary: Lifestyle

**Age Rating:**
- iOS: 4+
- Android: Everyone

### 6.4 In-App Purchases Setup (Freemium Model)

```javascript
// mobile/config/subscriptions.js
export const subscriptions = [
  {
    id: 'premium_monthly',
    productId: 'myfoodtracker_premium_monthly',
    price: '$4.99',
    duration: 'month',
    features: [
      'Unlimited AI photo analysis',
      'Advanced nutrition insights',
      'Meal planning & recipes',
      'Progress photos & comparisons',
      'Ad-free experience',
      'Priority support',
    ],
  },
  {
    id: 'premium_yearly',
    productId: 'myfoodtracker_premium_yearly',
    price: '$39.99',
    duration: 'year',
    savings: '$20',
    features: [
      'All Premium features',
      '33% savings vs monthly',
      'Exclusive challenges',
      'Early access to new features',
    ],
  },
];
```

### 6.5 TestFlight & Internal Testing

```bash
# iOS TestFlight
eas build --platform ios --profile production
eas submit --platform ios

# Android Internal Testing
eas build --platform android --profile production
eas submit --platform android --track internal
```

---

## PHASE 7: Final Testing & QA (P0 - Days 23-28)

### 7.1 Automated Testing Suite

```bash
npm install --save-dev jest @testing-library/react-native detox
```

```javascript
// mobile/__tests__/FoodLog.test.js
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FoodLog from '../app/(tabs)/log';

describe('FoodLog', () => {
  it('should log food via text input', async () => {
    const { getByPlaceholderText, getByText } = render(<FoodLog />);

    const input = getByPlaceholderText('What did you eat?');
    fireEvent.changeText(input, '2 scrambled eggs and toast');

    await waitFor(() => {
      expect(getByText('Scrambled Eggs')).toBeTruthy();
    });
  });
});
```

### 7.2 E2E Testing with Detox

```javascript
// e2e/foodLogging.test.js
describe('Food Logging Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete full food logging flow', async () => {
    // Navigate to log tab
    await element(by.id('log-tab')).tap();

    // Enter food text
    await element(by.id('food-input')).typeText('chicken salad');

    // Wait for analysis
    await waitFor(element(by.id('nutrition-card'))).toBeVisible().withTimeout(5000);

    // Save food log
    await element(by.id('save-button')).tap();

    // Verify success
    await expect(element(by.text('Food logged successfully!'))).toBeVisible();
  });
});
```

### 7.3 Load Testing

```javascript
// backend/tests/load/dashboard.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.get('https://myfoodtracker.onrender.com/api/nutrition/dashboard', {
    headers: { 'Authorization': `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 7.4 Security Audit Checklist

- [ ] OWASP Mobile Top 10 compliance verified
- [ ] Penetration testing completed
- [ ] API keys secured and rotated
- [ ] SSL/TLS certificates valid
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Rate limiting tested
- [ ] Authentication flows secure

---

## Success Metrics for Top 1%

### App Store Optimization (ASO)
- [ ] 4.8+ star rating (target: 4.9)
- [ ] <1% crash rate
- [ ] 70%+ day-1 retention
- [ ] 40%+ day-7 retention
- [ ] 20%+ day-30 retention

### Performance Benchmarks
- [ ] App launch time: <2s
- [ ] API response time: <200ms (p95)
- [ ] Offline support: 100% core features
- [ ] Battery drain: <5%/hour active use

### Accessibility Compliance
- [ ] WCAG 2.1 Level AA compliant
- [ ] VoiceOver/TalkBack support: 100%
- [ ] Keyboard navigation: Full support
- [ ] Color contrast: 4.5:1 minimum

### Security Posture
- [ ] Zero critical vulnerabilities
- [ ] Zero high-risk vulnerabilities
- [ ] All API keys secured
- [ ] Penetration test passed

---

## Timeline Summary

| Phase | Duration | Priority | Status |
|-------|----------|----------|--------|
| 1. Security & Compliance | 3 days | P0 CRITICAL | ⏳ Starting |
| 2. Functional Excellence | 4 days | P0 | ⏳ Pending |
| 3. Premium UX Polish | 5 days | P0 | ⏳ Pending |
| 4. Accessibility & i18n | 4 days | P1 | ⏳ Pending |
| 5. Performance & Analytics | 3 days | P1 | ⏳ Pending |
| 6. App Store Requirements | 3 days | P1 | ⏳ Pending |
| 7. Final Testing & QA | 6 days | P0 | ⏳ Pending |

**Total:** 28 days (4 weeks) to App Store launch

---

## Budget Estimate

| Category | Item | Cost |
|----------|------|------|
| **Development Tools** | Sentry Pro | $26/month |
| | Firebase Blaze Plan | ~$25/month |
| | App Store Developer | $99/year |
| | Google Play Developer | $25 one-time |
| **Third-Party Services** | OpenAI API | ~$50-200/month |
| | Clerk Pro | $25/month |
| | Neon Database | $19/month |
| **Testing** | BrowserStack | $39/month (optional) |
| | Load testing tools | Free (k6) |
| **Marketing** | App Store ads | $500-1000/month |
| | Social media assets | $200-500 |

**Total Estimated Monthly Cost:** $200-350
**Launch Cost:** ~$1500-2000

---

## Post-Launch Roadmap

### Month 1-3: Growth & Optimization
- [ ] A/B testing on onboarding flow
- [ ] User feedback collection
- [ ] Bug fixes and performance tuning
- [ ] Marketing campaign launch

### Month 4-6: Feature Expansion
- [ ] Apple Watch integration
- [ ] Advanced meal planning with AI
- [ ] Social features (friend challenges)
- [ ] Integration with fitness apps (Apple Health, Google Fit)

### Month 7-12: Scale & Monetization
- [ ] Premium tier launch
- [ ] Corporate wellness partnerships
- [ ] Nutritionist consultation marketplace
- [ ] White-label opportunities

---

**This plan will transform your app into a top 1% health & wellness application ready for successful App Store and Play Store launch.**

**Ready to start implementation? Let's begin with Phase 1: Security & Compliance fixes immediately.**
