const BLOCKING_RESOLUTION_FLAGS = new Set([
  'spelling_confirmation_required',
  'resolution_failed',
  'unresolved_nutrition',
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

