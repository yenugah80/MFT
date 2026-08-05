# Auth & OAuth Reference

Written 2026-08-05 after a full day spent on sign-in failures. Five independent
causes were stacked on top of each other; each fix only exposed the next one.
Four of the five were **not in the codebase** — they were Clerk dashboard
settings, environment variables, or a wrong API constant. That is exactly why
this document exists: redesigning the auth screens will not reintroduce most of
these, but changing config or copying patterns from the old code will.

Read the **Pre-flight checklist** before touching anything under
`mobile/app/(auth)/` or `mobile/components/auth/`.

---

## The setup, stated once

| Thing | Value |
|---|---|
| Clerk application | **MFT : My Food & Mood Tracker** |
| Clerk instance | `ins_3F9LvprZICPk7qas8IPVxpHkNWY` |
| Frontend API domain | `clerk.app.my-food-tracker.com` |
| Publishable key decodes to | `clerk.app.my-food-tracker.com$` |
| Backend validates with | the **matching** `sk_live_` for that same instance |

There is also an **older, unrelated Clerk application** called `MyFoodTracker`
at `clerk.my-food-tracker.com` (note: no `app.`). It is live, it responds to
API calls, and it holds stale copies of some users. It is **not** the instance
this app uses. If you ever see that domain in a config value, it is wrong.

### Auth strategies actually in use

- **Google** — `startOAuthFlow({ strategy: 'oauth_google' })`, browser redirect
- **Apple** — `signIn.create({ strategy: 'oauth_token_apple', token })`, native
- **Email/password** — standard Clerk, plus email-code verification

---

## The five failures, and how each announced itself

### 1. A `disabled` prop silently killed three buttons

**Symptom:** tapping Apple/Google/Continue on Create Account did *nothing*. No
error, no spinner, no log. Just a slightly dimmed button.

**Cause:** a consent checkbox was added along with
`disabled={!agreedToTerms}` on all three buttons. In React Native a disabled
`Pressable` **never fires `onPress`**, so each handler's own
"Please agree to the Terms…" notice became unreachable dead code.

**Rule:** never gate a button with `disabled` when the handler already
validates and explains. Let the press through so it can say why.

### 2. Clerk Bot Protection rejected every native OAuth attempt

**Symptom:** *"Authentication unsuccessful due to failed security validations."*

**Cause:** Clerk's Smart CAPTCHA (Cloudflare Turnstile) renders a browser
widget. A native app cannot render it, so the check fails and Clerk refuses the
sign-in. Its adaptive nature also makes it *intermittent*, which is why it
looked like "worked yesterday, broken today."

**Setting:** Clerk → Configure → Protect → Rules → **Bot sign-up protection**.
Currently **disabled**. Note this leaves the *web* sign-up surface (the
marketing site ships a Clerk bundle) unprotected — a real trade-off, not a
free win.

### 3. Native API off, no iOS app, empty redirect allowlist

**Symptom:** *"The current redirect url … does not match an authorized redirect
URI for this instance: `my-food-tracker://oauth-native-callback`"*

**Cause:** three separate gaps in Clerk → **Native Applications**:
- "Enable Native API" toggle was **off**
- no iOS application registered
- the mobile SSO redirect allowlist was **empty**

**Trap:** the legacy `/v1/redirect_urls` **API** listed the URL as registered,
while the dashboard's Native Applications page showed none. They are different
systems. Trust the dashboard UI for native config.

**Current state:** Native API on; iOS app registered (`8R3UBMWJ2P` /
`com.zennxt.myfoodtracker`); allowlist contains
`my-food-tracker://oauth-native-callback` and `com.zennxt.myfoodtracker://callback`.

### 4. Clerk's `transferable` status was unhandled

**Symptom:** Apple authentication *succeeded* — Face ID accepted, valid token
returned — and then the app did nothing.

**Cause:** when an account already exists under a **different identity**
(e.g. created with Google), Clerk does not return `complete`. It returns a
`transferable` verification meaning "link this new identity to the existing
user." That requires an explicit second call:

```js
// sign-in discovered the user needs the identity linked
if (attempt.firstFactorVerification?.status === 'transferable') {
  const transferred = await signUp.create({ transfer: true });
}
// sign-up discovered the identity belongs to an existing user
if (attempt.verifications?.externalAccount?.status === 'transferable') {
  const transferred = await signIn.create({ transfer: true });
}
```

Neither call existed, so the status matched no branch and the handler exited.

### 5. Backend and app used **different Clerk instances**

