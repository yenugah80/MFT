/**
 * UI contract guards
 *
 * Static checks for two defect classes that shipped silently and are invisible
 * to unit tests, because both produce a rendering component that simply shows
 * nothing (or stale data) rather than throwing.
 *
 *   1. Destructuring a key a hook does not return. `const { isLoading } =
 *      useRecommendations()` yielded undefined, so a spinner never rendered;
 *      `refetch` was undefined too, so `await refetch()` threw and left
 *      pull-to-refresh spinning forever.
 *   2. A `flex: 1` scroll child inside a container that has `maxHeight` but no
 *      `height`. The container sizes to its content, the flex child resolves to
 *      flexBasis 0, and the scroll area collapses to zero height. This is what
 *      made the Log Sleep and Log Stress sheets render empty.
 */

/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

const MOBILE_ROOT = path.resolve(__dirname, '..');

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

const rel = (f) => path.relative(MOBILE_ROOT, f);
const dirs = (...names) => names.flatMap((n) => walk(path.join(MOBILE_ROOT, n)));

/** Body of the brace-balanced block starting at the `{` at or after `from`. */
function balancedBlock(src, from) {
  const start = src.indexOf('{', from);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start + 1, i);
  }
  return null;
}

/**
 * Strip comments before pattern-matching. Without this the guard trips on prose
 * describing the very thing it forbids — a comment reading "no flex:1 here"
 * matches /flex\s*:\s*1/ just as well as real code does.
 */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Remove nested braces/brackets/parens so only top-level commas remain. */
function flatten(body) {
  let out = '';
  let depth = 0;
  for (const ch of body) {
    if ('{[('.includes(ch)) depth++;
    else if ('}])'.includes(ch)) depth--;
    else if (depth === 0) out += ch;
    if (depth === 0 && '}])'.includes(ch)) out += ' ';
  }
  return out;
}

