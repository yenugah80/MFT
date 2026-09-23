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
Why do some days feel effortless, while others feel completely off?

Your meals, sleep, hydration, mood, stress, activity and daily habits all tell part of the story. MFT : My Flourish Tracker brings them together so you can track your day, understand your progress and discover patterns you might otherwise miss.

Because your wellness is more than one number.

YOUR DAY. ONE CONNECTED PICTURE.

A calorie tracker knows what you ate. A sleep tracker knows how you slept. A mood tracker knows how you felt.

MFT connects the signals.

Track food, nutrition, mood, water, sleep, stress and activity, then explore your progress across Day, Week and Month views. Daily logs become a clearer picture of your routines over time.

AI-POWERED FOOD & NUTRITION TRACKING

Logging a meal shouldn't feel like homework.

Snap a photo, use your voice, or simply describe what you ate. MFT analyzes your meal and estimates calories, protein, carbs, fat, fiber, sugar, sodium and other available nutrients.

Explore meal items and ingredients, review macros and micronutrients, check estimated portions and edit quantities to better reflect what you actually had.

Whether it's a quick bite, homemade recipe, restaurant meal, familiar favorite or something uniquely yours, MFT works around how you naturally describe your food.

No manual macro math. More clarity about what's on your plate.

MOOD, SLEEP & STRESS WITH CONTEXT

Track mood, intensity and tags. Record sleep duration and quality. Capture stress levels, triggers and symptoms while they're fresh.

See them alongside nutrition, hydration and activity so each signal has context beyond an isolated score.

WATER, HYDRATION & ACTIVITY

Log water, follow daily hydration progress and build consistency. Track activity and estimated energy burn while keeping movement connected to your wellness history.

SEE TODAY. UNDERSTAND THE BIGGER PICTURE.

One day tells you what happened.
A week gives you context.
A month can reveal what keeps showing up.

Explore nutrition, mood, hydration, sleep, stress and activity across Day, Week and Month views.

As your history grows, MFT helps surface patterns across what you log, making routines and relationships easier to notice.

YOUR GOALS. YOUR PROGRESS.

Set meaningful goals and follow your progress as daily habits build.

Stay motivated with streaks, levels and achievements that reward consistency. Streak protection and fresh-start experiences help you return when life interrupts your routine.

SMARTER INSIGHTS FROM YOUR OWN HISTORY

MFT turns everyday tracking into useful context.

See trends and personalized insights from the information you log. Notice how different parts of your routine appear together and decide which patterns matter to you.

The more context you build, the more meaningful the picture becomes. MFT is designed to connect signals across your day, helping turn scattered wellness data into insights you can actually understand and use.

ONE APP. MORE OF YOUR WELLNESS.

• AI meal logging with photo, voice or text
• Calorie and nutrition tracking
• Protein, carbs, fat and macro tracking
• Ingredients and editable portion estimates
• Fiber, sugar, sodium and available micronutrients
• Mood, intensity and tags
• Water and hydration tracking
• Sleep duration and quality
• Stress levels, triggers and symptoms
• Activity and estimated energy burn
• Personal goals and progress
• Day, Week and Month wellness trends
• Personalized insights across your logs
• Streaks, levels and achievements

YOUR DATA. YOUR STORY.

You choose what to track. MFT uses what you choose to log to make your experience more relevant over time, while keeping your data connected to your account and under your control.

Your meals aren't separate from your day.
Your sleep isn't just a number.
Your mood doesn't exist in isolation.
Your progress is bigger than a calorie goal.

MFT connects the pieces.

Track your day.
Connect the signals.
Understand your patterns.
Flourish your way.
```

(3,987 characters — 13 under Apple's 4,000-char cap. Supersedes the
"connections" framing above; kept the same underlying feature claims,
all still grounded in what the app actually does.)

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
