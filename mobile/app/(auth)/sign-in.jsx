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
} from "../../components/auth/LaunchAuthDesign";
import { parseClerkError } from "../../utils/errors";

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

      const finishSignIn = async (sessionId, activate) => {
        await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
        await activate({ session: sessionId });
        router.replace("/");
      };

      try {
        // `oauth_token_apple`, NOT `oauth_apple`. The latter is Clerk's
        // browser-redirect flow and ignores a supplied token entirely, which
        // is why the attempt came back `needs_identifier` — Clerk never saw
        // an identity at all. `oauth_token_apple` is the native strategy that
        // accepts the identityToken from expo-apple-authentication. The
        // instance advertises both in supported_first_factors.
        const attempt = await signIn.create({
          strategy: "oauth_token_apple",
          token: credential.identityToken,
        });

        if (attempt.status === "complete") {
          await finishSignIn(attempt.createdSessionId, setActive);
          return;
        }

        // `transferable` means Clerk recognises this person (an account with
        // this email already exists) but has no Apple identity attached to it
        // yet — e.g. an account created with Google or email/password. Clerk
        // will not return `complete` until the identity is explicitly linked
        // via a transfer. Without this branch the user authenticates with
        // Face ID and then nothing happens at all, which is exactly the bug.
        if (attempt.firstFactorVerification?.status === "transferable") {
          const transferred = await signUp.create({ transfer: true });
          if (transferred.status === "complete") {
            await finishSignIn(transferred.createdSessionId, setSignUpActive);
            return;
          }
          throw new Error(`Apple account link did not complete (status: ${transferred.status}).`);
        }

        throw new Error(`Apple sign-in did not complete (status: ${attempt.status}).`);
      } catch (clerkErr) {
        if (clerkErr?.errors?.[0]?.code === "external_account_not_found") {
          const attempt = await signUp.create({
            strategy: "oauth_token_apple",
            token: credential.identityToken,
            ...(credential.fullName?.givenName && { firstName: credential.fullName.givenName }),
            ...(credential.fullName?.familyName && { lastName: credential.fullName.familyName }),
          });

          if (attempt.status === "complete" || attempt.status === "missing_requirements") {
            await finishSignIn(attempt.createdSessionId, setSignUpActive);
            return;
          }

          // Mirror image of the case above: signing *up* discovered the
          // identity already belongs to an existing user, so transfer back
          // into a sign-in rather than dead-ending.
          if (attempt.verifications?.externalAccount?.status === "transferable") {
            const transferred = await signIn.create({ transfer: true });
            if (transferred.status === "complete") {
              await finishSignIn(transferred.createdSessionId, setActive);
              return;
            }
          }

          throw new Error(`Apple sign-up did not complete (status: ${attempt.status}).`);
        } else {
          throw clerkErr;
        }
      }
    } catch (err) {
      if (err.code === "ERR_REQUEST_CANCELED") return;
      console.warn("[Auth] Apple sign-in failed:", err);
      const appleMsg = {
        ERR_REQUEST_UNKNOWN: "Apple sign-in failed. Make sure you're signed into an Apple ID on this device.",
        ERR_REQUEST_NOT_HANDLED: "Apple sign-in could not be completed. Please try again.",
        ERR_REQUEST_NOT_INTERACTIVE: "Apple sign-in requires user interaction. Please try again.",
        ERR_INVALID_RESPONSE: "Apple returned an invalid response. Please try again.",
      }[err.code];
      setNotice("error", appleMsg || parseClerkError(err) || "Apple sign-in failed. Please try again or use email.");
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setNotice("error", "Please enter your email and password.");
      return;
    }
    if (!isLoaded) return;

    setLoading(true);
    setMessage(null);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === "complete") {
        await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, "true");
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
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
    if (!isLoaded) return;

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
    if (!email.trim() || !isLoaded) return;

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
    if (newPassword !== confirmPassword) {
      setNotice("error", "Your new passwords do not match.");
      return;
    }
    if (!isLoaded) return;

    setLoading(true);
    setMessage(null);
    try {
      let attempt = await (resetAttemptRef.current || signIn).attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });

      resetAttemptRef.current = attempt;
      if (attempt.status === "needs_new_password") {
        attempt = await attempt.resetPassword({
          password: newPassword,
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

  const showSignIn = mode === "signIn";
  const showResetRequest = mode === "resetRequest";
  const showResetVerify = mode === "resetVerify";

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
          editable={!showResetVerify}
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

        <PrimaryButton
          title={screenCopy.cta}
          loading={loading}
          onPress={showSignIn ? handleSignIn : showResetRequest ? startResetFlow : completeReset}
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
    minHeight: 54,
    justifyContent: "center",
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -6,
    marginBottom: 4,
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
    marginTop: 32,
  },
});
