# Frontend Implementation Guide
## Behavioral Health Intelligence Components

**Purpose**: Step-by-step implementation guide for all 10 frontend components with responsive design, micro-interactions, and haptic feedback.

**Target**: React Native (Expo) with mobile-first responsive layouts

**Timeline**: 3-4 weeks for complete implementation + testing

---

## 0. SETUP & DEPENDENCIES

### Required Packages

```bash
npm install expo-haptics@latest               # Haptic feedback
npm install expo-linear-gradient@latest       # Gradient backgrounds
npm install expo-lottie@latest                # Animations
npm install react-native-svg@latest           # SVG for gauges
npm install @react-native-community/hooks@latest
```

### Design Tokens (Already Exist)

Use constants from:
- `mobile/constants/designTokens.js` (COLORS for dark theme - legacy)
- `mobile/constants/premiumTheme.js` (TEXT, SURFACES, BRAND for light theme - USE THIS)

```javascript
// CORRECT for light background theme
import { TEXT, SURFACES, BRAND, EFFECTS } from '../constants/premiumTheme';

const colors = {
  primary: BRAND.emerald,        // #10B981
  success: BRAND.emerald,        // #10B981
  warning: '#F59E0B',            // Amber
  danger: '#DC2626',             // Red
  neutral: SURFACES.background,  // #FFFFFF
  text: {
    primary: TEXT.primary,       // #111827 (dark gray)
    secondary: TEXT.secondary,   // #4B5563 (medium gray)
    tertiary: TEXT.tertiary,     // #6B7280 (light gray)
  }
};
```

---

## 1. COMPONENT: QuietConfidenceCard (Component for SILENT Decision)

### Purpose
When orchestrator decides SILENT (no new patterns), show calm confirmation instead of empty space.

### File Location
`mobile/components/dashboard/QuietConfidenceCard.jsx`

### Implementation

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND } from '../constants/premiumTheme';

export function QuietConfidenceCard() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ECFDF5', '#D1FAE5']}  // Subtle green gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Checkmark Icon */}
          <Text style={styles.icon}>✓</Text>

          {/* Headline */}
          <Text style={styles.headline}>You're On Track Today</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Your habits align with your goals. No changes needed right now.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
    color: BRAND.emerald,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
```

### Props
```typescript
interface QuietConfidenceCardProps {
  // No props needed - static confirmation
}
```

### Responsive Behavior
- **Mobile <375px**: Full width with 16px padding
- **Mobile 375-430px**: Full width with 12px padding
- **Tablet 768px+**: Max width 400px, centered

---

## 2. COMPONENT: ActionItem (With Post-Action Feedback)

### Purpose
Clickable action that navigates + shows instant feedback (haptic + checkmark)

### File Location
`mobile/components/dashboard/ActionItem.jsx`

### Implementation

```jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, BRAND } from '../constants/premiumTheme';

export function ActionItem({ icon, text, description, onTap, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const handlePress = async () => {
    if (isLoading) return;

    // Press feedback
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate
    try {
      await onTap();

      // Success feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // Show success state
      setShowSuccess(true);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 2 seconds
      setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccess(false);
        });
      }, 2000);

      onSuccess?.();
    } catch (error) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isLoading && styles.buttonActive,
        ]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Success Overlay */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successOverlay,
            { opacity: opacityAnim },
          ]}
        >
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Nice choice</Text>
          <Text style={styles.successSubtext}>
            This supports energy stability
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 80,
    minWidth: 70,
  },
  button: {
    flex: 1,
    backgroundColor: BRAND.emerald,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    // Min touch area: 44x44px
    minHeight: 44,
  },
  buttonActive: {
    backgroundColor: '#059669', // Darker emerald
    opacity: 0.9,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 14,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND.emerald,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  successSubtext: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'center',
  },
});
```

### Props
```typescript
interface ActionItemProps {
  icon: string;                    // emoji: "🥗"
  text: string;                    // "Add protein"
  description: string;             // "Stabilizes blood sugar"
  onTap: () => Promise<void>;      // Navigation handler
  onSuccess?: () => void;          // Called after success state
}
```

### Responsive Layout (Parent Container)

When using ActionItem, parent should handle responsive layout:

```jsx
// Mobile <375px: Stack vertically
<View style={styles.actionsContainer_mobile_small}>
  <ActionItem ... />
  <ActionItem ... />
