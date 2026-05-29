import { test, expect } from '@playwright/test'

/**
 * 99-all-pages-smoke
 *
 * Loads every public page once. For each:
 *   - Expect 200 (not 404 / not 500)
 *   - Expect zero console errors
 *   - Expect <h1> visible (the page has rendered content, not a blank shell)
 *
 * This is the "did anything regress" gate, not a deep behavioural test.
 * Real flows are in 01-03 specs.
 */

// Every public route as of 2026-05-30.
const PAGES: ReadonlyArray<{ path: string; allowMissingH1?: boolean }> = [
  { path: '/en' },
  { path: '/en/about' },
  { path: '/en/adopt' },
  { path: '/en/alpacas' },
  { path: '/en/alpacas/barbarella' },
  { path: '/en/contact' },
  { path: '/en/cookies' },
  { path: '/en/experiences' },
  { path: '/en/experiences/corporate-team-building' },
  { path: '/en/experiences/family-farm-days' },
  { path: '/en/experiences/romantic-sunset' },
  { path: '/en/gifts' },
  { path: '/en/impressum' },
  { path: '/en/journal' },
  { path: '/en/media' },
  { path: '/en/newsletter-confirmed' },
  { path: '/en/offline', allowMissingH1: true },
  { path: '/en/press' },
  { path: '/en/press-kit' },
  { path: '/en/privacy' },
  { path: '/en/share-adoption?alpaca=barbarella' },
  { path: '/en/shop' },
  { path: '/en/shop/alcaca' },
  { path: '/en/shop/commission' },
  { path: '/en/shop/woven' },
  { path: '/en/sitemap' },
  { path: '/en/sustainability' },
  { path: '/en/terms' },
  { path: '/en/tours' },
  { path: '/en/weddings' },
  { path: '/en/workshops' },
  { path: '/en/yoga' },
  { path: '/en/newsletter/unsubscribed' },
]

const KNOWN_BENIGN_CONSOLE: ReadonlyArray<RegExp> = [
  // FareHarbor embed warns about its own iframe sizing on slow hosts.
  /fareharbor/i,
  // GTM warns when consent mode v2 is denied by default — expected pre-consent.
  /gtag.*denied/i,
  // Next.js DevTools telemetry hint.
  /next.*telemetry/i,
  // Resource hints for Vercel Analytics — fire-and-forget, can fail in headless.
  /vercel.*analytics/i,
]

function isBenignConsoleMessage(text: string): boolean {
  return KNOWN_BENIGN_CONSOLE.some((re) => re.test(text))
}

for (const { path, allowMissingH1 } of PAGES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      if (isBenignConsoleMessage(text)) return
      errors.push(text)
    })
    page.on('pageerror', (err) => {
      errors.push(`pageerror: ${err.message}`)
    })

    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(response, `no response for ${path}`).not.toBeNull()
    const status = response!.status()
    expect(status, `non-2xx status ${status} for ${path}`).toBeLessThan(400)

    if (!allowMissingH1) {
      const h1 = page.locator('h1').first()
      await expect(h1, `no <h1> visible on ${path}`).toBeVisible({ timeout: 10_000 })
    }

    if (errors.length > 0) {
      throw new Error(
        `Console errors on ${path}:\n - ${errors.join('\n - ')}`,
      )
    }
  })
}
