#!/usr/bin/env node
// check-i18n-gap.js — CI translation-gap reporter
// Pure Node, no npm install required.
// Fails if __UNTRANSLATED__ count GROWS beyond baseline per locale.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRANSLATIONS_DIR = path.join(ROOT, 'translations');
const BASELINE_PATH = path.join(ROOT, 'i18n.baseline.json');
const LOCALES = ['de', 'it', 'es', 'fr'];
const SENTINEL = '__UNTRANSLATED__:';
const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY;

/** Recursively flatten a nested JSON object to dot-separated keys. */
function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`ERROR: Cannot read ${filePath}: ${e.message}`);
    process.exit(1);
  }
}

const enFlat = flatten(readJSON(path.join(TRANSLATIONS_DIR, 'en.json')));
const enKeys = new Set(Object.keys(enFlat));

const baseline = readJSON(BASELINE_PATH);
const baselineCounts = baseline.perLocale;

const rows = [];
let hasRegression = false;

for (const locale of LOCALES) {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  const localeFlat = flatten(readJSON(filePath));

  let sentinelCount = 0;
  let missingCount = 0;

  for (const key of enKeys) {
    if (!(key in localeFlat)) {
      missingCount++;
    } else if (
      typeof localeFlat[key] === 'string' &&
      localeFlat[key].startsWith(SENTINEL)
    ) {
      sentinelCount++;
    }
  }

  const gap = sentinelCount + missingCount;
  const base = baselineCounts[locale] ?? 0;
  const delta = gap - base;
  const status = delta > 0 ? 'FAIL' : delta < 0 ? 'IMPROVED' : 'OK';

  if (delta > 0) hasRegression = true;

  rows.push({ locale, sentinelCount, missingCount, gap, base, delta, status });

  const sign = delta > 0 ? '+' : '';
  console.log(
    `[${status}] ${locale}: sentinel=${sentinelCount} missing=${missingCount} ` +
    `total=${gap} baseline=${base} delta=${sign}${delta}`
  );
}

// GitHub Actions step summary
if (SUMMARY_FILE) {
  const lines = [
    '## i18n Translation Gap Report',
    '',
    `Baseline: \`${baseline.asOf}\`  `,
    `EN keys: ${enKeys.size}`,
    '',
    '| Locale | Sentinel (`__UNTRANSLATED__:`) | Missing | Gap | Baseline | Delta | Status |',
    '|--------|-------------------------------|---------|-----|----------|-------|--------|',
    ...rows.map(r => {
      const sign = r.delta > 0 ? '+' : '';
      const statusEmoji = r.delta > 0 ? ':x: FAIL' : r.delta < 0 ? ':white_check_mark: IMPROVED' : ':white_check_mark: OK';
      return `| \`${r.locale}\` | ${r.sentinelCount} | ${r.missingCount} | ${r.gap} | ${r.base} | ${sign}${r.delta} | ${statusEmoji} |`;
    }),
    '',
    hasRegression
      ? ':x: **Gap GREW in one or more locales. Translate new keys or sentinel them with `__UNTRANSLATED__:` before merging.**'
      : ':white_check_mark: **No regressions — gap is flat or shrinking.**',
  ];
  fs.appendFileSync(SUMMARY_FILE, lines.join('\n') + '\n');
}

if (hasRegression) {
  console.error(
    '\nFAILED: Translation gap grew beyond baseline. ' +
    'Add __UNTRANSLATED__: sentinels for any new EN keys in all four locales before merging.'
  );
  process.exit(1);
}

console.log('\nPASSED: Translation gap is flat or shrinking.');
