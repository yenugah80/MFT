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
AI Food, Mood & Sleep Tracker
```

(29 characters. Revised from "...Wellness Log" — "sleep" is a
high-intent search term not covered anywhere else in Name/Keywords, and
subtitle is weighted higher than the Keywords field by Apple's search
index, so it's worth spending on a term not already indexed for free.
"wellness" and "log" were generic/low-intent by comparison.)

## Category (App Information → Category)

**Primary:** Health & Fitness
**Secondary (optional):** Food & Drink

## Promotional Text (App Store → Promotional Text, 170 chars max, editable without a new build)

```
Snap, speak, or type a meal — MFT decodes it instantly and reveals how
it's shaping your mood, sleep, and energy. No macro math. Just your
patterns, finally visible.
```

(165 characters, 5 char margin. Leads with the three logging methods as
a concrete hook — imperative, no wasted words. "Decodes" and "reveals"
replace the flatter "estimates"/"shows" from the prior draft: both are
sharper verbs that imply the AI is doing work *for* the reader, and
"reveals" sets up the payoff line instead of just restating a feature.
Closes on the emotional hook — "finally visible" — because promotional
text's job isn't to inform, it's to make someone tap through mid-scroll.)

## Description (App Store → Description, 4000 chars max)

```
Your meals, mood, sleep, and energy aren't separate numbers — they're one
story your body's been trying to tell you. Most trackers only show you
the data. MFT shows you the connections.

LOG IN SECONDS, NOT MINUTES
Describe your meal in plain English, snap a photo, or just say it out
loud — MFT's AI estimates calories, protein, carbs, fat, and key
micronutrients before you've even sat down to eat. No barcodes. No
manual macro math.

SEE THE WHOLE PICTURE
Meals, water, mood, activity, sleep, and stress — all in one dashboard,
viewed by Day, Week, or Month. Zoom out and watch weeks of "today"
finally add up to something.

FIND YOUR OWN PATTERNS
MFT's insight engine digs through your own data for real correlations —
the way your hydration tracks your energy, or how a low-protein
breakfast shows up in your mood hours later — and hands them to you in
plain language. No spreadsheet required.

STAY MOTIVATED WITHOUT THE GUILT
Streaks, levels, and achievements keep you coming back — including a
Snapchat-style streak freeze, so one off day doesn't erase weeks of
progress. Every recommendation MFT gives you is built from your actual
logs, never a generic meal plan pulled off a shelf.

BUILT FOR PRIVACY
Your health data is yours. Lock the app behind Face ID or Touch ID so it
stays private even if your phone doesn't. You control what's tracked —
and it's never sold.

WHAT YOU CAN TRACK
• Meals — photo, voice, or text, with AI-estimated nutrition
• Water — visual daily goals, plus a hydration streak
• Mood — intensity, tags, and real food/sleep correlations
• Activity — MET-based calorie estimates across 14+ activity types
• Sleep — duration, quality, and what's actually affecting it (caffeine,
  screens, and more)
• Stress — level, triggers, physical symptoms, and what actually helps

MFT works best daily, but life happens — miss a day and streak freezes
plus a "fresh start" flow mean you pick back up, not start over.

Download MFT and find out what your data's been trying to tell you.
```

(Rewritten for sharper, more active copy throughout — stronger verbs
("digs through," "decodes," "hands them to you") in place of flatter
ones ("looks for," "estimates," "surfaces"), tighter sentences, and a
consistent voice that talks *to* the reader instead of describing the
app in third person. Opening hook reframed as a contrast ("most
trackers only show you the data. MFT shows you the connections.") so
the payoff lands in the same beat as the problem, not a sentence later.
Same facts, same structure, same claims — every feature named here is
still grounded in what the app actually does; nothing here should be
pasted without re-checking it still matches current functionality.
Closing line kept as a direct CTA — description text isn't
search-indexed, so its only job is converting a reader who's already
scrolled this far into tapping Get.)

## Keywords (App Store → Keywords, 100 chars max, comma-separated, no spaces after commas)

```
nutrition,calorie,diet,sleep,hydration,stress,health,macro,energy,habit,selfcare,streak,activity
```

(96 characters, verified via direct length count — leaves 4 chars of
margin. Apple's search index already weights the App Name ("MFT : My
Flourish Tracker" → indexes "flourish", "tracker") and Subtitle ("AI Food,
Mood & Sleep Tracker" → indexes "ai", "food", "mood", "sleep", "tracker")
higher than the Keywords field, and does not re-rank a term for appearing
twice — so this list avoids re-spending characters on "food"/"mood"/
"sleep"/"tracker", already covered for free. Swapped "journal" → "energy"
(generic vs. a direct match for the app's actual mood/sleep/energy
correlation feature) and dropped "water" in favor of "activity" (water
is redundant with "hydration" — same tracked category, weaker search
term — while "activity" is a full tracked category, MET-based exercise
logging, that had no keyword coverage at all). Full coverage check
across every tracked category in the app: food/mood/sleep → Subtitle;
hydration/stress/activity → Keywords. Kept from the prior revision:
- **"stress"** — a full tracked category (level, triggers, physical
  symptoms), not covered by Name or Subtitle.
- **"streak"** and **"selfcare"** — real differentiators (streak-freeze
  gamification; broad self-care search intent).
- **"diet"** — high-volume adjacent search term for this category.

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