**The one underneath everything.** Every authenticated API call returned 401
regardless of how well sign-in worked.

**Cause:** the app was built with a publishable key for
`clerk.app.my-food-tracker.com`, while Railway's `CLERK_SECRET_KEY` belonged to
the unrelated `clerk.my-food-tracker.com` instance. The backend cannot verify a
token signed by an instance whose keys it does not hold.

**Made worse by:** Clerk user IDs are instance-specific, so all existing data
was keyed to the *old* instance's IDs and had to be remapped
(1,292 + 128 rows, done transactionally).

**Rule:** the publishable key baked into the app and the secret key on the
server must belong to the same instance. Verify, don't assume:

```bash
# decode the app's key (it is base64 of the frontend domain)
echo "<base64 part of pk_live_...>" | base64 -d
```

---

## Failure signatures — what each message actually means

| Message / status | Real meaning |
|---|---|
| Button does nothing at all | a `disabled` prop, or an unhandled status with no else branch |
| "failed security validations" | Bot Protection / CAPTCHA blocking native |
| "redirect url … not authorized" | Native Applications allowlist gap |
| `needs_identifier` | Clerk never received an identity — usually the **wrong strategy** |
| `transferable` | account exists under another identity; needs a `transfer: true` call |
| 401 on every API call | app and backend on **different Clerk instances** |
| `AKAuthenticationError -7026` | no Apple ID signed into the device (always true on Simulator) |

---

## Pre-flight checklist when touching auth screens

1. **Never add `disabled` to a button whose handler already validates.**
   Silent no-ops are the worst failure mode — they produce no error, no log,
   and no way to diagnose remotely.
2. **Every branch needs an else.** `if (status === 'complete')` with no
   alternative means every other status vanishes silently. Throw with the
   status in the message.
3. **Navigate explicitly** after `setActive()`. The `(auth)` layout redirect
   works, but the email/password path calls `router.replace('/')` and the OAuth
   paths should match it.
4. **Call `setActive()` at all.** The sign-up Apple path once omitted it, so a
   "successful" sign-up left the user unauthenticated.
5. **Do not hide error text behind `__DEV__`.** Clerk's messages are written to
   be user-facing. A generic production fallback makes every distinct cause
   look identical and is undiagnosable from a device you cannot inspect.
6. **Use `oauth_token_apple`, not `oauth_apple`,** for native Apple sign-in.
   The latter is the redirect flow and silently discards the token.

---

## Testing notes

**The iOS Simulator cannot test Apple Sign-In.** It has no Apple ID
(`MobileMeAccounts does not exist`), so `ASAuthorizationController` fails with
error 1000 / `AKAuthenticationError -7026` no matter how correct the code is.
Only a physical device via TestFlight is a real test.

**Google Sign-In works in the Simulator**, but only in a *signed* build.
Unsigned local builds (`CODE_SIGNING_ALLOWED=NO`) fail the
`ASWebAuthenticationSession` handshake with an unhelpful null crash.

**Choose "Share My Email"** when testing Apple against an existing account.
"Hide My Email" returns a `@privaterelay.appleid.com` address that matches no
existing user, so a new empty account is created and the `transferable` path
never triggers.

### Expo submission queue can stall silently

On 2026-08-05 five submissions sat in `IN_QUEUE` for over two hours with no
error while status.expo.dev reported "All Systems Operational." Builds never
reached Apple. `eas submit` also hangs without `--no-wait`, and orphaned
processes pile up and block each other.

Direct upload bypasses all of it and takes seconds:

```bash
cp mobile/AuthKey_XYN85P5666.p8 ~/.appstoreconnect/private_keys/
xcrun altool --upload-app -f build.ipa -t ios \
  --apiKey XYN85P5666 --apiIssuer 49aa0f0c-ae4c-4e7b-86f1-0e75917999ec
```

---

## Config that lives outside this repo

Changing any of these breaks auth without a single code change, and nothing in
CI will catch it:

- Clerk → Native Applications (Native API toggle, iOS app, redirect allowlist)
- Clerk → SSO Connections (Google credentials; Apple Services ID / Team ID /
  Key ID / `.p8`)
- Clerk → Protect → Bot sign-up protection
- Railway → `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
- EAS → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (production environment)
- Google Cloud Console → authorized redirect URIs for the Clerk OAuth client
- Apple Developer → App ID capability **Sign in with Apple**, and a key with
  that capability enabled

`mobile/scripts/validate-release-config.mjs` guards store invariants but
**does not** check any of the above. Worth extending.
