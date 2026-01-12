/**
 * DailyIntelligenceErrorBoundary
 *
 * Error boundary for behavioral health intelligence sections
 * Catches rendering errors and shows graceful fallback UI
 * Does NOT catch async errors - those are handled by component error states
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../constants/designTokens';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

export class DailyIntelligenceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      '[DailyIntelligenceErrorBoundary] Caught error:',
      error,
      errorInfo
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={styles.container}
          accessible
          accessibilityRole="alert"
          accessibilityLabel="Intelligence display error"
        >
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={40} color={TEXT.secondary} />
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We couldn't load your daily insights. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <Text style={styles.devError}>{this.state.error.toString()}</Text>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[6],
    alignItems: 'center',
    backgroundColor: SURFACES.backgroundSecondary,
    borderRadius: 12,
    marginVertical: SPACING[3],
  },

  iconContainer: {
    marginBottom: SPACING[3],
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },

  message: {
    fontSize: 13,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING[4],
  },

  devError: {
    fontSize: 10,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    padding: SPACING[2],
    borderRadius: 4,
    marginBottom: SPACING[3],
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  button: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: BRAND.emerald,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
