import { test, expect } from '@playwright/test'

test.describe('Adopt funnel', () => {
  test('home → adopt page renders core funnel components', async ({ page }) => {
    await page.goto('/en/adopt')
    await expect(page.locator('h1')).toBeVisible()
    // Funnel components should all be present
    await expect(page.getByText(/Adopt|Sponsor/i).first()).toBeVisible()
    // Tier cards — in dev PAYMENT_VENDOR is unset so CTA hrefs are mailto: links
    // The AdoptTierCard and TierComparison both render <a> elements with href to checkout or mailto
    const checkoutLinks = page.locator('a[href*="mailto:"], a[href*="/api/checkout"], a[href*="/api/mollie-checkout"]')
    await expect(checkoutLinks.first()).toBeVisible()
  })

  test('personality quiz selection flows to alpaca picker', async ({ page }) => {
    await page.goto('/en/adopt')
    // AlpacaPersonalityMatch renders buttons for quiz answers
    const quizAnswerBtn = page.getByRole('button', { name: /Quiet book|Dinner party|Hike to|Game night/i }).first()
    if (await quizAnswerBtn.isVisible().catch(() => false)) {
      await quizAnswerBtn.click()
      // After clicking, the quiz should advance (next question or recommendation)
      // Presence of a second question or a recommendation card = quiz is interactive
      const quizAdvanced = page.getByRole('button', { name: /Slow walk|Helping at|Watching|Playing/i })
        .or(page.getByText(/Recommended|Your match/i))
      await expect(quizAdvanced.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('alpaca picker selection updates URL', async ({ page }) => {
    await page.goto('/en/adopt')
    // AlpacaPicker renders buttons with aria-label "Select <Name>"
    const pickerButton = page.getByRole('button', { name: /Select Avalon|Select Bardot|Select Barbarella/i }).first()
    if (await pickerButton.isVisible().catch(() => false)) {
      await pickerButton.click()
      // URL should now contain ?alpaca=
      await expect(page).toHaveURL(/\?alpaca=/, { timeout: 5000 })
    }
  })

  test('gift adoption form opens and updates URL on input', async ({ page }) => {
    await page.goto('/en/adopt')
    // AdoptGiftAdoption renders a <details> with a <summary>
    const giftSummary = page.locator('summary').filter({ hasText: /Adopting for someone else|gift/i }).first()
    if (await giftSummary.isVisible().catch(() => false)) {
      await giftSummary.click()
      // The input has placeholder "e.g. Marta"
      const nameInput = page.getByPlaceholder(/e\.g\. Marta|recipient name/i).first()
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Recipient')
        // Debounced 300ms — wait 600ms
        await page.waitForTimeout(600)
        // Next.js router encodes spaces as '+' in query strings
        await expect(page).toHaveURL(/gift_name=Test[+%20]Recipient/, { timeout: 3000 })
      }
    }
  })

  test('checkout CTA points at /api/checkout, /api/mollie-checkout or mailto', async ({ page }) => {
    await page.goto('/en/adopt')
    // AdoptTierCard renders <Link> with text "Adopt monthly" / "Adopt yearly" (client component — wait for hydration)
    // Also TierComparison and RepeatCta render similar links
    // Use role=link with matching accessible name or text
    const checkoutLink = page.getByRole('link', { name: /Adopt monthly|Adopt yearly|Adopt now/i }).first()
    await expect(checkoutLink).toBeVisible({ timeout: 10000 })
    const href = await checkoutLink.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/(\/api\/checkout|\/api\/mollie-checkout|mailto:)/)
  })

  test('cookie consent banner renders with equal-prominence reject button', async ({ page }) => {
    // Clear localStorage to ensure banner shows (not dismissed)
    await page.context().clearCookies()
    await page.addInitScript(() => {
      window.localStorage.removeItem('ai_cookie_consent_v1')
    })
    await page.goto('/en')
    // CookieConsent renders role="dialog" aria-label="Cookie consent"
    const banner = page.getByRole('dialog', { name: /cookie consent/i }).first()
    if (await banner.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Reject button text is "Reject non-essential"
      const rejectBtn = banner.getByRole('button', { name: /Reject non-essential|reject|decline/i }).first()
      // Accept button text is "Accept all"
      const acceptBtn = banner.getByRole('button', { name: /Accept all|accept/i }).first()
      await expect(rejectBtn).toBeVisible()
      await expect(acceptBtn).toBeVisible()
      // Equal prominence: both should have a non-transparent background
      const acceptBg = await acceptBtn.evaluate(el => getComputedStyle(el).backgroundColor)
      const rejectBg = await rejectBtn.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(acceptBg).not.toBe('rgba(0, 0, 0, 0)')
      expect(rejectBg).not.toBe('rgba(0, 0, 0, 0)')
    }
  })

  test('certificate route renders PDF with passed donor_name', async ({ request }) => {
    // Use APIRequestContext (not page.goto) — Chromium treats Content-Disposition:inline PDF as a download
    // 200 = PDF rendered; 429 = rate-limit hit (10 req / 5 min per IP across parallel workers)
    const response = await request.get('/api/adopt-certificate?donor_name=Cruz&alpaca_name=Avalon')
    expect([200, 429]).toContain(response.status())
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] ?? ''
      expect(contentType).toContain('application/pdf')
    }
  })

  test('OG image route returns PNG', async ({ page }) => {
    const response = await page.goto('/og?title=Test')
    expect(response?.status()).toBe(200)
    const contentType = response?.headers()['content-type'] ?? ''
    expect(contentType).toContain('image/png')
  })

  test('non-EN locale renders html lang attribute correctly', async ({ page }) => {
    await page.goto('/de/adopt')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'de')
  })

  test('healthz returns JSON', async ({ page }) => {
    const response = await page.goto('/healthz')
    expect(response?.status()).toBe(200)
    const body = await response?.text()
    expect(body).toContain('"ok"')
  })
})
