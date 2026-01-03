# iOS Deployment Guide - MyFoodTracker

## Production-Grade iOS App Launch Checklist

This guide ensures your MyFoodTracker app is production-ready for iOS App Store submission.

---

## 1. Environment Configuration

### Required Environment Variables

Ensure these are set in your `.env.production`:

```env
# Required
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
EXPO_PUBLIC_API_BASE_URL=https://your-production-api.com

# Recommended
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_LOG_LEVEL=error
EXPO_PUBLIC_API_TIMEOUT_MS=10000
```

### Verify Configuration

```bash
# Check environment setup
node -e "console.log(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)"
node -e "console.log(process.env.EXPO_PUBLIC_API_BASE_URL)"
```

---

## 2. iOS-Specific Configuration (app.json)

Add privacy and permission descriptions to your `app.json`:

```json
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.myfoodtracker",
    "buildNumber": "1",
    "supportsTabletMode": false,
    "infoPlist": {
      "NSCameraUsageDescription": "Camera access is required to scan barcodes and take food photos",
      "NSPhotoLibraryUsageDescription": "Photo library access is required to select food images from your device",
      "NSMicrophoneUsageDescription": "Microphone access is required for voice food logging feature",
      "NSLocalNetworkUsageDescription": "Local network access for enhanced connectivity",
      "UIRequiredDeviceCapabilities": ["armv7"]
    }
  }
}
```

---

## 3. Build Configuration (eas.json)

Ensure your EAS build profile is set up for production:

```json
{
  "build": {
    "production": {
      "ios": {
        "buildType": "app-store",
        "distribution": "store",
        "provisioning": "universal"
      }
    }
  }
}
```

---

## 4. Pre-Launch Testing Checklist

### Unit Tests
- [ ] All API endpoints tested
- [ ] Error handling verified
- [ ] Offline mode tested

### Integration Tests
- [ ] Authentication flow (login/logout)
- [ ] Food logging functionality
- [ ] API communication
- [ ] Push notifications (physical device)

### Performance Testing
- [ ] App startup time < 3 seconds
- [ ] No memory leaks (test with Xcode Instruments)
- [ ] Battery usage acceptable
- [ ] Network usage optimized

### Device Testing
- [ ] Test on physical iPhone (not just simulator)
- [ ] Test on older iOS versions (iOS 13+)
- [ ] Test with low network conditions
- [ ] Test with limited storage

### Feature Testing
- [ ] Camera functionality (barcode scanner)
- [ ] Photo library access
- [ ] Voice recording (if enabled)
- [ ] Push notifications
- [ ] App icon displays correctly
- [ ] Splash screen displays correctly

---

## 5. App Store Preparation

### App Information
- [ ] App name finalized
- [ ] Subtitle clear and concise
- [ ] Description highlights key features
- [ ] Keywords relevant for searchability
- [ ] Support URL valid and accessible
- [ ] Privacy policy URL valid and accessible

### Metadata
- [ ] Category: Health & Fitness
- [ ] Content rating questionnaire completed
- [ ] COPPA compliance verified (if applicable)
- [ ] Export compliance configured

### Screenshots & Assets
- [ ] 5 screenshots per device size (iPhone 6.5", 5.8", 5.5", 4.7")
- [ ] Screenshots show key features
- [ ] App icon (1024x1024px) submitted
- [ ] Preview video optional but recommended
- [ ] App icon rounded corners applied

### Review Information
- [ ] Demo account credentials provided (if login required)
- [ ] Clear notes about app functionality
- [ ] No "under development" indicators
- [ ] App functions completely without test accounts

---

## 6. Code Quality & Security

### Security Checklist
- [ ] No hardcoded API keys or credentials
- [ ] Secrets managed via environment variables
- [ ] HTTPS used for all API calls
- [ ] Secure token storage (SecureStore)
- [ ] No sensitive data in logs
- [ ] No malware or suspicious code

### Code Quality
- [ ] No console errors or warnings
- [ ] No deprecated Expo APIs used
- [ ] No memory leaks detected
- [ ] TypeScript types validated (if using TS)
- [ ] Linter passes without errors

### Performance
- [ ] Bundle size optimized
- [ ] Code splitting applied where needed
- [ ] Image sizes optimized
- [ ] No unnecessary re-renders

---

## 7. Build and Submission

### Build for App Store

```bash
# Create EAS build for production
eas build --platform ios --profile production

# Wait for build to complete, download the .ipa file
# Test the .ipa with TestFlight first
```

### TestFlight Testing (Recommended)

```bash
# Upload to TestFlight for internal testing
eas submit --platform ios --latest

# Test with TestFlight testers
# Verify all features work
# Check crash reports in TestFlight
```

