import { useOAuth, useSignUp } from "@clerk/clerk-expo";
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
  AuthHeading,
  BackButton,
  FooterLink,
  GoogleButton,
  Notice,
  PrimaryButton,
  WelcomeBrand,
  WelcomeCreateAccountAction,
  WelcomeFeatureChips,
  WelcomeHeadlineContent,
  WelcomePrivacyNote,
  WelcomeSubheadlineContent,
  AUTH_COLORS,
} from "../../components/auth/LaunchAuthDesign";
import { parseClerkError } from "../../utils/errors";
import VerifyEmail from "./verify-email";

// Required for Clerk OAuth on Expo — closes the browser after redirect
WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT_URL = makeRedirectUri({ native: "my-food-tracker://oauth-native-callback" });

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
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
      const { createdSessionId, setActive } = await startGoogleOAuthFlow({
        redirectUrl: OAUTH_REDIRECT_URL,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/onboarding/step-1");
      }
    } catch (err) {
      console.warn("[Auth] Google sign-up failed:", err);
      setNotice("error", __DEV__ ? parseClerkError(err) : "Google sign-up failed. Please try again or use email.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      setNotice("error", "Sign in with Apple is not available on this device.");
      return;
    }

    setAppleLoading(true);
    setMessage(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const attempt = await signUp.create({
        strategy: "oauth_apple",
        redirectUrl: OAUTH_REDIRECT_URL,
        token: credential.identityToken,
        ...(credential.fullName?.givenName && { firstName: credential.fullName.givenName }),
        ...(credential.fullName?.familyName && { lastName: credential.fullName.familyName }),
      });

      if (attempt.status === "complete" || attempt.status === "missing_requirements") {
        router.replace("/onboarding/step-1");
      }
    } catch (err) {
      if (err.code === "ERR_REQUEST_CANCELED") return;
      console.warn("[Auth] Apple sign-up failed:", err);
      const appleMsg = {
        ERR_REQUEST_UNKNOWN: "Apple sign-in failed. Make sure you're signed into an Apple ID on this device.",
        ERR_REQUEST_NOT_HANDLED: "Apple sign-in could not be completed. Please try again.",
        ERR_REQUEST_NOT_INTERACTIVE: "Apple sign-in requires user interaction. Please try again.",
        ERR_INVALID_RESPONSE: "Apple returned an invalid response. Please try again.",
      }[err.code];
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
    if (!isLoaded) return;

    setLoading(true);
    setMessage(null);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
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
            <WelcomeFeatureChips />
            <WelcomeSubheadlineContent />
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

      {/* Centered heading — no SmallBrand, matches screenshot */}
      <AuthHeading
        compact
        centered
        title="Create your account"
        subtitle="Let's get started."
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
          label="Email Address"
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
        />

        <AuthDivider />

        {/* Social SSO — compact row keeps create-account within one viewport */}
        <View style={styles.socialRow}>
          <AppleButton
            onPress={handleAppleSignUp}
            loading={appleLoading}
            title="Apple"
            style={[styles.socialOption, styles.socialOptionApple]}
          />
          <GoogleButton
            onPress={handleGoogleSignUp}
            loading={googleLoading}
            title="Google"
            style={styles.socialOption}
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
    marginTop: 14,
    gap: 14,
  },
  welcomeBottom: {
    marginTop: "auto",
    gap: 6,
  },
  topRow: {
    minHeight: 46,
    justifyContent: "center",
    marginBottom: 14,
  },
  detailsForm: {
    marginTop: 30,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  socialOption: {
    flex: 1,
    marginTop: 0,
    height: 46,
    paddingHorizontal: 10,
  },
  socialOptionApple: {
    marginTop: 0,
  },
});
