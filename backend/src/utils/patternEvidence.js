export const MIN_PATTERN_GROUP_SIZE = 3;

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Compare two non-overlapping groups while enforcing a minimum amount of
 * evidence on both sides. Missing and invalid values are excluded rather than
 * treated as zero.
 */
export function compareBinaryGroups(
  records,
  isInGroup,
  getValue,
  minimumGroupSize = MIN_PATTERN_GROUP_SIZE
) {
  const withValues = [];
  const withoutValues = [];

  for (const record of Array.isArray(records) ? records : []) {
    const rawValue = getValue(record);
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    (isInGroup(record) ? withValues : withoutValues).push(value);
  }

  if (withValues.length < minimumGroupSize || withoutValues.length < minimumGroupSize) {
    return null;
  }

  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const averageWith = average(withValues);
  const averageWithout = average(withoutValues);

  return {
    countWith: withValues.length,
    countWithout: withoutValues.length,
    averageWith: roundToTenth(averageWith),
    averageWithout: roundToTenth(averageWithout),
    difference: roundToTenth(averageWith - averageWithout),
  };
}