</View>

// Mobile 375-430px: 2 columns
<View style={styles.actionsContainer_mobile}>
  <ActionItem ... />
  <ActionItem ... />
</View>

// Tablet 768px+: 3 columns
<View style={styles.actionsContainer_tablet}>
  <ActionItem ... />
  <ActionItem ... />
  <ActionItem ... />
</View>

const styles = StyleSheet.create({
  actionsContainer_mobile_small: {
    gap: 8,
  },
  actionsContainer_mobile: {
    flexDirection: 'row',
    gap: 8,
  },
  actionsContainer_tablet: {
    flexDirection: 'row',
    gap: 12,
    marginRight: 40,
  },
});
```

---

## 3. COMPONENT: DismissReasonSelector (Modal)

### Purpose
Capture why user dismissed a pattern (feeds learning + expiry)

### File Location
`mobile/components/dashboard/DismissReasonSelector.jsx`

### Implementation

```jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, BRAND } from '../constants/premiumTheme';

const DISMISS_REASONS = [
  {
    id: 'not_relevant',
    label: 'Not relevant to me',
    description: 'This pattern doesn\'t apply to me',
  },
  {
    id: 'temporary',
    label: 'Just temporary situation',
    description: 'This was a one-time thing',
  },
  {
    id: 'fixed',
    label: 'Already fixed it',
    description: 'I\'ve already resolved this',
  },
  {
    id: 'never_show',
    label: 'Don\'t want to see this again',
    description: 'Permanently dismiss',
  },
];

export function DismissReasonSelector({
  visible,
  headline,
  onDismiss,
  onCancel,
}) {
  const [selectedReason, setSelectedReason] = useState(null);

  const handleConfirm = async () => {
    if (!selectedReason) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss(selectedReason);
    setSelectedReason(null);
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
    setSelectedReason(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.headline}>Why dismiss this pattern?</Text>
          <Text style={styles.subtitle}>This helps us improve</Text>

          {/* Reason Options */}
          <View style={styles.reasonsContainer}>
            {DISMISS_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && styles.reasonButtonSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.7}
              >
                {/* Radio Circle */}
                <View style={styles.radioContainer}>
                  <View
                    style={[
                      styles.radio,
                      selectedReason === reason.id && styles.radioSelected,
                    ]}
                  />
                </View>

                {/* Text */}
                <View style={styles.reasonTextContainer}>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                  <Text style={styles.reasonDescription}>
                    {reason.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !selectedReason && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: SURFACES.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 32,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  reasonButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    minHeight: 44,
  },
  reasonButtonSelected: {
    backgroundColor: '#ECFDF5',
  },
  radioContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  radioSelected: {
    borderColor: BRAND.emerald,
    backgroundColor: BRAND.emerald,
  },
  reasonTextContainer: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  reasonDescription: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 0.4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
  },
  confirmButton: {
    flex: 0.6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: BRAND.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

### Props
```typescript
interface DismissReasonSelectorProps {
  visible: boolean;
  headline: string;             // "High-NOVA Mood Crashes"
  onDismiss: (reason: string) => void;
  onCancel: () => void;
}
```

### Backend Mapping
```javascript
const reasonBackendMap = {
  'not_relevant': { type: 'USER_DISMISSED', adjustment: -0.2 },
  'temporary': { type: 'TEMPORARY_DISMISS', expiry: 7 },
  'fixed': { type: 'RESOLVED', expiry: 30 },
  'never_show': { type: 'DEACTIVATION', permanent: true },
};
```

---

## 4. RESPONSIVE BUTTON SPECIFICATIONS

### Universal Button Style Guide

```javascript
// All buttons must meet these specs:
const BUTTON_SPECS = {
  // Touch Area (iOS/Android standard)
  minTouchArea: 44,  // 44x44px minimum
  padding: {
    horizontal: 12,
    vertical: 10,
  },
  spacing: {
    between: 8,      // Minimum 8px between buttons
  },

  // Typography
  fontSize: 16,
  fontWeight: '600',
  lineHeight: 1.5,

  // States
  states: {
    idle: {
      backgroundColor: BRAND.emerald,
      color: '#FFFFFF',
      opacity: 1.0,
    },
    active: {
      backgroundColor: '#059669',  // Darker emerald
      color: '#FFFFFF',
      scale: 0.98,  // Subtle press
      shadowOpacity: 0.4,
    },
    success: {
      backgroundColor: BRAND.emerald,
      icon: '✓',
      haptic: 'light',
    },
    disabled: {
      backgroundColor: '#E5E7EB',
      color: '#9CA3AF',
      opacity: 0.5,
    },
  },

  // Animation
  transition: 200,  // ms
  ripple: false,    // Optional Material Design ripple
};
```

### Responsive Button Layouts

#### Layout 1: Full-Width (Mobile <375px)

```jsx
function ActionButtonsFull() {
  return (
    <View style={styles.container_fullwidth}>
      <TouchableOpacity style={styles.button_full}>
        <Text>Action 1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button_full}>
        <Text>Action 2</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container_fullwidth: {
    gap: 8,
  },
  button_full: {
    width: '100%',
    height: 44,
    backgroundColor: BRAND.emerald,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

#### Layout 2: Two-Column (Mobile 375-430px)

```jsx
function ActionButtonsTwo() {
  return (
    <View style={styles.container_twoCol}>
      <TouchableOpacity style={[styles.button, styles.button_twoCol]}>
        <Text>Action 1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.button_twoCol]}>
        <Text>Action 2</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container_twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  button_twoCol: {
    flex: 1,
    height: 44,
  },
});
```

#### Layout 3: Three-Column (Tablet 768px+)

```jsx
function ActionButtonsThree() {
  return (
    <View style={styles.container_threeCol}>
      <TouchableOpacity style={[styles.button, styles.button_threeCol]}>
        <Text>Action 1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.button_threeCol]}>
        <Text>Action 2</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.button_threeCol]}>
        <Text>Action 3</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container_threeCol: {
    flexDirection: 'row',
    gap: 12,
  },
  button_threeCol: {
    flex: 1,
    height: 48,
  },
});
```

### Responsive Container Helper

```jsx
import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return {
    isMobileSmall: width < 375,
    isMobile: width >= 375 && width < 600,
    isTablet: width >= 600,
    width,

    // Pre-calculated layouts
    buttonLayout: width < 375 ? 'stack' : width < 600 ? 'twoCol' : 'threeCol',
    padding: width < 375 ? 12 : 16,
    gap: width < 375 ? 6 : 8,
  };
}

