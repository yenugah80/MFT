/**
 * Sleep window maths.
 *
 * Lives outside the logger component so it can be unit tested: the time pickers
 * only edit a clock time, never a date, so turning two clock times into a real
 * interval is where the bugs live.
 */

/** Longest interval accepted as a single night's sleep. */
export const MAX_SLEEP_MINUTES = 24 * 60;

/**
 * Place the bed time on whichever calendar day makes it the most recent instant
 * before waking.
 *
 * The picker edits a clock time only, so "1:30 AM" has to resolve to the same
 * night as the wake time, not the previous evening. Anchoring it to the evening
 * produced a ~29 hour window, which failed validation and left Save disabled —
 * i.e. anyone who went to bed after midnight could not log their sleep at all.
 *
 * @param {Date} bed  Date carrying the intended bed clock time.
 * @param {Date} wake The wake instant, treated as fixed.
 * @returns {Date} Bed time on the correct calendar day.
 */
export function alignBedTime(bed, wake) {
  const aligned = new Date(wake);
  aligned.setHours(bed.getHours(), bed.getMinutes(), 0, 0);
  if (aligned >= wake) {
    aligned.setDate(aligned.getDate() - 1);
  }
  return aligned;
}

/**
 * Apply a new wake clock time while keeping the wake date, then re-anchor bed.
 *
 * @param {Date} bed      Current bed time.
 * @param {Date} wake     Current wake time (its date is preserved).
 * @param {Date} picked   Date carrying the newly picked wake clock time.
 * @returns {{bedTime: Date, wakeTime: Date}}
 */
export function applyWakeTime(bed, wake, picked) {
  const wakeTime = new Date(wake);
  wakeTime.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return { bedTime: alignBedTime(bed, wakeTime), wakeTime };
}

/**
 * Whole minutes slept.
 * @param {Date} bed
 * @param {Date} wake
 * @returns {number}
 */
export function sleepDurationMinutes(bed, wake) {
  return Math.round((wake - bed) / 60000);
}

/**
 * Whether a window is loggable. Mirrors the server's own bounds.
 * @param {number} minutes
 * @returns {boolean}
 */
export function isValidSleepDuration(minutes) {
  return minutes > 0 && minutes <= MAX_SLEEP_MINUTES;
}
