/**
 * tests/redirects-verify.mjs
 *
 * Verifies every redirect entry in next.config.mjs against localhost:3000.
 * For each redirect: curls the source, asserts 301 or 308, asserts Location
 * header matches the expected destination (with basic :path* wildcard handling).
 *
 * Usage:
 *   node tests/redirects-verify.mjs
 *
 * Prerequisites: dev server must be running on localhost:3000 (pnpm dev)
 *
 * Exit 0 = all pass, exit 1 = one or more failures.
 */

import { execSync } from 'child_process'

const BASE = 'http://localhost:3000'
const GREEN = '\x1b[32m✓\x1b[0m'
const RED = '\x1b[31m❌\x1b[0m'
const YELLOW = '\x1b[33m⚠\x1b[0m'

// ── Redirect table extracted from next.config.mjs ──────────────────────────

const pages = ['tours', 'about', 'contact', 'shop', 'privacy', 'terms', 'cookies']
const shopRoutes = ['woven', 'commission', 'alcaca']
const experienceRoutes = ['corporate-team-building', 'romantic-sunset', 'family-farm-days']

const localeRedirects = [
  { source: '/', destination: '/en', permanent: true },
  ...pages.map((page) => ({ source: `/${page}`, destination: `/en/${page}`, permanent: true })),
  ...shopRoutes.map((route) => ({ source: `/shop/${route}`, destination: `/en/shop/${route}`, permanent: true })),
  ...experienceRoutes.map((route) => ({
    source: `/experiences/${route}`,
    destination: `/en/experiences/${route}`,
    permanent: true,
  })),
]

const alpacaNames = [
  'barbarella', 'avalon', 'bardot', 'chet', 'dusty',
  'fela', 'fonda', 'lewis', 'marron', 'mojo',
  'moloko', 'nelson', 'suki', 'toots',
]

const oldSiteRedirects = [
  { source: '/home', destination: '/en', permanent: true },
  { source: '/home-1', destination: '/en', permanent: true },
  { source: '/wie-zijn-wij', destination: '/en/about', permanent: true },
  { source: '/wat-doen-wij', destination: '/en/tours', permanent: true },
  { source: '/wat-doen-wij-1', destination: '/en/tours', permanent: true },
  { source: '/alpacas-ibiza', destination: '/en/about', permanent: true },
  { source: '/onze-alpacas', destination: '/en/about', permanent: true },
  { source: '/contact-1', destination: '/en/contact', permanent: true },
  { source: '/weddings-photoshoots', destination: '/en/experiences/romantic-sunset', permanent: true },
  { source: '/weddings-photoshoots-1', destination: '/en/shop/alcaca', permanent: true },
  { source: '/adopt-a-paca', destination: '/en/tours', permanent: true },
  { source: '/alpaca-yoga', destination: '/en/tours', permanent: true },
  { source: '/alpaca-yoga-1', destination: '/en/tours', permanent: true },
  {
    source: '/business-incentives-brainstormsessies',
    destination: '/en/experiences/corporate-team-building',
    permanent: true,
  },
  { source: '/informatie-weaving', destination: '/en/shop/woven', permanent: true },
  { source: '/informatie-weaving-1', destination: '/en/shop/woven', permanent: true },
  { source: '/algemene-voorwaarden', destination: '/en/terms', permanent: true },
  ...alpacaNames.map((name) => ({ source: `/${name}`, destination: '/en/about', permanent: true })),
]

const feedRedirect = [{ source: '/feed.xml', destination: '/journal/rss.xml', permanent: false }]

const allRedirects = [...feedRedirect, ...localeRedirects, ...oldSiteRedirects]

// ── Helpers ────────────────────────────────────────────────────────────────

function curlRedirect(sourcePath) {
  // Use NUL (Windows) as /dev/null equivalent for the output sink.
  // shell:true ensures curl is found via PATH on Windows/Git-Bash environments.
  const url = `${BASE}${sourcePath}`
  const cmd = `curl -sI -o NUL -w "%{http_code} %{redirect_url}" --max-redirs 0 "${url}"`
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] })
    const [code, ...rest] = out.trim().split(' ')
    return { code: parseInt(code, 10), location: rest.join(' ').trim() }
  } catch (err) {
    // execSync throws on non-zero exit; still capture stdout if available
    const stdout = err.stdout ? err.stdout.toString().trim() : ''
    if (stdout) {
      const [code, ...rest] = stdout.split(' ')
      const parsed = parseInt(code, 10)
      if (!isNaN(parsed)) return { code: parsed, location: rest.join(' ').trim() }
    }
    return { code: 0, location: '', error: err.message }
  }
}

function normalizeDestination(dest, base) {
  // If destination is absolute already, return as-is
  if (dest.startsWith('http')) return dest
  return `${base}${dest}`
}

function matchLocation(location, expectedDest, base) {
  const expected = normalizeDestination(expectedDest, base)
  // Exact match
  if (location === expected) return true
  // Trailing slash variants
  if (location === expected + '/') return true
  if (location + '/' === expected) return true
  // Strip query string from location for comparison
  const locNoQuery = location.split('?')[0]
  if (locNoQuery === expected) return true
  if (locNoQuery === expected + '/') return true
  return false
}

// ── Main ──────────────────────────────────────────────────────────────────

let passes = 0
let failures = 0
const failDetails = []

console.log(`\nRedirect verifier — testing ${allRedirects.length} entries against ${BASE}\n`)
console.log(`${'#'.padStart(3)}  ${'Source'.padEnd(55)} ${'Expected Dest'.padEnd(45)} Status`)
console.log('─'.repeat(120))

for (let i = 0; i < allRedirects.length; i++) {
  const { source, destination, permanent } = allRedirects[i]
  const { code, location, error } = curlRedirect(source)

  const expectedCodes = permanent ? [301, 308] : [302, 307, 301, 308]
  const codeOk = expectedCodes.includes(code)
  const locOk = matchLocation(location, destination, BASE)
  const pass = codeOk && locOk

  const prefix = pass ? GREEN : RED
  const num = String(i + 1).padStart(3)
  const src = source.padEnd(55)
  const dest = destination.padEnd(45)
  const statusStr = `${code} -> ${location || '(no location)'}`

  if (pass) {
    passes++
    console.log(`${prefix} ${num}  ${src} ${dest} ${statusStr}`)
  } else {
    failures++
    const note = !codeOk
      ? `bad code ${code} (expected ${expectedCodes.join('/')})`
      : `wrong Location: got "${location}", expected "${normalizeDestination(destination, BASE)}"`
    console.log(`${prefix} ${num}  ${src} ${dest} ${note}`)
    failDetails.push({ source, destination, code, location, note })
  }
}

console.log('\n' + '─'.repeat(120))
console.log(`\nResult: ${passes} passed, ${failures} failed (${allRedirects.length} total)\n`)

if (failures > 0) {
  console.log('FAILURES:')
  for (const f of failDetails) {
    console.log(`  ${f.source}`)
    console.log(`    expected destination: ${f.destination}`)
    console.log(`    actual:  code=${f.code}  location="${f.location}"`)
    console.log(`    reason:  ${f.note}`)
  }
  process.exit(1)
} else {
  console.log('All redirects verified. ✓')
  process.exit(0)
}
