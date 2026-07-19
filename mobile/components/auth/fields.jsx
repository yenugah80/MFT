import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AUTH_COLORS, IS_COMPACT } from "./constants";

export function AuthHeading({ title, subtitle, centered = false, compact = false }) {
  return (
    <View
      style={[
        styles.heading,
        centered && styles.headingCentered,
        compact && styles.headingCompact,
      ]}
    >
      <Text
        style={[
          styles.screenTitle,
          centered && styles.textCenter,
          compact && styles.screenTitleCompact,
          compact && centered && styles.screenTitleWelcome,
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.screenSubtitle, centered && styles.textCenter]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function AuthField({
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
  trailing,
  ...inputProps
}) {
  const filled = Boolean(String(value || "").length);

  return (
    <View style={[styles.fieldWrapper, !label && styles.fieldWrapperNoLabel]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputShell, filled && styles.inputShellFilled, focused && styles.inputShellFocused]}>
        <Ionicons
          name={icon}
          size={22}
          color={focused ? AUTH_COLORS.primary : AUTH_COLORS.muted}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={AUTH_COLORS.muted}
          selectionColor={AUTH_COLORS.primary}
          keyboardAppearance="light"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          {...inputProps}
        />
        {children ? <View style={styles.trailingSlot}>{children}</View> : trailing}
      </View>
    </View>
  );
}

export function PasswordVisibilityButton({ visible, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      style={({ pressed }) => [styles.eyeButton, pressed && styles.surfacePressed]}
    >
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={AUTH_COLORS.muted} />
    </Pressable>
  );
}

export function Notice({ type, text, onDismiss }) {
  if (!text) return null;
  const isError = type === "error";
  return (
    <View style={[styles.notice, isError ? styles.noticeError : styles.noticeSuccess]}>
      <Ionicons
        name={isError ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={17}
        color={isError ? AUTH_COLORS.danger : AUTH_COLORS.success}
      />
      <Text style={[styles.noticeText, isError && styles.noticeTextError]}>{text}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={12} style={styles.noticeDismiss}>
          <Ionicons name="close" size={15} color={isError ? AUTH_COLORS.danger : AUTH_COLORS.success} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AuthDivider({ label = "OR" }) {
  return (
    <View style={styles.authDivider}>
      <View style={styles.authDividerLine} />
      <Text style={styles.authDividerText}>{label}</Text>
      <View style={styles.authDividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  surfacePressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.82,
  },
  heading: {
    marginTop: IS_COMPACT ? 44 : 88,
    marginBottom: 38,
  },
  headingCentered: {
    alignItems: "center",
    marginTop: 0,
  },
  headingCompact: {
    marginTop: IS_COMPACT ? 6 : 10,
    marginBottom: IS_COMPACT ? 6 : 10,
  },
  textCenter: { textAlign: "center" },
  screenTitle: {
    fontSize: IS_COMPACT ? 44 : 52,
    lineHeight: IS_COMPACT ? 52 : 60,
    color: AUTH_COLORS.ink,
    fontFamily: "TenorSans_400Regular",
    letterSpacing: 0,
  },
  screenTitleCompact: {
    fontSize: IS_COMPACT ? 24 : 28,
    lineHeight: IS_COMPACT ? 30 : 34,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.2,
  },
  screenTitleWelcome: {
    fontSize: IS_COMPACT ? 25 : 28,
    lineHeight: IS_COMPACT ? 31 : 34,
  },
  screenSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0,
  },
  fieldWrapper: {
    marginBottom: IS_COMPACT ? 14 : 18,
  },
  fieldWrapperNoLabel: {},
  fieldLabel: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: AUTH_COLORS.text,
    marginBottom: 8,
    letterSpacing: 0,
  },
  inputShell: {
    height: IS_COMPACT ? 46 : 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.68)",
    borderWidth: 1,
    borderColor: AUTH_COLORS.line,
    shadowColor: "rgba(22, 33, 30, 0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  inputShellFilled: {
    backgroundColor: "rgba(255, 255, 255, 0.84)",
  },
  inputShellFocused: {
    borderColor: "rgba(107, 78, 255, 0.42)",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  inputIcon: {
    width: 24,
    marginRight: 16,
    textAlign: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    color: AUTH_COLORS.text,
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0,
  },
  trailingSlot: {
    marginLeft: 12,
  },
  eyeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: IS_COMPACT ? 9 : 10,
    borderRadius: 15,
    marginBottom: IS_COMPACT ? 10 : 12,
  },
  noticeSuccess: { backgroundColor: AUTH_COLORS.successBg },
  noticeError: { backgroundColor: AUTH_COLORS.dangerBg },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: AUTH_COLORS.success,
    fontFamily: "DMSans_500Medium",
  },
  noticeTextError: { color: AUTH_COLORS.danger },
  noticeDismiss: {
    marginLeft: 2,
  },
  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: IS_COMPACT ? 16 : 22,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(15, 36, 31, 0.1)",
  },
  authDividerText: {
    fontSize: 14,
    color: AUTH_COLORS.muted,
    fontFamily: "DMSans_500Medium",
  },
});
