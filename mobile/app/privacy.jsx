/**
 * Privacy Policy Screen
 * Required for App Store & GDPR Compliance
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SafeScreen from '@/components/SafeScreen';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: December 28, 2024</Text>

        <Section title="Introduction">
          <Text style={styles.text}>
            My-Food-Tracker ("we," "our," or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our mobile application.
          </Text>
        </Section>

        <Section title="Information We Collect">
          <SubSection title="Information You Provide">
            <Text style={styles.text}>
              • Account Information: Name, email address, profile photo{'\n'}
              • Health Data: Food logs, calorie intake, nutrition data, water intake{'\n'}
              • Mood Data: Mood logs and notes{'\n'}
              • Photos: Food photos you choose to upload{'\n'}
              • Voice Data: Voice recordings for meal logging (processed and deleted immediately)
            </Text>
          </SubSection>

          <SubSection title="Automatically Collected Information">
            <Text style={styles.text}>
              • Device Information: Device type, operating system, unique device identifiers{'\n'}
              • Usage Data: App features used, time spent, interactions{'\n'}
              • Location Data: Only if you grant permission (not required)
            </Text>
          </SubSection>
        </Section>

        <Section title="How We Use Your Information">
          <Text style={styles.text}>
            We use your information to:{'\n\n'}
            • Provide nutrition analysis and meal tracking{'\n'}
            • Generate personalized insights and recommendations{'\n'}
            • Sync your data across devices{'\n'}
            • Improve our AI estimation quality{'\n'}
            • Send you notifications (with your permission){'\n'}
            • Provide customer support{'\n'}
            • Comply with legal obligations
          </Text>
        </Section>

        <Section title="AI and Third-Party Services">
          <Text style={styles.text}>
            We use OpenAI's GPT-4 and Whisper AI to analyze your food photos and voice inputs.
            Your data is sent to OpenAI's servers for processing. OpenAI does not use your
            data to train their models. Voice recordings are processed and immediately deleted.
          </Text>
          <Text style={styles.text}>
            {'\n'}We also use Clerk for authentication. Your authentication data is processed
            securely according to Clerk's privacy policy.
          </Text>
        </Section>

        <Section title="Data Storage and Security">
          <Text style={styles.text}>
            • Your data is stored securely using industry-standard encryption{'\n'}
            • Data is stored on secure servers (Render, Neon Database){'\n'}
            • Local data is stored encrypted on your device{'\n'}
            • We implement appropriate security measures to protect your data{'\n'}
            • Regular security audits and updates
          </Text>
        </Section>

        <Section title="Your Rights (GDPR & CCPA)">
          <Text style={styles.text}>
            You have the right to:{'\n\n'}
            • Access your personal data{'\n'}
            • Correct inaccurate data{'\n'}
            • Delete your data (Right to be Forgotten){'\n'}
            • Export your data (Data Portability){'\n'}
            • Opt-out of data processing{'\n'}
            • Withdraw consent at any time
          </Text>
          <Text style={styles.text}>
            {'\n'}To exercise these rights, contact us at: support@my-food-tracker.com
          </Text>
        </Section>

        <Section title="Data Retention">
          <Text style={styles.text}>
            • Active accounts: Data retained while account is active{'\n'}
            • Deleted accounts: Data deleted within 30 days{'\n'}
            • Backups: Deleted from backups within 90 days{'\n'}
            • Legal requirements: Data retained as required by law
          </Text>
        </Section>

        <Section title="Children's Privacy">
          <Text style={styles.text}>
            Our app is not intended for children under 13. We do not knowingly collect
            personal information from children under 13. If you believe we have collected
            such information, please contact us immediately.
          </Text>
        </Section>

        <Section title="International Data Transfers">
          <Text style={styles.text}>
            Your data may be transferred to and processed in countries outside your country
            of residence. We ensure appropriate safeguards are in place for such transfers.
          </Text>
        </Section>

        <Section title="Changes to This Policy">
          <Text style={styles.text}>
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by updating the "Last Updated" date. Continued use of the app after
            changes constitutes acceptance of the updated policy.
          </Text>
        </Section>

        <Section title="Contact Us">
          <Text style={styles.text}>
            If you have questions about this Privacy Policy, please contact us:{'\n\n'}
            Email: support@my-food-tracker.com{'\n'}
            Website: www.my-food-tracker.com
          </Text>
          <Text style={[styles.text, { marginTop: 12, fontSize: 13, color: '#6B7280', fontStyle: 'italic' }]}>
            Physical address available upon request for legal purposes.
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using My-Food-Tracker, you acknowledge that you have read and understood
            this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
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

function SubSection({ title, children }) {
  return (
    <View style={styles.subSection}>
      <Text style={styles.subSectionTitle}>{title}</Text>
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
  subSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  footerText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    textAlign: 'center',
  },
});
