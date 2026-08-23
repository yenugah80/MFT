/**
 * Fuse `what.action` + `why.primaryReason` into one natural-sounding
 * sentence for Recommendation5W2HCard's headline.
 *
 * Kept out of the component file so this pure text logic is unit-testable
 * without pulling in @expo/vector-icons / expo-linear-gradient / expo-haptics
 * native-module mocks just to test a string transform.
 *
 * @param {{action?: string}} what
 * @param {{primaryReason?: string}} why
 * @returns {string}
 */
export function buildRecommendationSummary(what, why) {
  const action = typeof what?.action === 'string' ? what.action : 'Take action';
  const reason = typeof why?.primaryReason === 'string' ? why.primaryReason : '';

  // Create a natural-sounding fused sentence
  if (reason) {
    // "Earlier, lighter dinners to improve your sleep comfort."
    // Not: "What: Eat earlier. Why: Sleep better."
    const cleanReason = reason.toLowerCase().replace(/^your /, '').replace(/\.$/, '');
    // The deterministic (non-AI) recommendation path writes `reason` as
    // an already-complete sentence that leads with the food's own name
    // ("Greek Yogurt Bowl adds 15g protein toward the 45g you still need
    // today"), not a short causal fragment like "sleep comfort". `action`
    // here is also the food name (see transformTo5W2H), so stitching
    // "${action} to address ${reason}" on top produced the food name
    // twice back to back, ungrammatically. If reason already opens with
    // the action text, it's a complete sentence on its own — use it
    // directly instead of doubling up.
    if (cleanReason.startsWith(action.toLowerCase())) {
      return reason.trim();
    }
    return `${action.replace(/\.$/, '')} to address ${cleanReason}.`;
  }
  return action;
}
