import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Factory that returns a Clerk auth middleware instance.
// All routes must call requireAuth() — this ensures consistent usage across the codebase.
export const requireAuth = () => ClerkExpressRequireAuth({});

// Helper to extract userId safely
export const getUserId = (req) => {
  return req.auth.userId;
};
