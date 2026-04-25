import { useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
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
import VerifyEmail from "./verify-email";

const { width, height } = Dimensions.get("window");
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

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();

  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      return Alert.alert("Error", "Email and password fields are required.");
    }

    if (password !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match.");
    }

    if (!isLoaded) return;

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      const message = parseClerkError(err);

      if (err?.errors?.[0]?.code === "form_identifier_exists") {
        return Alert.alert("Email Already Registered", "Please sign in instead.");
      }

      Alert.alert("Error", message);
      console.log("CLERK SIGN-UP ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const moveFocus = (nextRef) => {
    if (nextRef?.current) {
      nextRef.current.focus();
    } else {
      handleSignUp();
    }
  };

  if (pendingVerification) {
    return (
      <VerifyEmail
        email={email}
        firstName={firstName}
        lastName={lastName}
        onBack={() => setPendingVerification(false)}
      />
    );
  }

  return (
    <LinearGradient colors={[C.bgTop, C.bgMid, C.bgBottom]} style={styles.root}>
      <View style={[styles.background, styles.noPointerEvents]}>
        <View style={[styles.orb, styles.orbPeach]} />
        <View style={[styles.orb, styles.orbMint]} />
        <View style={[styles.orb, styles.orbViolet]} />
        <View style={[styles.orb, styles.orbRose]} />
        <View style={styles.heroAura} />
        <View style={styles.cardAura} />
        <LinearGradient
          colors={["rgba(255,255,255,0.72)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lightSweep}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
          <Animated.View entering={FadeIn.delay(70).duration(420)} style={styles.hero}>
            <View style={styles.logoStage}>
              <View style={styles.logoBackGlow} />
              <View style={styles.logoFloor} />
              <LinearGradient
                colors={["rgba(255,255,255,0.98)", "rgba(245,241,255,0.78)"]}
                style={styles.logoHalo}
              >
                <LinearGradient
                  colors={["#FFFFFF", "rgba(255,255,255,0.74)"]}
                  style={styles.logoFrame}
                >
                  <View style={styles.logoGloss} />
                  <Image
                    source={require("../../assets/images/app-logo.png")}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </LinearGradient>
              </LinearGradient>
            </View>

            <Text style={styles.brandName}>MYFOODTRACKER</Text>
            <View style={styles.brandChip}>
              <View style={styles.brandChipDot} />
              <Text style={styles.brandChipText}>Create your wellness account</Text>
            </View>

            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              {IS_COMPACT
                ? "Build a calm home for meals and progress."
                : "Build a glossy little home for your meals, check-ins, progress, and momentum."}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(120).duration(460)}
            style={styles.cardDepth}
          >
            <View style={styles.cardShadowPlate} />
            <LinearGradient
              colors={["rgba(255,255,255,0.94)", "rgba(224,216,255,0.52)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardBorder}
            >
              <BlurView intensity={30} tint="light" style={styles.card}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.58)", "rgba(255,255,255,0.1)"]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.cardInnerStroke}
                />
                <LinearGradient
                  colors={["rgba(255,255,255,0.44)", "rgba(255,255,255,0)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 0.85 }}
                  style={styles.cardSheen}
                />
                <View style={styles.cardCornerGlow} />
                <View style={styles.cardTopGlow} />
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.eyebrow}>SIGN UP</Text>
                    <Text style={styles.cardTitle}>
                      {IS_COMPACT ? "Build your home" : "Build your nutrition home"}
                    </Text>
                  </View>
                  <View style={styles.securityChip}>
                    <Ionicons
                      name="sparkles-outline"
                      size={15}
                      color={C.brandDeep}
                    />
                    <Text style={styles.securityChipText}>Personal</Text>
                  </View>
                </View>

                <View style={styles.nameRow}>
                  <View style={styles.halfField}>
                    <GlossyField
                      label="First name"
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
                  <View style={styles.halfField}>
                    <GlossyField
                      label="Last name"
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
                  returnKeyType="next"
                  onSubmitEditing={() => moveFocus(passwordRef)}
                />

                <GlossyField
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create password"
                  focused={focusedField === "password"}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  inputRef={passwordRef}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  textContentType="newPassword"
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => moveFocus(confirmPasswordRef)}
                >
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={18}
                      color={focusedField === "password" ? C.brandDeep : C.textMuted}
                    />
                  </TouchableOpacity>
                </GlossyField>

                <GlossyField
                  label="Confirm password"
                  icon="checkmark-circle-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  focused={focusedField === "confirmPassword"}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  inputRef={confirmPasswordRef}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  textContentType="password"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                >
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={18}
                      color={
                        focusedField === "confirmPassword" ? C.brandDeep : C.textMuted
                      }
                    />
                  </TouchableOpacity>
                </GlossyField>

                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.9}
                  style={[styles.ctaDepth, loading && styles.ctaDisabled]}
                >
                  <View style={styles.ctaBase} />
                  <LinearGradient
                    colors={["#4B28F2", "#5B38FF", "#6C4FFF"]}
                    start={{ x: 0, y: 0.2 }}
                    end={{ x: 1, y: 0.8 }}
                    style={styles.cta}
                  >
                    <View style={styles.ctaAmbient} />
                    <LinearGradient
                      colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
                      start={{ x: 0.08, y: 0 }}
                      end={{ x: 0.9, y: 0.8 }}
                      style={styles.ctaTopGloss}
                    />
                    <Text style={styles.ctaText}>
                      {loading ? "Creating account..." : "Create account"}
                    </Text>
                    <View style={styles.ctaIconWrap}>
                      <Ionicons
                        name={loading ? "time-outline" : "arrow-forward"}
                        size={18}
                        color={C.white}
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </BlurView>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(170).duration(420)} style={styles.footer}>
            <View style={styles.footerDivider} />
            <View style={styles.footerRow}>
              <Text style={styles.footerPrompt}>Already registered?</Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/sign-in")}
                activeOpacity={0.8}
                style={styles.footerLink}
              >
                <Text style={styles.footerLinkText}>Back to sign in</Text>
                <Ionicons name="arrow-forward" size={15} color={C.brandDeep} />
              </TouchableOpacity>
            </View>
          </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  noPointerEvents: {
    pointerEvents: "none",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbPeach: {
    width: ORB_PEACH,
    height: ORB_PEACH,
    top: -44,
    left: -44,
    backgroundColor: C.peachGlow,
  },
  orbMint: {
    width: ORB_MINT,
    height: ORB_MINT,
    top: 150,
    right: -34,
    backgroundColor: C.mintGlow,
  },
  orbViolet: {
    width: ORB_VIOLET,
    height: ORB_VIOLET,
    bottom: -150,
    right: -80,
    backgroundColor: C.violetGlow,
  },
  orbRose: {
    width: ORB_ROSE,
    height: ORB_ROSE,
    top: 360,
    left: -50,
    backgroundColor: C.roseGlow,
  },
  heroAura: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    width: IS_COMPACT ? 190 : 260,
    height: IS_COMPACT ? 120 : 170,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    opacity: 0.55,
  },
  cardAura: {
    position: "absolute",
    top: IS_COMPACT ? 250 : 320,
    alignSelf: "center",
    width: IS_COMPACT ? 300 : 420,
    height: IS_COMPACT ? 260 : 360,
    borderRadius: 46,
    backgroundColor: "rgba(126, 103, 255, 0.08)",
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
    paddingTop: IS_COMPACT ? 5 : 26,
    paddingBottom: IS_COMPACT ? 3 : 30,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: IS_COMPACT ? 3 : 22,
  },
  logoStage: {
    width: IS_COMPACT ? 66 : 104,
    height: IS_COMPACT ? 70 : 110,
    marginBottom: IS_COMPACT ? 4 : 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBackGlow: {
    position: "absolute",
    width: IS_COMPACT ? 52 : 82,
    height: IS_COMPACT ? 52 : 82,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.62)",
    top: IS_COMPACT ? 6 : 10,
    shadowColor: "rgba(255,255,255,0.66)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 5,
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
  brandChipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: C.brand,
    marginRight: 10,
  },
  brandChipText: {
    fontSize: IS_COMPACT ? 11 : 13,
    color: C.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
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
    maxWidth: IS_COMPACT ? 250 : 330,
    textAlign: "center",
  },
  cardDepth: {
    position: "relative",
    marginBottom: IS_COMPACT ? 1 : 18,
    width: IS_COMPACT ? "90%" : "94%",
    maxWidth: IS_COMPACT ? 400 : 480,
    alignSelf: "center",
  },
  cardShadowPlate: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: IS_COMPACT ? -6 : -8,
    height: IS_COMPACT ? 18 : 28,
    borderRadius: 20,
    backgroundColor: "rgba(97, 74, 255, 0.08)",
  },
  cardBorder: {
    borderRadius: IS_COMPACT ? 20 : 26,
    padding: 1.1,
  },
  card: {
    overflow: "hidden",
    borderRadius: IS_COMPACT ? 19 : 25,
    padding: IS_COMPACT ? 10 : 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  cardInnerStroke: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: IS_COMPACT ? 18 : 24,
  },
  cardSheen: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 56,
    height: IS_COMPACT ? 90 : 126,
    borderRadius: 30,
  },
  cardCornerGlow: {
    position: "absolute",
    width: IS_COMPACT ? 92 : 140,
    height: IS_COMPACT ? 92 : 140,
    borderRadius: 999,
    top: -18,
    right: -28,
    backgroundColor: "rgba(197, 189, 255, 0.2)",
  },
  cardTopGlow: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: IS_COMPACT ? 22 : 42,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: IS_COMPACT ? 8 : 14,
  },
  eyebrow: {
    fontSize: IS_COMPACT ? 9 : 11,
    color: C.textMuted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 3.2,
    marginBottom: IS_COMPACT ? 3 : 8,
  },
  cardTitle: {
    fontSize: IS_COMPACT ? 15 : 20,
    lineHeight: IS_COMPACT ? 18 : 25,
    color: C.textPrimary,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.3,
    maxWidth: IS_COMPACT ? 140 : 190,
    textAlign: "center",
  },
  securityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: IS_COMPACT ? 8 : 10,
    paddingVertical: IS_COMPACT ? 6 : 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(191, 180, 255, 0.95)",
    shadowColor: "rgba(107, 78, 255, 0.14)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  securityChipText: {
    fontSize: IS_COMPACT ? 9.5 : 11,
    color: C.brandDeep,
    fontFamily: "DMSans_500Medium",
    marginLeft: 6,
  },
  nameRow: {
    flexDirection: "row",
    gap: IS_COMPACT ? 6 : 10,
  },
  halfField: {
    flex: 1,
  },
  fieldBlock: {
    marginBottom: IS_COMPACT ? 6 : 12,
  },
  label: {
    fontSize: IS_COMPACT ? 10 : 12,
    color: C.textSecondary,
    fontFamily: "DMSans_500Medium",
    marginBottom: IS_COMPACT ? 3 : 6,
  },
  inputShell: {
    borderRadius: 19,
    shadowColor: "rgba(43, 31, 132, 0.07)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  inputShellFocused: {
    shadowColor: C.brandGlow,
    shadowOpacity: 0.24,
  },
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
  inputIcon: {
    marginRight: IS_COMPACT ? 6 : 12,
  },
  input: {
    flex: 1,
    height: "100%",
    color: C.textPrimary,
    fontSize: IS_COMPACT ? 12.5 : 15,
    fontFamily: "DMSans_400Regular",
  },
  ctaDepth: {
    position: "relative",
    marginTop: IS_COMPACT ? 8 : 20,
    width: "100%",
    maxWidth: IS_COMPACT ? 250 : 320,
    alignSelf: "center",
  },
  ctaBase: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: -7,
    height: IS_COMPACT ? 10 : 18,
    borderRadius: 999,
    backgroundColor: "rgba(76, 47, 242, 0.26)",
  },
  ctaDisabled: {
    opacity: 0.72,
  },
  cta: {
    height: IS_COMPACT ? 40 : 54,
    borderRadius: IS_COMPACT ? 13 : 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingLeft: IS_COMPACT ? 16 : 22,
    paddingRight: IS_COMPACT ? 8 : 10,
    shadowColor: "rgba(76, 47, 242, 0.34)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 7,
  },
  ctaAmbient: {
    position: "absolute",
    width: IS_COMPACT ? 56 : 92,
    height: IS_COMPACT ? 56 : 92,
    borderRadius: 999,
    right: -18,
    top: -24,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ctaTopGloss: {
    position: "absolute",
    top: 2,
    left: 10,
    right: 48,
    height: IS_COMPACT ? 12 : 18,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: IS_COMPACT ? 13 : 16,
    color: C.white,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.15,
    textShadowColor: "rgba(44, 22, 164, 0.34)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  ctaIconWrap: {
    width: IS_COMPACT ? 26 : 34,
    height: IS_COMPACT ? 26 : 34,
    borderRadius: IS_COMPACT ? 9 : 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  footer: {
    marginTop: IS_COMPACT ? -2 : 6,
  },
  footerDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginBottom: IS_COMPACT ? 3 : 14,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerPrompt: {
    fontSize: IS_COMPACT ? 11 : 14,
    color: C.textSecondary,
    fontFamily: "DMSans_400Regular",
    marginRight: 8,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerLinkText: {
    fontSize: IS_COMPACT ? 11.5 : 15,
    color: C.brandDeep,
    fontFamily: "DMSans_500Medium",
    marginRight: 6,
  },
});
