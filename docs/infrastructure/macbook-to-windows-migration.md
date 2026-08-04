# Continuing MFT Development on Windows (Mac → Windows Migration)

Reference for switching primary dev machines away from the current MacBook. Written 2026-08-04 because the App Store submission credentials only exist on that machine.

## TL;DR

MFT builds/submits through **EAS Build** (`mobile/eas.json`), which compiles iOS binaries in Expo's cloud — Xcode and macOS are not required locally. Development, builds, and App Store submission can all continue from Windows. The only blocker is copying signing credentials off the Mac before it's returned.

## What works from Windows, no Mac required

- All code editing (`/mobile`, `/backend`, `/worker`, `/shared`) — plain Node/JS, no native toolchain needed
- `eas build --platform ios --profile production` — cloud build
- `eas submit --platform ios` — cloud submission to App Store Connect
- OTA JS updates via `expo-updates` for most bug fixes (no full rebuild needed)
- Backend (Railway) and worker (Cloudflare) deploys — already platform-agnostic

## What's lost without a Mac

- Local iOS Simulator (use a physical iPhone + Expo Go / an EAS internal-distribution dev build instead)
- Xcode-specific native debugging (Instruments, native crash symbolication) — only relevant if writing custom native modules

## Credential inventory (as of 2026-08-04)

All three keys below are correctly `.gitignore`d — none are in git history, so none can be recovered by cloning the repo on a new machine. They must be copied off the Mac manually.

| File | Location | Status on this Mac | Used for |
|---|---|---|---|
| `AuthKey_XYN85P5666.p8` | `mobile/AuthKey_XYN85P5666.p8` | **Exists locally** | App Store Connect API key — signs `eas submit` for iOS |
| `google-service-account.json` | `mobile/google-service-account.json` | **Does not exist locally** | Google Play service account — signs `eas submit` for Android |
| `firebase-service-account.json` | `backend/firebase-service-account.json` | Not checked for existence (gitignore confirmed only) | Firebase admin access from backend |

Referenced in `mobile/eas.json`:
```json
"submit": {
  "production": {
    "ios": {
      "appleTeamId": "8R3UBMWJ2P",
      "ascAppId": "6783527114",
      "ascApiKeyPath": "./AuthKey_XYN85P5666.p8",
      "ascApiKeyId": "XYN85P5666",
      "ascApiKeyIssuerId": "49aa0f0c-ae4c-4e7b-86f1-0e75917999ec"
    },
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "production"
    }
  }
}
```

## Action items before returning the MacBook

1. **Copy `mobile/AuthKey_XYN85P5666.p8` off the Mac.** This is the critical one — it's the only copy and it can sign submissions to your App Store Connect account. Use one of:
   - A password manager that supports file attachments (1Password, Bitwarden)
   - AirDrop/copy to a device you already own
   - An encrypted USB drive
   - Do **not** email it or put it in unencrypted cloud storage.
2. **Locate `mobile/google-service-account.json`** if Android production submission has ever been configured — it wasn't found on this machine, so it may live in Google Cloud Console (re-downloadable) or on another device.
3. **Locate `backend/firebase-service-account.json`** if backend Firebase admin access is needed from the new machine — re-download from Firebase Console if it can't be found.
4. Once credentials are secured, they just need to be placed back at the same relative paths (`mobile/…`, `backend/…`) on the Windows machine — `eas.json` and backend config reference them by relative path, so no code changes are needed.

## Setting up EAS CLI on Windows

Not yet done — next step when the Windows machine is ready:
```bash
npm install -g eas-cli
eas login
```
Then `eas build`/`eas submit` from `/mobile` work identically to macOS once the `.p8` file above is restored to `mobile/`.
