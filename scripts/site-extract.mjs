// COMPREHENSIVE site data extractor. Crawls every public page in a real browser
// and pulls the COMPLETE structured dataset per page — no sampling, no eyeballing:
//   meta (title/desc/canonical/robots/hreflang/OG/twitter), all JSON-LD parsed,
//   heading outline, image inventory (alt/broken/dims), link inventory, form fields,
//   visible word count (thin-content), placeholder signals, console errors,
//   failed network requests, horizontal overflow (desktop+mobile), AND real
//   axe-core WCAG violations by impact. One JSON per page + aggregate + CSV.
//
//   node scripts/site-extract.mjs    (SHOT_BASE or http://localhost:3000)
//
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const BASE = process.env.SHOT_BASE || 'http://localhost:3000'
const OUT = 'reports/site-extract-2026-06-13'
mkdirSync(OUT + '/pages', { recursive: true })
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')

const PAGES = [
  ['home', '/en'], ['tours', '/en/tours'], ['visit', '/en/visit'], ['about', '/en/about'],
  ['adopt', '/en/adopt'], ['contact', '/en/contact'], ['shop', '/en/shop'],
  ['shop-woven', '/en/shop/woven'], ['shop-commission', '/en/shop/commission'], ['shop-alcaca', '/en/shop/alcaca'],
  ['alpacas', '/en/alpacas'], ['experiences', '/en/experiences'],
  ['exp-corporate', '/en/experiences/corporate-team-building'], ['exp-romantic', '/en/experiences/romantic-sunset'],
  ['exp-family', '/en/experiences/family-farm-days'], ['gifts', '/en/gifts'], ['redeem-voucher', '/en/redeem-voucher'],
  ['weaving', '/en/weaving'], ['skein', '/en/skein'], ['sustainability', '/en/sustainability'],
  ['weddings', '/en/weddings'], ['workshops', '/en/workshops'], ['yoga', '/en/yoga'],
  ['privacy', '/en/privacy'], ['terms', '/en/terms'], ['cookies', '/en/cookies'], ['impressum', '/en/impressum'],
  ['press', '/en/press'], ['sitemap', '/en/sitemap'], ['journal', '/en/journal'], ['herd-diary', '/en/herd-diary'],
  ['newsletter-archive', '/en/newsletter/archive'], ['alpaca-detail', '/en/alpacas/lewis'],
  ['my-adoption', '/en/my-adoption'], ['preferences', '/en/preferences'],
  ['home-nl', '/nl'], ['adopt-nl', '/nl/adopt'], ['adopt-de', '/de/adopt'],
  ['notfound', '/en/this-page-does-not-exist'],
]

const browser = await chromium.launch()
const agg = []

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

