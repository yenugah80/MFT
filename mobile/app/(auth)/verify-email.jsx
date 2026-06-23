import { useAuth, useSignUp } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  AuthCanvas,
  AuthField,
  AuthHeading,
  BackButton,
  FooterLink,
  Notice,
  PrimaryButton,
  SmallBrand,
  AUTH_COLORS,
} from "../../components/auth/LaunchAuthDesign";
import { saveProfileBasics } from "../../services/profileAPI";

const VerifyEmail = ({ email, firstName, lastName, onBack }) => {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken } = useAuth();
  const codeRef = useRef(null);
  const attemptedCodes = useRef(new Set());

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [message, setMessage] = useState("Your verification code is waiting in your inbox.");
  const [messageType, setMessageType] = useState("success");

  const setNotice = (type, text) => {
    setMessageType(type);
    setMessage(text);
  };

  const finishProfileSetup = async (sessionId) => {
    await setActive({ session: sessionId });
    await new Promise((resolve) => setTimeout(resolve, 500));

    let token = await getToken();
    let retries = 3;

    while (!token && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      token = await getToken();
      retries -= 1;
    }

    if (!token) {
      setNotice("error", "Your account was created, but we could not initialize your profile yet.");
      return;
    }

    await saveProfileBasics(token, {
      fullName: `${firstName} ${lastName}`.trim(),
      email,
    });

    try {
      await AsyncStorage.removeItem("@onboarding_draft");
      await AsyncStorage.removeItem("@onboarding_current_step");
    } catch (storageErr) {
      console.warn("Could not clear onboarding draft:", storageErr);
    }

    router.replace("/onboarding/step-1");
  };

  const handleVerification = async () => {
    if (!isLoaded) return;

    const sanitizedCode = (code || "").toString().trim();

    if (!sanitizedCode) {
      setNotice("error", "Enter the verification code from your email.");
      return;
    }

    if (attemptedCodes.current.has(sanitizedCode)) {
      setNotice("error", "That code was already used. Request a fresh one below.");
      return;
    }

    setLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: sanitizedCode,
      });

      if (signUpAttempt?.status === "complete") {
        attemptedCodes.current.add(sanitizedCode);
        await finishProfileSetup(signUpAttempt.createdSessionId);
        return;
      }

      const serverMessage =
        signUpAttempt?.errors?.[0]?.message ||
        signUpAttempt?.fullMessage ||
        "Verification did not complete. Please try again.";
      setNotice("error", serverMessage);
    } catch (err) {
      setNotice(
        "error",
        err?.errors?.[0]?.message || err?.message || "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded) return;

    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setNotice("success", "A fresh verification code has been sent.");
    } catch (err) {
      setNotice(
        "error",
        err?.errors?.[0]?.message || err?.message || "Could not resend the code."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCanvas>
      <View style={styles.topRow}>
        <BackButton onPress={onBack} />
      </View>

      <SmallBrand style={styles.brand} />
      <AuthHeading title="Check your email" subtitle={`Enter the verification code sent to ${email}.`} />

      <Animated.View entering={FadeInDown.delay(140).duration(420)}>
        <Notice type={messageType} text={message} />

        <AuthField
          icon="key-outline"
          value={code}
          onChangeText={setCode}
          placeholder="Verification code"
          focused={focusedField === "code"}
          onFocus={() => setFocusedField("code")}
          onBlur={() => setFocusedField(null)}
          inputRef={codeRef}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleVerification}
        />

        <PrimaryButton
          title={loading ? "Verifying..." : "Verify and continue"}
          loading={loading}
          onPress={handleVerification}
        />

        <Pressable onPress={resendCode} disabled={resending} hitSlop={12} style={styles.resendWrap}>
          <Text style={styles.resendText}>{resending ? "Sending again..." : "Resend code"}</Text>
        </Pressable>

        <View style={styles.footer}>
          <FooterLink prompt="Wrong email?" action="Back to sign up" onPress={onBack} />
        </View>
      </Animated.View>
    </AuthCanvas>
  );
};

const styles = StyleSheet.create({
  topRow: {
    minHeight: 54,
    justifyContent: "center",
  },
  brand: {
    marginTop: 20,
    marginBottom: 22,
  },
  resendWrap: {
    alignSelf: "center",
    marginTop: 22,
  },
  resendText: {
    fontSize: 15,
    color: AUTH_COLORS.green,
    fontFamily: "DMSans_700Bold",
  },
  footer: {
    marginTop: 42,
  },
});

export default VerifyEmail;