### App Store Submission

```bash
# Submit to App Store
eas submit --platform ios --profile production
```

Or manually:
1. Open App Store Connect (appstoreconnect.apple.com)
2. Go to Apps > MyFoodTracker
3. Create new version
4. Upload build from Xcode Organizer
5. Add screenshots and metadata
6. Submit for Review

---

## 8. Post-Launch Monitoring

### First 48 Hours
- [ ] Monitor crash reports in TestFlight
- [ ] Monitor App Store analytics
- [ ] Check user reviews for issues
- [ ] Prepare hotfix if critical issues found

### Ongoing Monitoring
- [ ] Monitor crash rates
- [ ] Review user feedback
- [ ] Track performance metrics
- [ ] Plan updates and improvements

---

## 9. Troubleshooting

### Build Failures

**"Certificate not found"**
- Ensure Apple Developer account configured
- Check provisioning profiles in Apple Developer portal
- Run: `eas build --platform ios --profile production --verbose`

**"Code signing failed"**
- Verify bundle identifier matches provisioning profile
- Check certificate expiration in Apple Developer portal
- Renew certificate if needed

### App Store Submission Rejection

**Common reasons:**
1. **Crashes on launch** - Test thoroughly on physical device
2. **Missing privacy descriptions** - Add all required Info.plist entries
3. **Demo account issues** - Ensure demo account works
4. **Broken features** - Verify all promised features work
5. **Performance issues** - Optimize startup time and memory usage

---

## 10. Production Environment Variables Template

Create `.env.production`:

```env
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE

# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
EXPO_PUBLIC_API_TIMEOUT_MS=10000

# Environment
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_LOG_LEVEL=error
```

---

## 11. Version Management

For each release update in `app.json`:

```json
{
  "version": "1.0.0",
  "ios": {
    "buildNumber": "1"
  }
}
```

Increment according to semantic versioning:
- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

Increment buildNumber for every submission to App Store.

---

## 12. Documentation for App Store Review

Create a file `APP_STORE_REVIEW_NOTES.txt`:

```
MyFoodTracker - Food Nutrition Logger

### Key Features:
- AI-powered food logging
- Barcode scanning for product lookup
- Real-time nutrition tracking
- Meal recommendations
- Health insights

### Demo Account:
Email: demo@example.com
Password: DemoPassword123!

### Important Notes:
1. App requires internet connection for full features
2. Push notifications require permission (will prompt on first launch)
3. Camera access required for barcode scanning
4. Photo library access required for food images

### First-Time Setup:
1. Create account or sign in
2. Accept permission prompts
3. Complete onboarding
4. Start logging meals

No jailbreaking or hacking required for full functionality.
```

---

## 13. Continuous Integration/Deployment

Set up EAS build with GitHub:

```bash
# Link EAS to GitHub (one-time setup)
eas build:configure

# Push to GitHub, EAS auto-builds on commit
git push origin main

# Check build status
eas build:list
```

---

## 14. Quick Reference Commands

```bash
# Validate environment
node -e "require('dotenv').config(); console.log(process.env)"

# Local build (development)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# Upload to TestFlight
eas submit --platform ios --path <path-to-ipa>

# View build logs
eas build:list
eas build:view <BUILD_ID>
```

---

## 15. Maintenance Schedule

### Before Every Release
- [ ] Run full test suite
- [ ] Test on physical devices
- [ ] Update version numbers
- [ ] Update CHANGELOG.md
- [ ] Review crash reports

### Monthly
- [ ] Review analytics
- [ ] Check for deprecated dependencies
- [ ] Update dependencies
- [ ] Review performance metrics

### Quarterly
- [ ] Plan major feature releases
- [ ] Review security practices
- [ ] Assess technical debt
- [ ] Plan infrastructure improvements

---

## Support & Resources

- **Apple Developer**: https://developer.apple.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Expo EAS**: https://docs.expo.dev/eas/
- **React Native Docs**: https://reactnative.dev/
- **Clerk Docs**: https://clerk.com/docs/

---

## Final Checklist Before Submission

- [ ] All environment variables configured for production
- [ ] iOS build profile set to "app-store"
- [ ] All required Info.plist entries present
- [ ] App tested on physical iPhone device
- [ ] No console errors or warnings
- [ ] Privacy policy and support URLs valid
- [ ] Screenshots and metadata complete
- [ ] Demo account provided (if login required)
- [ ] Build number incremented
- [ ] Version number updated
- [ ] TestFlight testing completed successfully
- [ ] Ready for App Store submission

---

**Good luck with your app launch! 🚀**
