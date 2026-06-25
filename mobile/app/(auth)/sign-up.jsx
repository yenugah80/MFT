import { useOAuth, useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
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

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");

  const setNotice = (type, text) => {
    setMessageType(type);
    setMessage(text);
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/"),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/onboarding/step-1");
      }
    } catch (err) {
      setNotice("error", "Google sign-up failed. Please try again or use email.");
    } finally {
      setGoogleLoading(false);
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
      if (err?.errors?.[0]?.code === "form_identifier_exists") {
        setNotice("error", "This email is already registered. Please sign in instead.");
        return;
      }
      setNotice("error", parseClerkError(err));
      console.log("CLERK SIGN-UP ERROR:", err);
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
            <PrimaryButton title="Create Account" onPress={() => setStep("details")} />
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

      <View>
        <Notice type={messageType} text={message} />

        {/* Google SSO — primary social option shown first */}
        <GoogleButton onPress={handleGoogleSignUp} loading={googleLoading} />

        <AuthDivider />

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

        <View style={styles.footer}>
          <FooterLink
            prompt="Already have an account?"
            action="Sign In"
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
    marginTop: 28,
    gap: 14,
  },
  welcomeBottom: {
    marginTop: "auto",
    gap: 6,
  },
  topRow: {
    minHeight: 54,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  footer: {
    marginTop: 32,
  },
});
