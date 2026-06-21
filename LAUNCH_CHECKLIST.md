# MyFoodTracker — Play Store Launch Checklist

Last updated: 2026-06-18

---

## ✅ DONE — What We Have

| Item | Detail |
|------|--------|
| `app.json` package name | `com.zennxt.myfoodtracker` (Android + iOS) |
| Firebase Android app registered | App ID `...e16a24b90d74dcf3702159`, package `com.zennxt.myfoodtracker` |
| Firebase iOS app registered | App ID `...786b9d351d8d532a702159`, bundle `com.zennxt.myfoodtracker` |
| `google-services.json` | Updated with correct package, points to `myft-a9fc5` |
| `GoogleService-Info.plist` | Updated with correct bundle ID, points to `myft-a9fc5` |
| Clerk production key | `pk_live_...` in `mobile/.env` AND EAS production env |
| Production API URL | `https://api.my-food-tracker.com/api` in `.env` |
| Log level | `error` (not `debug`) in `.env` |
| AuthKey (iOS) | `AuthKey_XYN85P5666.p8` copied to `mobile/` |
| EAS iOS submit config | `appleTeamId`, `ascApiKeyPath`, `ascApiKeyId`, `ascApiKeyIssuerId` all set |
| EAS build profiles | `development`, `preview`, `production` configured in `eas.json` |
| `.gitignore` | `*.p8`, `google-services.json`, `google-service-account.json` excluded |
| App icon | 1024×1024 RGB (no alpha) |
| Backend deployed | Railway at `https://api.my-food-tracker.com/api` |

---

## 🔴 BLOCKERS — Must do before ANY Play Store submission

### 1. Google Play Service Account Key
**Status:** MISSING — `mobile/google-service-account.json` does not exist

Steps:
1. Go to [Google Play Console](https://play.google.com/console) → Setup → API access
2. Link to a Google Cloud project (or create one)
3. Click **Create new service account**
4. In Google Cloud IAM, grant it **Release Manager** role
5. Download the JSON key file
6. Save it to `mobile/google-service-account.json`

```bash
# Verify EAS can find it before building
ls mobile/google-service-account.json
```

---

### 2. Create the App in Google Play Console
**Status:** NOT CREATED — no Play Console app listing exists yet

Steps:
1. Go to [Google Play Console](https://play.google.com/console) → **Create app**
2. App name: `My-Food-Tracker`
3. Default language: English (United States)
4. App or game: **App**
5. Free or paid: **Free**
6. Accept policies → **Create app**

---

### 3. Fix EAS iOS ascAppId (iOS only — not a Play Store blocker)
**Status:** Placeholder `ASC_APP_ID_HERE` in `mobile/eas.json`

Fix before iOS submission:
1. Go to App Store Connect → My Apps → your app → App Information
2. Copy the **Apple ID** (10-digit number)
3. Replace `ASC_APP_ID_HERE` in `mobile/eas.json`

---

### 4. Upgrade EAS CLI
**Status:** Using `18.4.0`, latest is `20.2.0`

```bash
npm install -g eas-cli
```

---

## 🟡 HIGH PRIORITY — Required before Play Store review approval

### 5. Privacy Policy — live public URL
**Status:** Content exists in `mobile/app/privacy.jsx` but needs a live URL

- Publish at `https://my-food-tracker.com/privacy`
- Play Store requires a publicly accessible URL (not an in-app screen)

### 6. Add SHA fingerprints to Firebase
**Status:** Not added — Firebase push notifications won't work in production without these

After running a production build, get the fingerprints:
```bash
cd mobile
eas credentials --platform android
# Copy the SHA-1 and SHA-256 fingerprints shown
```
Then in Firebase Console → My-Food-Tracker → Project Settings → Android app → Add fingerprint

### 7. Data Safety Form in Play Console
**Status:** Not filled out — required before publishing

Your app collects:
- Name, email (Clerk auth)
- Food logs, nutrition data
- Mood entries
- Water intake
- Health metrics (steps, heart rate if Health Connect used)

Go to Play Console → your app → **Data safety** → fill out each section accurately.

### 8. Content Rating Questionnaire
**Status:** Not completed

Go to Play Console → your app → **Content rating** → start questionnaire
Expected result: **Everyone** or **Teen**

---

## 🟢 STORE LISTING — Play Console content to fill in

Go to Play Console → your app → **Main store listing**:

- [ ] **App name** — `My-Food-Tracker` (max 30 chars)
- [ ] **Short description** — max 80 chars (e.g. `AI-powered nutrition & wellness tracker`)
- [ ] **Full description** — max 4000 chars
- [ ] **App icon** — 512×512 PNG (already have 1024×1024, resize it)
- [ ] **Feature graphic** — 1024×500 JPG or PNG (banner shown on Play Store)
- [ ] **Phone screenshots** — min 2, max 8 (recommend 5–6 key screens)
- [ ] **7-inch tablet screenshots** — required for full review
- [ ] **10-inch tablet screenshots** — required for full review
- [ ] **Category** — Health & Fitness
- [ ] **Email address** — your support email
- [ ] **Privacy policy URL** — `https://my-food-tracker.com/privacy`

---

## 🔵 BUILD & SUBMIT — Final steps

### Step 1 — Upgrade EAS CLI first
```bash
npm install -g eas-cli
```

### Step 2 — Trigger production build
```bash
cd mobile
eas build --platform android --profile production
```
Watch for errors. Last two builds errored — confirm this one succeeds before submitting.

### Step 3 — Check the build output
```bash
eas build:list --platform android --limit 1
```
Status must be `finished` (not `errored`).

### Step 4 — Submit to Internal Testing first
```bash
# Temporarily change "track" to "internal" in mobile/eas.json, then:
eas submit --platform android --profile production
```
Or upload the `.aab` manually via Play Console → Testing → Internal testing → Create new release.

### Step 5 — Promote to Production
After internal testing passes:
Play Console → your app → Production → Create new release → Promote from Internal testing

---

## 📋 QUICK STATUS SUMMARY

| # | Item | Status |
|---|------|--------|
| 1 | Google Play service account JSON | ❌ Missing |
| 2 | Create app in Play Console | ❌ Not done |
| 3 | Privacy policy live URL | ❌ Not hosted |
| 4 | Add SHA fingerprints to Firebase | ❌ Not done |
| 5 | Data safety form | ❌ Not filled |
| 6 | Content rating questionnaire | ❌ Not done |
| 7 | Store listing (description, screenshots, feature graphic) | ❌ Not done |
| 8 | Successful production Android build | ❌ Last build errored |
| 9 | EAS CLI upgrade | ⚠️ 18.4.0 → 20.2.0 available |
| 10 | iOS ascAppId in eas.json | ⚠️ Placeholder (iOS only, not Play Store) |
| 11 | Clerk live key | ✅ Done |
| 12 | Firebase config (Android + iOS) | ✅ Done today |
| 13 | AuthKey.p8 in place | ✅ Done today |
| 14 | Production API URL | ✅ Done |
| 15 | EAS build profiles | ✅ Done |
