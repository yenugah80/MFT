import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Strict authentication middleware
// This will validate the session token sent in the 'Authorization' header
// If invalid or missing, it throws a 401 Unauthorized error automatically.
export const requireAuth = ClerkExpressRequireAuth({
  // Optional: Add custom error handling or configuration here if needed
});

// Helper to extract userId safely
export const getUserId = (req) => {
  return req.auth.userId;
};
