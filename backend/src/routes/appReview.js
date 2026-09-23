/**
 * App Store review sign-in — POST /api/auth/app-review/sign-in
 *
 * Why this exists: Clerk Device Trust (Dashboard → Protect → Rules) makes
 * every password sign-in from a device Clerk hasn't seen before return
 * `needs_second_factor` and email a code. That is deliberate protection for
 * real users, but App Review signs in on a clean iPad and cannot read the
 * demo account's inbox, so the demo credentials never get past it (Build 39
 * rejection, Guideline 2.1(a)). See docs/architecture/auth-oauth-reference.md.
 *
 * What it does, for exactly one account:
 *   1. Only active when APP_REVIEW_EMAIL is set (404 otherwise).
 *   2. The submitted email must equal APP_REVIEW_EMAIL (constant-time).
 *   3. The password is verified by Clerk itself (users.verifyPassword).
 *   4. Banned/locked users are refused.
 *   5. Returns a single-use Clerk sign-in token (expires in 2 minutes) that
 *      the app redeems with signIn.create({ strategy: "ticket" }).
 *
 * Nothing about any other account changes. The password is never logged or
 * stored, and the ticket is never logged. Rate-limited per IP and globally.
 */
import crypto from "node:crypto";
import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { clerkClient } from "@clerk/express";

const TICKET_TTL_SECONDS = 120;
const MAX_PASSWORD_LENGTH = 256;

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

function emailsMatch(submitted, configured) {
  const a = crypto.createHash("sha256").update(normalizeEmail(submitted)).digest();
  const b = crypto.createHash("sha256").update(normalizeEmail(configured)).digest();
  return crypto.timingSafeEqual(a, b);
}

const log = (stage, details = {}) => console.info(`[AppReviewAuth] ${stage}`, details);

/**
 * @param {object} deps
 * @param {object} deps.clerk  Clerk backend client (users, signInTokens)
 * @param {() => string|undefined} deps.getReviewEmail
 */
export function createAppReviewSignInHandler({ clerk, getReviewEmail }) {
  return async function appReviewSignIn(req, res) {
    const reviewEmail = normalizeEmail(getReviewEmail());
    if (!reviewEmail) return res.status(404).json({ error: "not_found" });

    const { email, password } = req.body ?? {};
    const invalid = () => res.status(401).json({ error: "invalid_credentials" });

    if (
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > MAX_PASSWORD_LENGTH ||
      !emailsMatch(email, reviewEmail)
    ) {
      log("REJECTED", { reason: "not_eligible" });
      return invalid();
    }

    let user;
    try {
      const { data } = await clerk.users.getUserList({ emailAddress: [reviewEmail], limit: 2 });
      if (!Array.isArray(data) || data.length !== 1) {
        log("REJECTED", { reason: "user_lookup", matches: Array.isArray(data) ? data.length : 0 });
        return invalid();
      }
      user = data[0];
    } catch (err) {
      log("CLERK_ERROR", { stage: "user_lookup", status: err?.status });
      return res.status(503).json({ error: "unavailable" });
    }

    try {
      await clerk.users.verifyPassword({ userId: user.id, password });
    } catch (err) {
      // 4xx = wrong password (Clerk: incorrect_password); anything else is Clerk being unavailable.
      if (err?.status && err.status < 500) {
        log("REJECTED", { reason: "password", status: err.status });
        return invalid();
      }
      log("CLERK_ERROR", { stage: "verify_password", status: err?.status });
      return res.status(503).json({ error: "unavailable" });
    }

    if (user.banned || user.locked) {
      log("REJECTED", { reason: "account_unavailable" });
      return res.status(403).json({ error: "account_unavailable" });
    }

    try {
      const token = await clerk.signInTokens.createSignInToken({
        userId: user.id,
        expiresInSeconds: TICKET_TTL_SECONDS,
      });
      log("TICKET_ISSUED", { userId: user.id });
      return res.status(200).json({ ticket: token.token });
    } catch (err) {
      log("CLERK_ERROR", { stage: "sign_in_token", status: err?.status });
      return res.status(503).json({ error: "unavailable" });
    }
  };
}

const limiterResponse = (_req, res) => res.status(429).json({ error: "too_many_attempts" });

// Per client: a reviewer mistyping a few times is fine; guessing is not.
const perIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `app-review:${ipKeyGenerator(req.ip || "unknown")}`,
  handler: limiterResponse,
});

// Across all clients: caps distributed guessing against the one account.
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => "app-review:global",
  handler: limiterResponse,
});

const router = express.Router();

router.post(
  "/sign-in",
  perIpLimiter,
  globalLimiter,
  createAppReviewSignInHandler({
    clerk: clerkClient,
    getReviewEmail: () => process.env.APP_REVIEW_EMAIL,
  })
);

export default router;
