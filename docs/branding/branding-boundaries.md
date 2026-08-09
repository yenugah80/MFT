# Branding Boundaries

## Public Brand

- Full brand: `MFT (My Flourish Tracker)`
- Store-safe display name: `MFT : My Flourish Tracker`
- Launcher label: `MFT`

The store-safe display name is 25 characters, so it fits Apple and Google store name limits. Use this exact name in App Store Connect and Google Play Console, and use the full brand with parentheses in long-form copy when useful.

`My Flourish Tracker` replaced the earlier `My Flow Tracker` on 2026-08-09 — "Flow" reads too easily as menstrual/period tracking (the space next to apps like Flo in the Health & Fitness category), which this app is not. "Flourish" keeps the same `My ___ Tracker` shape and still starts with F, but describes the actual product: food, mood, water, and activity as one wellbeing story.

## Do Not Rename Without a Migration Plan

These identifiers are technical wiring, not public brand copy:

- Domain and URLs: `my-food-tracker.com`, `api.my-food-tracker.com`
- Expo slug and deep-link scheme: `my-food-tracker`
- Store package/bundle identifiers: `com.zennxt.myfoodtracker`
- Existing Firebase package registrations
- Existing database names, migration names, npm workspace names, and exported backup filenames

Renaming those can affect app updates, deep links, auth/Firebase config, API routing, stored user data, and launch assets.

## Pre-Submission Check

Before submitting store builds, verify the Android package ID used by the actual build matches the intended store package. `mobile/app.json` currently declares `com.zennxt.myfoodtracker`. The local generated `mobile/android` folder may drift because it is ignored by Git; regenerate or align it before local native release builds.
