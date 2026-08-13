/**
 * AIConsentPrompt
 *
 * The one place AI-assisted analysis consent (voice/photo food logging via
 * OpenAI) is ever asked for. Sign-up deliberately does NOT grant this —
 * sign-up's "by continuing" clickwrap only covers Terms of Service/Privacy
 * Policy, since GDPR Art. 9 requires *explicit, un-pre-ticked* consent for
 * health-adjacent data specifically, which a bundled clickwrap doesn't
 * provide. Every user, new or existing, gets the same real Agree/Not now
 * choice here instead.
 *
 * Without this they'd meet a consent request at whichever AI feature they
 * happen to touch first — voice, photo, or recommendations — which is both
 * confusing and repetitive. Asking once, on open, means the question never
 * appears mid-task.
 *
 * Shows only when the server reports `hasBeenAsked: false`. Someone who
 * actively declined has been asked, so they are never prompted again — re-asking
 * a decliner is nagging, not consent.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import apiClient from '../../services/apiClient';
import { BRAND, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, SURFACES } from '../../constants/premiumTheme';
import { getItem, setItem } from '../../utils/storage';

// Set once the prompt has been shown, so a user who dismisses it without
// answering isn't asked again on the next launch.
const SEEN_KEY = '@mft:ai_consent_prompt_seen';

export default function AIConsentPrompt() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (await getItem(SEEN_KEY)) return;

        const status = await apiClient.get('/consent/status');
        // Only the never-asked. Consented users and decliners both skip.
        if (mounted && status?.consent?.hasBeenAsked === false) {
          setVisible(true);
        }
      } catch {
        // Offline or unreachable — stay silent. A prompt is never urgent enough
        // to risk showing on bad data.
      }
    })();

    return () => { mounted = false; };
  }, []);

  const dismiss = useCallback(async () => {
    setVisible(false);
    await setItem(SEEN_KEY, 'true');
  }, []);

  const handleEnable = useCallback(async () => {
    setIsSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await apiClient.post('/consent/give-openai-consent', {
        understand: true,
        purpose: 'ai-consent-prompt',
      });
      await dismiss();
    } catch (err) {
      console.warn('[AIConsentPrompt] Could not save consent:', err?.message);
      // Don't trap them in the sheet on a network failure — Privacy & Data
      // still works and they'll simply be asked once more next launch.
      setVisible(false);
    } finally {
      setIsSaving(false);
    }
  }, [dismiss]);

  const handleNotNow = useCallback(async () => {
    await dismiss();
    // Deliberately points at where the setting lives, so declining now doesn't
    // mean hunting for it later.
    router.push('/profile/privacy');
  }, [dismiss, router]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={26} color={BRAND.primary} />
          </View>

          <Text style={styles.title}>Turn On Smart Analysis</Text>
          <Text style={styles.body}>
            Snap a photo or describe a meal by voice, and AI fills in the
            nutrition for you. Enabling this sends that photo or recording
            to OpenAI for analysis.
          </Text>

          {/* Brief by design — the detail is a tap away, not on the card. */}
          <Text style={styles.fine}>
            Powered by AI. Your data is never used for training. Read the{' '}
            <Text style={styles.fineLink} onPress={() => router.push('/terms')}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.fineLink} onPress={() => router.push('/privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleEnable}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Agree to Terms, Privacy Policy, and turn on smart food analysis"
          >
            <LinearGradient
              colors={SURFACES.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              {isSaving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.primaryText}>Agree &amp; Turn On</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleNotNow}
            accessibilityRole="button"
            accessibilityLabel="Not now, open privacy settings"
          >
            <Text style={styles.secondaryText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[5],
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(107,78,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: TYPOGRAPHY.size.sm,
    lineHeight: 20,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
  fine: {
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 16,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[3],
    marginBottom: SPACING[4],
  },
  fineLink: {
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: SPACING[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryText: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    marginTop: SPACING[2],
    paddingVertical: SPACING[3],
  },
  secondaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
});
