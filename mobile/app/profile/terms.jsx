import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import SafeScreen from "../../components/SafeScreen";
import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../constants/premiumTheme";

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeScreen>
      <LinearGradient
        colors={SURFACES.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/profile")}
          accessibilityLabel="Back to Profile"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>Our agreement with you</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By using MyFoodTracker, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use our app.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Use License</Text>
          <Text style={styles.text}>
            You are granted a limited, non-exclusive, non-transferable license to use MyFoodTracker for personal, non-commercial purposes in accordance with these terms.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.text}>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You agree not to use the app for any unlawful or prohibited purposes.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Health & Medical Disclaimer</Text>
          <Text style={styles.text}>
            IMPORTANT: MyFoodTracker is a wellness tool, NOT a medical device. The app, including all nutritional information, insights, predictions, correlations, and recommendations, is provided for informational and educational purposes only.{'\n\n'}
            This app does NOT provide medical advice, diagnosis, or treatment. The information should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with any questions regarding a medical condition, dietary needs, or health goals.{'\n\n'}
            MyFoodTracker is NOT intended to diagnose, treat, cure, or prevent any disease or health condition. If you have or suspect you have a medical problem, eating disorder, or other health condition, promptly contact your healthcare provider.{'\n\n'}
            Never disregard professional medical advice or delay seeking it because of information provided by this app. Reliance on any information provided by MyFoodTracker is solely at your own risk.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. Limitation of Liability</Text>
          <Text style={styles.text}>
            In no event shall MyFoodTracker be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the app.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6. Changes to Terms</Text>
          <Text style={styles.text}>
            We reserve the right to modify these terms at any time. Your continued use of the app following the posting of revised terms means that you accept and agree to the changes.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.text}>
            We may terminate or suspend your account and access to the app immediately, without prior notice or liability, for any reason whatsoever, including if you breach these Terms of Service.
          </Text>
        </View>

        <View style={[styles.card, { marginBottom: SPACING[10] }]}>
          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about these Terms of Service, please contact us through the app&apos;s support feature.
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING[3],
  },
  headerText: {
    gap: 6,
  },
  title: {
    fontSize: TYPOGRAPHY.size["2xl"],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: "rgba(255,255,255,0.9)",
  },
  content: {
    padding: SPACING[5],
    gap: SPACING[4],
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.md,
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
    marginBottom: SPACING[1],
  },
  text: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
});
