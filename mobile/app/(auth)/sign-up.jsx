import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  AppleButton,
  AuthCanvas,
  AuthDivider,
  AuthField,
  AuthHeroHeading,
  BackButton,
  FooterLink,
  GoogleButton,
  Notice,
  PrimaryButton,
  ConsentDisclaimer,
  WelcomeBenefitChips,
  WelcomeBrand,
  WelcomeCreateAccountAction,
  WelcomeFeatureChips,
  WelcomeHeadlineContent,
  WelcomePrivacyNote,
  WelcomeStoryDivider,
  WelcomeSubheadlineContent,
  AUTH_COLORS,
  IS_COMPACT,
} from "../../components/auth/LaunchAuthDesign";
import { mapAppleAuthErrorCode, parseClerkError } from "../../utils/errors";
import VerifyEmail from "./verify-email";

// Required for Clerk OAuth on Expo — closes the browser after redirect
WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT_URL = makeRedirectUri({ native: "my-food-tracker://oauth-native-callback" });

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  // Needed only for the OAuth transfer case, where Clerk reports that the
  // identity already belongs to an existing account and the sign-up must be
  // handed back to a sign-in.
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [step, setStep] = useState("welcome");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");

  const setNotice = (type, text) => {
    setMessageType(type);
    setMessage(text);
  };

  useFocusEffect(
    useRef(() => {
      setMessage(null);
    }).current
  );

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      console.warn("[Auth] Google OAuth redirectUrl:", OAUTH_REDIRECT_URL);
      const { createdSessionId, setActive, authSessionResult } =
        await startGoogleOAuthFlow({ redirectUrl: OAUTH_REDIRECT_URL });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/onboarding/step-1");
        return;
      }
      // Dismissing the browser is a normal choice, not a failure — stay quiet.
      if (authSessionResult?.type === "cancel" || authSessionResult?.type === "dismiss") return;
      setNotice("error", "Google sign-up didn't complete. Please try again.");
    } catch (err) {
      console.warn("[Auth] Google sign-up failed:", err);
      // Always show Clerk's own message — see the matching comment in
      // sign-in.jsx's handleGoogleSignIn for why the __DEV__ gate was removed.
      setNotice("error", parseClerkError(err) || "Google sign-up failed. Please try again or use email.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setAppleLoading(true);
    setMessage(null);
    try {
      // isAvailableAsync must be inside the try: on some devices/builds it can
      // itself reject, and with no catch around it that left the button
      // appearing to do nothing at all — no notice, no loading state, no
      // console trace visible outside a debugger.
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        setNotice("error", "Sign in with Apple is not available on this device.");
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // `oauth_token_apple` is the native token strategy; `oauth_apple` is the
      // browser-redirect one and silently ignores the token (see the matching
      // comment in sign-in.jsx).
      const attempt = await signUp.create({
        strategy: "oauth_token_apple",
        token: credential.identityToken,
        ...(credential.fullName?.givenName && { firstName: credential.fullName.givenName }),
        ...(credential.fullName?.familyName && { lastName: credential.fullName.familyName }),
      });

      if (attempt.status === "complete" || attempt.status === "missing_requirements") {
        // The session was never activated here, so even a "successful" Apple
        // sign-up left the user unauthenticated. Only `complete` carries a
        // session id; `missing_requirements` still needs the onboarding step.
        if (attempt.createdSessionId) {
          await setSignUpActive({ session: attempt.createdSessionId });
        }
        router.replace("/onboarding/step-1");
        return;
      }

      // Clerk found an existing account for this identity — hand the attempt
      // back to sign-in instead of dead-ending on a status we don't handle.
      if (attempt.verifications?.externalAccount?.status === "transferable") {
        const transferred = await signIn.create({ transfer: true });
        if (transferred.status === "complete") {
          await setSignInActive({ session: transferred.createdSessionId });
          router.replace("/");
          return;
        }
        throw new Error(`Apple account link did not complete (status: ${transferred.status}).`);
      }

      // Previously fell through to nothing — Apple would authenticate, then the
      // screen sat there with no error and no navigation.
      throw new Error(`Apple sign-up did not complete (status: ${attempt.status}).`);
    } catch (err) {
      if (err.code === "ERR_REQUEST_CANCELED") return;
      console.warn("[Auth] Apple sign-up failed:", err);
      const appleMsg = mapAppleAuthErrorCode(err.code);
      setNotice("error", appleMsg || parseClerkError(err) || "Apple sign-up failed. Please try again or use email.");
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setNotice("error", "Email and password are required.");
      return;
    }
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      const code = err?.errors?.[0]?.code;
      console.warn("[Auth] Sign-up error code:", code, err);
      if (code === "form_identifier_exists") {
        setNotice("error", "This email is already registered. Please sign in instead.");
        return;
      }
      if (code === "captcha_missing_token" || code === "captcha_invalid") {
        setNotice("error", "Security check failed. Please try again in a moment.");
        return;
      }
      setNotice("error", parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const moveFocus = (nextRef) => {
    if (nextRef?.current) {
      nextRef.current.focus();
      return;
    }
    handleSignUp();
  };

  if (pendingVerification) {
    return (
      <VerifyEmail
        email={email.trim()}
        firstName={firstName}
        lastName={lastName}
        onBack={() => setPendingVerification(false)}
      />
    );
  }

  // ─── Welcome screen ───────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <AuthCanvas keyboard={false}>
        <View style={styles.welcomeShell}>
          <WelcomeBrand />
          <WelcomeHeadlineContent />
          <View style={styles.welcomeMiddle}>
            <WelcomeSubheadlineContent />
            <WelcomeFeatureChips />
            <WelcomeStoryDivider />
            <WelcomeBenefitChips />
          </View>
          <View style={styles.welcomeBottom}>
            <WelcomeCreateAccountAction onPress={() => setStep("details")} />
            <FooterLink
              prompt="Already have an account?"
              action="Sign In"
              onPress={() => router.replace("/(auth)/sign-in")}
            />
            <WelcomePrivacyNote />
          </View>
        </View>
      </AuthCanvas>
    );
  }

  // ─── Details / registration form ─────────────────────────────────────────
  return (
    <AuthCanvas>
      <View style={styles.topRow}>
        <BackButton onPress={() => setStep("welcome")} />
      </View>

      {/* Same two-tone hero as sign-in — "Create" in ink, "account" in the
          accent, so both entry points read as one screen family. */}
      <AuthHeroHeading
        title="Create account"
        lead="A few details and you're in."
        subtitle="Start tracking food, mood, water and activity."
      />

      <View style={styles.detailsForm}>
        <Notice type={messageType} text={message} onDismiss={() => setMessage(null)} />

        {/* Name row */}
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <AuthField
              label="First Name"
              icon="person-outline"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              focused={focusedField === "firstName"}
              onFocus={() => setFocusedField("firstName")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              onSubmitEditing={() => moveFocus(lastNameRef)}
            />
          </View>
          <View style={styles.nameField}>
            <AuthField
              label="Last Name"
              icon="person-outline"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              focused={focusedField === "lastName"}
              onFocus={() => setFocusedField("lastName")}
              onBlur={() => setFocusedField(null)}
              inputRef={lastNameRef}
              returnKeyType="next"
              onSubmitEditing={() => moveFocus(emailRef)}
            />
          </View>
        </View>

        <AuthField
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email address"
          focused={focusedField === "email"}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          inputRef={emailRef}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => moveFocus(passwordRef)}
        />

        <AuthField
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          focused={focusedField === "password"}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          inputRef={passwordRef}
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          secureTextEntry={!showPassword}
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        >
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={12}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={AUTH_COLORS.muted}
            />
          </TouchableOpacity>
        </AuthField>

        <PrimaryButton
          title={loading ? "Creating account…" : "Continue"}
          loading={loading}
          onPress={handleSignUp}
          testID="signup-continue-button"
        />

        <AuthDivider />

        {/* Full-width and stacked, matching sign-in. The old side-by-side pair
            forced a 46pt override that fought the pill height, and centred
            labels collided with the chevron pinned to the right edge. */}
        <AppleButton
          onPress={handleAppleSignUp}
          loading={appleLoading}
          title="Continue with Apple"
          testID="signup-apple-button"
        />
        <GoogleButton
          onPress={handleGoogleSignUp}
          loading={googleLoading}
          title="Continue with Google"
          testID="signup-google-button"
        />

        {/* Clickwrap, not a checkbox — tapping any button above is the
            agreement, same pattern as DoorDash/Yelp. Covers all three
            methods explicitly so the scope is never ambiguous. */}
        <ConsentDisclaimer />

        <View style={styles.detailsFooter}>
          <FooterLink
            prompt="Already have an account?"
            action="Sign in"
            showArrow
            onPress={() => router.replace("/(auth)/sign-in")}
          />
        </View>
      </View>
    </AuthCanvas>
  );
}

const styles = StyleSheet.create({
  welcomeShell: {
    flex: 1,
    paddingBottom: 12,
  },
  welcomeMiddle: {
    alignItems: "center",
    marginTop: 18,
    gap: 18,
  },
  // Was marginTop: "auto", which pins this to the very bottom of the flex-1
  // shell — fine on compact screens, but on taller devices (iPhone Pro Max)
  // it left a large empty gap below the benefit chips instead of the button
  // following them at a normal reading distance.
  welcomeBottom: {
    marginTop: 48,
    gap: 14,
  },
  topRow: {
    minHeight: IS_COMPACT ? 44 : 48,
    justifyContent: "center",
    marginBottom: 2,
  },
  detailsForm: {
    marginTop: 4,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  detailsFooter: {
    marginTop: 14,
  },
});
