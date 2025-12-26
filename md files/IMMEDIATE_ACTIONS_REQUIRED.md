# 🚨 IMMEDIATE ACTIONS REQUIRED
## Security Fixes Before App Store Launch

**Status:** ⚠️ CRITICAL - DO NOT DEPLOY TO PRODUCTION UNTIL COMPLETED

---

## STEP 1: REVOKE EXPOSED API KEYS (DO THIS NOW - 15 minutes)

Your API keys are currently exposed in the repository. Follow these steps **immediately**:

### 1.1 OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Find the key starting with `sk-proj-iROzITPH6dyFP...`
3. Click "Revoke" or "Delete"
4. Click "Create new secret key"
5. Copy the new key (you won't see it again!)
6. Save it temporarily in a secure note app

### 1.2 Clerk Authentication Keys

1. Go to https://dashboard.clerk.com/
2. Select your application
3. Go to "API Keys" section
4. Click "Rotate" for both:
   - Secret Key (`sk_test_...`)
   - Publishable Key (`pk_test_...`)
5. Copy both new keys
6. Save them temporarily

### 1.3 Database Password

1. Go to https://console.neon.tech/
2. Select your database
3. Go to "Settings" → "Security"
4. Click "Reset Password"
5. Copy the new password
6. Update your DATABASE_URL with the new password

### 1.4 USDA API Key

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Request a new API key (free)
3. Check your email for the new key
4. Copy and save it

---

## STEP 2: SECURE YOUR ENVIRONMENT VARIABLES (30 minutes)

### 2.1 Update Local .env Files

I've created `.env.example` templates for you. Now:

```bash
# In backend directory
cd backend
cp .env.example .env

# Edit .env with your actual keys from Step 1
# Use nano, vim, or VS Code:
code .env  # or nano .env

# In mobile directory
cd ../mobile
cp .env.example .env
code .env  # or nano .env
```

**Fill in your new keys:**
```bash
# backend/.env
DATABASE_URL=postgresql://neondb_owner:[NEW_PASSWORD]@ep-frosty-art-a8f6ub8t-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=[NEW_OPENAI_KEY]
CLERK_SECRET_KEY=[NEW_CLERK_SECRET]
USDA_API_KEY=[NEW_USDA_KEY]

# mobile/.env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=[NEW_CLERK_PUBLISHABLE]
```

### 2.2 Remove .env from Git History

**WARNING:** Your old keys are in git history! Remove them:

```bash
# Option A: Using git-filter-repo (recommended)
# Install: brew install git-filter-repo  (macOS)
git filter-repo --path backend/.env --invert-paths --force
git filter-repo --path mobile/.env --invert-paths --force

# Option B: Using BFG Repo-Cleaner (easier)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env

# Force push to remote (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

### 2.3 Verify .gitignore

Make sure `.gitignore` contains:
```bash
# Check if .gitignore has these lines
cat .gitignore | grep ".env"

# If not, add them:
echo "
.env
.env.*
!.env.example
.env.local
.env.production
" >> .gitignore

# Commit .gitignore
git add .gitignore
git commit -m "security: update .gitignore to exclude .env files"
git push
```

---

## STEP 3: UPDATE PRODUCTION ENVIRONMENT VARIABLES (15 minutes)

### 3.1 Render Backend

1. Go to https://dashboard.render.com/
2. Select your backend service
3. Go to "Environment" tab
4. Update these variables with NEW keys:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `CLERK_SECRET_KEY`
   - `USDA_API_KEY`
5. Click "Save Changes"
6. Render will automatically redeploy

### 3.2 Expo (for mobile app)

1. Go to https://expo.dev/accounts/[your-account]/projects/myfoodtracker/settings
2. Go to "Secrets" section
3. Update:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (new publishable key)
4. Rebuild the app:
```bash
cd mobile
eas build --platform all --profile production
```

---

## STEP 4: VERIFY SECURITY (10 minutes)

Run these checks to ensure everything is secure:

### 4.1 Check Git History

```bash
# Search git history for exposed keys (should return nothing)
git log -S "sk-proj-iROz" --all --oneline
git log -S "npg_isjS4kM5WIDp" --all --oneline

# If you see results, git history wasn't cleaned properly
# Repeat Step 2.2
```

### 4.2 Test New Keys

```bash
# Backend
cd backend
npm start

# Check logs - should NOT see any auth errors
# Try logging a meal in the mobile app
# If it works, keys are configured correctly!
```

### 4.3 Security Scan

```bash
# Install trufflehog to scan for secrets
brew install trufflesecurity/trufflehog/trufflehog

# Scan your repo
trufflehog git file://. --only-verified

# Should return: "No verified secrets found"
```

---

## STEP 5: ENABLE ADDITIONAL SECURITY (Optional - 1 hour)

These aren't critical but highly recommended:

### 5.1 Two-Factor Authentication

Enable 2FA on all services:
- [ ] GitHub account
- [ ] OpenAI account
- [ ] Clerk dashboard
- [ ] Neon console
- [ ] Render dashboard
- [ ] Expo account

### 5.2 API Key Restrictions

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Click your key → "Edit"
3. Set spending limit: $50/month (prevents unexpected charges)
4. Enable email alerts for usage

**Clerk:**
1. Dashboard → "Security"
2. Enable IP allowlisting (production only)
3. Set session duration: 7 days max

---

## VERIFICATION CHECKLIST

Before proceeding to app store deployment:

- [ ] ✅ All API keys revoked and rotated
- [ ] ✅ .env files updated with new keys
- [ ] ✅ .env removed from git history
- [ ] ✅ .gitignore updated and committed
- [ ] ✅ Production environment variables updated (Render + Expo)
- [ ] ✅ App tested with new keys (backend + mobile)
- [ ] ✅ No secrets found in git history scan
- [ ] ✅ 2FA enabled on critical services
- [ ] ✅ API spending limits configured

---

## AFTER SECURITY IS FIXED

Once all checkboxes above are ✅, you can proceed to:

1. **Phase 2: Functional Excellence** - Fix remaining bugs
2. **Phase 3: Premium UX Polish** - Add animations, haptics, empty states
3. **Phase 4: Accessibility** - Screen reader support, translations
4. **Phase 5: Analytics** - Sentry, Firebase Analytics
5. **Phase 6: App Store Submission** - Screenshots, descriptions, TestFlight
6. **Phase 7: Launch** 🚀

**Estimated Timeline:** 3-4 weeks from today to App Store approval

---

## QUESTIONS OR ISSUES?

If you encounter any problems:

1. **Keys don't work:** Double-check you copied the entire key (no spaces/newlines)
2. **Git history not clean:** Use BFG Repo-Cleaner (easier than git-filter-repo)
3. **Production still broken:** Check Render logs for specific error messages
4. **Mobile app crashes:** Clear Expo cache with `expo start --clear`

---

## COST SUMMARY (After Security Fix)

**Monthly Operating Costs:**
- Neon Database: $19/month (Pro tier)
- Clerk Auth: $25/month (Pro tier for production)
- OpenAI API: ~$50-200/month (usage-based)
- Render Backend: $7/month (Starter tier) or $25/month (Pro)
- **Total: ~$100-270/month**

**One-Time Costs:**
- App Store Developer: $99/year
- Google Play Developer: $25 one-time
- **Total: $124 first year, $99/year after**

---

## NEXT STEPS AFTER THIS DOCUMENT

1. Complete all items in this document (2-3 hours)
2. Run verification checklist
3. Review [APP_STORE_READINESS_PLAN.md](APP_STORE_READINESS_PLAN.md) for full roadmap
4. Review [COMPREHENSIVE_TESTING_REPORT.md](COMPREHENSIVE_TESTING_REPORT.md) for detailed findings
5. Start implementing Phase 2 fixes from the roadmap

**You can do this! The app is 90% there - just needs these security fixes and polish.** 🚀

---

**Document Version:** 1.0
**Last Updated:** December 25, 2025
**Priority:** P0 CRITICAL
**Estimated Time:** 2-3 hours
