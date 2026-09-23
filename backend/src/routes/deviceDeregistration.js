/**
 * Deliberately unauthenticated route — see devicesTable.deregisterToken's
 * comment in schema.js for why this needs to work without any session.
 *
 * Security posture: the ONLY thing this route can do is delete a device
 * row exactly matching a securely-random, expiring, single-use token
 * (deregisterByToken in deviceRegistry.js) — no data is readable through
 * it, no other mutation is possible, and it can't be used to probe which
 * tokens are valid (an expired/already-consumed/wrong token all produce
 * the identical { success: true, removed: false } response). This is the
 * same trust model as a password-reset or email-unsubscribe link. It
 * inherits this app's existing global/burst rate limiting because it's
 * mounted under /api like every other route (see server.js).
 */
import express from "express";
import { attachDb } from "../middleware/db.js";
import { deregisterByToken } from "../utils/deviceRegistry.js";
import { sendDevError } from "../utils/sendDevError.js";

const router = express.Router();

router.use(attachDb);

router.post("/deregister", async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token || typeof token !== 'string' || token.length > 200) {
      return res.status(400).json({ success: false, error: 'A valid token is required' });
    }

    const result = await deregisterByToken(req.db, token);
    console.log(`[deviceDeregistration] Token-based deregister attempt: removed=${result.removed}`);
    res.status(200).json({ success: true, removed: result.removed });
  } catch (error) {
    console.error('[deviceDeregistration] Error:', error);
    sendDevError(res, error);
  }
});

export default router;
