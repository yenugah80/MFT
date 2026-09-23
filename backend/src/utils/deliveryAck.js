/**
 * Delivery-ID-based ack/dedup core logic, extracted as plain functions that
 * take `db` as an explicit parameter (dependency injection) rather than
 * being methods on the Express controller. This is deliberate: the
 * controller module (profileController.js) transitively imports server.js,
 * which calls `app.listen(...)` unconditionally at module scope — importing
 * it in a test would start a real HTTP listener. Testing these functions
 * directly, against a real (test) database, sidesteps that entirely.
 */
import { and, eq, gte, isNotNull, isNull, or } from 'drizzle-orm';
import { notificationDeliveryLogTable } from '../db/schema.js';
import { mapReminderTypesToLocalCategories } from './deliveredTodayMapping.js';

/**
 * Which local reminder categories the backend has CONFIRMED delivering
 * today for this user — "confirmed" meaning a real ack landed for that
 * specific delivery, not merely that Firebase/APNs accepted the send.
 */
export async function getDeliveredTodayForUser(db, userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rows = await db
    .select({ notificationType: notificationDeliveryLogTable.notificationType })
    .from(notificationDeliveryLogTable)
    .where(and(
      eq(notificationDeliveryLogTable.userId, userId),
      gte(notificationDeliveryLogTable.createdAt, todayStart),
      isNotNull(notificationDeliveryLogTable.ackedAt)
    ));

  return mapReminderTypesToLocalCategories(rows.map((row) => row.notificationType));
}

/**
 * Records that a device acknowledged receiving a specific delivery.
 * Ownership-checked (the row must belong to userId) and idempotent by
 * construction (the WHERE clause only matches an unacked row, so a repeat
 * ack — same device retrying, or a second device on the same account —
 * matches nothing the second time).
 *
 * If the caller passes `ackingDeviceId` (the resolved `devices.id` of the
 * device making the ack call) and the logged row was sent to a specific
 * device (non-null `deviceId`), the two must match — a different device on
 * the same account acking someone else's delivery is a mismatch, not a
 * valid ack, even though userId ownership alone would pass. Legacy rows
 * (`deviceId: null`, sent before the per-device model or via account-wide
 * fan-out) keep the original userId-only check — there is no specific
 * device to validate against.
 *
 * @returns {Promise<{ok: boolean, alreadyAcked: boolean, ownershipViolation: boolean}>}
 */
export async function acknowledgeDelivery(db, userId, deliveryId, ackingDeviceId = null) {
  if (!deliveryId || typeof deliveryId !== 'string') {
    return { ok: false, alreadyAcked: false, ownershipViolation: false };
  }

  // Device-match is folded into the same atomic UPDATE (rather than
  // updating then reverting on mismatch) so a wrong-device ack attempt
  // never observably lands, even for an instant: it matches a row whose
  // deviceId is NULL (legacy/broadcast — no specific device to check) OR
  // equals the acking device's own id. A row targeted at a different real
  // device matches neither and the UPDATE simply touches nothing.
  const deviceCondition = ackingDeviceId != null
    ? or(isNull(notificationDeliveryLogTable.deviceId), eq(notificationDeliveryLogTable.deviceId, ackingDeviceId))
    : undefined;

  const updated = await db
    .update(notificationDeliveryLogTable)
    .set({ ackedAt: new Date() })
    .where(and(
      eq(notificationDeliveryLogTable.deliveryId, deliveryId),
      eq(notificationDeliveryLogTable.userId, userId),
      isNull(notificationDeliveryLogTable.ackedAt),
      ...(deviceCondition ? [deviceCondition] : [])
    ))
    .returning({ id: notificationDeliveryLogTable.id, deviceId: notificationDeliveryLogTable.deviceId });

  if (updated.length > 0) {
    return { ok: true, alreadyAcked: false, ownershipViolation: false };
  }

  const [existing] = await db
    .select({
      userId: notificationDeliveryLogTable.userId,
      deviceId: notificationDeliveryLogTable.deviceId,
      ackedAt: notificationDeliveryLogTable.ackedAt,
    })
    .from(notificationDeliveryLogTable)
    .where(eq(notificationDeliveryLogTable.deliveryId, deliveryId));

  if (existing && existing.userId !== userId) {
    return { ok: false, alreadyAcked: false, ownershipViolation: true };
  }

  if (existing && existing.deviceId != null && ackingDeviceId != null && existing.deviceId !== ackingDeviceId) {
    return { ok: false, alreadyAcked: false, ownershipViolation: true };
  }

  return { ok: true, alreadyAcked: Boolean(existing), ownershipViolation: false };
}