/** Top-level keys of an object literal body, for both single- and multi-line. */
function objectKeys(body) {
  const keys = new Set();
  for (const part of flatten(body).split(',')) {
    const m = part.match(/(?:^|\n)\s*(?:\/\/[^\n]*\n\s*)*([A-Za-z_$][\w$]*)\s*:?/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

describe('hook destructures match what the hook returns', () => {
  // name -> Set of returned keys, or null when the hook returns a spread we
  // cannot resolve statically (then it is skipped rather than guessed at).
  const hookReturns = new Map();

  for (const file of dirs('hooks', 'providers', 'contexts')) {
    const src = fs.readFileSync(file, 'utf8');
    const decl = /^(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=)/gm;
    const marks = [...src.matchAll(decl)].map((m) => ({
      name: m[1] || m[2],
      idx: m.index,
    }));

    marks.forEach((mark, i) => {
      if (!/^use[A-Z]/.test(mark.name)) return;
      const segment = src.slice(mark.idx, i + 1 < marks.length ? marks[i + 1].idx : src.length);
      const ret = segment.lastIndexOf('return {');
      if (ret === -1) return;
      const body = balancedBlock(segment, ret);
      if (body === null) return;
      hookReturns.set(mark.name, /\.\.\./.test(flatten(body)) ? null : objectKeys(body));
    });
  }

  it('finds hooks to check (guards against the parser silently matching nothing)', () => {
    expect(hookReturns.size).toBeGreaterThan(10);
  });

  it('no component reads a key its hook never returns', () => {
    const violations = [];

    for (const file of dirs('app', 'components')) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/const\s*\{([^}]+)\}\s*=\s*(use\w+)\(/g)) {
        const returned = hookReturns.get(m[2]);
        if (!returned) continue; // unknown hook, or an unresolvable spread
        for (const raw of stripComments(m[1]).split(',')) {
          const key = raw.split(':')[0].trim();
          if (!key || key.startsWith('...') || !/^[A-Za-z_$][\w$]*$/.test(key)) continue;
          if (!returned.has(key)) {
            violations.push(
              `${rel(file)}: destructures '${key}' from ${m[2]}(), which returns [${[...returned].join(', ')}]`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('API response codes match the server exactly', () => {
  // The client reacts to these; a case or spelling drift makes the branch dead
  // code that fails silently, which is how the activity-insights consent prompt
  // stopped working.
  const CANONICAL = ['openai_consent_required'];

  it('no source compares against a mis-cased variant of a known code', () => {
    const violations = [];
    const variants = CANONICAL.map((c) => ({ canonical: c, upper: c.toUpperCase() }));

    for (const file of dirs('app', 'components', 'hooks', 'services', 'providers', 'contexts')) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const { canonical, upper } of variants) {
        // Only a quoted string literal is a real comparison; the bare
        // identifier is how the constant itself is legitimately named.
        if (new RegExp(`['"\`]${upper}['"\`]`).test(src)) {
          violations.push(`${rel(file)}: compares against '${upper}' — the server sends '${canonical}'`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('subjective ratings are not pre-filled', () => {
  /**
   * A pre-filled subjective rating is indistinguishable in the database from a
   * deliberate answer. Log Sleep opened and saved untouched used to record
   * "quality 7/10", Log Stress "level 5", and Log Activity "30 minutes at
   * moderate intensity" — the last feeding calculateCalories and the dashboard's
   * energy balance. Objective values (bed/wake times) may still be pre-filled;
   * these may not.
   */
  const SUBJECTIVE_DEFAULTS = [
    { file: 'components/SleepLogger.jsx', state: 'quality' },
    { file: 'components/StressLogger.jsx', state: 'stressLevel' },
    { file: 'app/(tabs)/activity.jsx', state: 'intensity' },
    { file: 'app/(tabs)/activity.jsx', state: 'duration' },
  ];

  it.each(SUBJECTIVE_DEFAULTS)('$file: $state starts unset', ({ file, state }) => {
    const src = stripComments(fs.readFileSync(path.join(MOBILE_ROOT, file), 'utf8'));
    const decl = new RegExp(`const\\s*\\[\\s*${state}\\s*,[^\\]]*\\]\\s*=\\s*useState\\(([^)]*)\\)`);
    const match = src.match(decl);

    // Guard the guard: a renamed state must fail loudly, not silently pass.
    expect(match).not.toBeNull();

    const initialiser = match[1].trim();
    // '' is the unset form for a text input; null for everything else.
    expect(["null", "''", '""']).toContain(initialiser);
  });
});

describe('result provenance is not claimed by mode switches', () => {
  /**
   * `analysisSource` records where the CURRENT analysis result came from. It
   * feeds the saved log's `source` column, retry routing, and which result UI
   * renders. The input-mode tabs used to set it alongside setInputMode, so
   * merely tapping another tab relabelled an existing unsaved result: analyse a
   * photo, tap Voice, and the effect in log.js auto-opened MealSummaryScreen
   * over photo data labelled as voice — and saving stored source:'voice'.
   *
   * Only a real analysis entry point may set it.
   */
  it('no handler sets both setInputMode and setAnalysisSource', () => {
    const violations = [];

    for (const file of dirs('app', 'components')) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      // Arrow-function handler bodies, inline or braced.
      for (const m of src.matchAll(/onPress=\{[\s\S]{0,400}?\}\}/g)) {
        if (/setInputMode\s*\(/.test(m[0]) && /setAnalysisSource\s*\(/.test(m[0])) {
          violations.push(
            `${rel(file)}: an onPress calls both setInputMode and setAnalysisSource — ` +
              `switching tabs must not relabel an existing result`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('scroll areas are not nested in content-hugging containers', () => {
  /**
   * Files where a hug-container and a flex:1 scroll style coexist but are in
   * different subtrees, verified by reading the JSX. Listed explicitly so the
   * check stays strict everywhere else.
   */
  const VERIFIED_UNRELATED = new Set([
    'components/DashboardContent.jsx',
    'components/dashboard/RecommendationDetailModal.jsx',
  ]);

  it('no flex:1 scroll child sits inside a maxHeight-without-height container', () => {
    const violations = [];

    for (const file of dirs('app', 'components')) {
      const src = fs.readFileSync(file, 'utf8');
      if (VERIFIED_UNRELATED.has(rel(file))) continue;

      const styles = new Map();
      for (const m of src.matchAll(/(\w+)\s*:\s*\{/g)) {
        const body = balancedBlock(src, m.index + m[0].length - 1);
        if (body !== null) styles.set(m[1], stripComments(body));
      }

      const hugs = [...styles].filter(
        ([, b]) =>
          /maxHeight\s*:/.test(b) && !/(?:^|[\s;,])height\s*:/.test(b) && !/flex\s*:\s*1/.test(b)
      );
      if (hugs.length === 0) continue;

      for (const m of src.matchAll(
        /<(ScrollView|FlatList|SectionList)[^>]*?style=\{\s*\[?\s*styles\.(\w+)/gs
      )) {
        const body = styles.get(m[2]);
        if (body && /flex\s*:\s*1/.test(body)) {
          violations.push(
            `${rel(file)}: <${m[1]} style={styles.${m[2]}}> uses flex:1 while this file defines ` +
              `content-hugging container(s) [${hugs.map(([n]) => n).join(', ')}] — the scroll area collapses to zero height`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
