#!/usr/bin/env node
/**
 * Checks what's actually still missing before MFT can be submitted for App
 * Review — reads the LIVE App Store Connect state via the API (read-only
 * key), not just whether local draft files exist. A draft sitting in
 * docs/app-store/store-listing-copy.md proves nothing about whether it was
 * ever pasted into ASC; this checks the real listing.
 *
 * Run from backend/ (needs its node_modules for jsonwebtoken):
 *   node scripts/checkAppStoreReadiness.mjs
 *
 * Requires ~/.appstoreconnect/private_keys/AuthKey_XYN85P5666.p8 to exist
 * (the read-only ASC API key already used elsewhere in this project).
 */
import jwt from 'jsonwebtoken';
import { existsSync, readFileSync } from 'node:fs';
import https from 'node:https';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const KEY_ID = 'XYN85P5666';
const ISSUER_ID = '49aa0f0c-ae4c-4e7b-86f1-0e75917999ec';
const APP_ID = '6783527114';
const KEY_PATH = join(homedir(), '.appstoreconnect', 'private_keys', `AuthKey_${KEY_ID}.p8`);

function checkmark(ok) {
  return ok ? '✅' : '❌';
}

function get(path) {
  const key = readFileSync(KEY_PATH, 'utf8');
  const token = jwt.sign({}, key, {
    algorithm: 'ES256',
    expiresIn: '15m',
    issuer: ISSUER_ID,
    audience: 'appstoreconnect-v1',
    keyid: KEY_ID,
  });
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.appstoreconnect.apple.com',
      path,
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse ASC response for ${path}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('MFT App Store Readiness Check');
  console.log('==============================\n');

  if (!existsSync(KEY_PATH)) {
    console.error(`❌ ASC API key not found at ${KEY_PATH} — cannot check live state.`);
    process.exit(1);
  }

  const results = [];

  // --- App-level info ---
  const app = await get(`/v1/apps/${APP_ID}`);
  results.push(['App name set correctly', app.data?.attributes?.name === 'MFT : My Flourish Tracker']);

  // --- Version + build ---
  const versions = await get(`/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&include=build`);
  const version = versions.data?.[0];
  const versionId = version?.id;
  const buildAttached = !!version?.relationships?.build?.data;
  results.push(['A version is in PREPARE_FOR_SUBMISSION', !!version]);
  results.push(['A build is attached to that version', buildAttached]);

  if (versionId) {
    // --- Listing metadata ---
    const localizations = await get(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
    const loc = localizations.data?.find((l) => l.attributes.locale === 'en-US') || localizations.data?.[0];
    const attrs = loc?.attributes || {};
    results.push(['Description filled in', !!attrs.description?.trim()]);
    results.push(['Keywords filled in', !!attrs.keywords?.trim()]);
    results.push(['Promotional text filled in', !!attrs.promotionalText?.trim()]);

    // --- Screenshots ---
    if (loc?.id) {
      const shots = await get(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
      const sets = shots.data || [];
      const iphoneSet = sets.find((s) => s.attributes.screenshotDisplayType?.includes('IPHONE'));
      const ipadSet = sets.find((s) => s.attributes.screenshotDisplayType?.includes('IPAD'));
      results.push(['iPhone screenshots uploaded', !!iphoneSet]);
      results.push(['iPad screenshots uploaded', !!ipadSet]);

      // App Previews
      const previewSets = await get(`/v1/appStoreVersionLocalizations/${loc.id}/appPreviewSets`).catch(() => ({ data: [] }));
      results.push(['App preview videos uploaded', (previewSets.data || []).length > 0]);
    }
  }

  // --- Local source-of-truth files exist (doesn't prove they're pasted in,
  // but flags if the draft itself is missing) ---
  const listingCopyPath = join(REPO_ROOT, 'docs/app-store/store-listing-copy.md');
  const privacyAnswersPath = join(REPO_ROOT, 'docs/app-store/ios-app-privacy.md');
  results.push(['Local listing-copy draft exists (docs/app-store/store-listing-copy.md)', existsSync(listingCopyPath)]);
  results.push(['Local App Privacy answer sheet exists (docs/app-store/ios-app-privacy.md)', existsSync(privacyAnswersPath)]);

  // --- Privacy policy URL reachable ---
  const privacyUrlOk = await new Promise((resolve) => {
    https.get('https://my-food-tracker.com/privacy', (res) => resolve(res.statusCode === 200))
      .on('error', () => resolve(false));
  });
  results.push(['Privacy policy URL is live (https://my-food-tracker.com/privacy)', privacyUrlOk]);

  // --- Report ---
  console.log('');
  for (const [label, ok] of results) {
    console.log(`${checkmark(ok)} ${label}`);
  }

  const failing = results.filter(([, ok]) => !ok);
  console.log('');
  if (failing.length === 0) {
    console.log('All checked items look ready. Note: pricing tier, age rating, App');
    console.log('Review contact/sign-in info, and Content Rights are not exposed by');
    console.log('the read-only ASC API and must be verified by hand in the dashboard.');
  } else {
    console.log(`${failing.length} item(s) still need attention (marked ❌ above).`);
  }
}

main().catch((err) => {
  console.error('Check failed:', err.message);
  process.exit(1);
});
