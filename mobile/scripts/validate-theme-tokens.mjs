/**
 * Theme token validator
 *
 * Catches the "Cannot read property 'x' of undefined" render crashes that occur
 * when a screen reads a design token path that does not exist — e.g.
 * `VIBRANT_WELLNESS.success.subtle`, which crashed the Privacy & Data screen on
 * mount and made account deletion unreachable.
 *
 * These are invisible to ESLint (property access on an imported object is always
 * "valid") and only surface when the screen is actually rendered, so a rarely
 * visited screen can ship broken. This script resolves every `TOKEN.a.b` access
 * against the real exported objects.
 *
 * Usage: node scripts/validate-theme-tokens.mjs
 * Exits non-zero if any unresolvable token path is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEME_MODULES = ['constants/premiumTheme.js', 'constants/designTokens.js'];
const SCAN_DIRS = ['app', 'components', 'hooks', 'services', 'utils', 'providers', 'constants'];

// Keep modules separate. Several names (ANIMATION, SURFACES, COLORS…) are
// exported by BOTH theme files with different shapes, so a merged lookup would
// resolve against the wrong one and report false positives. Each file is checked
// against the module it actually imports from.
const themesByModule = {};
for (const modPath of THEME_MODULES) {
  const mod = await import(path.join(MOBILE_ROOT, modPath));
  const key = path.basename(modPath, '.js');
  themesByModule[key] = {};
  for (const [name, value] of Object.entries(mod)) {
    // Only track plain object exports — functions and scalars have no paths to check.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      themesByModule[key][name] = value;
    }
  }
}

const files = [];
for (const dir of SCAN_DIRS) {
  const abs = path.join(MOBILE_ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  (function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const p = path.join(d, entry);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(entry)) files.push(p);
    }
  })(abs);
}

const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  // Only check tokens this file actually imports, so a local variable that
  // happens to share a name with a token export is not misread as one — and so
  // each name resolves against the module it was imported from.
  const themes = {};
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*constants\/(premiumTheme|designTokens)['"]/g)) {
    const moduleTokens = themesByModule[m[2]];
    for (const spec of m[1].split(',')) {
      const parts = spec.trim().split(/\s+as\s+/);
      const original = parts[0].trim();
      const local = parts[parts.length - 1].trim();
      if (local && moduleTokens[original]) themes[local] = moduleTokens[original];
    }
  }

  const names = Object.keys(themes).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (names.length === 0) continue;

  const re = new RegExp(`\\b(${names.join('|')})((?:\\.\\w+)+)`, 'g');
  for (const m of text.matchAll(re)) {
    const [full, root, chain] = m;
    const segments = chain.slice(1).split('.');

    let cursor = themes[root];
    const walked = [root];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      // Stop at the first non-object: further segments are runtime values
      // (e.g. array methods, .length) rather than token paths.
      if (cursor === null || typeof cursor !== 'object') break;
      if (!(seg in cursor)) {
        // A missing LEAF just evaluates to undefined — React Native ignores an
        // undefined style value, so it is a silent visual bug.
        // A missing INTERMEDIATE segment means the next `.` dereferences
        // undefined, which throws and takes down the whole screen.
        const isLeaf = i === segments.length - 1;
        findings.push({
          severity: isLeaf ? 'silent' : 'crash',
          file: path.relative(MOBILE_ROOT, file),
          line: text.slice(0, m.index).split('\n').length,
          expr: full,
          missing: `${walked.join('.')}.${seg}`,
          available: Object.keys(cursor).join(', '),
        });
        cursor = undefined;
        break;
      }
      cursor = cursor[seg];
      walked.push(seg);
    }
  }
}

if (findings.length === 0) {
  const tokenCount = Object.values(themesByModule).reduce((n, m) => n + Object.keys(m).length, 0);
  console.log(`✅ All theme token paths resolve (${files.length} files, ${tokenCount} token objects)`);
  process.exit(0);
}

const crashes = findings.filter((f) => f.severity === 'crash');
const silent = findings.filter((f) => f.severity === 'silent');

const report = (list, label) => {
  if (list.length === 0) return;
  console.error(`\n${label} (${list.length})\n${'─'.repeat(60)}`);
  for (const f of list) {
    console.error(`  ${f.file}:${f.line}`);
    console.error(`    ${f.expr}  →  '${f.missing}' is undefined`);
    console.error(`    available: ${f.available}\n`);
  }
};

report(crashes, '🔴 CRASHES ON RENDER — property read on undefined');
report(silent, '🟡 SILENT — resolves to undefined, style is dropped');

console.error(`\nSummary: ${crashes.length} crash, ${silent.length} silent (${findings.length} total)`);
// Only crashes fail the build; silent issues are reported for cleanup.
process.exit(crashes.length > 0 ? 1 : 0);
