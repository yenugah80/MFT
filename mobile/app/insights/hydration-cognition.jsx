/**
 * Hydration & Energy → redirect to /analytics/hydration
 *
 * This screen rendered four cards: a stats row (daily average / % of goal /
 * streak), the persona, the time-of-day split with peak hour, and tomorrow's
 * target. Every one of those is now on the hydration analytics screen, drawn
 * from the same /hydration/analytics/dashboard payload — so the two screens
 * showed the same numbers, and the analytics screen linked to this one, sending
 * users to a page that repeated what they had just read.
 *
 * Despite the name it never showed anything about energy or focus: there was no
 * mood or energy correlation in it, only hydration patterns. Its one unique
 * element, the caffeine-to-water note, now lives in "What you drink".
 *
 * Kept as a redirect rather than deleted because notifications, recommendation
 * CTAs and any deep link may still target this path.
 */

import { Redirect, Stack } from 'expo-router';

export default function HydrationCognitionScreen() {
  return (
    <>
      {/* The insights layout shows a header by default, and this route no
          longer sets a title — without this, the redirect frame renders a
          header reading "hydration-cognition", the raw route slug. */}
      <Stack.Screen options={{ headerShown: false }} />
      <Redirect href="/analytics/hydration" />
    </>
  );
}
