/**
 * OnboardingErrorBoundary
 * Premium error boundary specifically for the onboarding flow
 * Provides graceful recovery options with branded design
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, TEXT, SURFACES, SHADOWS, RADIUS, SPACING, SEMANTIC, TYPOGRAPHY } from '../../constants/premiumTheme';

class OnboardingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[OnboardingErrorBoundary] Error caught:', error);
    console.error('[OnboardingErrorBoundary] Component stack:', errorInfo?.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRestartOnboarding = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRestart) {
      this.props.onRestart();
    }
  };

  handleGoBack = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onGoBack) {
      this.props.onGoBack();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconCircle}>
                <Ionicons name="alert-circle" size={48} color={SEMANTIC.danger.base} />
              </View>
              <Text style={styles.headerTitle}>Setup Paused</Text>
              <Text style={styles.headerSubtitle}>
                We hit a bump, but your progress is safe
              </Text>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Ionicons name="information-circle" size={20} color={BRAND.primary} />
                <Text style={styles.messageTitle}>What happened?</Text>
              </View>
              <Text style={styles.messageText}>
                Something unexpected occurred while setting up your profile.
                Don&apos;t worry - your information is saved and you can continue right where you left off.
              </Text>
            </View>

            {__DEV__ && this.state.error && (
              <View style={styles.devError}>
                <Text style={styles.devErrorTitle}>Debug Info</Text>
                <Text style={styles.devErrorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.devStackTrace}>
                    {this.state.errorInfo.componentStack.slice(0, 500)}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.actionsContainer}>
              <Pressable
                onPress={this.handleRetry}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <LinearGradient
                  colors={[BRAND.primary, BRAND.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </LinearGradient>
              </Pressable>

              {this.props.onGoBack && (
                <Pressable
                  onPress={this.handleGoBack}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons name="arrow-back" size={20} color={TEXT.primary} />
                  <Text style={styles.secondaryButtonText}>Go Back</Text>
                </Pressable>
              )}

              {this.props.onRestart && (
                <Pressable
                  onPress={this.handleRestartOnboarding}
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.linkButtonText}>Start Over</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.helpSection}>
              <Ionicons name="help-circle-outline" size={16} color={TEXT.tertiary} />
              <Text style={styles.helpText}>
                If this keeps happening, try closing and reopening the app.
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    paddingTop: SPACING[12],
    paddingBottom: SPACING[8],
    paddingHorizontal: SPACING[6],
    borderBottomLeftRadius: RADIUS['2xl'],
    borderBottomRightRadius: RADIUS['2xl'],
  },
  headerContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    marginBottom: SPACING[2],
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: TYPOGRAPHY.family.medium,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING[6],
  },
  messageCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[6],
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primary,
    ...SHADOWS.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  messageTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  messageText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 22,
  },
  devError: {
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[6],
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  devErrorTitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC.danger.base,
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontFamily: 'monospace',
    marginBottom: SPACING[2],
  },
  devStackTrace: {
    fontSize: 10,
    color: '#991B1B',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  actionsContainer: {
    gap: SPACING[3],
    marginBottom: SPACING[6],
  },
  primaryButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
    ...SHADOWS.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  linkButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textDecorationLine: 'underline',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 18,
  },
});

export default OnboardingErrorBoundary;