// Usage
function MyComponent() {
  const { buttonLayout, padding } = useResponsiveLayout();

  return (
    <View style={{ paddingHorizontal: padding }}>
      {buttonLayout === 'stack' && <ActionButtonsFull />}
      {buttonLayout === 'twoCol' && <ActionButtonsTwo />}
      {buttonLayout === 'threeCol' && <ActionButtonsThree />}
    </View>
  );
}
```

---

## 5. MICRO-INTERACTIONS PATTERN

### Haptic Feedback Strategy

```javascript
import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  // Light tap feedback
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium press feedback
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy action feedback
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Success notification (ding)
  success: () => Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success
  ),

  // Error notification (buzz)
  error: () => Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Error
  ),

  // Warning notification
  warning: () => Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Warning
  ),
};

// Usage in components
onPress={async () => {
  await hapticFeedback.medium();
  // Do action
  await hapticFeedback.success();
}}
```

### Animation Patterns

```javascript
// Scale + Fade Animation
const scaleAndFadeIn = (targetOpacity = 1, duration = 300) => {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.9);

  const runAnimation = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: targetOpacity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { opacity, scale, runAnimation };
};

// Bounce Animation
const bounce = () => {
  const scale = new Animated.Value(0.95);

  return Animated.sequence([
    Animated.timing(scale, {
      toValue: 1.05,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }),
  ]);
};

