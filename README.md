<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React Native"/>
  <img src="https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI"/>
</p>

<h1 align="center">
  <br>
  <img src="mobile/assets/images/icon.png" alt="MyFoodTracker" width="120">
  <br>
  MyFoodTracker
  <br>
</h1>

<h4 align="center">AI-powered wellness intelligence that learns YOUR patterns, predicts YOUR outcomes, and adapts to YOUR unique physiology.</h4>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-privacy">Privacy</a>
</p>

<p align="center">
  <img src="mobile/assets/images/dashboard-preview.png" alt="Dashboard Preview" width="280">
  <img src="mobile/assets/images/insights-preview.png" alt="Insights Preview" width="280">
  <img src="mobile/assets/images/logging-preview.png" alt="Logging Preview" width="280">
</p>

---

## Why MyFoodTracker?

**Not another calorie counter.** We built what we wished existed: an app that actually *learns* you.

| Other Apps | MyFoodTracker |
|------------|---------------|
| Generic advice for everyone | Insights from YOUR actual data |
| "Drink more water" | "Your mood was 7.2/10 on days you drank 2L+ vs 5.1/10 otherwise" |
| Static recommendations | Learns which tips actually work for you |
| Black box algorithms | Shows confidence levels and evidence |

---

## ✨ Key Features

### 🧠 Smart Learning Engine

<table>
<tr>
<td width="50%">

**Learns What Works**

Every recommendation gets smarter based on verified outcomes. If a tip helped you, you'll see more like it.

</td>
<td width="50%">

**Finds Your Patterns**

Discovers connections unique to YOUR body—things you'd never notice yourself.

</td>
</tr>
<tr>
<td width="50%">

**Honest Predictions**

Morning mood & energy forecasts with confidence levels. We tell you when we're unsure.

</td>
<td width="50%">

**Tracks Results**

After you try a suggestion, we check if it actually helped—that's how we improve.

</td>
</tr>
</table>

### 📸 Log Food in Seconds

| Method | How It Works |
|--------|--------------|
| **Photo** | Snap a pic → AI identifies ingredients → Calculates nutrition |
| **Voice** | Say "chicken salad with ranch" → Whisper transcribes → Instant logging |
| **Text** | Type "2 eggs and toast" → Smart parsing → Done |
| **Barcode** | Scan → 900,000+ product database lookup |

### 📊 Track What Matters

<table>
<tr>
<td align="center" width="25%">
<h3>🍽️</h3>
<b>Nutrition</b><br>
<sub>Calories, macros, 25+ micronutrients</sub>
</td>
<td align="center" width="25%">
<h3>😊</h3>
<b>Mood</b><br>
<sub>8 states, correlations found automatically</sub>
</td>
<td align="center" width="25%">
<h3>💧</h3>
<b>Hydration</b><br>
<sub>One-tap logging, smart reminders</sub>
</td>
<td align="center" width="25%">
<h3>🏃</h3>
<b>Activity</b><br>
<sub>CDC guidelines, impact tracking</sub>
</td>
</tr>
</table>

### 🎮 Gamification That Motivates

```
Level up as you log → Earn XP → Unlock ranks → Build streaks

Novice (1-4) → Apprentice (5-9) → Expert (10-19) → Master (20-29) → Legend (50+)
```

| Action | XP Earned |
|--------|-----------|
| Log meal (first 3) | +10 XP |
| Log water | +5 XP |
| Hit water goal | +10 XP bonus |
| Log mood | +8 XP |
| Log activity | +10-25 XP |

---

## 🔬 How It Works

### Your Personal Insights

We don't give generic advice. Every insight references YOUR actual data:

```
📊 CORRELATION DETECTED

"Your mood averaged 7.2/10 on days you drank 2000+ ml water,
versus 5.1/10 otherwise."

Evidence: 23 out of 30 days analyzed
Statistical significance: p = 0.008
Best example: Tuesday, Jan 14 at 2pm - logged "Happy" after 2400ml
```

### Discovery Engine

Our system scans your data to find patterns you'd never notice:

```
🔍 NEW DISCOVERY

"Your energy dips 6 hours after high-sugar breakfasts,
but stays stable after protein-rich ones."

This pattern is unique to YOUR data.
Correlation: r = -0.68 | Analyzed: 14 instances
```

### Honest Predictions

We tell you our confidence level—no false promises:

```
🌅 TOMORROW'S PREDICTION

Mood forecast: 6.8/10
Confidence interval: 5.9 – 7.7 (80% CI)

Why uncertain: Limited sleep data this week, new caffeine pattern detected
Model accuracy: 78% within interval over last 30 predictions
```

---

## 🛠️ Tech Stack

### Mobile App
```
React Native 0.76 + Expo SDK 54
├── Navigation: Expo Router (file-based)
├── State: React Query + AsyncStorage
├── Auth: Clerk
├── UI: Ionicons, Lottie, LinearGradient
└── Offline: SQLite via expo-sqlite
```

### Backend
```
Node.js 18+ + Express 5
├── Database: PostgreSQL (Neon) + Drizzle ORM
├── AI: OpenAI GPT-4 Vision + Whisper
├── Auth: Clerk middleware
└── Security: Cloudflare Turnstile, rate limiting
```

### Intelligence Layer
```
Smart Recommendation Engine
├── Thompson Sampling (learns from outcomes)
├── Auto-Correlation Discovery (finds patterns)
├── Platt Scaling (calibrated predictions)
└── Outcome Verification (feedback loop)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- iOS 13.4+ / Android 10+
- OpenAI API key
- Neon database (or local PostgreSQL)
- Clerk account

### Quick Start

**1. Clone & Install**
```bash
git clone https://github.com/yourusername/MyFoodTracker.git
cd MyFoodTracker
```

**2. Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

**3. Mobile Setup**
```bash
cd mobile
npm install
npx expo start
# Press 'i' for iOS or 'a' for Android
```

### Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
CLERK_SECRET_KEY=sk_...

# Mobile (configured in app.json)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## 🔒 Privacy

<table>
<tr>
<td>✅</td>
<td><b>Your Data, Your Control</b> — Export or delete everything anytime</td>
</tr>
<tr>
<td>✅</td>
<td><b>No Ads, Ever</b> — We don't show ads or sell your data</td>
</tr>
<tr>
<td>✅</td>
<td><b>GDPR/CCPA Compliant</b> — Full compliance with privacy regulations</td>
</tr>
<tr>
<td>✅</td>
<td><b>Offline-First</b> — Works without internet, syncs when ready</td>
</tr>
<tr>
<td>✅</td>
<td><b>Encrypted</b> — TLS 1.3 in transit, AES-256 at rest</td>
</tr>
</table>

---

## 📁 Project Structure

```
MyFoodTracker/
├── mobile/                    # React Native Expo app
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/           # Sign-in, sign-up
│   │   ├── (tabs)/           # Dashboard, log, profile
│   │   └── insights/         # Intelligence screens
│   ├── components/           # Reusable UI
│   ├── hooks/                # Custom hooks
│   ├── services/             # API clients
│   └── constants/            # Theme, tokens
├── backend/                   # Node.js Express API
│   └── src/
│       ├── routes/           # API endpoints
│       ├── services/         # Business logic
│       │   ├── thompsonSamplingService.js
│       │   ├── autoCorrelationDiscoveryService.js
│       │   ├── predictionEngineService.js
│       │   └── outcomeVerificationService.js
│       └── db/               # Drizzle ORM models
└── CLAUDE.md                  # AI assistant instructions
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Project guide for AI assistants |
| [mobile/docs/ARCHITECTURE.md](mobile/docs/ARCHITECTURE.md) | System architecture |
| [mobile/docs/PERSISTENCE.md](mobile/docs/PERSISTENCE.md) | Data persistence strategy |
| [backend/README.md](backend/README.md) | Backend API documentation |

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Follow existing code style (ESLint + Prettier)
4. Submit a PR with clear description

**What we're looking for:**
- Bug fixes (especially offline sync, timezone issues)
- Accessibility improvements
- Test coverage
- Documentation

---

## ⚠️ Disclaimer

MyFoodTracker is a **wellness tool**, not a medical device. It cannot diagnose conditions or replace professional medical advice. Always consult healthcare providers for medical decisions.

**Not intended to treat:** eating disorders, diabetes, or any medical condition.

---

## 📄 License

Proprietary — © 2026 MyFoodTracker. All rights reserved.

---

<p align="center">
  <b>Free forever. No ads. Your data stays yours.</b>
  <br><br>
  <a href="#">Download on App Store</a> •
  <a href="#">Get on Google Play</a>
</p>
