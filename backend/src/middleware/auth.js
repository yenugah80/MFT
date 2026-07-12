import { getAuth } from '@clerk/express';

// Returns 401 JSON for unauthenticated requests — correct for REST APIs.
// Clerk's built-in requireAuth() redirects (302) instead of rejecting, which
// causes fetch() to follow the redirect and get a 404 from the root path.
export const requireAuth = () => (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const getUserId = (req) => getAuth(req).userId;
