// FULL-COVERAGE visual pass. We shipped ~52 pages and only ever screenshotted 6.
// This renders every PUBLIC page in a real browser at desktop + mobile, captures
// pixels, AND emits text signals (status, broken images, console errors, missing
// h1, horizontal-overflow) so layout/contrast/broken-image issues that code-reading
// structurally cannot see become visible. Run against a live local server.
//
//   node scripts/visual-shot-full.mjs   (expects SHOT_BASE or http://localhost:3000)
//
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.SHOT_BASE || 'http://localhost:3000'
const OUT = 'screenshots/full-2026-06-13'
mkdirSync(OUT, { recursive: true })

// Every public route from app/sitemap.ts + a representative dynamic page + the
// donor/owner-facing pages that the sitemap omits but real users still reach.
const PAGES = [
  ['home', '/en'],
  ['tours', '/en/tours'],
  ['visit', '/en/visit'],
  ['about', '/en/about'],
  ['adopt', '/en/adopt'],
  ['contact', '/en/contact'],
  ['shop', '/en/shop'],
  ['shop-woven', '/en/shop/woven'],
  ['shop-commission', '/en/shop/commission'],
  ['shop-alcaca', '/en/shop/alcaca'],
  ['alpacas', '/en/alpacas'],
  ['experiences', '/en/experiences'],
  ['exp-corporate', '/en/experiences/corporate-team-building'],
  ['exp-romantic', '/en/experiences/romantic-sunset'],
  ['exp-family', '/en/experiences/family-farm-days'],
  ['gifts', '/en/gifts'],
  ['redeem-voucher', '/en/redeem-voucher'],
  ['weaving', '/en/weaving'],
  ['skein', '/en/skein'],
  ['sustainability', '/en/sustainability'],
  ['weddings', '/en/weddings'],
  ['workshops', '/en/workshops'],
  ['yoga', '/en/yoga'],
  ['privacy', '/en/privacy'],
  ['terms', '/en/terms'],
  ['cookies', '/en/cookies'],
  ['impressum', '/en/impressum'],
  ['press', '/en/press'],
  ['sitemap', '/en/sitemap'],
  ['journal', '/en/journal'],
  ['herd-diary', '/en/herd-diary'],
  ['newsletter-archive', '/en/newsletter/archive'],
  // dynamic + user-facing pages the sitemap omits
  ['alpaca-detail', '/en/alpacas/lewis'],
  ['my-adoption', '/en/my-adoption'],
  ['preferences', '/en/preferences'],
  // locale spot-checks (the two genuinely shippable locales)
  ['home-nl', '/nl'],
  ['adopt-nl', '/nl/adopt'],
  // a weak locale, to SEE the graceful-fallback claim with our own eyes
  ['adopt-de', '/de/adopt'],
  // 404
  ['notfound', '/en/this-page-does-not-exist'],
]
const VIEWPORTS = [
  ['desktop', 1280, 900],
  ['mobile', 390, 844],
]

const browser = await chromium.launch()
const findings = []
for (const [vp, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 140)) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 140)))
  for (const [name, path] of PAGES) {
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 40000 })
      await page.waitForTimeout(700)
      const file = `${OUT}/${name}-${vp}.png`
      await page.screenshot({ path: file, fullPage: vp === 'desktop' })
      const brokenImgs = await page.evaluate(() =>
        Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.currentSrc || i.src).slice(-60)).slice(0, 6),
      )
      const h1 = await page.locator('h1').first().textContent().catch(() => null)
      // horizontal overflow = element wider than viewport (the classic mobile break)
      const overflow = await page.evaluate(() => {
        const de = document.documentElement
        return Math.max(0, de.scrollWidth - de.clientWidth)
      })
      // count gradient/emoji placeholder hero slots (the known "no photos" gap) — heuristic
      const placeholderHero = await page.evaluate(() => {
        const hero = document.querySelector('header, section')
        if (!hero) return false
        const bg = getComputedStyle(hero).backgroundImage || ''
        return bg.includes('gradient') && !bg.includes('url(')
      })
      findings.push({ page: name, vp, status: resp?.status() ?? null, h1: (h1 || '').trim().slice(0, 50), overflowPx: overflow, brokenImgs, placeholderHero, errs: consoleErrors.slice(0, 4) })
      consoleErrors.length = 0
    } catch (e) {
      findings.push({ page: name, vp, error: String(e).slice(0, 140) })
      consoleErrors.length = 0
    }
  }
  await ctx.close()
}
await browser.close()
writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2))
// terminal summary: only the rows that have a problem signal
const problems = findings.filter((f) => f.error || (f.status && f.status >= 400 && f.page !== 'notfound') || (f.brokenImgs && f.brokenImgs.length) || (f.overflowPx && f.overflowPx > 4) || (f.errs && f.errs.length) || !f.h1)
console.log('TOTAL', findings.length, 'shots ·', problems.length, 'with problem signals')
console.log(JSON.stringify(problems, null, 2))
