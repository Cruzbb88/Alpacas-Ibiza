# Live Site Brand Assets — alpacasibiza.com
**Extracted:** 2026-05-31
**Source:** `https://www.alpacasibiza.com/` (single homepage fetch via real-browser UA, 564KB)
**Method:** Direct curl + brace-balanced JSON parse of `Static.SQUARESPACE_CONTEXT`
**Skill invoked:** `/site-assets`

---

## What was extractable from the static HTML

### 1. Logo (CDN URLs — owner already has these hosted)

| Slot | URL | Notes |
|---|---|---|
| Header (primary) | `https://images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3/db346187-6229-47b0-b5d1-57ba89a893d1/LOGO-alpacas-ibiza-DEF.png` | full-size variant served by Squarespace CDN |
| Header (responsive variant) | `//images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3/0403b060-868d-436e-bdb1-541142ce63fa/LOGO-alpacas-ibiza-DEF.png` | second responsive copy |

**File name:** `LOGO-alpacas-ibiza-DEF.png` — same logo asset, two CDN cache variants.

**Action:** can be referenced directly by URL in the redesign today OR downloaded for self-hosting per the photo-migration decision in [CONTENT-MIGRATION-2026-05-31-OWNER-REVIEW.md](./CONTENT-MIGRATION-2026-05-31-OWNER-REVIEW.md) §6.

---

### 2. Typography

| Role | Font family | Source |
|---|---|---|
| Body / primary | `freight-text-pro` | Squarespace premium font (Typekit/Adobe Fonts subscription) |
| Secondary | `Cabin` | Google Fonts — `?family=Cabin:ital,wght@0,400;0,700;1,400;1,700` |

**Implications for the redesign:**
- `freight-text-pro` is **not free** — it's an Adobe Fonts subscription typically bundled with Squarespace's plan. To match it in the redesign we'd need either an Adobe Fonts kit OR a free substitute (e.g. Spectral, Source Serif Pro, Crimson Pro — all have similar warm-serif character).
- `Cabin` is Google-hosted — direct import in `next/font/google` is one line.

**Recommended substitution for `freight-text-pro` while preserving warmth:** Spectral (Google) — geometric humanist serif, similar contrast + warmth. Free.

---

### 3. Template metadata

| Field | Value |
|---|---|
| Squarespace template ID | `5c5a519771c10ba3470d8101` |
| Squarespace version | 7.1 |
| Site identifier | `caterpillar-ellipse-npmb` |

This is information the owner would need anyway to authenticate with FareHarbor / Squarespace APIs.

---

## What was NOT extractable (and why)

### Brand color palette
Cycle-13 audit already flagged this. **Confirmed:** Squarespace 7.1 does NOT render the brand-color palette as static CSS in the page HTML. It's loaded dynamically by JS at runtime (Squarespace's "site styles" endpoint at `/api/v2/site-styles/<themeId>`), which requires either:
- Browser JS execution (Squarespace authenticates the request via cookies + CSRF), OR
- A logged-in Squarespace dashboard scrape (owner-only)

A 564 KB curl of the homepage returned ZERO hex colors in the parsed `SQUARESPACE_CONTEXT` object. The only CSS variables present are computed image-aspect-ratios + spacing tokens — no palette.

### Inline `<style>` blocks were inspected
70 inline `<style>` blocks exist on the homepage. None contain the brand palette — they're component-level overrides (focal points, aspect ratios, padding) referencing CSS vars that resolve at runtime.

---

## Get the palette yourself in 30 seconds (DevTools)

Open https://www.alpacasibiza.com in Chrome → press **F12** → paste into the **Console** tab:

```js
// Dump Squarespace 7.1 computed brand palette
(() => {
  const styles = getComputedStyle(document.documentElement);
  const want = [
    '--solid-light-color','--solid-dark-color','--solid-bg-color','--solid-base-color',
    '--bright-light-color','--bright-dark-color','--bright-bg-color','--bright-base-color',
    '--lightTone-light-color','--lightTone-dark-color','--lightTone-bg-color','--lightTone-base-color',
    '--darkTone-light-color','--darkTone-dark-color','--darkTone-bg-color','--darkTone-base-color',
    '--white-color','--black-color','--accent-color','--site-background-color',
    '--paragraphLinkColor','--paragraphMediumColor','--paragraphLargeColor',
    '--headingLargeColor','--headingMediumColor','--headingSmallColor',
    '--siteTitleColor','--navigationLinkColor','--buttonPrimaryBackgroundColor',
    '--buttonPrimaryTextColor','--buttonSecondaryBackgroundColor','--buttonSecondaryTextColor',
  ];
  const rows = want.map(k => ({ token: k, value: styles.getPropertyValue(k).trim() }))
                   .filter(r => r.value);
  console.table(rows);
  // Copy to clipboard
  const out = rows.map(r => `${r.token}: ${r.value}`).join('\n');
  navigator.clipboard?.writeText(out).then(() => console.log('✓ copied to clipboard'));
  return rows;
})();
```

The console will print a table of token-name → hex/rgb value, and copy the same to your clipboard. Paste it back into chat and we'll wire your real brand colors into the redesign's `app/globals.css` `--accent`, `--foreground`, `--background`, etc.

**Why this works:** the JavaScript runs in your browser AFTER Squarespace has resolved the palette into CSS variables on `<html>`. No auth needed for the read.

---

## Image inventory (sampled)

The homepage references ~25-30 image URLs in `<img>` tags, all on `images.squarespace-cdn.com`. The first wave content scrape (cycle 13 / earlier today) already inventoried the per-page image URLs in [LIVE_SITE_CONTENT_INVENTORY.md](./LIVE_SITE_CONTENT_INVENTORY.md). No new image data here that isn't already captured there.

---

## What this UNBLOCKS

| Item | Status after this extraction |
|---|---|
| Logo URL for the redesign header | ✅ have it (can reference CDN or download) |
| Body font name | ✅ identified (`freight-text-pro` — needs Adobe Fonts or substitute) |
| Secondary font | ✅ identified (`Cabin` — free, Google) |
| Brand color palette | ⏳ owner runs the DevTools snippet above + pastes result |
| Template / site IDs | ✅ extracted (useful for FareHarbor / Squarespace dashboard work) |
