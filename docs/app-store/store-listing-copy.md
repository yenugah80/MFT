# App Store Listing Copy — Draft

Fill this into **App Store Connect → MFT → App Store → [version]** and
**App Information**. Everything below is grounded in what the app actually
does (verified against the real routes/screens this session), not generic
placeholder copy — check it still matches before pasting if features have
changed since this was drafted.

- **App:** MFT : My Flourish Tracker
- **Bundle ID:** `com.zennxt.myfoodtracker`
- **ASC App ID:** `6783527114`

---

## App Name (App Information → Name)

```
MFT : My Flourish Tracker
```

(25 characters — fits Apple's 30-char limit. Do not shorten or rename per
`docs/branding/branding-boundaries.md`.)

## Subtitle (App Information → Subtitle, 30 chars max)

```
AI Food, Mood & Wellness Log
```

(28 characters.)

## Category (App Information → Category)

**Primary:** Health & Fitness
**Secondary (optional):** Food & Drink

## Promotional Text (App Store → Promotional Text, 170 chars max, editable without a new build)

```
Log a meal by photo, voice, or text — MFT estimates the nutrition and
shows how it connects to your mood, sleep, and energy. No manual macro
math required.
```

## Description (App Store → Description, 4000 chars max)

```
MFT (My Flourish Tracker) is a wellbeing tracker that connects the dots
between what you eat, how you sleep, how you move, and how you feel —
instead of treating them as four separate apps.

LOG IN SECONDS, NOT MINUTES
Describe a meal in your own words, snap a photo, or just talk — MFT's AI
estimates calories, protein, carbs, fat, and key micronutrients for you.
No barcode required, no manual macro math.

SEE THE WHOLE PICTURE
Track meals, water, mood, activity, sleep, and stress in one place. MFT's
Your Progress dashboard shows Day, Week, and Month views for every one of
them, so you're not stuck staring at "today" forever.

FIND YOUR OWN PATTERNS
MFT's insight engine looks for real correlations in your own data — like
how your hydration relates to your energy, or how a low-protein breakfast
shows up in your mood a few hours later — and surfaces them as plain-
language insights, not a spreadsheet.

STAY MOTIVATED WITHOUT THE GUILT
Streaks, levels, and achievements reward consistency — including a
Snapchat-style streak freeze so one missed day doesn't wipe out weeks of
progress. Every recommendation is grounded in your actual logged data, not
a generic meal plan.

BUILT FOR PRIVACY
Optional biometric app lock (Face ID / Touch ID) keeps your health data
private even if your phone is unlocked. You control what's tracked, and
your data is never sold.

WHAT YOU CAN TRACK
• Meals — photo, voice, or text, with AI-estimated nutrition
• Water — with a visual daily goal and hydration streak
• Mood — with intensity, tags, and food/sleep correlations
• Activity — MET-based calorie estimates across 14+ activity types
• Sleep — duration, quality, and what affects it (caffeine, screens, more)
• Stress — level, triggers, physical symptoms, and what actually helps

MFT works best when used daily, but there's no pressure — missed a day?
Streak freezes and a "fresh start" flow mean you pick back up, not start
over.
```

## Keywords (App Store → Keywords, 100 chars max, comma-separated, no spaces after commas)

```
nutrition,calorie,diet,sleep,water,hydration,stress,health,macro,journal,habit,selfcare,streak
```

(94 characters, verified via direct length count — leaves 6 chars of
margin. Apple's search index already weights the App Name ("MFT : My
Flourish Tracker" → indexes "flourish", "tracker") and Subtitle ("AI Food,
Mood & Wellness Log" → indexes "ai", "food", "mood", "wellness", "log")
higher than the Keywords field, and does not re-rank a term for appearing
twice — so the previous draft was spending ~30 of its 100 characters
re-listing "food", "tracker", "mood", "wellness", "ai", all already
indexed for free. This revision drops those and spends the reclaimed
budget on:
- **"stress"** — a full tracked category in the app (stress level,
  triggers, physical symptoms) that was entirely absent from the previous
  keyword list, a real gap, not a stylistic tweak.
- **"streak"** and **"selfcare"** — real differentiators (streak-freeze
  gamification; broad self-care search intent) not covered by Name or
  Subtitle.
- **"diet"** — high-volume adjacent search term for this category, not
  previously present.

Apple keywords aren't shown publicly, only used for search indexing, so
no need to work them into the description too.)

## Support URL (App Information → Support URL)

```
https://my-food-tracker.com/support
```

(Confirmed live, HTTP 200, at draft time.)

## Marketing URL (App Information → Marketing URL, optional)

```
https://my-food-tracker.com
```

## Privacy Policy URL (App Privacy → Privacy Policy URL)

```
https://my-food-tracker.com/privacy
```

(Confirmed live, HTTP 200, at draft time.)

## Copyright (App Information → Copyright)

```
2026 Zennxt LLC
```

---

## What's NOT drafted here

- **App Privacy questionnaire answers** (data types collected, linked to
  identity, used for tracking) — already fully drafted in
  `docs/app-store/ios-app-privacy.md`, use that instead.
- **Screenshots** — separate blocker, tracked in
  `docs/architecture/mft-app-store-launch-status.md` (only one device size
  has real captures as of last check).
- **App Review notes / demo account credentials** — the demo account
  (`support@my-food-tracker.com`) already exists and is documented in
  memory; add its credentials to the "App Review Information" section
  in ASC (Sign-In required: Yes) before submitting, since Apple's
  reviewer needs a way in.
