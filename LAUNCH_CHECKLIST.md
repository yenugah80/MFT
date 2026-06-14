# MyFoodTracker — Launch Checklist

Last updated: 2026-06-13

## ✅ Fixed (done automatically)

- [x] **App icon** — regenerated as 1024×1024 RGB (no alpha) → `mobile/assets/styles/images/icon.png`
- [x] **`app.json` icon path** — updated top-level `icon` to reference new `icon.png`
- [x] **Privacy manifest duplicates** — removed duplicate `NSPrivacyAccessedAPICategoryUserDefaults` and `NSPrivacyAccessedAPICategoryFileTimestamp` entries
- [x] **Speech recognition permission** — added `NSSpeechRecognitionUsageDescription` to `ios.infoPlist`
- [x] **Log level** — changed `EXPO_PUBLIC_LOG_LEVEL` from `debug` → `error` in `mobile/.env`

---

## 🔴 Blockers — Must fix before submission

### Credentials you need to fill in yourself

- [ ] **Clerk production key** — in `mobile/.env`, replace `pk_test_...` with your `pk_live_...` key from Clerk dashboard → API Keys → Production
  - Also set this as an EAS secret: `eas secret:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_xxx`

- [ ] **EAS submit: Apple credentials** — in `mobile/eas.json`, fill in:
  - `"appleId"` → your Apple ID email (e.g. `you@example.com`)
  - `"ascAppId"` → your App Store Connect App ID (10-digit number, found in App Store Connect → App → App Information → Apple ID)
  - `"appleTeamId"` → your 10-character Apple Developer Team ID (found at developer.apple.com → Account → Membership, looks like `ABC123DEFG`)

- [ ] **Google Play service account** — `mobile/eas.json` references `./google-service-account.json` but the file is missing
  - Go to Google Play Console → Setup → API access → Create service account
  - Grant it "Release manager" role
  - Download the JSON key and save to `mobile/google-service-account.json`
  - Add to `.gitignore` immediately after

### In-app purchases

- [x] **Subscription system** — Paywall now shows "Subscriptions Coming Soon" with a "Continue for Free" button instead of the broken purchase flow. Feature gates still open the Paywall (to show users what's ahead), but no purchase can be triggered. Wire up RevenueCat for v1.1.

---

## 🟡 High Priority — Do before submitting store listing

- [ ] **Host Privacy Policy at a public URL** — both stores require a live URL (not an in-app screen)
  - Suggested: `https://my-food-tracker.com/privacy`
  - The content already exists in `mobile/app/privacy.jsx` — just host it as a webpage

- [ ] **Host Terms of Service at a public URL**
  - Suggested: `https://my-food-tracker.com/terms`
  - Content is in `mobile/app/terms.jsx`

- [ ] **Create dedicated splash screen image** — currently reuses the icon
  - Create `mobile/assets/styles/images/splash.png` at 2048×2732 (portrait) with a centered logo on a solid background
  - Update `expo-splash-screen` plugin config in `app.json` to reference it

- [ ] **Remove `android.permission.MODIFY_AUDIO_SETTINGS`** from `app.json` if voice input doesn't need it
  - This permission controls audio output (speaker/headphone routing), not microphone input
  - Play Store may flag it as unnecessary — remove if your voice logging only reads mic input

---

## 🟢 Store Listing Requirements

### App Store Connect
- [ ] App name, subtitle, description, keywords
- [ ] Screenshots — **6.7" iPhone required** + 6.5", 5.5"
- [ ] iPad screenshots — required because `supportsTablet: true` in `app.json`
- [ ] Age rating questionnaire (likely 4+)
- [ ] Category: Health & Fitness
- [ ] Privacy policy URL (public, live)
- [ ] Support URL (live)
- [ ] Content rights declaration
- [ ] Sign in with Apple enabled in Apple Developer account for Clerk auth

### Google Play Console
- [ ] Store listing: title, short description (80 chars), full description (4000 chars)
- [ ] Screenshots: Phone (min 2), 7" tablet, 10" tablet
- [ ] Feature graphic: 1024×500
- [ ] Category: Health & Fitness
- [ ] Privacy policy URL (public, live)
- [ ] **Data safety form** — you collect name, email, nutrition data, mood, water intake, health metrics
  - Fill this out accurately — inaccurate data safety disclosure is grounds for removal
- [ ] Content rating questionnaire (target: 13+)
- [ ] App access: provide test account credentials in review notes
  - Test email/password so reviewers can log in and test the app

---

## 🔵 Build & Technical

- [ ] Run `eas build --platform all --profile production` and confirm both succeed
- [ ] Test production build on real device (not simulator) — camera, voice, and push notifications require real hardware
- [ ] Verify API calls in production build hit `https://api.my-food-tracker.com/api` (not localhost/IP)
- [ ] Test onboarding flow end-to-end on a fresh account
- [ ] Test that `@react-native-voice/voice` works in production build (it's excluded from expo doctor checks)

---

## Submission commands (once everything above is done)

```bash
# Build
eas build --platform all --profile production

# Submit iOS
eas submit --platform ios --profile production

# Submit Android
eas submit --platform android --profile production
```