// Checkmark Animation
const checkmarkAnimation = () => {
  const scale = new Animated.Value(0);
  const opacity = new Animated.Value(0);

  return {
    run: () => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    scale,
    opacity,
  };
};
```

---

## 6. ACCESSIBILITY & WCAG AAA

### Color Contrast Requirements

```javascript
// All text must meet 4.5:1 contrast ratio (WCAG AAA)
export const contrastSafe = {
  // On white background (#FFFFFF)
  darkText: '#111827',      // 18:1 contrast (exceeds AAA)
  emerald: '#10B981',       // 5.8:1 contrast (AAA)
  amber: '#D97706',         // 5.2:1 contrast (AAA)
  red: '#DC2626',           // 5.0:1 contrast (AAA)

  // Secondary text
  mediumGray: '#4B5563',    // 7.3:1 contrast (AAA)
  lightGray: '#6B7280',     // 5.5:1 contrast (AAA)
};
```

### Accessibility Checklist

```javascript
// Every interactive element must have:
// 1. minHeight: 44 (touch target)
// 2. accessible={true}
// 3. accessibilityRole
// 4. accessibilityLabel
// 5. accessibilityHint (for complex interactions)

<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Add protein"
  accessibilityHint="Opens food logging with protein filter preset"
  onPress={handlePress}
  style={styles.button}
>
  <Text>Add protein</Text>
</TouchableOpacity>
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Core Components (Days 1-3)
- [ ] QuietConfidenceCard
- [ ] ActionItem
- [ ] DismissReasonSelector

### Phase 2: Responsive Layouts (Days 4-5)
- [ ] Responsive button layouts
- [ ] Container helpers
- [ ] Dimension tracking

### Phase 3: Micro-Interactions (Days 6-7)
- [ ] Haptic feedback integration
- [ ] Animation system
- [ ] State transitions

### Phase 4: Integration (Days 8-10)
- [ ] Wire to DailyIntelligenceCard
- [ ] Wire to CorrelationCard
- [ ] Wire to backend API calls

### Phase 5: Testing (Days 11-14)
- [ ] Unit tests for each component
- [ ] Integration tests
- [ ] Device testing (iPhone, Android, iPad)
- [ ] Accessibility testing

---

## 8. API INTEGRATION PATTERNS

### Pattern 1: Action Item Navigation

```jsx
const handleAddProtein = async () => {
  // Navigate to food log with protein filter
  router.push({
    pathname: '/(tabs)/log',
    params: {
      prefilled: {
        mealType: 'snack',
        nutritionFilter: 'high_protein',
      },
      sourceRecommendation: recommendationId,
    },
  });

  // Backend: Log that recommendation was accepted
  await apiClient.post('/api/correlations/:id/feedback', {
    correlationId,
    feedback: 'ACCEPT',
    action: 'add_protein',
  });
};
```

### Pattern 2: Dismiss Feedback

```jsx
const handleDismiss = async (reason) => {
  const reasonMap = {
    'not_relevant': { type: 'USER_DISMISSED', confidence: 0 },
    'temporary': { type: 'TEMPORARY', expiryDays: 7 },
    'fixed': { type: 'RESOLVED', expiryDays: 30 },
    'never_show': { type: 'DEACTIVATION', permanent: true },
  };

  const payload = reasonMap[reason];

  // Backend: Record dismissal
  await apiClient.post(`/api/correlations/${correlationId}/feedback`, {
    feedbackType: payload.type,
    dismissalReason: reason,
    ...payload,
  });

  // Local: Hide pattern immediately
  hideCorrelation(correlationId);
};
```

---

## 9. TESTING CHECKLIST

### Manual Testing on Each Device

- [ ] iPhone 12 mini (375px)
- [ ] iPhone 14 Pro (430px)
- [ ] iPad (768px)
- [ ] Android equivalents

### Interaction Testing

- [ ] Buttons respond to press (haptic feedback)
- [ ] Animations complete (no jank)
- [ ] Success states appear and disappear
- [ ] Modals open/close smoothly
- [ ] Accessibility labels read correctly

### Accessibility Testing

- [ ] VoiceOver (iOS): Tab order correct
- [ ] TalkBack (Android): All labels present
- [ ] Contrast ratios: 4.5:1 minimum
- [ ] Touch targets: ≥44px

---

## 10. NEXT STEPS

1. **Start with Phase 1**: Implement QuietConfidenceCard first (simplest)
2. **Add ActionItem**: Then integrate post-action feedback
3. **Add DismissReasonSelector**: Wire to CorrelationCard
4. **Test each component** in isolation before integration
5. **Integrate to DashboardContent**: Wire orchestrator API
6. **Deploy & iterate** based on user feedback

---

**Status**: Implementation guide complete. Ready to start coding.

**Questions?** Refer to FRONTEND_VISUALIZATION_DESIGN.md for component specs.
