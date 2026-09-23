const BLOCKING_RESOLUTION_FLAGS = new Set([
  'spelling_confirmation_required',
  'resolution_failed',
  'unresolved_nutrition',
  // Backend's resolve.js sets this when an AI-estimation-sourced item comes
  // back at near-zero calories — the signature of the model not actually
  // recognizing the food name (e.g. a garbled transcription like
  // "moongsal") rather than a legitimately low-calorie food. Previously
  // unflagged, so an unrecognized name silently became a confirmed
  // 0-calorie item instead of being routed to the same "needs
  // clarification" review path as an outright resolution failure.
  'unrecognized_food_low_estimate',
  // Backend sets this when the AI itself explicitly reports it could not
  // identify the food (voice: recognized:false; text: recognitionStatus
  // "unknown") — distinct from the low-estimate flag above because a
  // confidently-wrong guess (e.g. a garbled word silently renamed to a
  // real, plausible-sounding dish with normal, non-zero macros) has no
  // numeric signature to catch after the fact. This is the model's own
  // signal, not inferred from the numbers it happened to return.
  'unrecognized_food_name',
]);

export function replaceIngredientTerm(input, original, canonical) {
  if (!input || !original || !canonical) return null;

  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(escaped, 'i');
  if (!matcher.test(input)) return null;

  return input.replace(matcher, canonical);
}

export function itemNeedsResolution(item) {
  if (!item) return false;
  if (item.requiresUserConfirmation) return true;
  return (item.flags || []).some(flag => BLOCKING_RESOLUTION_FLAGS.has(flag));
}

export function unresolvedItems(items = []) {
  return items.filter(itemNeedsResolution);
}

