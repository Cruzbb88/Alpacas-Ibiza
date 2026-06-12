// Render the running site in a real browser and screenshot key pages at
// desktop + mobile. We have shipped this whole redesign and never SEEN it —
// every check was curl+grep. This captures pixels so layout/contrast/fonts/
// broken-images/overlap become visible. Run against a live local server.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOT_BASE || 'http://localhost:3000'
const OUT = 'screenshots'
mkdirSync(OUT, { recursive: true })

const PAGES = [
  ['home-en', '/en'],
  ['adopt-en', '/en/adopt'],
  ['alpacas-en', '/en/alpacas'],
  ['tours-en', '/en/tours'],
  ['home-nl', '/nl'],
  ['contact-en', '/en/contact'],
]
const VIEWPORTS = [
  ['desktop', 1280, 900],
  ['mobile', 390, 844],
]

const browser = await chromium.launch()
const findings = []
for (const [vp, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 120)) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 120)))
  for (const [name, path] of PAGES) {
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 })
      await page.waitForTimeout(800)
      const file = `${OUT}/${name}-${vp}.png`
      // full page on desktop, above-the-fold on mobile (what a user sees first)
      await page.screenshot({ path: file, fullPage: vp === 'desktop' })
      // quick DOM signals
      const brokenImgs = await page.evaluate(() =>
        Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 5),
      )
      const h1 = await page.locator('h1').first().textContent().catch(() => null)
      findings.push({ page: name, vp, status: resp?.status(), file, h1: (h1 || '').trim().slice(0, 60), brokenImgs, errs: [...consoleErrors] })
      consoleErrors.length = 0
    } catch (e) {
      findings.push({ page: name, vp, error: String(e).slice(0, 120) })
    }
  }
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(findings, null, 2))