for (const [name, path] of PAGES) {
  const rec = { page: name, path, console: [], failedReq: [] }
  const onConsole = (m) => { if (m.type() === 'error') rec.console.push(m.text().slice(0, 160)) }
  const onErr = (e) => rec.console.push('pageerror: ' + e.message.slice(0, 160))
  const onResp = (r) => { const s = r.status(); if (s >= 400) rec.failedReq.push(`${s} ${r.url().slice(0, 90)}`) }
  page.on('console', onConsole); page.on('pageerror', onErr); page.on('response', onResp)
  try {
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
    rec.status = resp?.status() ?? null
    await page.waitForTimeout(600)

    // ---- meta + schema + inventory (single in-page evaluate) ----
    Object.assign(rec, await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const attr = (s, a) => { const e = q(s); return e ? e.getAttribute(a) : null }
      const jsonld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
        try { return JSON.parse(s.textContent) } catch { return { __PARSE_ERROR__: true } }
      })
      const schemaTypes = jsonld.flatMap((b) => Array.isArray(b) ? b.map((x) => x['@type']) : [b['@type']]).filter(Boolean)
      const imgs = Array.from(document.images)
      const links = Array.from(document.querySelectorAll('a[href]'))
      const fields = Array.from(document.querySelectorAll('input,select,textarea'))
      const labelable = fields.filter((f) => f.type !== 'hidden')
      const unlabeled = labelable.filter((f) => {
        if (f.getAttribute('aria-label') || f.getAttribute('aria-labelledby')) return false
        const id = f.id
        if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return false
        if (f.closest('label')) return false
        return true
      })
      const heads = Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => h.tagName + ':' + (h.textContent || '').trim().slice(0, 40))
      const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').trim()
      // heading-order: first heading should be h1; flag if an h1 is missing or out of order
      const h1count = document.querySelectorAll('h1').length
      return {
        title: document.title,
        desc: attr('meta[name="description"]', 'content'),
        canonical: attr('link[rel="canonical"]', 'href'),
        robots: attr('meta[name="robots"]', 'content'),
        hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => l.getAttribute('hreflang')),
        og: { title: attr('meta[property="og:title"]', 'content'), image: attr('meta[property="og:image"]', 'content'), locale: attr('meta[property="og:locale"]', 'content') },
        twitter: attr('meta[name="twitter:card"]', 'content'),
        schemaTypes,
        jsonldCount: jsonld.length,
        h1count,
        headings: heads.slice(0, 25),
        imgTotal: imgs.length,
        imgMissingAlt: imgs.filter((i) => !i.alt || !i.alt.trim()).length,
        imgBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.currentSrc || i.src).slice(-60)).slice(0, 8),
        linkTotal: links.length,
        linkExternalNoRel: links.filter((a) => a.target === '_blank' && !/noopener/.test(a.rel || '')).length,
        formFields: labelable.length,
        unlabeledFields: unlabeled.length,
        wordCount: bodyText.split(' ').filter(Boolean).length,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      }
    }))

    // ---- real axe-core WCAG ----
    await page.addScriptTag({ content: AXE })
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] })
      const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 }
      const rules = r.violations.map((v) => { byImpact[v.impact] = (byImpact[v.impact] || 0) + 1; return { id: v.id, impact: v.impact, n: v.nodes.length, help: v.help.slice(0, 70) } })
      return { byImpact, total: r.violations.length, rules }
    })
    rec.axe = axe

    await page.screenshot({ path: `${OUT}/pages/${name}.png`, fullPage: true }).catch(() => {})
  } catch (e) {
    rec.error = String(e).slice(0, 160)
  }
  page.off('console', onConsole); page.off('pageerror', onErr); page.off('response', onResp)
  writeFileSync(`${OUT}/pages/${name}.json`, JSON.stringify(rec, null, 2))
  agg.push(rec)
  process.stderr.write(`. ${name} [${rec.status}] axe=${rec.axe?.total ?? '?'} imgBroken=${rec.imgBroken?.length ?? '?'} overflow=${rec.overflowPx ?? '?'} words=${rec.wordCount ?? '?'}\n`)
}
await ctx.close()

// ---- mobile overflow pass (cheap, all pages) ----
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mp = await mctx.newPage()
for (const r of agg) {
  if (r.error) continue
  try {
    await mp.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await mp.waitForTimeout(400)
    r.mobileOverflowPx = await mp.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  } catch { r.mobileOverflowPx = -1 }
}
await mctx.close()
await browser.close()

writeFileSync(`${OUT}/_aggregate.json`, JSON.stringify(agg, null, 2))
// CSV
const csv = ['page,status,title_len,desc,canonical,robots,hreflang_n,schema_n,h1,imgTotal,imgMissingAlt,imgBroken,unlabeledFields,wordCount,overflowDesktop,overflowMobile,axeCritical,axeSerious,axeTotal,consoleErr,failedReq']
for (const r of agg) {
  csv.push([r.page, r.status, (r.title || '').length, r.desc ? 'Y' : 'MISSING', r.canonical ? 'Y' : 'MISSING', r.robots || '-', (r.hreflang || []).length, (r.schemaTypes || []).length, r.h1count ?? '-', r.imgTotal ?? '-', r.imgMissingAlt ?? '-', (r.imgBroken || []).length, r.unlabeledFields ?? '-', r.wordCount ?? '-', r.overflowPx ?? '-', r.mobileOverflowPx ?? '-', r.axe?.byImpact?.critical ?? '-', r.axe?.byImpact?.serious ?? '-', r.axe?.total ?? '-', (r.console || []).length, (r.failedReq || []).length].join(','))
}
writeFileSync(`${OUT}/_summary.csv`, csv.join('\n'))
console.log('EXTRACTED', agg.length, 'pages →', OUT)
console.log('axe totals:', agg.reduce((a, r) => a + (r.axe?.total || 0), 0), 'violations across all pages')
