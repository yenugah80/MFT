# MFT : My Food & Mood Tracker - Project Guide for Claude

## Project Overview

MFT (My Food & Mood Tracker) is a comprehensive nutrition and wellness tracking mobile application built with React Native/Expo for the frontend and Node.js/Express for the backend. The app uses AI-powered food analysis to help users track meals, hydration, activity, mood, and overall health metrics.

## Tech Stack

### Mobile App (`/mobile`)
- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Query (@tanstack/react-query) with AsyncStorage persistence
- **Authentication**: Clerk (@clerk/clerk-expo)
- **UI**: Custom components with Ionicons, expo-linear-gradient, Lottie animations
- **Local Database**: expo-sqlite for offline food log storage

### Backend (`/backend`)
- **Runtime**: Node.js with ES Modules
- **Framework**: Express 5
- **Database**: PostgreSQL via Neon (@neondatabase/serverless)
- **ORM**: Drizzle ORM
- **AI**: OpenAI API for food analysis and recommendations
- **Authentication**: Clerk middleware (@clerk/express)
- **Caching**: node-cache, Redis (optional)

### Worker (`/worker`)
- **Runtime**: Cloudflare Workers
- **Purpose**: Edge functions for background tasks

### Deployment

- **Backend**: Railway
- **API URL**: https://api.my-food-tracker.com/api
- **Database**: Neon PostgreSQL (serverless)
- **Domain**: my-food-tracker.com (Cloudflare)
- **Worker**: Cloudflare Workers

## Directory Structure

```
MFT/
├── .claude/                   # Claude Code configuration
│   ├── settings.json
│   └── memory/
├── .github/                   # GitHub workflows & templates
│   └── workflows/
├── mobile/                    # React Native Expo app
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/           # Auth screens (sign-in, sign-up)
│   │   ├── (tabs)/           # Main tab screens (dashboard, log, profile)
│   │   ├── history/          # Meal history screens
│   │   ├── insights/         # Mood insights screens
│   │   ├── onboarding/       # Onboarding flow
│   │   └── profile/          # Profile sub-screens
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── providers/            # Context providers
│   ├── services/             # API clients and services
│   ├── constants/            # Design tokens, theme, daily values
│   └── utils/                # App-specific utilities
├── backend/                   # Node.js Express API
│   └── src/
│       ├── routes/           # API route handlers
│       ├── services/         # Business logic services
│       ├── models/           # Drizzle ORM models
│       ├── middleware/       # Express middleware
│       ├── utils/            # Backend utilities
│       └── config/           # Configuration (db, etc.)
├── worker/                    # Cloudflare Worker
│   └── src/
├── shared/                    # Shared code (npm workspace)
│   ├── utils/                # Shared utilities (animations, toast)
│   ├── types/                # Shared TypeScript types
│   └── i18n/                 # Internationalization files
├── agents/                    # AI agents & automation
│   ├── design-system.md      # Design token reference for all agents
│   └── skills/               # Claude Code custom skills
├── docs/                      # Documentation
│   ├── api/                  # API documentation
│   ├── architecture/         # Architecture docs
│   ├── branding/             # Brand guidelines & rename tracking
│   ├── database/             # SQL migrations & schema docs
│   ├── infrastructure/       # DNS, deployment config docs
│   └── proposals/            # Feature proposals
├── store-assets/              # App store assets
│   ├── google-play/          # Android store assets
│   └── screenshots/          # App preview screenshots
├── scripts/                   # Build & deployment scripts
├── .github/                   # GitHub workflows & Copilot instructions
│   ├── workflows/            # CI/CD pipelines
│   └── copilot-instructions.md
├── CLAUDE.md                  # This file
├── .mcp.json                  # MCP server configuration
├── package.json               # Root workspace config
├── railway.toml               # Railway deployment config
└── README.md
```

## Key Files

### Mobile
- `mobile/app/_layout.jsx` - Root layout with providers
- `mobile/app/(tabs)/_layout.jsx` - Tab navigation with OnboardingGuard
- `mobile/components/DashboardContent.jsx` - Main dashboard UI
- `mobile/hooks/useFoodAnalysis.js` - Food analysis logic
- `mobile/services/apiClient.js` - Axios API client with Clerk auth
- `mobile/constants/designTokens.js` - Dark theme tokens (COLORS)
- `mobile/constants/premiumTheme.js` - Light theme tokens (TEXT, SURFACES, BRAND)

