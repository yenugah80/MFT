/**
 * Cloudflare Middleware
 * Verifies requests come through Cloudflare and extracts real client IP
 *
 * Features:
 * - Validates CF-Connecting-IP header (real client IP)
 * - Optional: Block direct access (bypass protection)
 * - Extracts geo data from Cloudflare headers
 * - Detects known bot traffic
 */

// Cloudflare IP ranges (updated periodically)
// https://www.cloudflare.com/ips/
const CF_IPV4_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

/**
 * Check if IP is in CIDR range
 */
function ipInRange(ip, cidr) {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);

  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Check if request is from Cloudflare
 */
function isFromCloudflare(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return true; // Allow localhost for development
  }

  // Check IPv4 ranges
  for (const range of CF_IPV4_RANGES) {
    if (ipInRange(ip, range)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract real client IP from Cloudflare headers
 */
export function getClientIP(req) {
  // Cloudflare provides the real client IP in CF-Connecting-IP
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

/**
 * Extract Cloudflare geo data
 */
export function getCloudflareGeo(req) {
  return {
    country: req.headers['cf-ipcountry'] || null,
    city: req.headers['cf-ipcity'] || null,
    region: req.headers['cf-ipregion'] || null,
    timezone: req.headers['cf-timezone'] || null,
  };
}

/**
 * Check if request is from a known bot (via Cloudflare)
 */
export function isBot(req) {
  const botScore = req.headers['cf-bot-score'];
  if (botScore) {
    // Score 1-29 = likely bot, 30-99 = likely human
    return parseInt(botScore) < 30;
  }

  // Fallback: Check user agent for obvious bots
  const ua = req.headers['user-agent'] || '';
  const botPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /java\//i,
    /headless/i,
    /phantom/i,
    /selenium/i,
  ];

  // Allow good bots (Google, Bing, etc.)
  const goodBots = [/googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i];
  for (const pattern of goodBots) {
    if (pattern.test(ua)) return false;
  }

  for (const pattern of botPatterns) {
    if (pattern.test(ua)) return true;
  }

  return false;
}

/**
 * Cloudflare verification middleware
 * Use this to ensure requests come through Cloudflare (optional)
 */
export function requireCloudflare(options = {}) {
  const { blockDirect = false, allowDevelopment = true } = options;

  return (req, res, next) => {
    const isDev = process.env.NODE_ENV === 'development';

    // Allow development mode
    if (isDev && allowDevelopment) {
      req.clientIP = getClientIP(req);
      req.cfGeo = getCloudflareGeo(req);
      req.isBot = isBot(req);
      return next();
    }

    // Check if coming through Cloudflare
    const proxyIP = req.ip || req.connection?.remoteAddress;
    const hasCloudflareHeaders = req.headers['cf-connecting-ip'] || req.headers['cf-ray'];

    if (blockDirect && !hasCloudflareHeaders && !isFromCloudflare(proxyIP)) {
      console.warn(`[Cloudflare] Direct access blocked from ${proxyIP}`);
      return res.status(403).json({
        success: false,
        error: 'Direct access not allowed',
      });
    }

    // Attach useful data to request
    req.clientIP = getClientIP(req);
    req.cfGeo = getCloudflareGeo(req);
    req.isBot = isBot(req);
    req.cfRay = req.headers['cf-ray'] || null;

    next();
  };
}

/**
 * Bot blocking middleware
 * Blocks requests identified as bots
 */
export function blockBots(options = {}) {
  const { allowedPaths = ['/health', '/api/health'] } = options;

  return (req, res, next) => {
    // Skip for health checks
    if (allowedPaths.includes(req.path)) {
      return next();
    }

    // Skip in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    if (isBot(req)) {
      console.warn(`[Bot] Blocked bot request: ${req.headers['user-agent']}`);
      return res.status(403).json({
        success: false,
        error: 'Automated requests not allowed',
      });
    }

    next();
  };
}

/**
 * Suspicious request detector
 * Flags requests with unusual patterns
 */
export function detectSuspicious(req) {
  const flags = [];

  // No user agent
  if (!req.headers['user-agent']) {
    flags.push('no_user_agent');
  }

  // Missing common headers
  if (!req.headers['accept-language'] && !req.headers['accept']) {
    flags.push('missing_headers');
  }

  // Unusual content types for API
  const contentType = req.headers['content-type'];
  if (req.method === 'POST' && contentType && !contentType.includes('json') && !contentType.includes('form')) {
    flags.push('unusual_content_type');
  }

  // Very fast requests (potential automation)
  // This would need request timing tracking

  return flags;
}

export default {
  requireCloudflare,
  blockBots,
  getClientIP,
  getCloudflareGeo,
  isBot,
  detectSuspicious,
};
