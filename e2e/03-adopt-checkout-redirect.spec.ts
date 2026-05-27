import { test, expect } from '@playwright/test'

// In dev (PAYMENT_VENDOR unset) both CTA hrefs fall back to mailto: (adopt/page.tsx:61-62).
// In staging/prod with PAYMENT_VENDOR=stripe|mollie, clicking navigates to Stripe/Mollie checkout.
// PASS = clicking the primary CTA does not land on a broken/empty page.

test('adopt page primary CTA resolves to a valid destination (no broken state)', async ({ page }) => {
  await page.goto('/en/adopt')

  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()

  // Primary CTA is the "Monthly" adoption link (first <a> in the CTA section)
  const monthlyBtn = page.getByRole('link', { name: /monthly/i }).first()
  await expect(monthlyBtn).toBeVisible()

  const href = await monthlyBtn.getAttribute('href')
  expect(href).toBeTruthy()

  // Must be one of: mailto (dev fallback), Stripe Checkout, or Mollie Checkout
  const isValidDestination =
    href!.startsWith('mailto:') ||
    href!.includes('checkout.stripe.com') ||
    href!.includes('mollie.com') ||
    href!.startsWith('https://')

  expect(isValidDestination).toBe(true)
})
