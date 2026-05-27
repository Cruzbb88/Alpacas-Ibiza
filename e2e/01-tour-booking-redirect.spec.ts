import { test, expect } from '@playwright/test'

test('tours page renders and exposes a FareHarbor booking link', async ({ page }) => {
  await page.goto('/en/tours')

  // Hero heading must be visible
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()

  // Prefer the inline "Book Now" text link; fall back to any <a> pointing at FareHarbor
  const bookNowLink = page
    .locator('a[href*="fareharbor.com"]')
    .first()

  await expect(bookNowLink).toBeVisible()

  const href = await bookNowLink.getAttribute('href')
  expect(href).toContain('fareharbor.com/embeds/book/alpacasibiza')
})
