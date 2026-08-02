# iOS App Privacy — Answer Sheet

Fill this into **App Store Connect → MFT → App Privacy** before submitting.
Every answer below is derived from what the code actually does; the source is
cited so the form can be re-verified after future changes.

- **App:** MFT : My Food & Mood Tracker
- **Bundle ID:** `com.zennxt.myfoodtracker`
- **ASC App ID:** `6783527114`
- **Privacy policy URL:** https://my-food-tracker.com/privacy

> Rule of thumb Apple applies: if the data leaves the device, it is "collected",
> even when it is only stored in your own database and never sold.

---

## 1. Does this app collect data? → **Yes**

## 2. Data types collected

| Apple data type | Collected | Linked to identity | Used for tracking | Purpose | Where it comes from |
|---|---|---|---|---|---|
| **Contact Info → Name** | Yes | Yes | No | App Functionality | Clerk sign-up / Sign in with Apple |
| **Contact Info → Email Address** | Yes | Yes | No | App Functionality | Clerk sign-up; also attached to crash reports (`mobile/services/crashReporting.js:127`) |
| **Health & Fitness → Health** | Yes | Yes | No | App Functionality | Body metrics, weight history, mood logs — `profiles`, `weight_history`, `mood_log` |
| **Health & Fitness → Fitness** | Yes | Yes | No | App Functionality | Activity logs — `activity_log` |
| **User Content → Photos or Videos** | Yes | Yes | No | App Functionality | Meal photos sent for AI analysis (`expo-image-picker`, `expo-camera`) |
| **User Content → Audio Data** | Yes | Yes | No | App Functionality | Voice meal logging (`@react-native-voice/voice`) |
| **User Content → Other User Content** | Yes | Yes | No | App Functionality | Food logs, water logs, notes — `food_log`, `water_log` |
| **Identifiers → User ID** | Yes | Yes | No | App Functionality | Clerk user id, used as the primary key on every record |
| **Identifiers → Device ID** | Yes | Yes | No | App Functionality | FCM push token (`mobile/services/fcmService.js`, stored in `account_settings.expo_push_token`) |
| **Usage Data → Product Interaction** | Yes | Yes | No | Analytics, App Functionality | `mobile/services/analytics.js` — screen views and events, identified by user id (`analytics.js:183`) |
| **Diagnostics → Crash Data** | Yes | Yes | No | App Functionality | `mobile/services/crashReporting.js` — posted to own backend with user id + email |
| **Diagnostics → Performance Data** | Yes | Yes | No | App Functionality | Same reporting pipeline |

### Explicitly NOT collected

Answer **No** to these — nothing in the codebase touches them:

- Financial Info / Payment Info — there is no IAP, no payment SDK
- Precise or Coarse Location — no `expo-location`, no location permission declared
- Contacts, Browsing History, Search History
- Sensitive Info (race, sexual orientation, religion, biometric ID)
- Apple HealthKit data — the HealthKit integration is stubbed and disabled for 1.0
  (`mobile/services/healthPlatformService.js`), and the `NSHealth*UsageDescription`
  keys have been removed from `app.json` accordingly

## 3. Tracking

**Does this app track users? → No.**

There is no ad network, no attribution SDK, no IDFA access, and no data shared
with data brokers. Do **not** add `NSUserTrackingUsageDescription` — the App
Tracking Transparency prompt must not appear.

## 4. Account deletion (Guideline 5.1.1(v))

Required question: "Do you provide a way for users to delete their account?" → **Yes**

Reviewer path to demonstrate it:

> Profile tab → **Privacy & Data** → **Delete Account** → *Delete Everything*

This calls `DELETE /api/profile/delete-account`, which deletes the `profiles` row
(cascading to all user tables) **and** deletes the Clerk user itself, so the login
stops working. See `backend/src/controllers/profileController.js` → `deleteAccount`.
The device's local SQLite cache, React Query cache and AsyncStorage are purged by
`mobile/services/accountDeletion.js`.

## 5. Notes for App Review

- **Demo account:** required — the app is gated behind sign-in. Create a Clerk
  test user and put the credentials in App Review Information.
- **Health disclaimer:** the app gives nutrition and wellness guidance, not medical
  advice. Disclaimers are shown in-app (`mobile/app/profile/terms.jsx`,
  `mobile/app/insights/index.jsx`, `mobile/components/log/AnalysisConfidence.jsx`).
- **Third-party processors** to name in the privacy policy: Clerk (auth),
  Neon (database), Railway (hosting), OpenAI (food analysis), Firebase Cloud
  Messaging (push), Cloudflare (CDN/DNS).
- **Encryption:** `ITSAppUsesNonExemptEncryption: false` is set in `app.json`, so no
  export-compliance documentation is requested at upload.

---

*Re-verify this document whenever a new SDK, permission, or logged data type is added.*
