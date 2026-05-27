import { test, expect } from '@playwright/test'

// Turnstile widget renders null in dev when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset
// (components/turnstile-widget.tsx:82 — `if (!siteKey) return null`).
// So the test never blocks on the widget; it fills the form and submits directly.

test('contact form transitions out of idle on submit (no JS exception)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/en/contact')

  // Fill required fields by accessible role / name attribute
  await page.getByRole('textbox', { name: /name/i }).fill('E2E Tester')
  await page.getByRole('textbox', { name: /email/i }).fill('e2e@example.com')
  await page.getByRole('textbox', { name: /message/i }).fill('Automated smoke test — please ignore.')

  await page.getByRole('button', { name: /send/i }).click()

  // PASS = form leaves idle state: either success panel or inline error, never frozen
  const successPanel = page.locator('text=✅').or(page.getByRole('status'))
  const errorMsg     = page.locator('text=/error|failed|sorry/i')

  await expect(successPanel.or(errorMsg)).toBeVisible({ timeout: 10_000 })

  expect(errors).toHaveLength(0)
})
