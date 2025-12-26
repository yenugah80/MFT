# Lottie Animation Assets

This directory contains Lottie JSON animations for premium UX interactions.

## Required Animations

Download these free Lottie animations from [LottieFiles.com](https://lottiefiles.com/) and save them in this directory:

### 1. **success.json**
- Search: "checkmark success" or "success check"
- Recommended: [Success Checkmark](https://lottiefiles.com/animations/success)
- Use: Food logged, goal achieved, sync completed

### 2. **error.json**
- Search: "error" or "error alert"
- Recommended: [Error Animation](https://lottiefiles.com/animations/error)
- Use: API errors, validation failures, network issues

### 3. **loading.json**
- Search: "loading spinner" or "loading dots"
- Recommended: [Loading Spinner](https://lottiefiles.com/animations/loading)
- Use: Processing AI analysis, syncing data

### 4. **celebration.json**
- Search: "confetti celebration" or "party confetti"
- Recommended: [Confetti](https://lottiefiles.com/animations/confetti)
- Use: Streak milestones, level up, achievements

### 5. **food-analysis.json**
- Search: "scanning" or "AI scan"
- Recommended: [Scanning Animation](https://lottiefiles.com/animations/scan)
- Use: Analyzing food photos or text

### 6. **empty-state.json**
- Search: "empty state" or "no data"
- Recommended: [Empty Box](https://lottiefiles.com/animations/empty)
- Use: No data, first-time users

### 7. **sync.json**
- Search: "cloud sync" or "sync"
- Recommended: [Cloud Sync](https://lottiefiles.com/animations/sync)
- Use: Syncing with cloud

### 8. **streak.json**
- Search: "fire" or "flame"
- Recommended: [Fire Animation](https://lottiefiles.com/animations/fire)
- Use: Active streak display

## How to Download

1. Go to [LottieFiles.com](https://lottiefiles.com/)
2. Search for the animation type
3. Click on an animation you like
4. Click "Download" → "Lottie JSON"
5. Save the file with the exact name listed above
6. Place it in this directory

## Placeholder Files

Until you download the real animations, create simple placeholder JSON files:

```json
{
  "v": "5.5.7",
  "meta": { "g": "LottieFiles AE ", "a": "", "k": "", "d": "", "tc": "" },
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 500,
  "h": 500,
  "nm": "Placeholder",
  "ddd": 0,
  "assets": [],
  "layers": []
}
```

Save this as each filename to prevent import errors until you get the real animations.

## Alternative: Use Expo Image Fallback

If you don't want to use Lottie animations yet, you can comment out the animation imports in `utils/animations.js` and use static images or icons instead.

## License

Make sure to check the license of each animation you download. Most Lottie animations on LottieFiles are free for personal and commercial use, but always verify before using.
