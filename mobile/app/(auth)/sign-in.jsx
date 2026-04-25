import { useSignIn } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { parseClerkError } from "../../utils/errors";

const { width, height } = Dimensions.get("window");
const HAS_SIGNED_IN_KEY = "@mft:hasSignedInBefore";
const CONTENT_MAX_WIDTH = width >= 1024 ? 520 : width >= 768 ? 500 : 460;
const ORB_PEACH = Math.min(width * 0.56, 360);
const ORB_MINT = Math.min(width * 0.42, 300);
const ORB_VIOLET = Math.min(width * 0.72, 520);
const ORB_ROSE = Math.min(width * 0.38, 240);
const LIGHT_SWEEP_WIDTH = Math.min(width * 0.9, 820);
const IS_COMPACT = height <= 900;

const C = {
  bgTop: "#FFF8F2",
  bgMid: "#FAF6FF",
  bgBottom: "#F4F8FA",
  peachGlow: "rgba(255, 193, 122, 0.24)",
  mintGlow: "rgba(120, 235, 215, 0.18)",
  violetGlow: "rgba(114, 86, 255, 0.15)",
  roseGlow: "rgba(255, 157, 211, 0.1)",
  glassStrong: "rgba(255,255,255,0.83)",
  glassSoft: "rgba(255,255,255,0.66)",
  border: "rgba(137, 125, 119, 0.14)",
  textPrimary: "#221B18",
  textSecondary: "#60554E",
  textMuted: "#9B8E86",
  brand: "#6B4EFF",
  brandDeep: "#4D31F6",
  brandSoft: "#9A8BFF",
  brandGlow: "rgba(107, 78, 255, 0.34)",
  white: "#FFFFFF",
  divider: "rgba(137, 125, 119, 0.15)",
  successSoft: "rgba(79, 191, 145, 0.14)",
  successText: "#32785D",
  errorSoft: "rgba(237, 86, 120, 0.12)",
  errorText: "#A34158",
};

