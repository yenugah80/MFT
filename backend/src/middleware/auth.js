import { requireAuth as clerkRequireAuth, getAuth } from '@clerk/express';

// Factory that returns a Clerk auth middleware instance.
// Uses @clerk/express (same SDK as clerkMiddleware in server.js) to avoid dual-SDK conflicts.
export const requireAuth = () => clerkRequireAuth();

// Helper to extract userId safely
export const getUserId = (req) => {
  return getAuth(req).userId;
};
