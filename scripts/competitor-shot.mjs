// Screenshot competitor / peer sites for a real visual comparison against ours.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT = 'screenshots/competitors'
mkdirSync(OUT, { recursive: true })

const SITES = [
  ['canmarti-home', 'https://canmarti.com/'],
  ['farmexp-alpaca', 'https://farmexperiencestours.com/spain/ibiza-alpaca-experience/'],
  ['live-alpacasibiza', 'https://www.alpacasibiza.com/'],
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const out = []
for (const [name, url] of SITES) {
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1200)
    const file = `${OUT}/${name}.png`
    await page.screenshot({ path: file, fullPage: true })
    const h1 = await page.locator('h1').first().textContent().catch(() => null)
    out.push({ name, url, status: resp?.status(), file, h1: (h1 || '').trim().slice(0, 80) })
  } catch (e) {
    out.push({ name, url, error: String(e).slice(0, 140) })
  }
}
await browser.close()
console.log(JSON.stringify(out, null, 2))