function GlossyField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  focused,
  onFocus,
  onBlur,
  inputRef,
  children,
  ...inputProps
}) {
  return (
    <View style={styles.fieldBlock}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        <LinearGradient
          colors={
            focused
              ? ["rgba(255,255,255,0.98)", "rgba(244,240,255,0.92)"]
              : ["rgba(255,255,255,0.96)", "rgba(249,247,255,0.86)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inputWrap}
        >
          <View style={styles.inputGloss} />
          <Ionicons
            name={icon}
            size={18}
            color={focused ? C.brand : C.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={C.textMuted}
            selectionColor={C.brand}
            keyboardAppearance="light"
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            {...inputProps}
          />
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

function Notice({ type, text }) {
  if (!text) return null;
  const isError = type === "error";

  return (
    <View style={[styles.notice, isError ? styles.noticeError : styles.noticeSuccess]}>
      <Ionicons
        name={isError ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={16}
        color={isError ? C.errorText : C.successText}
      />
      <Text style={[styles.noticeText, isError && styles.noticeTextError]}>{text}</Text>
    </View>
  );
}

export default function SignInScreen() {
  const router = useRouter();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const codeRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const resetAttemptRef = useRef(null);
  const { signIn, setActive, isLoaded } = useSignIn();

  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const screenCopy = useMemo(() => {
    if (mode === "resetRequest") {
      return {
        chip: "Account recovery, handled calmly",
        title: "Reset password",
        subtitle: IS_COMPACT ? "Get a secure reset code by email." : "We will send a secure reset code so you can choose a new password calmly.",
        eyebrow: "RECOVERY",
        cardTitle: "Recover your account",
        security: "Private",
        cta: loading ? "Sending code..." : "Send reset code",
      };
    }
    if (mode === "resetVerify") {
      return {
        chip: "Account recovery, handled calmly",
        title: "Choose a new password",
        subtitle: IS_COMPACT ? "Enter the code and your new password." : "Enter the code from your email and create a fresh password for your account.",
        eyebrow: "VERIFY",
        cardTitle: "Secure your account",
        security: "Verified",
        cta: loading ? "Resetting password..." : "Reset password",
      };
    }
    return {
      chip: "Smart nutrition, calm focus",
      title: isReturningUser ? "Welcome back." : "Sign in",
      subtitle: isReturningUser
        ? IS_COMPACT
          ? "Step back into your wellness dashboard."
          : "Step back into your private wellness dashboard with your meals and progress intact."
        : IS_COMPACT
          ? "Your calm nutrition portal."
          : "A glossy little portal into your nutrition rhythm, streaks, and progress.",
      eyebrow: "LOGIN",
      cardTitle: "Your private wellness space",
      security: "Secure",
      cta: loading ? "Signing in..." : "Sign in",
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
    <LinearGradient colors={[C.bgTop, C.bgMid, C.bgBottom]} style={styles.root}>
      <View style={[styles.background, styles.noPointerEvents]}>
        <View style={[styles.orb, styles.orbPeach]} />
        <View style={[styles.orb, styles.orbMint]} />
        <View style={[styles.orb, styles.orbViolet]} />
        <View style={[styles.orb, styles.orbRose]} />
        <LinearGradient colors={["rgba(255,255,255,0.72)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lightSweep} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Animated.View entering={FadeIn.delay(70).duration(420)} style={styles.hero}>
              <View style={styles.logoStage}>
                <View style={styles.logoFloor} />
                <LinearGradient colors={["rgba(255,255,255,0.98)", "rgba(245,241,255,0.78)"]} style={styles.logoHalo}>
                  <LinearGradient colors={["#FFFFFF", "rgba(255,255,255,0.74)"]} style={styles.logoFrame}>
                    <View style={styles.logoGloss} />
                    <Image source={require("../../assets/images/app-logo.png")} style={styles.logo} contentFit="contain" />
                  </LinearGradient>
                </LinearGradient>
              </View>

              <View style={styles.heroTextBlock}>
                <Text style={styles.brandName}>MYFOODTRACKER</Text>
                <View style={styles.brandChip}>
                  <View style={styles.brandChipDot} />
                  <Text style={styles.brandChipText}>{screenCopy.chip}</Text>
                </View>
                <Text style={styles.title}>{screenCopy.title}</Text>
                <Text style={styles.subtitle}>{screenCopy.subtitle}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(460)} style={styles.cardDepth}>
              <View style={styles.cardShadowPlate} />
              <LinearGradient colors={["rgba(255,255,255,0.86)", "rgba(216,207,255,0.4)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                <BlurView intensity={30} tint="light" style={styles.card}>
                  <View style={styles.cardTopGlow} />
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.eyebrow}>{screenCopy.eyebrow}</Text>
                      <Text style={styles.cardTitle}>{screenCopy.cardTitle}</Text>
                    </View>
                    <View style={styles.securityChip}>
                      <Ionicons name="shield-checkmark-outline" size={15} color={C.brandDeep} />
                      <Text style={styles.securityChipText}>{screenCopy.security}</Text>
                    </View>
                  </View>

                  <Notice type={messageType} text={message} />

                  <GlossyField
                    label="Email"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
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
                      <View style={styles.passwordRow}>
                        <Text style={styles.label}>Password</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setMode("resetRequest");
                            setMessage(null);
                            setFocusedField(null);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={styles.forgot}>Forgot password?</Text>
                        </TouchableOpacity>
                      </View>

                      <GlossyField
                        label=""
                        icon="lock-closed-outline"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
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
                        <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color={focusedField === "password" ? C.brandDeep : C.textMuted} />
                        </TouchableOpacity>
                      </GlossyField>
                    </>
                  ) : null}

                  {showResetVerify ? (
                    <>
                      <GlossyField
                        label="Reset code"
                        icon="key-outline"
                        value={code}
                        onChangeText={setCode}
                        placeholder="Enter the email code"
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

                      <GlossyField
                        label="New password"
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
                        <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color={focusedField === "newPassword" ? C.brandDeep : C.textMuted} />
                        </TouchableOpacity>
                      </GlossyField>

                      <GlossyField
                        label="Confirm password"
                        icon="checkmark-circle-outline"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
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
                      >
                        <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color={focusedField === "confirmPassword" ? C.brandDeep : C.textMuted} />
                        </TouchableOpacity>
                      </GlossyField>

                      <TouchableOpacity onPress={resendResetCode} disabled={resending} activeOpacity={0.8} style={styles.secondaryAction}>
                        <Text style={styles.secondaryActionText}>{resending ? "Sending again..." : "Resend code"}</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  <TouchableOpacity
                    onPress={showSignIn ? handleSignIn : showResetRequest ? startResetFlow : completeReset}
                    disabled={loading}
                    activeOpacity={0.9}
                    style={[styles.ctaDepth, loading && styles.ctaDisabled]}
                  >
                    <View style={styles.ctaBase} />
                    <LinearGradient colors={[C.brandDeep, C.brand, C.brandSoft]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.cta}>
                      <Text style={styles.ctaText}>{screenCopy.cta}</Text>
                      <Ionicons name={loading ? "time-outline" : "arrow-forward"} size={19} color={C.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </BlurView>
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(170).duration(420)} style={styles.footer}>
              <View style={styles.footerDivider} />
              <View style={styles.footerRow}>
                {showSignIn ? (
                  <>
                    <Text style={styles.footerPrompt}>New here?</Text>
                    <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} activeOpacity={0.8} style={styles.footerLink}>
                      <Text style={styles.footerLinkText}>Create account</Text>
                      <Ionicons name="arrow-forward" size={15} color={C.brandDeep} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.footerPrompt}>Remembered it?</Text>
                    <TouchableOpacity onPress={resetToSignIn} activeOpacity={0.8} style={styles.footerLink}>
                      <Text style={styles.footerLinkText}>Back to sign in</Text>
                      <Ionicons name="arrow-forward" size={15} color={C.brandDeep} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  noPointerEvents: { pointerEvents: "none" },
  background: { ...StyleSheet.absoluteFillObject },
  orb: { position: "absolute", borderRadius: 999 },
  orbPeach: { width: ORB_PEACH, height: ORB_PEACH, top: -44, left: -44, backgroundColor: C.peachGlow },
  orbMint: { width: ORB_MINT, height: ORB_MINT, top: IS_COMPACT ? 176 : 150, right: IS_COMPACT ? -52 : -34, backgroundColor: C.mintGlow },
  orbViolet: {
    width: IS_COMPACT ? Math.min(ORB_VIOLET, 420) : ORB_VIOLET,
    height: IS_COMPACT ? Math.min(ORB_VIOLET, 420) : ORB_VIOLET,
    bottom: IS_COMPACT ? -210 : -150,
    right: IS_COMPACT ? -110 : -80,
    backgroundColor: C.violetGlow,
  },
  orbRose: {
    width: IS_COMPACT ? Math.min(ORB_ROSE, 180) : ORB_ROSE,
    height: IS_COMPACT ? Math.min(ORB_ROSE, 180) : ORB_ROSE,
    top: IS_COMPACT ? 438 : 360,
    left: IS_COMPACT ? -62 : -50,
    backgroundColor: C.roseGlow,
  },
  lightSweep: {
    position: "absolute",
    width: LIGHT_SWEEP_WIDTH,
    height: 180,
    top: 70,
    right: -70,
    borderRadius: 999,
    transform: [{ rotate: "-14deg" }],
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: IS_COMPACT ? 8 : 26,
    paddingBottom: IS_COMPACT ? 6 : 30,
  },
  content: { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  hero: {
    width: IS_COMPACT ? "90%" : "100%",
    maxWidth: IS_COMPACT ? 400 : undefined,
    alignSelf: "center",
    alignItems: "center",
    marginBottom: IS_COMPACT ? 6 : 22,
  },
  heroTextBlock: { width: "100%", alignItems: "center" },
  logoStage: {
    width: IS_COMPACT ? 66 : 104,
    height: IS_COMPACT ? 70 : 110,
    marginBottom: IS_COMPACT ? 4 : 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFloor: {
    position: "absolute",
    bottom: 6,
    width: IS_COMPACT ? 44 : 72,
    height: IS_COMPACT ? 10 : 18,
    borderRadius: 999,
    backgroundColor: "rgba(107, 78, 255, 0.12)",
    transform: [{ scaleX: 1.08 }],
  },
  logoHalo: {
    width: IS_COMPACT ? 56 : 94,
    height: IS_COMPACT ? 56 : 94,
    borderRadius: IS_COMPACT ? 18 : 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.brandGlow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.38,
    shadowRadius: 26,
    elevation: 10,
  },
  logoFrame: {
    width: IS_COMPACT ? 48 : 82,
    height: IS_COMPACT ? 48 : 82,
    borderRadius: IS_COMPACT ? 16 : 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
  },
  logoGloss: {
    position: "absolute",
    top: 5,
    left: 10,
    right: 10,
    height: IS_COMPACT ? 8 : 20,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  logo: {
    width: IS_COMPACT ? 40 : 68,
    height: IS_COMPACT ? 40 : 68,
    borderRadius: IS_COMPACT ? 12 : 20,
  },
  brandName: {
    fontSize: IS_COMPACT ? 10 : 12,
    color: C.textMuted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 4.2,
    marginBottom: IS_COMPACT ? 4 : 10,
    textAlign: "center",
  },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: IS_COMPACT ? 9 : 13,
    paddingVertical: IS_COMPACT ? 5 : 9,
    borderRadius: 999,
    backgroundColor: C.glassSoft,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    shadowColor: "rgba(58, 46, 141, 0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: IS_COMPACT ? 8 : 18,
  },
  brandChipDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: C.brand, marginRight: 10 },
  brandChipText: { fontSize: IS_COMPACT ? 11 : 13, color: C.textSecondary, fontFamily: "DMSans_500Medium" },
  title: {
    fontSize: IS_COMPACT ? 24 : 34,
    lineHeight: IS_COMPACT ? 27 : 39,
    color: C.textPrimary,
    fontFamily: "TenorSans_400Regular",
    letterSpacing: -0.4,
    marginBottom: IS_COMPACT ? 4 : 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: IS_COMPACT ? 12 : 15,
    lineHeight: IS_COMPACT ? 17 : 23,
    color: C.textSecondary,
    fontFamily: "DMSans_400Regular",
    letterSpacing: 0.05,
    maxWidth: IS_COMPACT ? 270 : 340,
    textAlign: "center",
  },
  cardDepth: {
    position: "relative",
    marginBottom: IS_COMPACT ? 4 : 18,
    width: IS_COMPACT ? "90%" : "100%",
    maxWidth: IS_COMPACT ? 400 : undefined,
    alignSelf: "center",
  },
  cardShadowPlate: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: IS_COMPACT ? -6 : -10,
    height: IS_COMPACT ? 18 : 36,
    borderRadius: 20,
    backgroundColor: "rgba(97, 74, 255, 0.08)",
  },
  cardBorder: { borderRadius: IS_COMPACT ? 20 : 30, padding: 1.2 },
  card: {
    overflow: "hidden",
    borderRadius: IS_COMPACT ? 19 : 29,
    padding: IS_COMPACT ? 10 : 20,
    backgroundColor: C.glassStrong,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTopGlow: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: IS_COMPACT ? 22 : 54,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: IS_COMPACT ? 10 : 12,
    marginBottom: IS_COMPACT ? 10 : 18,
  },
  cardHeaderText: { flex: 1, paddingRight: 8 },
  eyebrow: {
    fontSize: IS_COMPACT ? 9 : 11,
    color: C.textMuted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 3.2,
    marginBottom: IS_COMPACT ? 3 : 8,
  },
  cardTitle: {
    fontSize: IS_COMPACT ? 15 : 22,
    lineHeight: IS_COMPACT ? 18 : 28,
    color: C.textPrimary,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.3,
    maxWidth: IS_COMPACT ? 180 : 240,
    textAlign: "center",
  },
  securityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: IS_COMPACT ? 8 : 12,
    paddingVertical: IS_COMPACT ? 6 : 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(201, 192, 255, 0.78)",
    shadowColor: "rgba(107, 78, 255, 0.14)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  securityChipText: {
    fontSize: IS_COMPACT ? 9.5 : 12,
    color: C.brandDeep,
    fontFamily: "DMSans_500Medium",
    marginLeft: 6,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: IS_COMPACT ? 8 : 12,
    gap: 8,
  },
  noticeSuccess: { backgroundColor: C.successSoft },
  noticeError: { backgroundColor: C.errorSoft },
  noticeText: {
    flex: 1,
    fontSize: IS_COMPACT ? 10.5 : 12,
    color: C.successText,
    fontFamily: "DMSans_500Medium",
    lineHeight: IS_COMPACT ? 14 : 17,
  },
  noticeTextError: { color: C.errorText },
  fieldBlock: { marginBottom: IS_COMPACT ? 6 : 14 },
  label: {
    fontSize: IS_COMPACT ? 10 : 13,
    color: C.textSecondary,
    fontFamily: "DMSans_500Medium",
    marginBottom: IS_COMPACT ? 3 : 8,
  },
  inputShell: {
    borderRadius: 19,
    shadowColor: "rgba(43, 31, 132, 0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  inputShellFocused: { shadowColor: C.brandGlow, shadowOpacity: 0.24 },
  inputWrap: {
    position: "relative",
    height: IS_COMPACT ? 40 : 58,
    borderRadius: IS_COMPACT ? 13 : 19,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: IS_COMPACT ? 10 : 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    overflow: "hidden",
  },
  inputGloss: {
    position: "absolute",
    top: 4,
    left: 10,
    right: 10,
    height: IS_COMPACT ? 8 : 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  inputIcon: { marginRight: IS_COMPACT ? 6 : 12 },
  input: {
    flex: 1,
    height: "100%",
    color: C.textPrimary,
    fontSize: IS_COMPACT ? 12.5 : 15,
    fontFamily: "DMSans_400Regular",
  },
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    marginBottom: IS_COMPACT ? 3 : 8,
  },
  forgot: { fontSize: IS_COMPACT ? 10 : 12, color: C.brandDeep, fontFamily: "DMSans_500Medium" },
  secondaryAction: { alignSelf: "center", marginTop: IS_COMPACT ? 2 : 6, marginBottom: IS_COMPACT ? 2 : 8 },
  secondaryActionText: { fontSize: IS_COMPACT ? 10.5 : 13, color: C.brandDeep, fontFamily: "DMSans_500Medium" },
  ctaDepth: {
    position: "relative",
    marginTop: IS_COMPACT ? 8 : 18,
    width: "100%",
    maxWidth: IS_COMPACT ? 250 : 340,
    alignSelf: "center",
  },
  ctaBase: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: -6,
    height: IS_COMPACT ? 10 : 16,
    borderRadius: 999,
    backgroundColor: "rgba(80, 56, 255, 0.14)",
  },
  ctaDisabled: { opacity: 0.72 },
  cta: {
    height: IS_COMPACT ? 40 : 52,
    borderRadius: IS_COMPACT ? 13 : 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  ctaText: {
    fontSize: IS_COMPACT ? 13 : 15,
    color: C.white,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.1,
    marginRight: 8,
  },
  footer: {
    width: IS_COMPACT ? "90%" : "100%",
    maxWidth: IS_COMPACT ? 400 : undefined,
    alignSelf: "center",
    marginTop: IS_COMPACT ? 0 : 6,
  },
  footerDivider: { height: 1, backgroundColor: C.divider, marginBottom: IS_COMPACT ? 4 : 14 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  footerPrompt: {
    fontSize: IS_COMPACT ? 11 : 14,
    color: C.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginRight: 8,
  },
  footerLink: { flexDirection: "row", alignItems: "center" },
  footerLinkText: {
    fontSize: IS_COMPACT ? 11.5 : 15,
    color: C.brandDeep,
    fontFamily: "DMSans_500Medium",
    marginRight: 6,
  },
});