### Backend
- `backend/src/server.js` - Express server entry point
- `backend/src/routes/resolve.js` - Food analysis endpoint
- `backend/src/routes/food.js` - Food logging endpoints
- `backend/src/routes/nutrition.js` - Dashboard data endpoint
- `backend/src/services/smartNutritionResolver.js` - AI nutrition lookup

### Shared
- `shared/utils/` - Reusable utilities across apps
- `shared/types/` - TypeScript type definitions
- `shared/i18n/` - Translation files (es, fr, hi, zh)

## Agent & Skill Resources

- **Design System Reference**: `agents/design-system.md` — complete token reference for all agents and skills. Read before writing any mobile UI code.
- **UI Component Skill**: `agents/skills/ui-component.md` — invoke with `/ui-component <description>` to scaffold components following the design system.

## Theme System

**IMPORTANT**: The app uses a light background theme. Use these constants correctly:

```javascript
// For dark text on light background (CORRECT for current theme)
import { TEXT, SURFACES, BRAND } from '../constants/premiumTheme';
// TEXT.primary = '#111827' (dark gray)
// TEXT.secondary = '#4B5563' (medium gray)
// TEXT.tertiary = '#6B7280' (light gray)

// For dark backgrounds (OLD - causes white-on-white issues)
import { COLORS } from '../constants/designTokens';
// COLORS.text.primary = '#f8fafc' (white - DON'T USE for text on light bg)
```

## Common Patterns

### API Calls
```javascript
import apiClient from '../services/apiClient';
// Automatically includes Clerk auth token
const response = await apiClient.get('/nutrition/dashboard');
```

### React Query Hooks
```javascript
// Dashboard data
const { data, isLoading, error, refetch } = useDashboard();

// Food analysis
const { analyzeFoodItem, isAnalyzing } = useFoodAnalysis();
```

### Navigation
```javascript
import { useRouter } from 'expo-router';
const router = useRouter();
router.push('/(tabs)/log');
router.replace('/(tabs)/dashboard');
```

## Development Commands

### Root (npm workspaces)
```bash
npm run dev              # Start backend
npm run dev:mobile       # Start mobile Metro bundler
npm run dev:worker       # Start worker dev server
npm run lint             # Lint all workspaces
npm run test             # Test all workspaces
```

### Mobile
```bash
cd mobile
npm start              # Start Metro bundler
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
```

### Backend
```bash
cd backend
npm run dev            # Start with nodemon (hot reload)
npm start              # Production start
npm run drizzle:migrate # Run database migrations
```

### Worker
```bash
cd worker
npm run dev            # Start local dev server
npm run deploy         # Deploy to Cloudflare
```

## Common Issues & Solutions

### White text on white background
- **Cause**: Using `COLORS.text.*` (dark theme) instead of `TEXT.*` (light theme)
- **Fix**: Replace `COLORS.text.primary` with `TEXT.primary` in styles

### Duplicate food items in meal breakdown
- **Cause**: Items not deduplicated by itemId or name
- **Fix**: Use deduplication logic in FoodItemsList.js

### Food names showing wrong (hallucinated)
- **Cause**: Backend smartNutritionResolver overwriting original parsed name
- **Fix**: Preserve `parsedFood.name` in resolve.js instead of using `nutrition.foodName`

### Back button not working in history
- **Cause**: hitSlop too small, negative margins causing overlap
- **Fix**: Increase hitSlop, use `router.replace()` instead of `router.back()`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/nutrition/dashboard` | GET | Dashboard summary data |
| `/api/food/log` | POST | Log a food item |
| `/api/food/resolve` | POST | Analyze food with AI |
| `/api/mood/log` | POST | Log mood entry |
| `/api/water/log` | POST | Log water intake |
| `/api/profile/me` | GET | Get user profile |
| `/api/recommendations` | GET | Get AI food recommendations |

## Testing Food Analysis

When testing food analysis with complex meals like "rice with chicken curry":
1. The parser splits this into individual items: ["rice", "chicken curry"]
2. Each item gets nutrition data from OpenAI
3. Items should preserve their original parsed names
4. UI should show all items without duplicates

## Git Workflow

- Backend deploys on Railway (auto-deploy from main branch)
- Commit messages should follow conventional commits format
- Always include the Claude Code co-author attribution

```bash
git commit -m "fix: Description of fix

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
