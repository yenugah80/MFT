/**
 * POST /api/auth/app-review/sign-in — the narrow App Store review path
 * around Clerk Device Trust. These cases pin down that it can only ever act
 * for the one configured account, only with that account's real password,
 * and never leaks the password or ticket into logs.
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { createAppReviewSignInHandler } from '../src/routes/appReview.js';

const REVIEW_EMAIL = 'support@my-food-tracker.com';
const REVIEW_USER = { id: 'user_review', banned: false, locked: false };

function makeClerk() {
  return {
    users: {
      getUserList: jest.fn(async () => ({ data: [REVIEW_USER], totalCount: 1 })),
      verifyPassword: jest.fn(async () => ({ verified: true })),
    },
    signInTokens: {
      createSignInToken: jest.fn(async () => ({ token: 'ticket_secret_value' })),
    },
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

async function call(handler, body) {
  const res = makeRes();
  await handler({ body }, res);
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

let clerk;
let infoSpy;

beforeEach(() => {
  clerk = makeClerk();
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
});

const handlerFor = (email = REVIEW_EMAIL) =>
  createAppReviewSignInHandler({ clerk, getReviewEmail: () => email });

describe('app review sign-in', () => {
  test.each([[null], ['']])('is inert (404) when APP_REVIEW_EMAIL is not configured (%p)', async (configured) => {
    const result = await call(handlerFor(configured), { email: REVIEW_EMAIL, password: 'pw' });
    expect(result.status).toBe(404);
    expect(clerk.users.getUserList).not.toHaveBeenCalled();
  });

  test('issues a short-lived single-user ticket for the review account and correct password', async () => {
    const result = await call(handlerFor(), { email: '  Support@My-Food-Tracker.com ', password: 'right' });

    expect(result).toEqual({ status: 200, body: { ticket: 'ticket_secret_value' } });
    expect(clerk.users.getUserList).toHaveBeenCalledWith({ emailAddress: [REVIEW_EMAIL], limit: 2 });
    expect(clerk.users.verifyPassword).toHaveBeenCalledWith({ userId: 'user_review', password: 'right' });
    expect(clerk.signInTokens.createSignInToken).toHaveBeenCalledWith({
      userId: 'user_review',
      expiresInSeconds: 120,
    });
  });

  test('any other email is rejected without touching Clerk', async () => {
    const result = await call(handlerFor(), { email: 'someone@example.com', password: 'right' });
    expect(result).toEqual({ status: 401, body: { error: 'invalid_credentials' } });
    expect(clerk.users.getUserList).not.toHaveBeenCalled();
    expect(clerk.signInTokens.createSignInToken).not.toHaveBeenCalled();
  });

  test('a wrong password is rejected and no ticket is created', async () => {
    clerk.users.verifyPassword.mockRejectedValueOnce(Object.assign(new Error('incorrect'), { status: 422 }));
    const result = await call(handlerFor(), { email: REVIEW_EMAIL, password: 'wrong' });
    expect(result).toEqual({ status: 401, body: { error: 'invalid_credentials' } });
    expect(clerk.signInTokens.createSignInToken).not.toHaveBeenCalled();
  });

  test.each([[undefined], [''], [123], ['x'.repeat(257)]])('rejects a missing or malformed password (%p)', async (password) => {
    const result = await call(handlerFor(), { email: REVIEW_EMAIL, password });
    expect(result.status).toBe(401);
    expect(clerk.users.verifyPassword).not.toHaveBeenCalled();
  });

  test('refuses when the email is ambiguous or the account does not exist', async () => {
    clerk.users.getUserList.mockResolvedValueOnce({ data: [], totalCount: 0 });
    expect((await call(handlerFor(), { email: REVIEW_EMAIL, password: 'right' })).status).toBe(401);

    clerk.users.getUserList.mockResolvedValueOnce({ data: [REVIEW_USER, { id: 'user_other' }], totalCount: 2 });
    expect((await call(handlerFor(), { email: REVIEW_EMAIL, password: 'right' })).status).toBe(401);
    expect(clerk.signInTokens.createSignInToken).not.toHaveBeenCalled();
  });

  test('refuses a banned or locked account even with the right password', async () => {
    clerk.users.getUserList.mockResolvedValueOnce({ data: [{ ...REVIEW_USER, locked: true }] });
    const result = await call(handlerFor(), { email: REVIEW_EMAIL, password: 'right' });
    expect(result.status).toBe(403);
    expect(clerk.signInTokens.createSignInToken).not.toHaveBeenCalled();
  });

  test('a Clerk outage is a 503, not a false "wrong password"', async () => {
    clerk.users.verifyPassword.mockRejectedValueOnce(Object.assign(new Error('down'), { status: 502 }));
    const result = await call(handlerFor(), { email: REVIEW_EMAIL, password: 'right' });
    expect(result.status).toBe(503);
  });

  test('never logs the password or the ticket', async () => {
    await call(handlerFor(), { email: REVIEW_EMAIL, password: 'hunter2-secret' });
    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain('hunter2-secret');
    expect(logged).not.toContain('ticket_secret_value');
  });
});
