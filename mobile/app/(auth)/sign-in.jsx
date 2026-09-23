import { useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import * as AppleAuthentication from "expo-apple-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  AppleButton,
  AuthCanvas,
  AuthDivider,
  AuthField,
  AuthHeading,
  AuthHeroHeading,
  BackButton,
  FooterLink,
  GoogleButton,
  Notice,
  PrimaryButton,
  AUTH_COLORS,
  IS_COMPACT,
} from "../../components/auth/LaunchAuthDesign";
import { mapAppleAuthErrorCode, parseClerkError } from "../../utils/errors";
import { authenticateAppleCredential } from "../../utils/appleAuth";
import { logAuthFailure, logAuthStage } from "../../utils/authDiagnostics";
import { isAppReviewAccount } from "../../utils/appReview";
import apiClient from "../../services/apiClient";

// Required for Clerk OAuth on Expo — closes the browser after redirect
WebBrowser.maybeCompleteAuthSession();

export const HAS_SIGNED_IN_KEY = "@mft:hasSignedInBefore";
const OAUTH_REDIRECT_URL = makeRedirectUri({ native: "my-food-tracker://oauth-native-callback" });

export default function SignInScreen() {
  const router = useRouter();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const codeRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const resetAttemptRef = useRef(null);
  const secondFactorAttemptRef = useRef(null);
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isReturningUser, setIsReturningUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    AsyncStorage.getItem(HAS_SIGNED_IN_KEY).then((val) => setIsReturningUser(val === "true"));
  }, []);

  const setNotice = (type, text) => {
    setMessageType(type);
    setMessage(text);
  };

  useFocusEffect(
    useRef(() => {
      setMessage(null);
    }).current
  );

  const screenCopy = useMemo(() => {
    if (mode === "resetRequest") {
      return {
        title: "Reset password",
        subtitle: "Enter your email and we'll send a secure reset code.",
        cta: loading ? "Sending code…" : "Send reset code",
      };
    }

    if (mode === "resetVerify") {
      return {
        title: "Create new password",
        subtitle: "Use the email code to secure your MFT account.",
        cta: loading ? "Resetting…" : "Reset password",
      };
    }

    if (mode === "secondFactor") {
      return {
        title: "Verify it's you",
        subtitle: "Enter the security code we just emailed you.",
        cta: loading ? "Verifying…" : "Verify & continue",
      };
    }

    return {
      title: isReturningUser ? "Welcome back" : "Sign in",
      // Only set once isReturningUser resolves from AsyncStorage, so the hero
      // never flashes the wrong lead line on first render.
      lead:
        isReturningUser === null
          ? null
          : isReturningUser
          ? "Good to see you again."
          : "Enter your details to continue.",
      subtitle: isReturningUser
        ? "Your wellness dashboard is ready."
        : "Sign in to continue your journey.",
      cta: loading ? "Signing in…" : "Continue",
    };
  }, [isReturningUser, loading, mode]);

  const resetToSignIn = () => {
    setMode("signIn");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setFocusedField(null);
    resetAttemptRef.current = null;
    secondFactorAttemptRef.current = null;
  };

  const handleBack = () => {
    if (mode !== "signIn") {
      resetToSignIn();
      return;
    }
    router.replace("/(auth)/sign-up");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      const { createdSessionId, setActive: oauthSetActive, authSessionResult } =
        await startGoogleOAuthFlow({ redirectUrl: OAUTH_REDIRECT_URL });
      if (createdSessionId && oauthSetActive) {
        await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
        await oauthSetActive({ session: createdSessionId });
        router.replace("/");
        return;
      }
      // Dismissing the browser is a normal choice, not a failure — stay quiet.
      if (authSessionResult?.type === "cancel" || authSessionResult?.type === "dismiss") return;
      // Anything else means the flow genuinely stalled. Previously this fell
      // through to nothing: no session, no error, no navigation.
      setNotice("error", "Google sign-in didn't complete. Please try again.");
    } catch (err) {
      console.warn("[Auth] Google sign-in failed:", err);
      // Always show Clerk's own message, not just in __DEV__: it's already a
      // human-safe string Clerk generates specifically to be user-facing (e.g.
      // "redirect url... not authorized"), and hiding it behind a generic
      // fallback in production made every real failure indistinguishable from
      // every other one — impossible to diagnose from a device we don't have
      // console access to.
      setNotice("error", parseClerkError(err) || "Google sign-in failed. Please try again or use email.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }
    setAppleLoading(true);
    setMessage(null);
    try {
      logAuthStage("APPLE_AUTH_STARTED");
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

      logAuthStage("APPLE_CREDENTIAL_RECEIVED");

      // `oauth_token_apple` (the native strategy), never `oauth_apple` — see
      // docs/architecture/auth-oauth-reference.md. The helper handles the
      // transferable hand-offs in both directions and only returns when Clerk
      // actually created a session.
      const { sessionId, flow } = await authenticateAppleCredential({
        credential,
        signIn,
        signUp,
        startWith: "sign_in",
        log: logAuthStage,
      });

      await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
      await (flow === "sign_up" ? setSignUpActive : setActive)({ session: sessionId });
      logAuthStage("SESSION_CREATED", { flow });
      // "/" decides between onboarding (new account) and the dashboard.
      router.replace("/");
      logAuthStage("AUTH_NAVIGATION_STARTED", { flow });
    } catch (err) {
      if (err.code === "ERR_REQUEST_CANCELED") return;
      logAuthFailure("APPLE_AUTH", err);
      const appleMsg = mapAppleAuthErrorCode(err.code);
      setNotice("error", appleMsg || parseClerkError(err) || "Apple sign-in failed. Please try again or use email.");
    } finally {
      setAppleLoading(false);
    }
  };

  const trySignInWithReviewTicket = async (identifier, pwd) => {
    if (!isAppReviewAccount(identifier)) return null;
    try {
      logAuthStage("APP_REVIEW_TICKET_REQUESTED");
      const { ticket } = await apiClient.post("/auth/app-review/sign-in", {
        email: identifier.trim(),
        password: pwd.trim(),
      });
      if (!ticket) return null;
      const ticketAttempt = await signIn.create({ strategy: "ticket", ticket });
      if (ticketAttempt.status === "complete" && ticketAttempt.createdSessionId) {
        return ticketAttempt.createdSessionId;
      }
      logAuthFailure("APP_REVIEW_TICKET", null, { status: ticketAttempt.status });
    } catch (err) {
      logAuthFailure("APP_REVIEW_TICKET", err);
    }
    return null;
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setNotice("error", "Please enter your email and password.");
      return;
    }
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password: password.trim() });
      if (attempt.status === "complete") {
        await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }

      // Verified directly against Clerk's API that this happens for every
      // account on this instance — including brand-new ones with no MFA
      // enrollment — despite the instance's own config reporting no second
      // factor is required. Handle it for real rather than showing a
      // misleading "check your credentials" for a password that Clerk
      // itself just reported as `first_factor_verification: verified`.
      if (attempt.status === "needs_second_factor") {
        // App Review cannot read the demo account's inbox, so Device Trust's
        // new-device code would block the reviewer. For that one configured
        // account only, the backend re-verifies the password and returns a
        // single-use Clerk sign-in ticket. Every other account, and any
        // failure here, continues to the normal emailed-code step below.
        const sessionId = await trySignInWithReviewTicket(email, password);
        if (sessionId) {
          await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
          await setActive({ session: sessionId });
          logAuthStage("SESSION_CREATED", { flow: "app_review_ticket" });
          router.replace("/");
          return;
        }

        const emailFactor = attempt.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code"
        );
        if (emailFactor) {
          secondFactorAttemptRef.current = attempt;
          await attempt.prepareSecondFactor({ strategy: "email_code" });
          setMode("secondFactor");
          setNotice("success", "Code sent — check your inbox.");
          setTimeout(() => codeRef.current?.focus(), 250);
          return;
        }
      }

      setNotice("error", "Please check your credentials and try again.");
    } catch (err) {
      setNotice("error", parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const startResetFlow = async () => {
    if (!email.trim()) {
      setNotice("error", "Enter the email linked to your account.");
      return;
    }
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const attempt = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      resetAttemptRef.current = attempt;
      const emailFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "reset_password_email_code"
      );

      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        throw new Error("Password reset by email is not available for this account.");
      }

      await attempt.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: emailFactor.emailAddressId,
      });

      setMode("resetVerify");
      setNotice("success", "Reset code sent. Check your inbox and continue.");
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (err) {
      setNotice("error", parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const resendResetCode = async () => {
    if (!email.trim()) {
      setNotice("error", "Enter the email linked to your account.");
      return;
    }
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setResending(true);
    try {
      const attempt = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      resetAttemptRef.current = attempt;
      const emailFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === "reset_password_email_code"
      );

      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        throw new Error("A fresh reset code could not be prepared for this email.");
      }

      await attempt.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setNotice("success", "A fresh reset code is on the way.");
    } catch (err) {
      setNotice("error", parseClerkError(err));
    } finally {
      setResending(false);
    }
  };

  const completeReset = async () => {
    if (!code.trim() || !newPassword || !confirmPassword) {
      setNotice("error", "Complete the code and both password fields.");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setNotice("error", "Your new passwords do not match.");
      return;
    }
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      let attempt = await (resetAttemptRef.current || signIn).attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword.trim(),
      });

      resetAttemptRef.current = attempt;
      if (attempt.status === "needs_new_password") {
        attempt = await attempt.resetPassword({
          password: newPassword.trim(),
          signOutOfOtherSessions: true,
        });
        resetAttemptRef.current = attempt;
      }

      if (attempt.status === "complete") {
        await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }

      setNotice("error", "The reset could not be completed yet. Please review the code and try again.");
    } catch (err) {
      setNotice("error", parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const completeSecondFactor = async () => {
    if (!code.trim()) {
      setNotice("error", "Enter the security code from your email.");
      return;
    }
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const attempt = await (secondFactorAttemptRef.current || signIn).attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      secondFactorAttemptRef.current = attempt;

      if (attempt.status === "complete") {
        await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }

      setNotice("error", "That code didn't work. Please check it and try again.");
    } catch (err) {
      setNotice("error", parseClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const resendSecondFactorCode = async () => {
    if (!isLoaded) {
      setNotice("error", "Still getting ready — please try again in a moment.");
      return;
    }

    setResending(true);
    try {
      await (secondFactorAttemptRef.current || signIn).prepareSecondFactor({ strategy: "email_code" });
      setNotice("success", "A fresh code is on the way.");
    } catch (err) {
      setNotice("error", parseClerkError(err));
    } finally {
      setResending(false);
    }
  };

  const showSignIn = mode === "signIn";
  const showResetRequest = mode === "resetRequest";
  const showResetVerify = mode === "resetVerify";
  const showSecondFactor = mode === "secondFactor";

  return (
    <AuthCanvas>
      <View style={styles.topRow}>
        <BackButton onPress={handleBack} />
      </View>

      {showSignIn ? (
        <AuthHeroHeading
          title={screenCopy.title}
          lead={screenCopy.lead}
          subtitle={screenCopy.subtitle}
        />
      ) : (
        <AuthHeading compact title={screenCopy.title} subtitle={screenCopy.subtitle} />
      )}

      <View>
        <Notice type={messageType} text={message} onDismiss={() => setMessage(null)} />

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
          editable={!showResetVerify && !showSecondFactor}
          returnKeyType={showSignIn ? "next" : showResetRequest ? "done" : "next"}
          onSubmitEditing={() => {
            if (showSignIn) return passwordRef.current?.focus();
            if (showResetRequest) return startResetFlow();
            return codeRef.current?.focus();
          }}
        />

        {showSignIn ? (
          <>
            <AuthField
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              focused={focusedField === "password"}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              inputRef={passwordRef}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            >
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={12}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={AUTH_COLORS.muted}
                />
              </TouchableOpacity>
            </AuthField>

            <Pressable
              onPress={() => {
                setMode("resetRequest");
                setMessage(null);
                setFocusedField(null);
              }}
              hitSlop={12}
              style={styles.forgotWrap}
            >
              <Text style={styles.forgot}>Forgot password?</Text>
            </Pressable>
          </>
        ) : null}

        {showResetVerify ? (
          <>
            <AuthField
              label="Reset Code"
              icon="key-outline"
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code from your email"
              focused={focusedField === "code"}
              onFocus={() => setFocusedField("code")}
              onBlur={() => setFocusedField(null)}
              inputRef={codeRef}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />

            <AuthField
              label="New Password"
              icon="lock-closed-outline"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Create a new password"
              focused={focusedField === "newPassword"}
              onFocus={() => setFocusedField("newPassword")}
              onBlur={() => setFocusedField(null)}
              inputRef={newPasswordRef}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            >
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={12}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={AUTH_COLORS.muted}
                />
              </TouchableOpacity>
            </AuthField>

            <AuthField
              label="Confirm New Password"
              icon="checkmark-circle-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your new password"
              focused={focusedField === "confirmPassword"}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              inputRef={confirmPasswordRef}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="password"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={completeReset}
            />

            <Pressable onPress={resendResetCode} disabled={resending} hitSlop={12} style={styles.resendWrap}>
              <Text style={styles.forgot}>{resending ? "Sending again…" : "Resend code"}</Text>
            </Pressable>
          </>
        ) : null}

        {showSecondFactor ? (
          <>
            <AuthField
              label="Security Code"
              icon="key-outline"
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code from your email"
              focused={focusedField === "code"}
              onFocus={() => setFocusedField("code")}
              onBlur={() => setFocusedField(null)}
              inputRef={codeRef}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={completeSecondFactor}
            />

            <Pressable onPress={resendSecondFactorCode} disabled={resending} hitSlop={12} style={styles.resendWrap}>
              <Text style={styles.forgot}>{resending ? "Sending again…" : "Resend code"}</Text>
            </Pressable>
          </>
        ) : null}

        <PrimaryButton
          title={screenCopy.cta}
          loading={loading}
          onPress={
            showSignIn
              ? handleSignIn
              : showResetRequest
              ? startResetFlow
              : showSecondFactor
              ? completeSecondFactor
              : completeReset
          }
        />

        {/* Social SSO — only shown on the main sign-in mode, below the credentials form */}
        {showSignIn ? (
          <>
            <AuthDivider />
            <AppleButton onPress={handleAppleSignIn} loading={appleLoading} title="Continue with Apple" />
            <GoogleButton onPress={handleGoogleSignIn} loading={googleLoading} title="Continue with Google" />
          </>
        ) : null}

        <View style={styles.footer}>
          {showSignIn ? (
            <FooterLink
              prompt="Don't have an account?"
              action="Create account"
              showArrow
              onPress={() => router.replace("/(auth)/sign-up")}
            />
          ) : (
            <FooterLink prompt="Remembered it?" action="Back to Sign In" onPress={resetToSignIn} />
          )}
        </View>
      </View>
    </AuthCanvas>
  );
}

const styles = StyleSheet.create({
  topRow: {
    minHeight: IS_COMPACT ? 44 : 48,
    justifyContent: "center",
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -6,
    marginBottom: 2,
  },
  resendWrap: {
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 2,
  },
  forgot: {
    fontSize: 15,
    color: AUTH_COLORS.primary,
    fontFamily: "DMSans_700Bold",
  },
  footer: {
    marginTop: 16,
  },
});
