#!/usr/bin/env node
// inject-i18n-sentinels.js — restore __UNTRANSLATED__ visibility for missing keys.
// Pure Node, no npm install required.
//
// Reads translations/en.json. For each of de/it/es/fr, finds keys present in EN
// but missing in the target locale, and injects them as
//   "__UNTRANSLATED__: <EN value>"
// at the same key path. Arrays get per-element sentinel prefix. Existing
// translated values are NEVER overwritten.
//
// Runs idempotently — running twice is a no-op once gaps are sentineled.
//
// Pair this with scripts/check-i18n-gap.js (CI gap baseline + regression check).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRANSLATIONS_DIR = path.join(ROOT, 'translations');
const LOCALES = ['de', 'it', 'es', 'fr'];
const SENTINEL = '__UNTRANSLATED__:';

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sentinelize(value) {
  if (typeof value === 'string') return `${SENTINEL} ${value}`;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return `${SENTINEL} ${String(value)}`;
  }
  if (Array.isArray(value)) return value.map(sentinelize);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sentinelize(v);
    return out;
  }
  return `${SENTINEL} `;
}

/**
 * Recursively merge `from` into `into` at the structural level.
 * - Keys present in `into` are kept (translated values preserved).
 * - Keys only in `from` are injected with sentinel-prefixed EN values.
 * Returns { merged, injected }.
 */
function mergeWithSentinels(into, from) {
  let injected = 0;
  const merged = isPlainObject(into) ? { ...into } : (Array.isArray(into) ? [...into] : {});

  if (isPlainObject(from)) {
    for (const [k, v] of Object.entries(from)) {
      if (!(k in merged)) {
        merged[k] = sentinelize(v);
        injected += countLeafValues(v);
      } else if (isPlainObject(v) && isPlainObject(merged[k])) {
        const sub = mergeWithSentinels(merged[k], v);
        merged[k] = sub.merged;
        injected += sub.injected;
      } else if (Array.isArray(v) && Array.isArray(merged[k]) && merged[k].length < v.length) {
        // EN array grew — sentinel the tail
        const filled = [...merged[k]];
        for (let i = merged[k].length; i < v.length; i++) {
          filled.push(sentinelize(v[i]));
          injected += countLeafValues(v[i]);
        }
        merged[k] = filled;
      }
      // else: leaf already present in target locale — preserve
    }
  }

  return { merged, injected };
}

function countLeafValues(v) {
  if (Array.isArray(v)) return v.reduce((acc, x) => acc + countLeafValues(x), 0);
  if (isPlainObject(v)) {
    return Object.values(v).reduce((acc, x) => acc + countLeafValues(x), 0);
  }
  return 1;
}

const en = readJSON(path.join(TRANSLATIONS_DIR, 'en.json'));

let totalInjected = 0;
for (const locale of LOCALES) {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  const current = readJSON(filePath);
  const { merged, injected } = mergeWithSentinels(current, en);
  if (injected > 0) {
    writeJSON(filePath, merged);
  }
  totalInjected += injected;
  console.log(`[${locale}] injected ${injected} sentinel${injected === 1 ? '' : 's'}`);
}

console.log(`\nDone. ${totalInjected} sentinel(s) injected across ${LOCALES.length} locales.`);
console.log('Run `node scripts/check-i18n-gap.js` to verify gap regression status.');
