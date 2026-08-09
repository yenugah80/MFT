# Brand Rename Todos

Target public name: `MFT : My Flourish Tracker`

**2026-08-09:** Changed from `MFT : My Flow Tracker` to `MFT : My Flourish Tracker`.
"Flow" reads too easily as menstrual/period tracking in the Health & Fitness
category (see e.g. the Flo app) — this app has nothing to do with that.
"Flourish" keeps the same shape and still starts with F, but actually
describes the product: food, mood, water, and activity as one wellbeing
story. Everything below that referenced "Flow" has been updated to
"Flourish"; nothing else about the rename scope changed.

## Done

- Updated committed Expo display name in `mobile/app.json`.
- Kept Expo slug and deep-link scheme as `my-food-tracker`.
- Kept iOS bundle ID and Android package as `com.zennxt.myfoodtracker`.
- Updated app permission copy to use `MFT`.
- Updated in-app visible brand text, legal text, profile footer, onboarding copy, share messages, and dashboard headers.
- Updated README, CLAUDE, architecture/docs, design-system comments, and static landing page references.
- Renamed root npm package metadata from `myfoodtracker` to `mft` and refreshed `package-lock.json`.
- Updated exported privacy data filename from `myfoodtracker-data-...json` to `mft-data-...json`.
- Aligned the local generated Android folder to `com.zennxt.myfoodtracker` for local native builds.
- Verified Firebase apps already use namespace `com.zennxt.myfoodtracker`.
- Verified Firebase project/app display labels were updated in Firebase Console.
- Replaced local Android Firebase config with the clean active `com.zennxt.myfoodtracker` config.
- Verified local iOS Firebase config points to active app ID `1:1012021599388:ios:786b9d351d8d532a702159`.

## Queued

- Set App Store Connect app name to `MFT : My Flourish Tracker`.
- Set Google Play Console app name to `MFT : My Flourish Tracker`.

## Keep Stable

- Domain: `my-food-tracker.com`
- API domain: `api.my-food-tracker.com`
- Expo slug: `my-food-tracker`
- Deep-link scheme: `my-food-tracker`
- Store package/bundle ID: `com.zennxt.myfoodtracker`
- Firebase app namespaces: `com.zennxt.myfoodtracker`
- Existing database fallback name: `myfoodtracker`, unless a real database migration is planned.
