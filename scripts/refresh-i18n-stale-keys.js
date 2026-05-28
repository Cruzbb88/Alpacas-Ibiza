#!/usr/bin/env node
// refresh-i18n-stale-keys.js — re-sync specific keys in de/it/es/fr to match
// the current en.json, prepending __UNTRANSLATED__: so the gap-check tool
// still sees them as untranslated. Used when EN copy changes (e.g. vendor
// flip from Stripe to Mollie) and the same key in non-EN locales still
// references the old text.
//
// Pass a comma-separated list of dot-paths as the first arg:
//   node scripts/refresh-i18n-stale-keys.js adopt.ctaSubtext,adopt.faqA7

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TRANSLATIONS_DIR = path.join(ROOT, 'translations')
const LOCALES = ['de', 'it', 'es', 'fr']
const SENTINEL_PREFIX = '__UNTRANSLATED__: '

const keysArg = process.argv[2]
if (!keysArg) {
  console.error('usage: node scripts/refresh-i18n-stale-keys.js key1.path,key2.path')
  process.exit(1)
}
const keys = keysArg.split(',').map(s => s.trim()).filter(Boolean)

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function writeJSON(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8') }

function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj)
}
function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.')
  const last = parts.pop()
  let cur = obj
  for (const p of parts) {
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {}
    cur = cur[p]
  }
  cur[last] = value
}

const en = readJSON(path.join(TRANSLATIONS_DIR, 'en.json'))

for (const locale of LOCALES) {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`)
  const data = readJSON(filePath)
  let touched = 0
  for (const k of keys) {
    const enVal = getByPath(en, k)
    if (typeof enVal !== 'string') {
      console.warn(`[${locale}] skipping ${k} — EN value is not a string`)
      continue
    }
    setByPath(data, k, `${SENTINEL_PREFIX}${enVal}`)
    touched++
  }
  if (touched > 0) writeJSON(filePath, data)
  console.log(`[${locale}] refreshed ${touched} key(s)`)
}
