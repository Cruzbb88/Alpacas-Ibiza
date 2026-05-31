# Squarespace DevTools extraction scripts — owner runs these
**For:** San & Bart
**Use:** paste into your browser's Console while logged into the alpacasibiza.com Squarespace dashboard. Each script copies its result to clipboard — paste the result back to us.

---

## How to open Console (30 seconds, once)

1. Log into your Squarespace dashboard (https://account.squarespace.com → Alpacas Ibiza)
2. On the page named in each section below, press **F12** (Windows) or **Cmd+Opt+I** (Mac)
3. Click the **Console** tab in the panel that appears
4. Copy the entire script from this file, paste into Console, press **Enter**
5. Result is in your clipboard — paste it into chat or an email back to us

---

## Script 1 — Brand color palette

**Open:** any public page of alpacasibiza.com (not the dashboard — the live site itself, e.g. https://www.alpacasibiza.com/)
**What it does:** dumps every color token Squarespace 7.1 uses for the brand palette, including all the per-section variants (header, footer, hero, etc.)

```js
(() => {
  const wanted = [
    '--solid-light-color','--solid-dark-color','--solid-bg-color','--solid-base-color',
    '--bright-light-color','--bright-dark-color','--bright-bg-color','--bright-base-color',
    '--lightTone-light-color','--lightTone-dark-color','--lightTone-bg-color','--lightTone-base-color',
    '--darkTone-light-color','--darkTone-dark-color','--darkTone-bg-color','--darkTone-base-color',
    '--white-color','--black-color','--accent-color','--site-background-color',
    '--siteTitleColor','--navigationLinkColor','--navigationActiveLinkColor',
    '--buttonPrimaryBackgroundColor','--buttonPrimaryTextColor',
    '--buttonSecondaryBackgroundColor','--buttonSecondaryTextColor',
    '--buttonTertiaryBackgroundColor','--buttonTertiaryTextColor',
    '--paragraphLinkColor','--paragraphLargeColor','--paragraphMediumColor','--paragraphSmallColor',
    '--headingLargeColor','--headingMediumColor','--headingSmallColor',
    '--logoColor','--footerBackgroundColor','--footerTextColor',
    '--inputBorderColor','--inputBackgroundColor','--inputTextColor',
    '--dividerColor','--shadowColor',
  ]
  const styles = getComputedStyle(document.documentElement)
  const rows = wanted
    .map(k => ({ token: k, value: styles.getPropertyValue(k).trim() }))
    .filter(r => r.value)
  console.table(rows)
  const out = '# Alpacas Ibiza brand palette (auto-extracted)\n' +
    rows.map(r => `${r.token}: ${r.value}`).join('\n')
  navigator.clipboard?.writeText(out)
    .then(() => console.log('✓ %c' + rows.length + ' tokens copied to clipboard', 'color:green;font-weight:bold'))
    .catch(() => console.log('Copy failed — select the table above and Cmd/Ctrl+C manually'))
  return rows
})()
```

**What we do with it:** wire the exact same hex values into the redesign's `app/globals.css` so the new site is visually identical to your current site.

---

## Script 2 — Full media library inventory

**Open:** your Squarespace dashboard → **Pages** → click any page → **Edit** the page → in the editor, open the **Image Block** picker (or any place that opens the media library). Or visit directly: `https://[your-site-id].squarespace.com/config/assets/files` after logging in.

**What it does:** scrapes every asset visible in the library panel — filename, dimensions, file size, upload date. Tells us what photos you actually have so we know what's available to migrate.

```js
(() => {
  // Squarespace media library cards have data attributes — match common ones across 7.1 versions
  const cards = Array.from(document.querySelectorAll(
    '[data-test*="asset"], [class*="asset-tile"], [class*="MediaLibraryItem"], [class*="library-item"], [class*="file-card"]'
  ))
  if (cards.length === 0) {
    console.warn('No media items found. Scroll the library to load more, then re-run.')
    console.log('Try also: ' + document.querySelectorAll('img').length + ' <img> tags on page — falling back to those.')
  }
  const rows = cards.length > 0
    ? cards.map(c => {
        const filename = c.querySelector('[title], [alt], [class*="filename"], [class*="name"]')?.textContent?.trim()
                     || c.getAttribute('data-filename')
                     || c.getAttribute('title')
                     || '(no name)'
        const img = c.querySelector('img')
        const src = img?.src || img?.getAttribute('data-src') || c.getAttribute('data-src') || ''
        const size = c.querySelector('[class*="size"], [data-size]')?.textContent?.trim() || ''
        const dims = c.querySelector('[class*="dim"], [data-dim]')?.textContent?.trim() || ''
        return { filename, dims, size, src }
      })
    : Array.from(document.querySelectorAll('img')).map(img => ({
        filename: img.src.split('/').pop()?.split('?')[0] || '(no name)',
        dims: img.naturalWidth + '×' + img.naturalHeight,
        size: '',
        src: img.src,
      }))
  console.table(rows)
  const out = '# Alpacas Ibiza media inventory (' + rows.length + ' assets)\n' +
    'filename\tdims\tsize\tsrc\n' +
    rows.map(r => `${r.filename}\t${r.dims}\t${r.size}\t${r.src}`).join('\n')
  navigator.clipboard?.writeText(out)
    .then(() => console.log('✓ %c' + rows.length + ' assets copied to clipboard', 'color:green;font-weight:bold'))
  return rows
})()
```

**Important:** Squarespace lazy-loads the media library. **Scroll the entire panel to the bottom first**, then run the script — otherwise it only sees what's been loaded.

**What we do with it:** decide what to re-host on the new site, identify gaps (alpaca portraits, weaving photos, tour photos, owner photos).

---

## Script 3 — FareHarbor item IDs (accumulates across pages)

**Open:** your Squarespace dashboard → **Settings** → **Connected Accounts** → look for FareHarbor. OR easier: open the live site, navigate to each tour page in turn (one at a time), and run the script on each.

**What it does:** scans the current page for any FareHarbor link/iframe, extracts the `items=` query parameter (the tour-specific ID we need), and **remembers what it found in localStorage** so you can run it on multiple pages in a row and get a combined list.

```js
(() => {
  const STORAGE_KEY = 'fh_item_id_dump_v1'
  // Find every URL that points at fareharbor and extract items= param
  const urls = []
  document.querySelectorAll('a[href*="fareharbor"], iframe[src*="fareharbor"]').forEach(el => {
    urls.push(el.href || el.src || '')
  })
  // Also extract data-fh-* attributes (FareHarbor lightbox links)
  document.querySelectorAll('[data-fh-flow], [data-fh-items], [data-fh-customer-id]').forEach(el => {
    const flow = el.getAttribute('data-fh-flow') || ''
    const items = el.getAttribute('data-fh-items') || ''
    if (items) urls.push(`fareharbor:flow=${flow}&items=${items}`)
  })
  // Parse each URL
  const found = []
  urls.forEach(u => {
    const m = u.match(/items=(\d+)/i)
    if (m) {
      // Use the nearest heading or page title as the tour name
      const pageTitle = document.querySelector('h1')?.textContent?.trim() || document.title
      found.push({ page: location.pathname, pageTitle, items: m[1], source_url: u.slice(0, 200) })
    }
    // Also handle Squarespace's path-format /items/123/
    const m2 = u.match(/\/items\/(\d+)\//)
    if (m2) {
      const pageTitle = document.querySelector('h1')?.textContent?.trim() || document.title
      found.push({ page: location.pathname, pageTitle, items: m2[1], source_url: u.slice(0, 200) })
    }
  })
  // Merge with localStorage accumulator
  let prev = []
  try { prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch {}
  const seen = new Set(prev.map(r => r.page + ':' + r.items))
  const merged = [...prev]
  found.forEach(r => {
    const key = r.page + ':' + r.items
    if (!seen.has(key)) { merged.push(r); seen.add(key) }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  console.table(merged)
  const out = '# FareHarbor item IDs found across visited pages\n' +
    'page\tpageTitle\titems\tsource_url\n' +
    merged.map(r => `${r.page}\t${r.pageTitle}\t${r.items}\t${r.source_url}`).join('\n')
  navigator.clipboard?.writeText(out)
    .then(() => console.log('✓ %ctotal across all pages: ' + merged.length + ' tour→ID mappings (copied)', 'color:green;font-weight:bold'))
  console.log('To start fresh: localStorage.removeItem("' + STORAGE_KEY + '")')
  return merged
})()
```

**Workflow:** on the live site, visit each tour/experience page one at a time and run the script on each. The script accumulates. After visiting all tour pages, paste the clipboard result back to us. Pages to visit:
- /wat-doen-wij (main tours hub)
- /alpaca-yoga-1
- /business-incentives-brainstormsessies
- /weddings-photoshoots
- Any other tour or workshop page that has a "Book now" button

**What we do with it:** populate the redesign's `FAREHARBOR_ITEM_*` env vars so each tour page links directly to its specific booking flow (currently every tour falls back to the master calendar).

---

## Script 4 — All page slugs (including drafts)

**Open:** your Squarespace dashboard → **Pages** (the left sidebar — shows the page tree of your whole site, including unpublished drafts)

**What it does:** lists every page Squarespace knows about, with its slug, title, and publish status. Tells us if there are draft pages with content we should know about that public scrape misses.

```js
(() => {
  // Squarespace pages panel uses several class patterns across 7.1 versions
  const items = Array.from(document.querySelectorAll(
    '[class*="page-item"], [class*="PageListItem"], [data-test*="page-item"], [class*="navigation-item"], li[role="treeitem"]'
  ))
  if (items.length === 0) {
    console.warn('No page items detected. Make sure the "Pages" panel is fully expanded on the left.')
  }
  const rows = items.map(el => {
    const title = el.querySelector('[class*="title"], [class*="name"], [data-test*="title"]')?.textContent?.trim()
              || el.textContent?.trim().split('\n')[0]
              || ''
    const link = el.querySelector('a')?.getAttribute('href') || el.getAttribute('href') || ''
    const slug = link.replace(/^.*\/(pages|config\/pages|pages\/edit)\//, '/')
                     .replace(/^.*\/(items|edit)\/[^\/]+\/?/, '/')
                     .split('?')[0]
    const isDraft = !!el.querySelector('[class*="draft"], [class*="unpublished"], [data-status="draft"]')
                 || el.textContent?.toLowerCase().includes('draft')
                 || false
    const isPrivate = el.textContent?.toLowerCase().includes('password')
                   || !!el.querySelector('[class*="locked"], [class*="private"]')
    return { title, slug, status: isDraft ? 'DRAFT' : (isPrivate ? 'PRIVATE' : 'LIVE') }
  }).filter(r => r.title)
  console.table(rows)
  const out = '# Alpacas Ibiza — all pages (' + rows.length + ' incl. drafts)\n' +
    'title\tslug\tstatus\n' +
    rows.map(r => `${r.title}\t${r.slug}\t${r.status}`).join('\n')
  navigator.clipboard?.writeText(out)
    .then(() => console.log('✓ %c' + rows.length + ' pages copied to clipboard', 'color:green;font-weight:bold'))
  return rows
})()
```

**What we do with it:** find any draft / unpublished page we should know about (a half-written about-team page, an unfinished workshop page, etc.) so we can either pull the content or know to skip it.

---

## Total runtime for you

All four scripts together: ~5 minutes of clicking, no command-line knowledge needed.

Send the four clipboard pastes back to us in any reasonable format (email, chat). We wire what they tell us into the redesign without further questions.

---

## If a script returns nothing or errors

Squarespace's admin DOM changes occasionally. If a script returns 0 items where you expect more:
- Make sure you're on the **right page** (each script's "Open:" line names it)
- Make sure the panel is **fully scrolled** (lazy-loading hides items)
- Try **refreshing the page** and re-running
- If still failing, paste the console error back to us and we'll adjust the selectors

No personal data leaves your browser via these scripts — they only read what's already on your screen and copy to your clipboard. You see exactly what gets sent before you paste it back.
