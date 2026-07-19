/**
 * Terms of Service Screen
 * Required for App Store Compliance
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TYPOGRAPHY } from '../constants/premiumTheme';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/dashboard');
          }
        }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: December 28, 2024</Text>

        <Section title="Acceptance of Terms">
          <Text style={styles.text}>
            By accessing and using MFT (&quot;the App&quot;), you accept and agree to be
            bound by these Terms of Service. If you do not agree to these terms, please
            do not use the App.
          </Text>
        </Section>

        <Section title="Description of Service">
          <Text style={styles.text}>
            MFT provides nutrition tracking, meal logging, mood tracking, and
            health insights through AI-powered analysis. The App uses OpenAI&apos;s GPT-4 and
            Whisper AI to analyze food photos and voice inputs.
          </Text>
        </Section>

        <Section title="User Accounts">
          <Text style={styles.text}>
            • You must be at least 13 years old to use this App{'\n'}
            • You are responsible for maintaining the confidentiality of your account{'\n'}
            • You are responsible for all activities under your account{'\n'}
            • You must provide accurate and complete information{'\n'}
            • You must notify us immediately of any unauthorized access
          </Text>
        </Section>

        <Section title="Acceptable Use">
          <Text style={styles.text}>
            You agree NOT to:{'\n\n'}
            • Use the App for any illegal purpose{'\n'}
            • Attempt to gain unauthorized access to our systems{'\n'}
            • Upload malicious code or viruses{'\n'}
            • Harass, abuse, or harm other users{'\n'}
            • Violate any applicable laws or regulations{'\n'}
            • Reverse engineer or decompile the App{'\n'}
            • Use automated systems to access the App without permission
          </Text>
        </Section>

        <Section title="Health Disclaimer">
          <Text style={styles.text}>
            IMPORTANT: MFT is NOT a medical device and is NOT intended to
            diagnose, treat, cure, or prevent any disease.{'\n\n'}

            • The nutrition data provided is for informational purposes only{'\n'}
            • AI analysis may contain errors or inaccuracies{'\n'}
            • Always consult a healthcare professional for medical advice{'\n'}
            • Do not rely solely on this App for dietary decisions{'\n'}
            • Individual nutritional needs vary significantly{'\n\n'}

            By using this App, you acknowledge that you understand these limitations
            and assume all risks associated with using the nutritional information provided.
          </Text>
        </Section>

        <Section title="Estimate Quality">
          <Text style={styles.text}>
            While we strive for reasonable estimates in our nutrition analysis:{'\n\n'}

            • AI estimates may have a margin of error{'\n'}
            • User-provided data may be inaccurate{'\n'}
            • Third-party databases may contain errors{'\n'}
            • Portion sizes are estimates{'\n\n'}

            We make no warranties regarding the accuracy, completeness, or reliability
            of any nutritional information.
          </Text>
        </Section>

        <Section title="Intellectual Property">
          <Text style={styles.text}>
            The App and its original content, features, and functionality are owned by
            MFT and are protected by international copyright, trademark, patent,
            trade secret, and other intellectual property laws.{'\n\n'}

            You retain ownership of the content you upload (photos, notes, etc.), but
            grant us a license to use it for providing and improving the service.
          </Text>
        </Section>

        <Section title="Subscription and Payments">
          <Text style={styles.text}>
            • Some features may require a paid subscription{'\n'}
            • Subscription fees are non-refundable except as required by law{'\n'}
            • You can cancel your subscription at any time{'\n'}
            • Prices may change with 30 days notice{'\n'}
            • Payment processing is handled securely by third parties
          </Text>
        </Section>

        <Section title="Termination">
          <Text style={styles.text}>
            We may terminate or suspend your account immediately, without prior notice,
            for any reason, including:{'\n\n'}

            • Breach of these Terms{'\n'}
            • Fraudulent, abusive, or illegal activity{'\n'}
            • Extended period of inactivity{'\n\n'}

            Upon termination, your right to use the App will immediately cease. You may
            request deletion of your data at any time.
          </Text>
        </Section>

        <Section title="Limitation of Liability">
          <Text style={styles.text}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:{'\n\n'}

            • We provide the App &quot;AS IS&quot; without warranties{'\n'}
            • We are not liable for any indirect, incidental, or consequential damages{'\n'}
            • Our total liability shall not exceed the amount you paid us in the last 12 months{'\n'}
            • We are not responsible for third-party services (OpenAI, Clerk, etc.)
          </Text>
        </Section>

        <Section title="Indemnification">
          <Text style={styles.text}>
            You agree to defend, indemnify, and hold us harmless from any claims,
            damages, obligations, losses, liabilities, costs, or debt arising from:{'\n\n'}

            • Your use of the App{'\n'}
            • Your violation of these Terms{'\n'}
            • Your violation of any third-party rights{'\n'}
            • Your content or conduct
          </Text>
        </Section>

        <Section title="Changes to Terms">
          <Text style={styles.text}>
            We reserve the right to modify these Terms at any time. We will notify you
            of any changes by updating the &quot;Last Updated&quot; date. Continued use of the App
            after changes constitutes acceptance of the updated Terms.
          </Text>
        </Section>

        <Section title="Governing Law">
          <Text style={styles.text}>
            These Terms shall be governed by and construed in accordance with applicable
            international laws and the laws of your jurisdiction, without regard to conflict
            of law provisions.
          </Text>
        </Section>

        <Section title="Dispute Resolution">
          <Text style={styles.text}>
            Any disputes arising from these Terms or your use of the App shall be
            resolved through binding arbitration, except where prohibited by law.
            You waive your right to a jury trial.
          </Text>
        </Section>

        <Section title="Severability">
          <Text style={styles.text}>
            If any provision of these Terms is found to be unenforceable or invalid,
            that provision will be limited or eliminated to the minimum extent necessary
            so that the Terms will otherwise remain in full force and effect.
          </Text>
        </Section>

        <Section title="Contact Information">
          <Text style={styles.text}>
            Questions about these Terms? Contact us:{'\n\n'}
            Email: support@my-food-tracker.com{'\n'}
            Website: www.my-food-tracker.com
          </Text>
          <Text style={[styles.text, { marginTop: 12, fontSize: 13, color: '#6B7280', fontStyle: 'italic' }]}>
            Physical address available upon request for legal purposes.
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using MFT, you acknowledge that you have read, understood,
            and agree to be bound by these Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  footerText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
