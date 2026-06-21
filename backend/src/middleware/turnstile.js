/**
 * Cloudflare Turnstile Verification Middleware
 *
 * Turnstile is Cloudflare's CAPTCHA alternative that verifies humans vs bots.
 * This middleware provides:
 * 1. Server-side token verification
 * 2. HTML page for WebView-based verification in mobile apps
 *
 * Setup:
 * 1. Go to Cloudflare Dashboard → Turnstile → Add Site
 * 2. Get your Site Key and Secret Key
 * 3. Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY env vars
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Escape user-controlled strings before embedding in HTML attributes */
function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Verify Turnstile token with Cloudflare
 * @param {string} token - The Turnstile token from client
 * @param {string} ip - Client IP address (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyTurnstileToken(token, ip = null) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not configured');
    // In development, allow bypass
    if (process.env.NODE_ENV === 'development') {
      return { success: true, bypassed: true };
    }
    return { success: false, error: 'Turnstile not configured' };
  }

  if (!token) {
    return { success: false, error: 'No token provided' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, challengeTs: result.challenge_ts };
    } else {
      console.warn('[Turnstile] Verification failed:', result['error-codes']);
      return {
        success: false,
        error: 'Verification failed',
        codes: result['error-codes'],
      };
    }
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Express middleware to require Turnstile verification
 * Expects token in request body as 'turnstileToken' or header 'x-turnstile-token'
 */
export function requireTurnstile(options = {}) {
  const { optional = false } = options;

  return async (req, res, next) => {
    // Skip in development if not configured
    if (process.env.NODE_ENV === 'development' && !process.env.TURNSTILE_SECRET_KEY) {
      return next();
    }

    const token = req.body?.turnstileToken || req.headers['x-turnstile-token'];
    const clientIP = req.clientIP || req.ip;

    if (!token && optional) {
      return next();
    }

    const result = await verifyTurnstileToken(token, clientIP);

    if (!result.success) {
      return res.status(403).json({
        success: false,
        error: 'Human verification required',
        requiresVerification: true,
        verificationUrl: '/api/verify/turnstile',
      });
    }

    // Attach verification result to request
    req.turnstileVerified = true;
    req.turnstileTimestamp = result.challengeTs;
    next();
  };
}

/**
 * Generate HTML page for Turnstile verification (for mobile WebView)
 */
export function getTurnstilePageHTML(siteKey, action = 'verify') {
  const safeAction = escapeHtmlAttr(action);
  const safeSiteKey = escapeHtmlAttr(siteKey);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Security Verification</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      fill: white;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    p {
      font-size: 15px;
      color: #6b7280;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .turnstile-container {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .status {
      font-size: 14px;
      color: #6b7280;
      margin-top: 16px;
    }
    .status.success {
      color: #10b981;
    }
    .status.error {
      color: #ef4444;
    }
    .loading {
      display: none;
    }
    .loading.show {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    </div>
    <h1>Security Verification</h1>
    <p>Please complete this quick check to verify you're human. This helps protect your account.</p>

    <div class="turnstile-container">
      <div
        class="cf-turnstile"
        data-sitekey="${safeSiteKey}"
        data-callback="onSuccess"
        data-error-callback="onError"
        data-theme="light"
        data-size="normal"
        data-action="${safeAction}"
      ></div>
    </div>

    <p class="status loading" id="status">Verifying...</p>
  </div>

  <script>
    function onSuccess(token) {
      document.getElementById('status').textContent = 'Verified! Closing...';
      document.getElementById('status').classList.add('success', 'show');

      // Send token back to React Native WebView
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'turnstile_success',
          token: token,
        }));
      }

      // Close after brief delay
      setTimeout(() => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'close',
          }));
        }
      }, 1000);
    }

    function onError(error) {
      document.getElementById('status').textContent = 'Verification failed. Please try again.';
      document.getElementById('status').classList.add('error', 'show');

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'turnstile_error',
          error: error,
        }));
      }
    }
  </script>
</body>
</html>
`;
}

export default {
  verifyTurnstileToken,
  requireTurnstile,
  getTurnstilePageHTML,
};
